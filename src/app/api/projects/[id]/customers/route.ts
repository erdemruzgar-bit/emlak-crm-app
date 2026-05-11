import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects/:id/customers — Bu projeyle ilgilenen müşterileri listele
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, code: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const where = {
    isAnonymized: false,
    interestedProjects: { some: { projectId: id } },
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        assignedAgent: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        interestedProjects: {
          where: { projectId: id },
          select: { createdAt: true, note: true, addedBy: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    project,
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
