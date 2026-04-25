import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { canExportData, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

const DEFAULT_LISTING_LABELS: Record<string, string> = { SATILIK: "Satılık", KIRALIK: "Kiralık", ARSIV: "Arşiv" };
const propertyTypeLabels: Record<string, string> = { DAIRE: "Daire", VILLA: "Villa", ARSA: "Arsa", ISYERI: "İşyeri", MUSTAKILEV: "Müstakil Ev" };
const statusLabels: Record<string, string> = { ACTIVE: "Aktif", SOLD: "Satıldı", RENTED: "Kiralandı", INACTIVE: "Pasif" };

interface PropertyRow {
  title: string;
  listingType: string; propertyType: string; status: string;
  price: number; currency: string;
  area: number | null; rooms: string | null; bathrooms: number | null;
  floor: number | null; totalFloors: number | null; age: number | null;
  heating: string | null;
  city: string | null; district: string | null; neighborhood: string | null;
  address: string | null; description: string | null;
  createdAt: Date;
  owner: { firstName: string; lastName: string } | null;
  assignedAgent: { name: string } | null;
  branch: { name: string } | null;
}

function buildColumns(listingLabels: Record<string, string>): ColumnDef<PropertyRow>[] { return [
  { key: "title", header: "Başlık", width: 32 },
  { key: "listingType", header: "Tip", width: 10, transform: (v) => listingLabels[String(v)] ?? String(v) },
  { key: "propertyType", header: "Emlak Tipi", width: 12, transform: (v) => propertyTypeLabels[String(v)] ?? String(v) },
  { key: "status", header: "Durum", width: 10, transform: (v) => statusLabels[String(v)] ?? String(v) },
  { key: "price", header: "Fiyat", width: 14 },
  { key: "currency", header: "Para Birimi", width: 10 },
  { key: "area", header: "m²", width: 8 },
  { key: "rooms", header: "Oda", width: 8 },
  { key: "bathrooms", header: "Banyo", width: 8 },
  { key: "floor", header: "Kat", width: 8 },
  { key: "totalFloors", header: "Toplam Kat", width: 10 },
  { key: "age", header: "Bina Yaşı", width: 10 },
  { key: "heating", header: "Isıtma", width: 12 },
  { key: "city", header: "Şehir", width: 14 },
  { key: "district", header: "İlçe", width: 14 },
  { key: "neighborhood", header: "Mahalle", width: 16 },
  { key: "address", header: "Adres", width: 28 },
  { key: "owner", header: "İlan Sahibi", width: 20, transform: (v) => {
    const o = v as { firstName?: string; lastName?: string } | null;
    return o ? `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() : "";
  }},
  { key: "assignedAgent", header: "Danışman", width: 18, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
  { key: "branch", header: "Şube", width: 16, transform: (v) => (v as { name?: string } | null)?.name ?? "" },
  { key: "description", header: "Açıklama", width: 40 },
  { key: "createdAt", header: "Kayıt Tarihi", width: 18 },
]; }

export async function GET(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportData(actor)) {
    return NextResponse.json({ error: "Excel dışa aktarma yetkiniz yok" }, { status: 403 });
  }

  const [properties, listingCatalog] = await Promise.all([
    prisma.property.findMany({
      include: {
        owner: { select: { firstName: true, lastName: true } },
        assignedAgent: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listingTypeCatalog.findMany(),
  ]);

  const listingLabels: Record<string, string> = {
    ...DEFAULT_LISTING_LABELS,
    ...Object.fromEntries(listingCatalog.map((t) => [t.code, t.label])),
  };

  const buffer = buildExcel<PropertyRow>(properties as unknown as PropertyRow[], buildColumns(listingLabels), "Portföy");

  await createAuditLog({
    userId: actor.id,
    action: "READ",
    entity: "Property",
    newValue: { exportCount: properties.length },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  return excelResponse(buffer, `portfoy-${timestamp}.xlsx`);
}
