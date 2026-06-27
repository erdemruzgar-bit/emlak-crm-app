import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

// Bir kullanıcının üzerindeki atanmış müşteri + portföyü başka bir danışmana toplu devreder.
// İsteğe bağlı olarak kaynağı aynı işlemde pasife alır (yalnızca ADMIN).
//
// Yetki:
//   - AGENT yapamaz.
//   - ADMIN: tüm kayıtları herhangi bir aktif danışmana devreder, deactivate edebilir.
//   - MANAGER: yalnızca KENDİ şubelerindeki (ana + ek yetkili) kayıtları, AGENT'a devreder; deactivate edemez.
//
// Kapsam (ürün kararı): yalnızca Customer.assignedAgentId + Property.assignedAgentId.
// Kayıtların branchId'sine DOKUNULMAZ (yalnızca danışman değişir).

const reassignSchema = z.object({
  targetAgentId: z.string().min(1, "Hedef danışman gerekli"),
  deactivate: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as unknown as Record<string, unknown>;
  const sessionRole = sessionUser.role as string;
  const sessionId = sessionUser.id as string;

  if (sessionRole !== "ADMIN" && sessionRole !== "MANAGER") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = reassignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { targetAgentId } = parsed.data;

    if (targetAgentId === id) {
      return NextResponse.json({ error: "Kayıtlar aynı kullanıcıya devredilemez" }, { status: 400 });
    }

    // deactivate yalnızca ADMIN ve kendi hesabı değilse geçerli.
    const deactivate = !!parsed.data.deactivate && sessionRole === "ADMIN" && id !== sessionId;

    // Kaynak kullanıcı
    const sourceUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, branchId: true },
    });
    if (!sourceUser) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Hedef danışman aktif ve geçerli mi?
    const targetAgent = await prisma.user.findUnique({
      where: { id: targetAgentId },
      select: { id: true, isActive: true, role: true, branchId: true },
    });
    if (!targetAgent || !targetAgent.isActive) {
      return NextResponse.json({ error: "Seçilen danışman geçersiz veya pasif" }, { status: 400 });
    }

    // MANAGER kısıtları: kendi şube(leri) kapsamı + hedef AGENT olmalı + deactivate yok.
    let branchScope: { in: string[] } | undefined;
    if (sessionRole === "MANAGER") {
      const authorizedBranchIds = Array.isArray(sessionUser.authorizedBranchIds)
        ? (sessionUser.authorizedBranchIds as string[])
        : [];
      const managerBranchIds = [sessionUser.branchId as string | null, ...authorizedBranchIds]
        .filter((b): b is string => typeof b === "string" && b.length > 0);

      if (managerBranchIds.length === 0) {
        return NextResponse.json({ error: "Şubeniz tanımlı değil" }, { status: 403 });
      }
      // Hedef danışman müdürün şubesinde ve AGENT olmalı
      if (targetAgent.role !== "AGENT" || !targetAgent.branchId || !managerBranchIds.includes(targetAgent.branchId)) {
        return NextResponse.json({ error: "Yalnızca kendi şubenizdeki bir danışmana devredebilirsiniz" }, { status: 403 });
      }
      branchScope = { in: managerBranchIds };
    }

    // where koşulları — anonimleştirilmiş müşteriler (KVKK unutulma) hariç tutulur.
    const customerWhere: Record<string, unknown> = { assignedAgentId: id, isAnonymized: false };
    const propertyWhere: Record<string, unknown> = { assignedAgentId: id };
    if (branchScope) {
      customerWhere.branchId = branchScope;
      propertyWhere.branchId = branchScope;
    }

    const ops: unknown[] = [
      prisma.customer.updateMany({ where: customerWhere, data: { assignedAgentId: targetAgentId } }),
      prisma.property.updateMany({ where: propertyWhere, data: { assignedAgentId: targetAgentId } }),
    ];
    if (deactivate) {
      ops.push(prisma.user.update({ where: { id }, data: { isActive: false } }));
    }

    const results = await prisma.$transaction(ops as never);
    const customers = (results[0] as { count: number }).count;
    const properties = (results[1] as { count: number }).count;

    await createAuditLog({
      userId: sessionId,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      oldValue: { assignedAgentId: id },
      newValue: { reassignedTo: targetAgentId, customers, properties, deactivated: deactivate },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ customers, properties, deactivated: deactivate });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
