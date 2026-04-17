import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      assignedAgent: { select: { name: true } },
      owner: { select: { id: true, firstName: true, lastName: true } },
      branch: { select: { name: true } },
      matches: {
        include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!property) {
    return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(property);
}
