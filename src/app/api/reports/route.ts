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

  const branchFilter: Record<string, unknown> = {};
  if (user.role === "MANAGER") branchFilter.branchId = user.branchId;
  else if (user.role === "AGENT") branchFilter.assignedAgentId = user.id;

  try {
    // Monthly sales/rentals (last 6 months)
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const [satis, kira] = await Promise.all([
        prisma.property.count({ where: { status: "SOLD", updatedAt: { gte: mStart, lte: mEnd }, ...branchFilter } }),
        prisma.property.count({ where: { status: "RENTED", updatedAt: { gte: mStart, lte: mEnd }, ...branchFilter } }),
      ]);
      monthlySales.push({ month: monthNames[mStart.getMonth()], satis, kira });
    }

    // Agent performance
    const agents = await prisma.user.findMany({
      where: { role: { in: ["AGENT", "MANAGER"] }, isActive: true, ...(user.role === "MANAGER" ? { branchId: user.branchId as string } : {}) },
      select: { id: true, name: true },
    });

    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        const [sales, customers] = await Promise.all([
          prisma.property.count({ where: { assignedAgentId: agent.id, status: { in: ["SOLD", "RENTED"] } } }),
          prisma.customer.count({ where: { assignedAgentId: agent.id, isAnonymized: false } }),
        ]);
        return { name: agent.name, sales, customers };
      })
    );

    // Branch comparison
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true },
    });

    const branchComparison = await Promise.all(
      branches.map(async (b) => {
        const value = await prisma.property.count({
          where: { branchId: b.id, status: { in: ["SOLD", "RENTED"] } },
        });
        return { name: b.name, value };
      })
    );

    // KVKK stats
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
