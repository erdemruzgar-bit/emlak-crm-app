import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

// Komisyon politikası API'si.
// - GET   /api/commission-policy            -> şirket geneli (branchId NULL)
// - GET   /api/commission-policy?branchId=X -> X'in efektif politikası (override yoksa şirket geneli döner)
// - GET   /api/commission-policy?all=1      -> tüm politikalar (ADMIN)
// - PUT   /api/commission-policy            -> şirket geneli güncelle (ADMIN)
// - PUT   /api/commission-policy?branchId=X -> şube override güncelle (ADMIN veya o şubenin MANAGER'ı)

const policySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  salesBuyerRate: z.number().min(0).max(100).optional(),
  salesSellerRate: z.number().min(0).max(100).optional(),
  rentTenantRate: z.number().min(0).max(1000).optional(),
  rentLandlordRate: z.number().min(0).max(1000).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  vatIncludedDefault: z.boolean().optional(),
  cobrokerOwnShare: z.number().min(0).max(100).optional(),
  agentShareOfOwnOffice: z.number().min(0).max(100).optional(),
  buyerSideAgentShare: z.number().min(0).max(100).optional(),
  payoutTemplate: z.enum(["CLASSIC", "COBROKER", "DOUBLE_AGENT", "COBROKER_DOUBLE"]).optional(),
});

async function getOrCreateGlobal() {
  const existing = await prisma.commissionPolicy.findFirst({ where: { branchId: null } });
  if (existing) return existing;
  return prisma.commissionPolicy.create({
    data: { name: "Şirket Geneli" },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = extractActor(session);

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const all = searchParams.get("all");

  if (all === "1") {
    if (actor?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    }
    const policies = await prisma.commissionPolicy.findMany({
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branchId: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(policies);
  }

  const global = await getOrCreateGlobal();

  if (branchId) {
    const branchPolicy = await prisma.commissionPolicy.findUnique({ where: { branchId } });
    return NextResponse.json({
      effective: branchPolicy ?? global,
      override: branchPolicy ?? null,
      global,
    });
  }

  return NextResponse.json(global);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  if (!branchId && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Yalnızca ADMIN şirket genelini değiştirebilir" }, { status: 403 });
  }
  if (branchId && actor.role === "MANAGER" && !actor.branchIds.includes(branchId)) {
    return NextResponse.json({ error: "Yalnızca yetkili olduğunuz şubelerin politikasını güncelleyebilirsiniz" }, { status: 403 });
  }
  if (branchId && actor.role === "AGENT") {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) return NextResponse.json({ error: "Şube bulunamadı" }, { status: 404 });

      const policy = await prisma.commissionPolicy.upsert({
        where: { branchId },
        create: { branchId, ...parsed.data },
        update: parsed.data,
      });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        entity: "CommissionPolicy",
        entityId: policy.id,
        newValue: { branchId, ...parsed.data },
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });
      return NextResponse.json(policy);
    }

    const global = await getOrCreateGlobal();
    const updated = await prisma.commissionPolicy.update({
      where: { id: global.id },
      data: parsed.data,
    });
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "CommissionPolicy",
      entityId: updated.id,
      newValue: { scope: "global", ...parsed.data },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/commission-policy?branchId=X — şube override'ını siler
// (şirket genelini silemez)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  if (!branchId) {
    return NextResponse.json({ error: "Şirket geneli silinemez" }, { status: 400 });
  }
  if (actor.role !== "ADMIN" && !(actor.role === "MANAGER" && actor.branchIds.includes(branchId))) {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  await prisma.commissionPolicy.deleteMany({ where: { branchId } });
  await createAuditLog({
    userId: actor.id,
    action: "DELETE",
    entity: "CommissionPolicy",
    entityId: branchId,
    oldValue: { branchId },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });
  return NextResponse.json({ message: "Şube politikası silindi (şirket genelini kullanır)" });
}
