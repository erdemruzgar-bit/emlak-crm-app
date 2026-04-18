import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { appointmentListFilter, canExportData, extractActor } from "@/lib/rbac";

const typeLabels: Record<string, string> = { GOSTERIM: "Gösterim", TOPLANTI: "Toplantı", DIGER: "Diğer" };
const statusLabels: Record<string, string> = { PLANNED: "Planlandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal" };

interface AppointmentRow {
  title: string; type: string; status: string;
  startDate: Date; endDate: Date;
  location: string | null; notes: string | null;
  user: { name: string } | null;
  customer: { firstName: string; lastName: string } | null;
  property: { title: string } | null;
}

const columns: ColumnDef<AppointmentRow>[] = [
  { key: "startDate", header: "Başlangıç", width: 20 },
  { key: "endDate", header: "Bitiş", width: 20 },
  { key: "title", header: "Başlık", width: 28 },
  { key: "type", header: "Tip", width: 12, transform: (v) => typeLabels[String(v)] ?? String(v) },
  { key: "status", header: "Durum", width: 14, transform: (v) => statusLabels[String(v)] ?? String(v) },
  { key: "customer", header: "Müşteri", width: 22, transform: (v) => {
    const c = v as { firstName?: string; lastName?: string } | null;
    return c ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : "";
  }},
  { key: "property", header: "İlan", width: 30, transform: (v) => (v as { title?: string } | null)?.title ?? "" },
  { key: "user", header: "Danışman", width: 18, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
  { key: "location", header: "Konum", width: 24 },
  { key: "notes", header: "Notlar", width: 32 },
];

export async function GET(_req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportData(actor)) {
    return NextResponse.json({ error: "Excel dışa aktarma yetkiniz yok" }, { status: 403 });
  }

  const appointments = await prisma.appointment.findMany({
    where: appointmentListFilter(actor),
    include: {
      user: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
      property: { select: { title: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const buffer = buildExcel<AppointmentRow>(appointments as unknown as AppointmentRow[], columns, "Randevular");

  const timestamp = new Date().toISOString().slice(0, 10);
  return excelResponse(buffer, `randevular-${timestamp}.xlsx`);
}
