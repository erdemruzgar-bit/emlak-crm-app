import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { z } from "zod/v4";

const reminderCreateSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı"),
  description: z.string().optional(),
  dueDate: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  targetType: z
    .enum(["CUSTOMER", "PROPERTY", "APPOINTMENT", "CONTRACT", "GENERAL"])
    .default("GENERAL"),
  targetId: z.string().optional(),
  userId: z.string().optional(), // Opsiyonel: başka birine hatırlatma (MANAGER/ADMIN)
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const done = searchParams.get("done");
  const scope = searchParams.get("scope") || "me"; // me | team | all
  const countOnly = searchParams.get("countOnly") === "1";

  const where: Record<string, unknown> = {};

  if (scope === "me") {
    where.userId = actor.id;
  } else if (scope === "team") {
    if (actor.role === "ADMIN") {
      // tümü
    } else if (actor.role === "MANAGER") {
      // yetkili olduğu şubelerin kullanıcıları (ana + ek)
      where.user = { branchId: actor.branchIds.length > 0 ? { in: actor.branchIds } : "__no_branch__" };
    } else {
      where.userId = actor.id;
    }
  } else if (scope === "all") {
    if (actor.role !== "ADMIN") where.userId = actor.id;
  }

  if (done === "false") where.isDone = false;
  if (done === "true") where.isDone = true;

  if (countOnly) {
    const count = await prisma.reminder.count({ where });
    return NextResponse.json({ count });
  }

  try {
    const reminders = await prisma.reminder.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ isDone: "asc" }, { dueDate: "asc" }],
    });
    return NextResponse.json(reminders);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = reminderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { userId: requestedUserId, dueDate, ...rest } = parsed.data;

    // AGENT sadece kendine; MANAGER/ADMIN başkalarına da yazabilir
    const targetUserId =
      requestedUserId && (actor.role === "ADMIN" || actor.role === "MANAGER")
        ? requestedUserId
        : actor.id;

    const reminder = await prisma.reminder.create({
      data: {
        ...rest,
        userId: targetUserId,
        dueDate: new Date(dueDate),
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(reminder, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
