import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { customerUpdateSchema } from "@/lib/validations/customer";
import { runCustomerMatching } from "@/lib/matching";
import { canEditCustomer, extractActor } from "@/lib/rbac";
import { applyAccessMask, requiresAccessGateFor, type SensitiveField } from "@/lib/access-control";

// GET /api/customers/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      consents: { orderBy: { createdAt: "desc" } },
      notes: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      interactions: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      propertyMatches: {
        include: { property: { select: { id: true, title: true, price: true, listingType: true } } },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  // Decrypt TC Kimlik No for display
  const decryptedTc = customer.tcKimlikNo ? decrypt(customer.tcKimlikNo) : null;

  // Hassas veri erişim kapısı (AGENT için, müşteri kendi ekledikleri hariç)
  const actor = extractActor(session);
  const gated = requiresAccessGateFor(actor, { createdById: customer.createdById });
  let revealedFields: SensitiveField[] = [];
  let activeAccessSession: { id: string; reasonCategory: string; reason: string; startedAt: Date; fields: string[] } | null = null;

  if (gated && actor) {
    const active = await prisma.customerAccessSession.findFirst({
      where: { customerId: id, userId: actor.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      select: { id: true, reasonCategory: true, reason: true, startedAt: true, fields: true },
    });
    if (active) {
      activeAccessSession = active;
      revealedFields = active.fields.filter((f: string): f is SensitiveField =>
        f === "phone" || f === "email" || f === "tc"
      );
    }
  }

  const masked = applyAccessMask(
    { phone: customer.phone, email: customer.email, tcKimlikNo: decryptedTc, createdById: customer.createdById },
    actor,
    { revealedFields }
  );

  const responseCustomer = {
    ...customer,
    phone: masked.phone,
    email: masked.email,
    tcKimlikNo: masked.tcKimlikNo,
    phoneMasked: masked.phoneMasked,
    emailMasked: masked.emailMasked,
    tcKimlikNoMasked: masked.tcKimlikNoMasked,
    sensitiveGated: masked.sensitiveGated,
    activeAccessSession,
  };

  await createAuditLog({
    userId: (session.user as unknown as Record<string, unknown>).id as string,
    action: "READ",
    entity: "Customer",
    entityId: id,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(responseCustomer);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PUT /api/customers/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
  const body = await req.json();
  const parsed = customerUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const oldCustomer = await prisma.customer.findUnique({ where: { id } });
  if (!oldCustomer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  const actor = extractActor(session);
  if (!canEditCustomer(actor, oldCustomer)) {
    await createAuditLog({
      userId: actor?.id,
      action: "DENIED_EDIT",
      entity: "Customer",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ error: "Bu müşteriyi düzenleme yetkiniz yok" }, { status: 403 });
  }

  // AGENT kendi müşterisini başkasına devredemez
  if (parsed.data.assignedAgentId !== undefined && parsed.data.assignedAgentId !== oldCustomer.assignedAgentId) {
    if (actor?.role === "AGENT") {
      return NextResponse.json({ error: "Danışman atama yetkiniz yok" }, { status: 403 });
    }
    if (parsed.data.assignedAgentId) {
      const newAgent = await prisma.user.findUnique({
        where: { id: parsed.data.assignedAgentId },
        select: { id: true, isActive: true },
      });
      if (!newAgent || !newAgent.isActive) {
        return NextResponse.json({ error: "Seçilen danışman geçersiz" }, { status: 400 });
      }
    }
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.desiredMoveDate) updateData.desiredMoveDate = new Date(updateData.desiredMoveDate as string);
  if (updateData.nextFollowUpDate) updateData.nextFollowUpDate = new Date(updateData.nextFollowUpDate as string);
  if (updateData.lastContactDate) updateData.lastContactDate = new Date(updateData.lastContactDate as string);

  // KVKK: AGENT (kendi eklemediği müşteri için) hassas alanı yalnızca aktif gerekçeli oturumla güncelleyebilir.
  // Kendi eklediği müşteri ise her zaman güncelleyebilir.
  if (requiresAccessGateFor(actor, { createdById: oldCustomer.createdById })) {
    const active = await prisma.customerAccessSession.findFirst({
      where: { customerId: id, userId: actor!.id, status: "ACTIVE" },
      select: { fields: true },
    });
    const revealed = new Set(active?.fields ?? []);
    if (!revealed.has("phone")) delete updateData.phone;
    if (!revealed.has("email")) delete updateData.email;
    if (!revealed.has("tc")) delete updateData.tcKimlikNo;
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId: (session.user as unknown as Record<string, unknown>).id as string,
    action: "UPDATE",
    entity: "Customer",
    entityId: id,
    oldValue: { firstName: oldCustomer.firstName, lastName: oldCustomer.lastName },
    newValue: { firstName: customer.firstName, lastName: customer.lastName },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  runCustomerMatching(id).catch(() => {});

  return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/customers/:id — KVKK: Anonymize instead of hard delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as Record<string, unknown>;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece sistem yöneticisi müşteri silebilir" }, { status: 403 });
  }

  const { id } = await params;

  // KVKK: Anonymize data instead of deleting
  await prisma.customer.update({
    where: { id },
    data: {
      firstName: "Anonim",
      lastName: "Kullanıcı",
      email: null,
      phone: null,
      tcKimlikNo: null,
      address: null,
      isAnonymized: true,
    },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "DELETE",
    entity: "Customer",
    entityId: id,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ message: "Müşteri verileri anonimleştirildi (KVKK)" });
}
