import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { runPropertyMatching } from "@/lib/matching";
import { canEditProperty, canViewProperty, extractActor, loadPropertyForRbac } from "@/lib/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prop = await loadPropertyForRbac(id);
  if (!prop) {
    return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  }
  const actor = extractActor(session);
  if (!canViewProperty(actor, prop)) {
    return NextResponse.json({ error: "Bu ilanı görüntüleme yetkiniz yok" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const includeRejected = searchParams.get("includeRejected") === "true";

  // Refresh matches first (skor güncellenir, manuel status korunur)
  await runPropertyMatching(id);

  const matches = await prisma.propertyMatch.findMany({
    where: {
      propertyId: id,
      ...(includeRejected ? {} : { status: { not: "REJECTED" } }),
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          stage: true,
          urgency: true,
          minBudget: true,
          maxBudget: true,
          customerType: true,
          photoUrl: true,
          assignedAgent: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },     // INTERESTED first (alphabetical: I < S < R)
      { createdAt: "desc" }, // en son eklenen üstte
      { matchScore: "desc" },
    ],
    take: 30,
  });

  return NextResponse.json(matches);
}

// Manuel olarak bir müşteriyi ilana bağla (INTERESTED)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prop = await loadPropertyForRbac(id);
  if (!prop) {
    return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  }
  const actor = extractActor(session);
  if (!canEditProperty(actor, prop)) {
    return NextResponse.json({ error: "Bu ilanı düzenleme yetkiniz yok" }, { status: 403 });
  }

  const { customerId } = await req.json();

  if (!customerId) {
    return NextResponse.json({ error: "customerId gerekli" }, { status: 400 });
  }

  const match = await prisma.propertyMatch.upsert({
    where: { propertyId_customerId: { propertyId: id, customerId } },
    create: { propertyId: id, customerId, status: "INTERESTED" },
    update: { status: "INTERESTED" },
    include: {
      customer: {
        select: {
          id: true, firstName: true, lastName: true, phone: true, email: true,
          stage: true, urgency: true, customerType: true, photoUrl: true,
        },
      },
    },
  });

  return NextResponse.json(match);
}
