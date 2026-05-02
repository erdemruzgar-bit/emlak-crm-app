import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as Record<string, unknown>;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // Filtreler
  const userId = searchParams.get("userId") || undefined;
  const entity = searchParams.get("entity") || undefined;
  const action = searchParams.get("action") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) {
      // Tarih filtresi için günün sonuna kadar (lte 23:59:59.999)
      const d = new Date(to);
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
    where.timestamp = range;
  }

  const [logs, total, entityFacets, actionFacets] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ["entity"],
      _count: { _all: true },
      orderBy: { _count: { entity: "desc" } },
      take: 10,
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    facets: {
      entities: entityFacets.map((f) => ({ value: f.entity, count: f._count._all })),
      actions: actionFacets.map((f) => ({ value: f.action, count: f._count._all })),
    },
  });
}
