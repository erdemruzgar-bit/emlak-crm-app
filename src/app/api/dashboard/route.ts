import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const propertyTypeLabels: Record<string, string> = {
  DAIRE: "Daire",
  VILLA: "Villa",
  ARSA: "Arsa",
  ISYERI: "İşyeri",
  MUSTAKILEV: "Müstakil Ev",
};

const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as Record<string, unknown>;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // RBAC filtering
  const branchFilter: Record<string, unknown> = {};
  const agentFilter: Record<string, unknown> = {};
  if (user.role === "AGENT") {
    agentFilter.assignedAgentId = user.id;
    branchFilter.assignedAgentId = user.id;
  } else if (user.role === "MANAGER") {
    agentFilter.branchId = user.branchId;
    branchFilter.branchId = user.branchId;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const appointmentFilter = user.role === "AGENT" ? { userId: user.id as string } : {};

  const [
    totalCustomers,
    activeProperties,
    monthSoldProperties,
    pendingAppointments,
    propertyTypeGroups,
    recentAuditLogs,
    overdueFollowUps,
    todayAppointments,
  ] = await Promise.all([
    prisma.customer.count({ where: { isAnonymized: false, ...agentFilter } }),
    prisma.property.count({ where: { status: "ACTIVE", ...branchFilter } }),
    prisma.property.count({
      where: { status: { in: ["SOLD", "RENTED"] }, updatedAt: { gte: monthStart, lte: monthEnd }, ...branchFilter },
    }),
    prisma.appointment.count({
      where: { status: "PLANNED", startDate: { gte: now }, ...appointmentFilter },
    }),
    prisma.property.groupBy({ by: ["propertyType"], _count: { id: true }, where: branchFilter }),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    prisma.customer.findMany({
      where: {
        isAnonymized: false,
        nextFollowUpDate: { lte: now },
        stage: { notIn: ["CLOSED", "LOST"] },
        ...agentFilter,
      },
      select: { id: true, firstName: true, lastName: true, phone: true, nextFollowUpDate: true, stage: true, urgency: true },
      orderBy: { nextFollowUpDate: "asc" },
      take: 10,
    }),
    prisma.appointment.findMany({
      where: { startDate: { gte: todayStart, lte: todayEnd }, status: "PLANNED", ...appointmentFilter },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, title: true } },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  // Monthly property status changes (last 6 months)
  const monthlySales = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const count = await prisma.property.count({
      where: {
        status: { in: ["SOLD", "RENTED"] },
        updatedAt: { gte: mStart, lte: mEnd },
        ...branchFilter,
      },
    });
    monthlySales.push({ month: monthNames[mStart.getMonth()], count });
  }

  // Property type distribution
  const propertyTypeDistribution = propertyTypeGroups.map((g) => ({
    name: propertyTypeLabels[g.propertyType] || g.propertyType,
    value: g._count.id,
  }));

  // Recent activities from audit logs
  const actionLabels: Record<string, string> = {
    CREATE: "oluşturuldu",
    UPDATE: "güncellendi",
    DELETE: "silindi",
  };
  const entityLabels: Record<string, string> = {
    Customer: "Müşteri",
    Property: "İlan",
    Appointment: "Randevu",
  };
  const entityTypes: Record<string, string> = {
    Customer: "customer",
    Property: "property",
    Appointment: "appointment",
  };

  const recentActivities = recentAuditLogs
    .filter((log) => log.action !== "READ")
    .slice(0, 5)
    .map((log) => {
      const entity = entityLabels[log.entity] || log.entity;
      const action = actionLabels[log.action] || log.action;
      const userName = log.user?.name || "Sistem";
      const timeDiff = now.getTime() - new Date(log.timestamp).getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const date = hours < 1 ? "Az önce" : hours < 24 ? `${hours} saat önce` : `${Math.floor(hours / 24)} gün önce`;

      return {
        id: log.id,
        type: entityTypes[log.entity] || "property",
        description: `${entity} ${action} — ${userName}`,
        date,
      };
    });

  return NextResponse.json({
    totalCustomers,
    activeProperties,
    monthSales: monthSoldProperties,
    pendingAppointments,
    monthlySales,
    propertyTypeDistribution,
    recentActivities,
    overdueFollowUps,
    todayAppointments,
  });
}
