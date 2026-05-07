// PropertyNote silme: yazan kişi veya MANAGER+ADMIN siler.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId, noteId } = await params;

  const note = await prisma.propertyNote.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true, propertyId: true, kind: true, content: true },
  });
  if (!note || note.propertyId !== propertyId) {
    return NextResponse.json({ error: "Not bulunamadı" }, { status: 404 });
  }

  const isOwner = note.userId === actor.id;
  const isManagerOrAdmin = actor.role === "ADMIN" || actor.role === "MANAGER";
  if (!isOwner && !isManagerOrAdmin) {
    return NextResponse.json({ error: "Bu notu silme yetkiniz yok" }, { status: 403 });
  }

  await prisma.propertyNote.delete({ where: { id: noteId } });

  await createAuditLog({
    userId: actor.id,
    action: "DELETE",
    entity: "PropertyNote",
    entityId: noteId,
    oldValue: { propertyId, kind: note.kind, contentPreview: note.content.slice(0, 100) },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
