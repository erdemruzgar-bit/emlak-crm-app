import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

// PATCH /api/customers/:id/access-sessions/:sessionId
// Oturumu sonlandırır. Body: { exitNote: string } → CustomerNote oluşturur, oturumu COMPLETED yapar.
// Body: { abandon: true } → ABANDONED işaretler (çıkış notu olmadan tab kapatma için beacon endpoint'i).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  if (!actor) {
    return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
  }

  const { id, sessionId } = await params;
  const body = await req.json().catch(() => null);
  const ipAddress = req.headers.get("x-forwarded-for") || undefined;

  const accessSession = await prisma.customerAccessSession.findUnique({
    where: { id: sessionId },
    select: { id: true, customerId: true, userId: true, status: true },
  });
  if (!accessSession || accessSession.customerId !== id) {
    return NextResponse.json({ error: "Oturum bulunamadı" }, { status: 404 });
  }
  // Yalnızca oturumu açan kullanıcı veya yönetici kapatabilir
  if (accessSession.userId !== actor.id && actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  if (accessSession.status !== "ACTIVE") {
    return NextResponse.json({ error: "Oturum zaten kapalı", session: accessSession }, { status: 409 });
  }

  // Abandon path (beacon — tarayıcı kapatıldığında)
  if (body?.abandon === true) {
    const updated = await prisma.customerAccessSession.update({
      where: { id: sessionId },
      data: { status: "ABANDONED", endedAt: new Date() },
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "CustomerAccessSession",
      entityId: sessionId,
      newValue: { status: "ABANDONED" },
      ipAddress,
    });
    return NextResponse.json(updated);
  }

  // Normal completion path — exit note zorunlu
  const exitNoteContent = typeof body?.exitNote === "string" ? body.exitNote.trim() : "";
  if (exitNoteContent.length < 3) {
    return NextResponse.json(
      { error: "Sonuç notu en az 3 karakter olmalıdır" },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const note = await tx.customerNote.create({
      data: {
        content: exitNoteContent,
        customerId: id,
        userId: actor.id,
      },
    });
    const sess = await tx.customerAccessSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        exitNoteId: note.id,
      },
      include: {
        exitNote: { select: { id: true, content: true, createdAt: true } },
        user: { select: { id: true, name: true, role: true } },
      },
    });
    return { sess, note };
  });

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "CustomerNote",
    entityId: updated.note.id,
    newValue: { customerId: id, content: exitNoteContent, accessSessionId: sessionId },
    ipAddress,
  });
  await createAuditLog({
    userId: actor.id,
    action: "UPDATE",
    entity: "CustomerAccessSession",
    entityId: sessionId,
    newValue: { status: "COMPLETED", exitNoteId: updated.note.id },
    ipAddress,
  });

  return NextResponse.json(updated.sess);
}
