// Proje bazlı Excel export — kullanıcının import'ladığı 13-kolonlu formatla
// uyumlu, geri alınabilir hâlde tüm daire+sahip bilgileri.
//
// AGENT için hassas alanlar (telefon, e-posta) maskelenir. KVKK güvenliği:
// AGENT export edilen Excel'de kendi eklemediği müşterilerin telefonunu
// görmemeli. canExport zaten ayrı bir izin.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canExportData, extractActor } from "@/lib/rbac";
import { applyAccessMask } from "@/lib/access-control";
import { buildExcel, excelResponse, type ColumnDef } from "@/lib/excel";
import { formatTrPhoneDisplay } from "@/lib/phone";

interface ExportRow {
  Blok: string;
  Daire: string;
  M2: string;
  KAT: string;
  MANZARA: string;
  MUTFAK: string;
  "ODA SAYISI": string;
  "Malik / Kiracı": string;
  "Adı Soyadı": string;
  "E-Posta": string;
  Telefon: string;
  DURUM: string;
  "GÖRÜŞME NOTU": string;
}

const customerTypeLabel: Record<string, string> = {
  LANDLORD: "Kat Maliki",
  TENANT: "Kiracı",
  BUYER: "Alıcı",
  SELLER: "Satıcı",
  TENANT_CANDIDATE: "Kiracı Adayı",
};

const occupancyLabel: Record<string, string> = {
  SAHIBI_OTURUYOR: "Kendisi Oturuyor",
  KIRACILI: "Kiracılı",
  BOS: "Boş",
  KAPORA_ALINDI: "Kapora Alındı",
  SOZLESME_ALINDI: "Sözleşme Alındı",
  ARSIV: "Arşiv",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportData(actor)) {
    return NextResponse.json({ error: "Excel dışa aktarma yetkiniz yok" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });

  // AGENT için şube izolasyonu
  const branchClause: Record<string, unknown> | undefined =
    actor.role === "AGENT"
      ? actor.branchIds.length
        ? { branchId: { in: actor.branchIds } }
        : { branchId: "__no_branch__" }
      : undefined;

  const properties = await prisma.property.findMany({
    where: { projectId, ...(branchClause ?? {}) },
    select: {
      id: true,
      unitNumber: true,
      area: true,
      floor: true,
      rooms: true,
      viewType: true,
      kitchenType: true,
      hasBalcony: true,
      occupancyStatus: true,
      operationalNote: true,
      block: { select: { name: true } },
      owner: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          altPhone: true,
          email: true,
          tcKimlikNo: true,
          customerType: true,
          createdById: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { kind: true, content: true, createdAt: true },
      },
    },
    orderBy: [{ block: { name: "asc" } }, { unitNumber: "asc" }],
  });

  const rows: ExportRow[] = properties.map((p) => {
    let ownerName = "";
    let ownerPhone = "";
    let ownerAltPhone = "";
    let ownerEmail = "";
    let customerType = "";

    if (p.owner) {
      ownerName = `${p.owner.firstName} ${p.owner.lastName}`.trim();
      const masked = applyAccessMask(p.owner, actor);
      // AGENT için: gated ise null, gated değilse açık
      ownerPhone = masked.phone ? formatTrPhoneDisplay(masked.phone) : (masked.sensitiveGated ? "(maskeli)" : "");
      ownerAltPhone = !masked.sensitiveGated && p.owner.altPhone ? formatTrPhoneDisplay(p.owner.altPhone) : "";
      ownerEmail = masked.email ?? (masked.sensitiveGated ? "(maskeli)" : "");
      customerType = customerTypeLabel[p.owner.customerType] ?? p.owner.customerType;
    }

    const telCell = ownerAltPhone
      ? `Cep: ${ownerPhone} / Diğer: ${ownerAltPhone}`
      : ownerPhone
      ? `Cep: ${ownerPhone}`
      : "";

    const oda = p.rooms ? (p.hasBalcony ? `${p.rooms} ( TERASLI )` : p.rooms) : "";

    const durumLabel = p.occupancyStatus
      ? occupancyLabel[p.occupancyStatus] ?? p.occupancyStatus
      : "";
    const durumCell = [durumLabel, p.operationalNote].filter(Boolean).join(" · ");

    const callLog = p.notes.length
      ? p.notes
          .map((n) => `[${new Date(n.createdAt).toLocaleDateString("tr-TR")}] ${n.content}`)
          .join("\n---\n")
      : "";

    return {
      Blok: p.block?.name ?? "",
      Daire: p.unitNumber ?? "",
      M2: p.area != null ? String(p.area) : "",
      KAT: p.floor != null ? String(p.floor) : "",
      MANZARA: p.viewType ?? "",
      MUTFAK: p.kitchenType ?? "",
      "ODA SAYISI": oda,
      "Malik / Kiracı": customerType,
      "Adı Soyadı": ownerName,
      "E-Posta": ownerEmail,
      Telefon: telCell,
      DURUM: durumCell,
      "GÖRÜŞME NOTU": callLog,
    };
  });

  const columns: ColumnDef<ExportRow>[] = [
    { key: "Blok", header: "Blok", width: 14 },
    { key: "Daire", header: "Daire", width: 8 },
    { key: "M2", header: "M2", width: 8 },
    { key: "KAT", header: "KAT", width: 8 },
    { key: "MANZARA", header: "MANZARA", width: 14 },
    { key: "MUTFAK", header: "MUTFAK", width: 10 },
    { key: "ODA SAYISI", header: "ODA SAYISI", width: 18 },
    { key: "Malik / Kiracı", header: "Malik / Kiracı", width: 16 },
    { key: "Adı Soyadı", header: "Adı Soyadı", width: 24 },
    { key: "E-Posta", header: "E-Posta", width: 28 },
    { key: "Telefon", header: "Telefon", width: 32 },
    { key: "DURUM", header: "DURUM", width: 32 },
    { key: "GÖRÜŞME NOTU", header: "GÖRÜŞME NOTU", width: 80 },
  ];

  const buf = buildExcel(rows, columns, "Daireler");
  const filename = `proje-${project.name.replace(/[^a-zA-Z0-9-_]/g, "_")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return excelResponse(buf, filename) as unknown as Response;
}
