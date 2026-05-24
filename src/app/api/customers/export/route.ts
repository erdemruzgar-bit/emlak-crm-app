import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { canExportData, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

const DEFAULT_TYPE_LABELS: Record<string, string> = { BUYER: "Alıcı", SELLER: "Satıcı", TENANT: "Kiracı", TENANT_CANDIDATE: "Kiracı Adayı", LANDLORD: "Ev Sahibi" };
const stageLabels: Record<string, string> = { LEAD: "Aday", QUALIFIED: "Nitelikli", ACTIVE: "Aktif Takip", SHOWING: "Gösterimde", OFFER: "Teklif Aşaması", CONTRACT: "Sözleşme Aşaması", CLOSED: "Kazanıldı", LOST: "Kaybedildi" };
const urgencyLabels: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" };

interface CustomerRow {
  firstName: string; lastName: string;
  email: string | null; phone: string | null; address: string | null;
  customerType: string; source: string | null;
  stage: string | null; urgency: string | null;
  minBudget: number | null; maxBudget: number | null;
  preferredTypes: string[]; preferredCities: string[]; preferredDistricts: string[];
  minArea: number | null; maxArea: number | null;
  minRooms: string | null; maxRooms: string | null;
  tags: string[]; notesSummary: string | null;
  lastContactDate: Date | null; nextFollowUpDate: Date | null;
  createdAt: Date;
  assignedAgent: { name: string } | null;
  branch: { name: string } | null;
}

function buildColumns(typeLabels: Record<string, string>): ColumnDef<CustomerRow>[] { return [
  { key: "firstName", header: "Ad", width: 16 },
  { key: "lastName", header: "Soyad", width: 16 },
  { key: "customerType", header: "Tip", width: 12, transform: (v) => typeLabels[String(v)] ?? String(v) },
  { key: "stage", header: "Aşama", width: 14, transform: (v) => (v ? stageLabels[String(v)] ?? String(v) : "") },
  { key: "urgency", header: "Aciliyet", width: 10, transform: (v) => (v ? urgencyLabels[String(v)] ?? String(v) : "") },
  { key: "phone", header: "Telefon", width: 18 },
  { key: "email", header: "E-posta", width: 24 },
  { key: "address", header: "Adres", width: 30 },
  { key: "source", header: "Kaynak", width: 14 },
  { key: "minBudget", header: "Min Bütçe", width: 14 },
  { key: "maxBudget", header: "Max Bütçe", width: 14 },
  { key: "preferredTypes", header: "Tercih Tipler", width: 20 },
  { key: "preferredCities", header: "Tercih Şehirler", width: 18 },
  { key: "preferredDistricts", header: "Tercih İlçeler", width: 20 },
  { key: "minArea", header: "Min m²", width: 10 },
  { key: "maxArea", header: "Max m²", width: 10 },
  { key: "minRooms", header: "Min Oda", width: 10 },
  { key: "maxRooms", header: "Max Oda", width: 10 },
  { key: "tags", header: "Etiketler", width: 20 },
  { key: "notesSummary", header: "Özet Not", width: 30 },
  { key: "lastContactDate", header: "Son İletişim", width: 18 },
  { key: "nextFollowUpDate", header: "Sonraki Takip", width: 18 },
  { key: "createdAt", header: "Kayıt Tarihi", width: 18 },
  { key: "assignedAgent", header: "Danışman", width: 18, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
  { key: "branch", header: "Şube", width: 16, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
]; }

export async function GET(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportData(actor)) {
    return NextResponse.json({ error: "Excel dışa aktarma yetkiniz yok" }, { status: 403 });
  }

  const [customers, catalog] = await Promise.all([
    prisma.customer.findMany({
      where: { isAnonymized: false },
      include: {
        assignedAgent: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customerTypeCatalog.findMany(),
  ]);

  const typeLabels: Record<string, string> = {
    ...DEFAULT_TYPE_LABELS,
    ...Object.fromEntries(catalog.map((t) => [t.code, t.label])),
  };

  const buffer = await buildExcel<CustomerRow>(customers as unknown as CustomerRow[], buildColumns(typeLabels), "Müşteriler");

  await createAuditLog({
    userId: actor.id,
    action: "READ",
    entity: "Customer",
    newValue: { exportCount: customers.length },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  return excelResponse(buffer, `musteriler-${timestamp}.xlsx`);
}
