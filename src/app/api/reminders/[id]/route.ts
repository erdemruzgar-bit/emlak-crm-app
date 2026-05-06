import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor, type SessionActor } from "@/lib/rbac";
import { z } from "zod/v4";

const reminderUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  isDone: z.boolean().optional(),
});

async function canAccess(actor: SessionActor | null, reminderUserId: string) {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (reminderUserId === actor.id) return true;
  if (actor.role === "MANAGER") {
    const user = await prisma.user.findUnique({ where: { id: reminderUserId }, select: { branchId: true } });
    return !!user?.branchId && actor.branchIds.includes(user.branchId);
  }
  return false;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  const { id } = await params;

  try {
    const existing = await prisma.reminder.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return NextResponse.json({ error: "Hatırlatma bulunamadı" }, { status: 404 });
    if (!(await canAccess(actor, existing.userId))) {
      return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = reminderUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    const { dueDate, isDone, ...rest } = parsed.data;
    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        isDone: isDone,
        doneAt: isDone === true ? new Date() : isDone === false ? null : undefined,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(reminder);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  const { id } = await params;

  try {
    const existing = await prisma.reminder.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return NextResponse.json({ error: "Hatırlatma bulunamadı" }, { status: 404 });
    if (!(await canAccess(actor, existing.userId))) {
      return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    }
    await prisma.reminder.delete({ where: { id } });
    return NextResponse.json({ message: "Silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
