import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import {
  ACCESS_REASON_CODES,
  SENSITIVE_FIELDS,
  requiresAccessGate,
} from "@/lib/access-control";

// POST /api/customers/:id/access-sessions
// AGENT hassas veri görmek için oturum açar. Body: { reasonCategory, reason, fields }
// Aktif oturum varsa onu döner (idempotent), yeni alan istendiyse fields'i genişletir.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = extractActor(session);
  if (!actor) {
    return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
  }

  // ADMIN/MANAGER için kapı yok — istemcinin yanlışlıkla çağırmasına karşı no-op başarı dön
  if (!requiresAccessGate(actor)) {
    return NextResponse.json({ skipped: true, reason: "ROLE_EXEMPT" }, { status: 200 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const reasonCategory = typeof body?.reasonCategory === "string" ? body.reasonCategory : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const fields = Array.isArray(body?.fields) ? body.fields : [];

  if (!ACCESS_REASON_CODES.includes(reasonCategory as (typeof ACCESS_REASON_CODES)[number])) {
    return NextResponse.json({ error: "Geçersiz gerekçe kategorisi" }, { status: 400 });
  }
  if (reason.length < 3) {
    return NextResponse.json({ error: "Gerekçe en az 3 karakter olmalıdır" }, { status: 400 });
  }
  const requestedFields = (fields as string[]).filter((f) =>
    (SENSITIVE_FIELDS as readonly string[]).includes(f)
  );
  if (requestedFields.length === 0) {
    return NextResponse.json({ error: "En az bir alan seçilmelidir" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  const ipAddress = req.headers.get("x-forwarded-for") || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  // Aktif bir oturum varsa: alanları birleştir (kullanıcı yeni bir alan istemiş olabilir)
  const active = await prisma.customerAccessSession.findFirst({
    where: { customerId: id, userId: actor.id, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });

  if (active) {
    const merged = Array.from(new Set([...active.fields, ...requestedFields]));
    const newFields = merged.length !== active.fields.length;
    const updated = newFields
      ? await prisma.customerAccessSession.update({
          where: { id: active.id },
          data: { fields: merged },
        })
      : active;

    await createAuditLog({
      userId: actor.id,
      action: "READ",
      entity: "CustomerAccessSession",
      entityId: updated.id,
      newValue: { customerId: id, fields: requestedFields, mode: newFields ? "EXTEND" : "REUSE" },
      ipAddress,
    });

    return NextResponse.json(updated, { status: 200 });
  }

  const created = await prisma.customerAccessSession.create({
    data: {
      customerId: id,
      userId: actor.id,
      reasonCategory,
      reason,
      fields: requestedFields,
      ipAddress,
      userAgent,
    },
  });

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "CustomerAccessSession",
    entityId: created.id,
    newValue: { customerId: id, reasonCategory, reason, fields: requestedFields },
    ipAddress,
  });

  return NextResponse.json(created, { status: 201 });
}

// GET /api/customers/:id/access-sessions
// Müşteri detayında "Erişim Geçmişi" tabı için. Tüm roller görebilir (KVKK transparency).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sessions = await prisma.customerAccessSession.findMany({
    where: { customerId: id },
    include: {
      user: { select: { id: true, name: true, role: true } },
      exitNote: { select: { id: true, content: true, createdAt: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(sessions);
}
