import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as Record<string, unknown>;
  const now = new Date();

  const authorizedBranchIds = Array.isArray(user.authorizedBranchIds) ? (user.authorizedBranchIds as string[]) : [];
  const managerBranchIds =
    user.role === "MANAGER"
      ? [user.branchId as string | null, ...authorizedBranchIds].filter((b): b is string => typeof b === "string" && b.length > 0)
      : [];
  const managerBranchClause = managerBranchIds.length > 0 ? { in: managerBranchIds } : "__no_branch__";

  // Property tabanlı sayım için (adet) — eski davranışla uyumlu
  const branchFilter: Record<string, unknown> = {};
  if (user.role === "MANAGER") branchFilter.branchId = managerBranchClause;
  else if (user.role === "AGENT") branchFilter.assignedAgentId = user.id;

  // Contract tabanlı ciro hesabı için ayrı filtre
  // (Contract.assignedAgentId yok; AGENT için createdById ile filtrelenir)
  const contractBranchFilter: Record<string, unknown> = {};
  if (user.role === "MANAGER") contractBranchFilter.branchId = managerBranchClause;
  else if (user.role === "AGENT") contractBranchFilter.createdById = user.id;

  try {
    // Aylık satış/kira (son 6 ay) — ADET (Property.status) + CİRO (Contract.amount)
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [satis, kira, satisCiroAgg, kiraCiroAgg] = await Promise.all([
        prisma.property.count({ where: { status: "SOLD", updatedAt: { gte: mStart, lte: mEnd }, ...branchFilter } }),
        prisma.property.count({ where: { status: "RENTED", updatedAt: { gte: mStart, lte: mEnd }, ...branchFilter } }),
        prisma.contract.aggregate({
          _sum: { amount: true },
          where: {
            contractType: "SATIS",
            status: { in: ["ACTIVE", "RENEWED", "EXPIRED"] },
            startDate: { gte: mStart, lte: mEnd },
            ...contractBranchFilter,
          },
        }),
        prisma.contract.aggregate({
          _sum: { amount: true },
          where: {
            contractType: "KIRA",
            status: { in: ["ACTIVE", "RENEWED", "EXPIRED"] },
            startDate: { gte: mStart, lte: mEnd },
            ...contractBranchFilter,
          },
        }),
      ]);

      monthlySales.push({
        month: monthNames[mStart.getMonth()],
        satis,
        kira,
        satisCiro: satisCiroAgg._sum.amount ?? 0,
        kiraCiro: kiraCiroAgg._sum.amount ?? 0,
      });
    }

    // Danışman performansı — adet + ciro
    const agents = await prisma.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER"] }, isActive: true, ...(user.role === "MANAGER" ? { branchId: managerBranchClause } : {}) },
      select: { id: true, name: true },
    });

    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        const [sales, customers, revenueAgg] = await Promise.all([
          prisma.property.count({ where: { assignedAgentId: agent.id, status: { in: ["SOLD", "RENTED"] } } }),
          prisma.customer.count({ where: { assignedAgentId: agent.id, isAnonymized: false } }),
          prisma.contract.aggregate({
            _sum: { amount: true },
            where: {
              createdById: agent.id,
              status: { in: ["ACTIVE", "RENEWED", "EXPIRED"] },
              contractType: { in: ["KIRA", "SATIS"] },
            },
          }),
        ]);
        return {
          name: agent.name,
          sales,
          customers,
          revenue: revenueAgg._sum.amount ?? 0,
        };
      })
    );

    // Şube karşılaştırma — adet + ciro
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true },
    });

    const branchComparison = await Promise.all(
      branches.map(async (b) => {
        const [count, revenueAgg] = await Promise.all([
          prisma.property.count({
            where: { branchId: b.id, status: { in: ["SOLD", "RENTED"] } },
          }),
          prisma.contract.aggregate({
            _sum: { amount: true },
            where: {
              branchId: b.id,
              status: { in: ["ACTIVE", "RENEWED", "EXPIRED"] },
              contractType: { in: ["KIRA", "SATIS"] },
            },
          }),
        ]);
        return {
          name: b.name,
          value: count,
          revenue: revenueAgg._sum.amount ?? 0,
        };
      })
    );

    // KVKK istatistikleri
    const [totalConsents, acikRiza, pazarlama, pendingDeletion, auditLogsToday] = await Promise.all([
      prisma.customerConsent.count({ where: { isGranted: true } }),
      prisma.customerConsent.count({ where: { consentType: "ACIK_RIZA", isGranted: true } }),
      prisma.customerConsent.count({ where: { consentType: "PAZARLAMA", isGranted: true } }),
      prisma.customer.count({ where: { isAnonymized: false, nextFollowUpDate: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } } }),
      prisma.auditLog.count({ where: { timestamp: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
    ]);

    return NextResponse.json({
      monthlySales,
      agentPerformance,
      branchComparison,
      kvkkStats: { totalConsents, acikRiza, pazarlama, pendingDeletion, auditLogsToday },
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
