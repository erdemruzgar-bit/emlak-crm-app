import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

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
    const item = await prisma.roomType.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    // Bu oda tipine sahip mülk var mı? (rooms String eşleşmesi)
    const usage = await prisma.property.count({ where: { rooms: item.name } });
    if (usage > 0) {
      return NextResponse.json(
        { error: `Bu tipi kullanan ${usage} mülk var. Önce o mülkleri değiştirin.` },
        { status: 409 }
      );
    }

    await prisma.roomType.delete({ where: { id } });
    await createAuditLog({
      userId: actor.id,
      action: "DELETE",
      entity: "RoomType",
      entityId: id,
      oldValue: { name: item.name },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ message: "Silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
