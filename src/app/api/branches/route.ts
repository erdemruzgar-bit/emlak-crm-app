import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const branchSchema = z.object({
  name: z.string().min(2, "Şube adı en az 2 karakter olmalı"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: { users: true, customers: true, properties: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(branches);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece Yönetici şube oluşturabilir" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = branchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: parsed.data,
      include: { _count: { select: { users: true, customers: true, properties: true } } },
    });

    await createAuditLog({
      userId: sessionUser.id as string,
      action: "CREATE",
      entity: "Branch",
      entityId: branch.id,
      newValue: { name: branch.name },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
