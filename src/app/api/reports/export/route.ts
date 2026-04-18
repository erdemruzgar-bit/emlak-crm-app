import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { canExportData, extractActor } from "@/lib/rbac";
import * as XLSX from "xlsx";

const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

interface MonthlyRow { month: string; satis: number; kira: number }
interface AgentRow { name: string; sales: number; customers: number }
interface BranchRow { name: string; value: number }
interface KvkkRow { metric: string; count: number }

export async function GET(_req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportData(actor)) {
    return NextResponse.json({ error: "Excel dışa aktarma yetkiniz yok" }, { status: 403 });
  }

  const now = new Date();
  const branchFilter: Record<string, unknown> = {};
  if (actor.role === "MANAGER") branchFilter.branchId = actor.branchId;
  else if (actor.role === "AGENT") branchFilter.assignedAgentId = actor.id;

  // Monthly
  const monthlySales: MonthlyRow[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const [satis, kira] = await Promise.all([
      prisma.property.count({ where: { status: "SOLD", updatedAt: { gte: mStart, lte: mEnd }, ...branchFilter } }),
      prisma.property.count({ where: { status: "RENTED", updatedAt: { gte: mStart, lte: mEnd }, ...branchFilter } }),
    ]);
    monthlySales.push({ month: `${monthNames[mStart.getMonth()]} ${mStart.getFullYear()}`, satis, kira });
  }

  // Agents
  const agents = await prisma.user.findMany({
    where: { role: { in: ["AGENT", "MANAGER"] }, isActive: true, ...(actor.role === "MANAGER" ? { branchId: actor.branchId ?? "__none__" } : {}) },
    select: { id: true, name: true },
  });
  const agentPerformance: AgentRow[] = await Promise.all(agents.map(async (agent) => {
    const [sales, customers] = await Promise.all([
      prisma.property.count({ where: { assignedAgentId: agent.id, status: { in: ["SOLD", "RENTED"] } } }),
      prisma.customer.count({ where: { assignedAgentId: agent.id, isAnonymized: false } }),
    ]);
    return { name: agent.name, sales, customers };
  }));

  // Branches
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const branchComparison: BranchRow[] = await Promise.all(branches.map(async (b) => {
    const value = await prisma.property.count({ where: { branchId: b.id, status: { in: ["SOLD", "RENTED"] } } });
    return { name: b.name, value };
  }));

  // KVKK
  const [totalConsents, acikRiza, pazarlama, pendingDeletion, auditLogsToday] = await Promise.all([
    prisma.customerConsent.count({ where: { isGranted: true } }),
    prisma.customerConsent.count({ where: { consentType: "ACIK_RIZA", isGranted: true } }),
    prisma.customerConsent.count({ where: { consentType: "PAZARLAMA", isGranted: true } }),
    prisma.customer.count({ where: { isAnonymized: false, nextFollowUpDate: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } } }),
    prisma.auditLog.count({ where: { timestamp: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
  ]);
  const kvkkRows: KvkkRow[] = [
    { metric: "Toplam Onaylı Rıza", count: totalConsents },
    { metric: "Açık Rıza", count: acikRiza },
    { metric: "Pazarlama İzni", count: pazarlama },
    { metric: "90+ Gün Takipsiz Müşteri", count: pendingDeletion },
    { metric: "Bugünkü Audit Kayıt", count: auditLogsToday },
  ];

  // Multi-sheet workbook
  const monthlyCols: ColumnDef<MonthlyRow>[] = [
    { key: "month", header: "Ay", width: 14 },
    { key: "satis", header: "Satış", width: 10 },
    { key: "kira", header: "Kira", width: 10 },
  ];
  const agentCols: ColumnDef<AgentRow>[] = [
    { key: "name", header: "Danışman", width: 24 },
    { key: "sales", header: "Kapanan İşlem", width: 14 },
    { key: "customers", header: "Müşteri Sayısı", width: 14 },
  ];
  const branchCols: ColumnDef<BranchRow>[] = [
    { key: "name", header: "Şube", width: 20 },
    { key: "value", header: "Kapanan İşlem", width: 14 },
  ];
  const kvkkCols: ColumnDef<KvkkRow>[] = [
    { key: "metric", header: "Metrik", width: 30 },
    { key: "count", header: "Değer", width: 10 },
  ];

  // Build multi-sheet manually to preserve filename
  const wb = XLSX.utils.book_new();
  const addSheet = <T,>(rows: T[], cols: ColumnDef<T>[], name: string) => {
    const headers = cols.map((c) => c.header);
    const data = rows.map((row) =>
      cols.map((c) => {
        const raw = (row as Record<string, unknown>)[c.key as string];
        if (c.transform) return c.transform(raw, row);
        if (raw == null) return "";
        if (raw instanceof Date) return raw.toLocaleString("tr-TR");
        return raw as string | number;
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = cols.map((c) => ({ wch: c.width ?? 18 }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet(monthlySales, monthlyCols, "Aylık Satış-Kira");
  addSheet(agentPerformance, agentCols, "Danışman Performansı");
  addSheet(branchComparison, branchCols, "Şube Karşılaştırma");
  addSheet(kvkkRows, kvkkCols, "KVKK Metrikleri");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  void buildExcel; // referansı koru (lint susutma)

  const timestamp = new Date().toISOString().slice(0, 10);
  return excelResponse(buf, `rapor-${timestamp}.xlsx`);
}
