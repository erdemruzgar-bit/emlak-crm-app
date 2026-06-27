import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditTask, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const taskUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
});

async function loadAndCheck(req: NextRequest, session: unknown, id: string) {
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { user: { select: { branchId: true } } },
  });
  if (!existing) {
    return { response: NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 }) };
  }
  const actor = extractActor(session);
  if (!canEditTask(actor, existing)) {
    await createAuditLog({
      userId: actor?.id,
      action: "DENIED_EDIT",
      entity: "Task",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return { response: NextResponse.json({ error: "Bu görevi düzenleme yetkiniz yok" }, { status: 403 }) };
  }
  return { existing };
}

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
    const check = await loadAndCheck(req, session, id);
    if ("response" in check) return check.response;

    const body = await req.json();
    const parsed = taskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { dueDate, ...rest } = parsed.data;
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      include: {
        user: { select: { name: true } },
        assignedBy: { select: { name: true } },
      },
    });

    return NextResponse.json(task);
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

  const { id } = await params;

  try {
    const check = await loadAndCheck(req, session, id);
    if ("response" in check) return check.response;

    await prisma.task.delete({ where: { id } });
    await createAuditLog({
      userId: extractActor(session)?.id,
      action: "DELETE",
      entity: "Task",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ message: "Görev silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
