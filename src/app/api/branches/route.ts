import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: { users: true, customers: true, properties: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(branches);
}
