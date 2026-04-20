import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor, SessionActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const contractUpdateSchema = z.object({
  contractType: z.enum(["KIRA", "SATIS", "KOMISYON"]).optional(),
  title: z.string().min(2).optional(),
  propertyId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  ownerCustomerId: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  depositAmount: z.number().nonnegative().nullable().optional(),
  commissionRate: z.number().nonnegative().nullable().optional(),
  commissionAmount: z.number().nonnegative().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "RENEWED", "TERMINATED"]).optional(),
  signedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

function canAccessContract(
  actor: SessionActor | null,
  contract: { branchId: string | null; createdById: string }
): boolean {
  if (!actor) return false;
  if (actor.role === "ADMIN") return true;
  if (actor.role === "MANAGER") {
    return !!actor.branchId && actor.branchId === contract.branchId;
  }
  return contract.createdById === actor.id;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = extractActor(session);

  try {
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            district: true,
            listingType: true,
            propertyType: true,
          },
        },
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        ownerCustomer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        createdBy: { select: { id: true, name: true } },
        attachments: {
          include: { uploadedBy: { select: { name: true } } },
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Sözleşme bulunamadı" }, { status: 404 });
    }

    if (!canAccessContract(actor, contract)) {
      return NextResponse.json({ error: "Bu sözleşmeye erişim yetkiniz yok" }, { status: 403 });
    }

    return NextResponse.json(contract);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = extractActor(session);

  try {
    const existing = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, branchId: true, createdById: true, status: true, amount: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sözleşme bulunamadı" }, { status: 404 });
    }

    if (!canAccessContract(actor, existing)) {
      await createAuditLog({
        userId: actor?.id,
        action: "DENIED_EDIT",
        entity: "Contract",
        entityId: id,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });
      return NextResponse.json({ error: "Bu sözleşmeyi düzenleme yetkiniz yok" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = contractUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { startDate, endDate, signedAt, ...rest } = parsed.data;

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate === null ? null : endDate ? new Date(endDate) : undefined,
        signedAt: signedAt === null ? null : signedAt ? new Date(signedAt) : undefined,
      },
      include: {
        property: { select: { id: true, title: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await createAuditLog({
      userId: actor?.id,
      action: "UPDATE",
      entity: "Contract",
      entityId: id,
      oldValue: { status: existing.status, amount: existing.amount },
      newValue: { status: contract.status, amount: contract.amount },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(contract);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const actor = extractActor(session);

  try {
    const existing = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, branchId: true, createdById: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sözleşme bulunamadı" }, { status: 404 });
    }

    if (!canAccessContract(actor, existing)) {
      return NextResponse.json({ error: "Bu sözleşmeyi silme yetkiniz yok" }, { status: 403 });
    }

    await prisma.contract.delete({ where: { id } });

    await createAuditLog({
      userId: actor?.id,
      action: "DELETE",
      entity: "Contract",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ message: "Sözleşme silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
