import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { applyContractEffects } from "@/lib/contract-effects";
import { z } from "zod/v4";

const contractCreateSchema = z.object({
  contractType: z.enum(["KIRA", "SATIS", "KOMISYON"]),
  title: z.string().min(2, "Başlık en az 2 karakter olmalı"),
  propertyId: z.string().optional(),
  customerId: z.string().optional(),
  ownerCustomerId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().default("TRY"),
  depositAmount: z.number().nonnegative().optional(),
  commissionRate: z.number().nonnegative().optional(),
  commissionAmount: z.number().nonnegative().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "RENEWED", "TERMINATED"]).default("DRAFT"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = extractActor(session);
  const { searchParams } = new URL(req.url);
  const contractType = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const propertyId = searchParams.get("propertyId") || "";
  const customerId = searchParams.get("customerId") || "";

  const where: Record<string, unknown> = {};

  // Şube izolasyonu: ADMIN hepsini; diğerleri kendi şubesinin kontratları
  if (actor && actor.role !== "ADMIN") {
    where.branchId = actor.branchId ?? "__no_branch__";
  }

  if (contractType) where.contractType = contractType;
  if (status) where.status = status;
  if (propertyId) where.propertyId = propertyId;
  if (customerId) where.customerId = customerId;

  try {
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        property: { select: { id: true, title: true, address: true, city: true, district: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        ownerCustomer: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { name: true } },
        _count: { select: { attachments: true } },
      },
      orderBy: [{ status: "asc" }, { endDate: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(contracts);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = extractActor(session);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = contractCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { startDate, endDate, ...rest } = parsed.data;

    const contract = await prisma.contract.create({
      data: {
        ...rest,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        createdById: actor.id,
        branchId: actor.branchId ?? undefined,
      },
      include: {
        property: { select: { id: true, title: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      entity: "Contract",
      entityId: contract.id,
      newValue: { contractType: contract.contractType, amount: contract.amount },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    // Doğrudan ACTIVE olarak yaratıldıysa (DRAFT atlanmış) ilişkili
    // mülk/müşteriyi kira/satış durumuna geçir.
    await applyContractEffects(contract.id, null);

    return NextResponse.json(contract, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
