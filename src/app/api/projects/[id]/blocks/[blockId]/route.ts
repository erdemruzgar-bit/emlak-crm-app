import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
  }

  const { id, blockId } = await params;
  try {
    const block = await prisma.block.findUnique({ where: { id: blockId }, select: { projectId: true } });
    if (!block || block.projectId !== id) {
      return NextResponse.json({ error: "Blok bulunamadı" }, { status: 404 });
    }
    // Bu bloğa bağlı mülk var mı?
    const count = await prisma.property.count({ where: { blockId } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Bu bloğa bağlı ${count} mülk var. Önce mülkleri başka bir bloğa taşıyın.` },
        { status: 409 }
      );
    }
    await prisma.block.delete({ where: { id: blockId } });
    return NextResponse.json({ message: "Blok silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
