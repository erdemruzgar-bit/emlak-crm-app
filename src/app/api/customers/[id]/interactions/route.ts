import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { type, summary } = body;

  if (!type || !["CALL", "EMAIL", "VISIT", "WHATSAPP"].includes(type)) {
    return NextResponse.json({ error: "Geçerli bir iletişim tipi gerekli (CALL, EMAIL, VISIT, WHATSAPP)" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });
  }

  const user = session.user as unknown as Record<string, unknown>;

  const interaction = await prisma.customerInteraction.create({
    data: {
      type,
      summary: summary || null,
      customerId: id,
      userId: user.id as string,
      date: new Date(),
    },
    include: { user: { select: { name: true } } },
  });

  await createAuditLog({
    userId: user.id as string,
    action: "CREATE",
    entity: "CustomerInteraction",
    entityId: interaction.id,
    newValue: { customerId: id, type, summary },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(interaction, { status: 201 });
}
