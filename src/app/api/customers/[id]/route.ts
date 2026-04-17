import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { customerUpdateSchema } from "@/lib/validations/customer";

// GET /api/customers/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      assignedAgent: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      consents: { orderBy: { createdAt: "desc" } },
      notes: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      interactions: {
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      },
      propertyMatches: {
        include: { property: { select: { id: true, title: true, price: true, listingType: true } } },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  // Decrypt TC Kimlik No for display
  const decryptedCustomer = {
    ...customer,
    tcKimlikNo: customer.tcKimlikNo ? decrypt(customer.tcKimlikNo) : null,
  };

  await createAuditLog({
    userId: (session.user as unknown as Record<string, unknown>).id as string,
    action: "READ",
    entity: "Customer",
    entityId: id,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(decryptedCustomer);
}

// PUT /api/customers/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = customerUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const oldCustomer = await prisma.customer.findUnique({ where: { id } });
  if (!oldCustomer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.desiredMoveDate) updateData.desiredMoveDate = new Date(updateData.desiredMoveDate as string);
  if (updateData.nextFollowUpDate) updateData.nextFollowUpDate = new Date(updateData.nextFollowUpDate as string);
  if (updateData.lastContactDate) updateData.lastContactDate = new Date(updateData.lastContactDate as string);

  const customer = await prisma.customer.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId: (session.user as unknown as Record<string, unknown>).id as string,
    action: "UPDATE",
    entity: "Customer",
    entityId: id,
    oldValue: { firstName: oldCustomer.firstName, lastName: oldCustomer.lastName },
    newValue: { firstName: customer.firstName, lastName: customer.lastName },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(customer);
}

// DELETE /api/customers/:id — KVKK: Anonymize instead of hard delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as Record<string, unknown>;
  if (user.role === "AGENT") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { id } = await params;

  // KVKK: Anonymize data instead of deleting
  await prisma.customer.update({
    where: { id },
    data: {
      firstName: "Anonim",
      lastName: "Kullanıcı",
      email: null,
      phone: null,
      tcKimlikNo: null,
      address: null,
      isAnonymized: true,
    },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "DELETE",
    entity: "Customer",
    entityId: id,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ message: "Müşteri verileri anonimleştirildi (KVKK)" });
}
