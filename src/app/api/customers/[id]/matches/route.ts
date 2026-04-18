import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { runCustomerMatching } from "@/lib/matching";
import { canEditProperty, extractActor, loadPropertyForRbac } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const includeRejected = searchParams.get("includeRejected") === "true";

  await runCustomerMatching(id);

  const matches = await prisma.propertyMatch.findMany({
    where: {
      customerId: id,
      ...(includeRejected ? {} : { status: { not: "REJECTED" } }),
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          propertyType: true,
          listingType: true,
          city: true,
          district: true,
          area: true,
          rooms: true,
          status: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },     // INTERESTED first
      { createdAt: "desc" }, // en son eklenen üstte
      { matchScore: "desc" },
    ],
    take: 30,
  });

  return NextResponse.json(matches);
}

// Manuel olarak ilanı müşteriye bağla
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { propertyId } = await req.json();

  if (!propertyId) {
    return NextResponse.json({ error: "propertyId gerekli" }, { status: 400 });
  }

  // Manuel bağlama ilanın düzenleme hakkına tabi
  const prop = await loadPropertyForRbac(propertyId);
  if (!prop) {
    return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  }
  const actor = extractActor(session);
  if (!canEditProperty(actor, prop)) {
    return NextResponse.json({ error: "Bu ilanı müşteriye bağlama yetkiniz yok" }, { status: 403 });
  }

  const match = await prisma.propertyMatch.upsert({
    where: { propertyId_customerId: { propertyId, customerId: id } },
    create: { propertyId, customerId: id, status: "INTERESTED" },
    update: { status: "INTERESTED" },
  });

  return NextResponse.json(match);
}
