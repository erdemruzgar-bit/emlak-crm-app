import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseExcel, parseTrDate } from "@/lib/excel";
import { canImportData, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

// Beklenen Excel başlıkları:
// Ad, Soyad, Tip, Aşama, Aciliyet, Telefon, E-posta, Adres, Kaynak, Min Bütçe, Max Bütçe,
// Tercih Tipler, Tercih Şehirler, Tercih İlçeler, Min m², Max m², Min Oda, Max Oda, Etiketler, Özet Not

const typeLabelRev: Record<string, string> = { "Alıcı": "BUYER", "Satıcı": "SELLER", "Kiracı": "TENANT", "Kiracı Adayı": "TENANT_CANDIDATE", "Ev Sahibi": "LANDLORD" };
// Hem yeni hem eski Türkçe etiketleri kabul et (geriye dönük uyum)
const stageLabelRev: Record<string, string> = {
  "Aday": "LEAD", "Lead": "LEAD",
  "Nitelikli": "QUALIFIED",
  "Aktif Takip": "ACTIVE", "Aktif": "ACTIVE",
  "Gösterimde": "SHOWING", "Gösterim": "SHOWING",
  "Teklif Aşaması": "OFFER", "Teklif": "OFFER",
  "Sözleşme Aşaması": "CONTRACT", "Sözleşme": "CONTRACT",
  "Kazanıldı": "CLOSED", "Kapandı": "CLOSED",
  "Kaybedildi": "LOST", "Kayıp": "LOST",
};
const urgencyLabelRev: Record<string, string> = { "Düşük": "LOW", "Orta": "MEDIUM", "Yüksek": "HIGH", "Acil": "URGENT" };

interface ImportRow {
  index: number; // Excel satır numarası (2-başlayan)
  data: Record<string, unknown>;
  valid: boolean;
  errors: string[];
  action: "create" | "update" | "skip";
  existingId?: string;
}

function splitArray(v: unknown): string[] {
  if (!v) return [];
  return String(v).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
}

function pickNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
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

  if (!file) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, unknown>[];
  try {
    rawRows = parseExcel(buffer);
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı. .xlsx veya .csv formatında olmalı." }, { status: 400 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Dosyada satır yok" }, { status: 400 });
  }

  // Catalog'dan mevcut tip kodlarını ve Türkçe etiketlerini çek (import doğrulaması için)
  const catalog = await prisma.customerTypeCatalog.findMany({ where: { isActive: true } });
  const catalogCodes = new Set(catalog.map((c) => c.code));
  const catalogLabelMap: Record<string, string> = Object.fromEntries(
    catalog.map((c) => [c.label, c.code])
  );

  // Mevcut e-posta/telefon eşleşmesi için
  const emails = rawRows.map((r) => r["E-posta"]).filter(Boolean) as string[];
  const phones = rawRows.map((r) => r["Telefon"]).filter(Boolean) as string[];
  const existing = await prisma.customer.findMany({
    where: {
      OR: [
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
        ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
      ],
      isAnonymized: false,
    },
    select: { id: true, email: true, phone: true },
  });
  const byEmail = new Map(existing.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.id]));
  const byPhone = new Map(existing.filter((c) => c.phone).map((c) => [c.phone!, c.id]));

  const rows: ImportRow[] = rawRows.map((r, i) => {
    const errors: string[] = [];
    const firstName = String(r["Ad"] ?? "").trim();
    const lastName = String(r["Soyad"] ?? "").trim();
    const email = r["E-posta"] ? String(r["E-posta"]).trim() : null;
    const phone = r["Telefon"] ? String(r["Telefon"]).trim() : null;
    const typeLabel = String(r["Tip"] ?? "").trim();
    const stageLabel = String(r["Aşama"] ?? "").trim();
    const urgencyLabel = String(r["Aciliyet"] ?? "").trim();

    if (firstName.length < 2) errors.push("Ad en az 2 karakter olmalı");
    if (lastName.length < 2) errors.push("Soyad en az 2 karakter olmalı");
    // Türkçe etiket → kod (built-in + catalog). Yoksa direk büyük-harf kod olarak dene.
    const customerType: string =
      typeLabelRev[typeLabel] || catalogLabelMap[typeLabel] || typeLabel.toUpperCase();
    const valid =
      catalogCodes.has(customerType) ||
      ["BUYER", "SELLER", "TENANT", "LANDLORD", "TENANT_CANDIDATE"].includes(customerType);
    if (!valid) errors.push(`Tip geçersiz: "${typeLabel}" — Ayarlar → Müşteri Tipleri'nden ekleyin`);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("E-posta biçimi geçersiz");

    const stage = stageLabel ? stageLabelRev[stageLabel] || null : null;
    const urgency = urgencyLabel ? urgencyLabelRev[urgencyLabel] || null : null;

    // Eşleşme
    let existingId: string | undefined;
    if (email) existingId = byEmail.get(email.toLowerCase());
    if (!existingId && phone) existingId = byPhone.get(phone);

    const data = {
      firstName, lastName, email, phone,
      customerType,
      source: r["Kaynak"] ? String(r["Kaynak"]).trim() : null,
      address: r["Adres"] ? String(r["Adres"]).trim() : null,
      stage, urgency,
      minBudget: pickNumber(r["Min Bütçe"]),
      maxBudget: pickNumber(r["Max Bütçe"]),
      preferredTypes: splitArray(r["Tercih Tipler"]),
      preferredCities: splitArray(r["Tercih Şehirler"]),
      preferredDistricts: splitArray(r["Tercih İlçeler"]),
      minArea: pickNumber(r["Min m²"]),
      maxArea: pickNumber(r["Max m²"]),
      minRooms: r["Min Oda"] ? String(r["Min Oda"]).trim() : null,
      maxRooms: r["Max Oda"] ? String(r["Max Oda"]).trim() : null,
      tags: splitArray(r["Etiketler"]),
      notesSummary: r["Özet Not"] ? String(r["Özet Not"]).trim() : null,
      lastContactDate: parseTrDate(r["Son İletişim"]),
      nextFollowUpDate: parseTrDate(r["Sonraki Takip"]),
    };

    return {
      index: i + 2, // Excel satır numarası (başlık 1. satır)
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

  // Dry-run: sadece preview dön
  if (!applyMode) {
    return NextResponse.json({ summary, rows });
  }

  // Apply modu: geçerli satırları DB'ye yaz
  const user = session!.user as unknown as Record<string, unknown>;
  const defaultAgentId = user.id as string;
  const defaultBranchId = user.branchId as string | undefined;

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    if (!row.valid) continue;
    const d = row.data;
    const payload = {
      firstName: d.firstName as string,
      lastName: d.lastName as string,
      email: d.email as string | null,
      phone: d.phone as string | null,
      address: d.address as string | null,
      customerType: d.customerType as string,
      source: d.source as string | null,
      stage: d.stage as string | null,
      urgency: d.urgency as string | null,
      minBudget: d.minBudget as number | null,
      maxBudget: d.maxBudget as number | null,
      preferredTypes: d.preferredTypes as unknown as string[],
      preferredCities: d.preferredCities as unknown as string[],
      preferredDistricts: d.preferredDistricts as unknown as string[],
      minArea: d.minArea as number | null,
      maxArea: d.maxArea as number | null,
      minRooms: d.minRooms as string | null,
      maxRooms: d.maxRooms as string | null,
      tags: d.tags as unknown as string[],
      notesSummary: d.notesSummary as string | null,
      lastContactDate: (d.lastContactDate as unknown as Date) || undefined,
      nextFollowUpDate: (d.nextFollowUpDate as unknown as Date) || undefined,
    };

    if (row.existingId) {
      await prisma.customer.update({
        where: { id: row.existingId },
        data: payload,
      });
      updated++;
    } else {
      await prisma.customer.create({
        data: {
          ...payload,
          assignedAgentId: defaultAgentId,
          branchId: defaultBranchId,
        },
      });
      created++;
    }
  }

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Customer",
    newValue: { importedCreate: created, importedUpdate: updated, source: "excel" },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ summary: { ...summary, created, updated }, rows });
}
