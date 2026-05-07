// Property'ye bağlı görüşme/not akışı.
// GET: notları listeler (cursor pagination — basit limit/offset).
// POST: yeni not ekler; opsiyonel olarak Reminder de kurabilir (atomic).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { canEditProperty } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const noteCreateSchema = z.object({
  kind: z.enum(["GENERAL", "CALL_LOG", "MEETING", "OPERATIONAL_STATUS"]),
  content: z.string().min(1, "Not boş olamaz").max(5000),
  reminder: z
    .object({
      title: z.string().min(1).max(200),
      dueDate: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    })
    .optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Property görüntüleme yetkisi (hassas alan içermiyor — sadece varlık doğrulama)
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, branchId: true },
  });
  if (!property) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });

  // AGENT şube izolasyonu (canViewProperty ile aynı mantık — basitleştirilmiş)
  if (actor.role === "AGENT" && property.branchId && !actor.branchIds.includes(property.branchId)) {
    return NextResponse.json({ error: "Bu ilanın notlarını görme yetkiniz yok" }, { status: 403 });
  }

  const [notes, total] = await Promise.all([
    prisma.propertyNote.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.propertyNote.count({ where: { propertyId } }),
  ]);

  return NextResponse.json({ notes, total });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const parsed = noteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, branchId: true, assignedAgentId: true },
  });
  if (!property) return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  if (!canEditProperty(actor, property)) {
    return NextResponse.json({ error: "Bu ilana not yazma yetkiniz yok" }, { status: 403 });
  }

  const { kind, content, reminder } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const note = await tx.propertyNote.create({
      data: {
        propertyId,
        userId: actor.id,
        kind,
        content,
        source: "form",
      },
      include: { user: { select: { id: true, name: true } } },
    });

    let createdReminder = null;
    if (reminder) {
      const due = new Date(reminder.dueDate);
      if (isNaN(due.getTime())) {
        throw new Error("Geçersiz hatırlatma tarihi");
      }
      createdReminder = await tx.reminder.create({
        data: {
          userId: actor.id,
          title: reminder.title,
          dueDate: due,
          priority: reminder.priority,
          targetType: "PROPERTY",
          targetId: propertyId,
        },
      });
    }

    return { note, reminder: createdReminder };
  });

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "PropertyNote",
    entityId: result.note.id,
    newValue: { propertyId, kind },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  }).catch(() => {});

  return NextResponse.json(result, { status: 201 });
}
