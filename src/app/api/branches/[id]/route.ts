import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const branchUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = branchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { users: true, customers: true, properties: true } } },
    });

    await createAuditLog({
      userId: sessionUser.id as string,
      action: "UPDATE",
      entity: "Branch",
      entityId: id,
      newValue: parsed.data,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(branch);
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

  const sessionUser = session.user as unknown as Record<string, unknown>;
  if (sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.branch.delete({ where: { id } });
    await createAuditLog({
      userId: sessionUser.id as string,
      action: "DELETE",
      entity: "Branch",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ message: "Şube silindi" });
  } catch {
    return NextResponse.json({ error: "Şube silinemedi (bağlı kullanıcılar olabilir)" }, { status: 400 });
  }
}
