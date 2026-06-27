import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditProperty, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const statusSchema = z.object({
  status: z.enum(["SUGGESTED", "INTERESTED", "REJECTED"]),
});

async function loadMatchAndCheck(session: unknown, matchId: string) {
  const match = await prisma.propertyMatch.findUnique({
    where: { id: matchId },
    include: { property: { select: { assignedAgentId: true, branchId: true } } },
  });
  if (!match) {
    return { response: NextResponse.json({ error: "Eşleşme bulunamadı" }, { status: 404 }) };
  }
  const actor = extractActor(session);
  if (!canEditProperty(actor, match.property)) {
    return { response: NextResponse.json({ error: "Bu eşleşmeyi düzenleme yetkiniz yok" }, { status: 403 }) };
  }
  return { match };
}

// PATCH — status değiştir (İlgileniyor / Reddet / Geri al)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const check = await loadMatchAndCheck(session, id);
  if ("response" in check) return check.response;

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const updated = await prisma.propertyMatch.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Eşleşme bulunamadı" }, { status: 404 });
  }
}

// DELETE — manuel eklemeyi tamamen kaldır
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const check = await loadMatchAndCheck(session, id);
  if ("response" in check) return check.response;

  try {
    await prisma.propertyMatch.delete({ where: { id } });
    await createAuditLog({
      userId: extractActor(session)?.id,
      action: "DELETE",
      entity: "PropertyMatch",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Eşleşme bulunamadı" }, { status: 404 });
  }
}
