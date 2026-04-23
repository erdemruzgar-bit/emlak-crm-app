import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const patchSchema = z.object({
  label: z.string().min(1).max(40).optional(),
  isTenantSide: z.boolean().optional(),
  isOwnerSide: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  try {
    const item = await prisma.customerTypeCatalog.update({
      where: { id },
      data: parsed.data,
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "CustomerTypeCatalog",
      entityId: id,
      newValue: parsed.data,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Bulunamadı veya güncellenemedi" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const item = await prisma.customerTypeCatalog.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const usage = await prisma.customer.count({ where: { customerType: item.code } });
    if (usage > 0) {
      return NextResponse.json(
        { error: `Bu tipi kullanan ${usage} müşteri var. Önce o müşterilerin tipini değiştirin.` },
        { status: 409 }
      );
    }

    await prisma.customerTypeCatalog.delete({ where: { id } });
    await createAuditLog({
      userId: actor.id,
      action: "DELETE",
      entity: "CustomerTypeCatalog",
      entityId: id,
      oldValue: { code: item.code, label: item.label },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ message: "Silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
