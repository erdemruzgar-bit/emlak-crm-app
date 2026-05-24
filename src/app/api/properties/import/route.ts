import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseExcel } from "@/lib/excel";
import { canImportData, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { runPropertyMatching } from "@/lib/matching";

const DEFAULT_LISTING_REV: Record<string, string> = { "Satılık": "SATILIK", "Kiralık": "KIRALIK", "Arşiv": "ARSIV" };
const propertyTypeRev: Record<string, string> = { "Daire": "DAIRE", "Villa": "VILLA", "Arsa": "ARSA", "İşyeri": "ISYERI", "Müstakil Ev": "MUSTAKILEV" };
const statusRev: Record<string, string> = { "Aktif": "ACTIVE", "Satıldı": "SOLD", "Kiralandı": "RENTED", "Pasif": "INACTIVE" };

interface ImportRow {
  index: number;
  data: Record<string, unknown>;
  valid: boolean;
  errors: string[];
  action: "create" | "update" | "skip";
  existingId?: string;
}

function pickNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function pickInt(v: unknown): number | null {
  const n = pickNumber(v);
  return n == null ? null : Math.round(n);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canImportData(actor)) {
    return NextResponse.json({ error: "Excel içe aktarma yetkiniz yok" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const applyMode = formData.get("apply") === "true";

  if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, unknown>[];
  try {
    rawRows = await parseExcel(buffer);
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 400 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Dosyada satır yok" }, { status: 400 });
  }

  // Catalog'dan mevcut listing tip kodlarını ve etiketlerini çek
  const listingCatalog = await prisma.listingTypeCatalog.findMany({ where: { isActive: true } });
  const listingCatalogCodes = new Set(listingCatalog.map((c) => c.code));
  const listingCatalogLabelMap: Record<string, string> = Object.fromEntries(
    listingCatalog.map((c) => [c.label, c.code])
  );
  const listingRev: Record<string, string> = { ...DEFAULT_LISTING_REV, ...listingCatalogLabelMap };

  // Mevcut ilan eşleşmesi için başlık ile bak
  const titles = rawRows.map((r) => r["Başlık"]).filter(Boolean) as string[];
  const existing = await prisma.property.findMany({
    where: { title: { in: titles } },
    select: { id: true, title: true },
  });
  const byTitle = new Map(existing.map((p) => [p.title, p.id]));

  const rows: ImportRow[] = rawRows.map((r, i) => {
    const errors: string[] = [];
    const title = String(r["Başlık"] ?? "").trim();
    const listingTR = String(r["Tip"] ?? "").trim();
    const propertyTypeTR = String(r["Emlak Tipi"] ?? "").trim();
    const statusTR = String(r["Durum"] ?? "").trim();
    const price = pickNumber(r["Fiyat"]);

    if (title.length < 3) errors.push("Başlık en az 3 karakter olmalı");
    const listingType = listingRev[listingTR] || listingTR.toUpperCase();
    const listingValid =
      listingCatalogCodes.has(listingType) ||
      ["SATILIK", "KIRALIK", "ARSIV"].includes(listingType);
    if (!listingValid) errors.push(`Tip geçersiz: "${listingTR}" — Ayarlar → İlan Tipleri'nden ekleyin`);
    const propertyType = propertyTypeRev[propertyTypeTR] || propertyTypeTR.toUpperCase();
    if (!["DAIRE", "VILLA", "ARSA", "ISYERI", "MUSTAKILEV"].includes(propertyType)) errors.push(`Emlak tipi geçersiz: "${propertyTypeTR}"`);
    if (!price || price <= 0) errors.push("Fiyat pozitif bir sayı olmalı");
    const status = statusTR ? statusRev[statusTR] || "ACTIVE" : "ACTIVE";

    const existingId = byTitle.get(title);

    const data = {
      title,
      listingType,
      propertyType,
      status,
      price: price ?? 0,
      currency: r["Para Birimi"] ? String(r["Para Birimi"]).trim() : "TRY",
      area: pickNumber(r["m²"]),
      rooms: r["Oda"] ? String(r["Oda"]).trim() : null,
      bathrooms: pickInt(r["Banyo"]),
      floor: pickInt(r["Kat"]),
      totalFloors: pickInt(r["Toplam Kat"]),
      age: pickInt(r["Bina Yaşı"]),
      heating: r["Isıtma"] ? String(r["Isıtma"]).trim() : null,
      city: r["Şehir"] ? String(r["Şehir"]).trim() : null,
      district: r["İlçe"] ? String(r["İlçe"]).trim() : null,
      neighborhood: r["Mahalle"] ? String(r["Mahalle"]).trim() : null,
      address: r["Adres"] ? String(r["Adres"]).trim() : null,
      description: r["Açıklama"] ? String(r["Açıklama"]).trim() : null,
    };

    return {
      index: i + 2,
      data,
      valid: errors.length === 0,
      errors,
      action: errors.length > 0 ? "skip" : existingId ? "update" : "create",
      existingId,
    };
  });

  const summary = {
    total: rows.length,
    create: rows.filter((r) => r.action === "create").length,
    update: rows.filter((r) => r.action === "update").length,
    invalid: rows.filter((r) => r.action === "skip").length,
  };

  if (!applyMode) {
    return NextResponse.json({ summary, rows });
  }

  const user = session!.user as unknown as Record<string, unknown>;
  const defaultAgentId = user.id as string;
  const defaultBranchId = user.branchId as string | undefined;

  let created = 0;
  let updated = 0;
  const newIds: string[] = [];

  for (const row of rows) {
    if (!row.valid) continue;
    if (row.existingId) {
      await prisma.property.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: row.existingId }, data: row.data as any,
      });
      updated++;
    } else {
      const p = await prisma.property.create({
        data: {
          ...row.data,
          assignedAgentId: defaultAgentId,
          branchId: defaultBranchId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      created++;
      newIds.push(p.id);
    }
  }

  // Eşleşme motorunu yeni kayıtlar için tetikle (fire-and-forget)
  for (const id of newIds) {
    runPropertyMatching(id).catch(() => {});
  }

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Property",
    newValue: { importedCreate: created, importedUpdate: updated, source: "excel" },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ summary: { ...summary, created, updated }, rows });
}
