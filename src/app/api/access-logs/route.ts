import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";

// GET /api/access-logs
// Yönetici (ADMIN/MANAGER) raporu. Filtreler:
//   userId, customerId, status, reasonCategory, from, to
// Sayfalama: page, pageSize (varsayılan 50)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || undefined;
  const customerId = url.searchParams.get("customerId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const reasonCategory = url.searchParams.get("reasonCategory") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10)));

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (reasonCategory) where.reasonCategory = reasonCategory;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.startedAt = range;
  }

  // MANAGER yalnızca kendi şubesindeki kullanıcıların kayıtlarını görür
  if (actor.role === "MANAGER") {
    where.user = { branchId: actor.branchId ?? "__no_branch__" };
  }

  const [items, total, summary] = await Promise.all([
    prisma.customerAccessSession.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true, branch: { select: { name: true } } } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        exitNote: { select: { id: true, content: true, createdAt: true } },
      },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customerAccessSession.count({ where }),
    prisma.customerAccessSession.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    summary: Object.fromEntries(summary.map((s) => [s.status, s._count._all])),
  });
}
