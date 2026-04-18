import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor, taskListFilter } from "@/lib/rbac";
import { z } from "zod/v4";

const taskCreateSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignedToId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = extractActor(session);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = { ...taskListFilter(actor) };
  if (status) where.status = status;

  try {
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: { select: { name: true } },
        assignedBy: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = taskCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const user = session.user as unknown as Record<string, unknown>;
    const { assignedToId, dueDate, ...rest } = parsed.data;

    const task = await prisma.task.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        userId: (assignedToId || user.id) as string,
        assignedById: user.id as string,
      },
      include: {
        user: { select: { name: true } },
        assignedBy: { select: { name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
