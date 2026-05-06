import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const actor = extractActor(session);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const attachment = await prisma.contractAttachment.findUnique({
      where: { id: attachmentId },
      include: { contract: { select: { id: true, branchId: true, createdById: true } } },
    });

    if (!attachment || attachment.contract.id !== id) {
      return NextResponse.json({ error: "Eklenti bulunamadı" }, { status: 404 });
    }

    const canAccess =
      actor.role === "ADMIN" ||
      (actor.role === "MANAGER" && !!attachment.contract.branchId && actor.branchIds.includes(attachment.contract.branchId)) ||
      attachment.contract.createdById === actor.id ||
      attachment.uploadedById === actor.id;

    if (!canAccess) {
      return NextResponse.json({ error: "Bu eklentiyi silme yetkiniz yok" }, { status: 403 });
    }

    await prisma.contractAttachment.delete({ where: { id: attachmentId } });

    await createAuditLog({
      userId: actor.id,
      action: "DELETE",
      entity: "ContractAttachment",
      entityId: attachmentId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ message: "Eklenti silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
