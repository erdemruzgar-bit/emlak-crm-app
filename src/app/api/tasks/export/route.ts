import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { canExportData, extractActor, taskListFilter } from "@/lib/rbac";

const priorityLabels: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek" };
const statusLabels: Record<string, string> = { TODO: "Yapılacak", IN_PROGRESS: "Devam Ediyor", DONE: "Tamamlandı" };

interface TaskRow {
  title: string; description: string | null;
  priority: string; status: string;
  dueDate: Date | null; createdAt: Date;
  user: { name: string } | null;
  assignedBy: { name: string } | null;
}

const columns: ColumnDef<TaskRow>[] = [
  { key: "title", header: "Başlık", width: 30 },
  { key: "status", header: "Durum", width: 14, transform: (v) => statusLabels[String(v)] ?? String(v) },
  { key: "priority", header: "Öncelik", width: 10, transform: (v) => priorityLabels[String(v)] ?? String(v) },
  { key: "user", header: "Atanan Kişi", width: 18, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
  { key: "assignedBy", header: "Atayan", width: 18, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
  { key: "dueDate", header: "Son Tarih", width: 18 },
  { key: "description", header: "Açıklama", width: 40 },
  { key: "createdAt", header: "Oluşturma", width: 18 },
];

export async function GET(_req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportData(actor)) {
    return NextResponse.json({ error: "Excel dışa aktarma yetkiniz yok" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    where: taskListFilter(actor),
    include: {
      user: { select: { name: true } },
      assignedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const buffer = buildExcel<TaskRow>(tasks as unknown as TaskRow[], columns, "Görevler");

  const timestamp = new Date().toISOString().slice(0, 10);
  return excelResponse(buffer, `gorevler-${timestamp}.xlsx`);
}
