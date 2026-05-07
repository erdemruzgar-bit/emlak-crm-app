// Sega tarzı 13-kolonlu çalışma defterini bir projeye toplu import eder.
// Akış:
//   1. preview (apply=false): satır satır parse + dedupe arama + simulasyon
//   2. apply (apply=true):    transaction içinde Block upsert + Customer upsert/dedupe
//                             + Property upsert + PropertyNote create + audit log
//
// İçerikler 'src/lib/excel-project-import.ts' içindeki saf adapter'dan gelir.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseExcel } from "@/lib/excel";
import { canImportData, extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { parseProjectRows, type ParsedRow } from "@/lib/excel-project-import";
import { phoneDedupeKey } from "@/lib/phone";

interface PreviewRow {
  index: number;
  blockName: string | null;
  unitNumber: string | null;
  valid: boolean;
  action: "create" | "update" | "skip";
  errors: string[];
  warnings: string[];
  parsed: {
    area: number | null;
    floor: number | null;
    viewType: string | null;
    kitchenType: string | null;
    rooms: string | null;
    hasBalcony: boolean | null;
    customerType: string;
    ownerName: string;
    ownerPhone: string | null;
    ownerAltPhone: string | null;
    ownerEmail: string | null;
    occupancyStatus: string | null;
    operationalNote: string | null;
    callLogPreview: string | null;
  };
  existingPropertyId: string | null;
  matchedCustomerId: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canImportData(actor)) {
    return NextResponse.json({ error: "Excel içe aktarma yetkiniz yok" }, { status: 403 });
  }

  const { id: projectId } = await params;

  // Proje var mı kontrol et
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const applyMode = formData.get("apply") === "true";
  if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, unknown>[];
  try {
    rawRows = parseExcel(buffer);
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 400 });
  }
  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Dosyada satır yok" }, { status: 400 });
  }

  const parsed: ParsedRow[] = parseProjectRows(rawRows);

  // Mevcut bloklar (case-insensitive eşleşme için ad listesi)
  const existingBlocks = await prisma.block.findMany({
    where: { projectId },
    select: { id: true, name: true },
  });
  const blockByName = new Map(existingBlocks.map((b) => [b.name.toUpperCase(), b]));

  // Satır bazında simülasyon yap, dedupe sonuçlarını yakala
  const previewRows: PreviewRow[] = [];
  const phoneIndexCache = new Map<
    string,
    { id: string; phone: string | null; altPhone: string | null; firstName: string; lastName: string } | null
  >();

  for (const p of parsed) {
    const errors = [...p.errors];
    const warnings = [...p.warnings];
    let action: "create" | "update" | "skip" = "create";
    let existingPropertyId: string | null = null;
    let matchedCustomerId: string | null = null;

    // Block (preview'da DB'ye yazmadan upsert simülasyonu)
    let blockId: string | null = null;
    if (p.blockName) {
      const found = blockByName.get(p.blockName.toUpperCase());
      blockId = found?.id ?? null;
    }

    // Mevcut property: aynı projectId + blockId + unitNumber
    if (blockId && p.unitNumber) {
      const existing = await prisma.property.findFirst({
        where: { projectId, blockId, unitNumber: p.unitNumber },
        select: { id: true, ownerId: true },
      });
      if (existing) {
        existingPropertyId = existing.id;
        action = "update";
      }
    }

    // Customer dedupe: telefon dedupe key
    const dedupeKey = phoneDedupeKey(p.ownerPhone) ?? phoneDedupeKey(p.ownerAltPhone);
    if (dedupeKey) {
      let cached = phoneIndexCache.get(dedupeKey);
      if (cached === undefined) {
        // Telefon son 10 hane ile arama (Customer.phone veya altPhone)
        const candidates = await prisma.customer.findMany({
          where: {
            isAnonymized: false,
            OR: [
              { phone: { endsWith: dedupeKey } },
              { altPhone: { endsWith: dedupeKey } },
            ],
          },
          select: { id: true, phone: true, altPhone: true, firstName: true, lastName: true },
          take: 5,
        });
        cached = candidates[0] ?? null;
        phoneIndexCache.set(dedupeKey, cached);
        // İsim mismatch uyarısı
        if (cached && p.ownerFirstName) {
          const existingName = `${cached.firstName ?? ""} ${cached.lastName ?? ""}`.trim().toLowerCase();
          const importedName = `${p.ownerFirstName} ${p.ownerLastName}`.trim().toLowerCase();
          if (existingName && importedName && existingName !== importedName) {
            warnings.push(`Aynı telefonla farklı isim kayıtlı: "${existingName}". Mevcut müşteriye bağlanacak.`);
          }
        }
      }
      matchedCustomerId = cached?.id ?? null;
    }

    if (errors.length) action = "skip";

    previewRows.push({
      index: p.index,
      blockName: p.blockName,
      unitNumber: p.unitNumber,
      valid: errors.length === 0,
      action,
      errors,
      warnings,
      parsed: {
        area: p.area,
        floor: p.floor,
        viewType: p.viewType,
        kitchenType: p.kitchenType,
        rooms: p.rooms,
        hasBalcony: p.hasBalcony,
        customerType: p.customerType,
        ownerName: `${p.ownerFirstName} ${p.ownerLastName}`.trim(),
        ownerPhone: p.ownerPhone,
        ownerAltPhone: p.ownerAltPhone,
        ownerEmail: p.ownerEmail,
        occupancyStatus: p.occupancyStatus,
        operationalNote: p.operationalNote,
        callLogPreview: p.callLog ? p.callLog.slice(0, 120) : null,
      },
      existingPropertyId,
      matchedCustomerId,
    });
  }

  const summary = {
    total: previewRows.length,
    create: previewRows.filter((r) => r.action === "create").length,
    update: previewRows.filter((r) => r.action === "update").length,
    skip: previewRows.filter((r) => r.action === "skip").length,
    warnings: previewRows.reduce((s, r) => s + r.warnings.length, 0),
  };

  if (!applyMode) {
    return NextResponse.json({ summary, rows: previewRows });
  }

  // ─── APPLY ─────────────────────────────────────────────────────────────
  const importBatchId = `imp_${randomBytes(8).toString("hex")}`;
  let createdCount = 0;
  let updatedCount = 0;
  let customersCreated = 0;
  let notesCreated = 0;
  const propertyIdsForMatching: string[] = [];

  await prisma.$transaction(
    async (tx) => {
      // 1) Tüm bloklarını upsert et (önceden tek tek)
      const distinctBlocks = Array.from(
        new Set(previewRows.filter((r) => r.valid && r.blockName).map((r) => r.blockName as string))
      );
      const blockIdMap = new Map<string, string>(); // BLOCK_NAME (upper) → blockId

      for (const bn of distinctBlocks) {
        const upper = bn.toUpperCase();
        const existing = blockByName.get(upper);
        if (existing) {
          blockIdMap.set(upper, existing.id);
        } else {
          const created = await tx.block.create({
            data: { projectId, name: bn },
            select: { id: true },
          });
          blockIdMap.set(upper, created.id);
        }
      }

      // 2) Satır satır işle
      for (let i = 0; i < parsed.length; i++) {
        const p = parsed[i];
        const pv = previewRows[i];
        if (!pv.valid || pv.action === "skip") continue;
        if (!p.blockName || !p.unitNumber) continue;
        const blockId = blockIdMap.get(p.blockName.toUpperCase());
        if (!blockId) continue;

        // Customer dedupe / create
        let customerId: string | null = pv.matchedCustomerId;
        const ownerHasInfo = p.ownerFirstName || p.ownerPhone || p.ownerEmail;
        if (!customerId && ownerHasInfo) {
          const created = await tx.customer.create({
            data: {
              firstName: p.ownerFirstName || "(İsimsiz)",
              lastName: p.ownerLastName || "",
              phone: p.ownerPhone,
              altPhone: p.ownerAltPhone,
              email: p.ownerEmail,
              customerType: p.customerType,
              source: "Excel Import",
              // KVKK: import edilen müşterilerde createdById null — AGENT'a kapısız erişim verme
              createdById: null,
              assignedAgentId: actor.id,
              branchId: actor.branchId ?? undefined,
            },
            select: { id: true },
          });
          customerId = created.id;
          customersCreated++;
        } else if (customerId) {
          // Mevcut customer'a altPhone/email ekle (boşsa)
          await tx.customer.update({
            where: { id: customerId },
            data: {
              altPhone: p.ownerAltPhone ?? undefined,
              email: p.ownerEmail ?? undefined,
            },
          });
        }

        // Property upsert
        const propertyData: Record<string, unknown> = {
          projectId,
          blockId,
          unitNumber: p.unitNumber,
          area: p.area ?? undefined,
          floor: p.floor ?? undefined,
          rooms: p.rooms ?? undefined,
          viewType: p.viewType ?? undefined,
          kitchenType: p.kitchenType ?? undefined,
          hasBalcony: p.hasBalcony ?? undefined,
          occupancyStatus: p.occupancyStatus ?? undefined,
          operationalNote: p.operationalNote ?? undefined,
        };
        if (customerId) propertyData.ownerId = customerId;

        let propertyId: string;
        if (pv.existingPropertyId) {
          await tx.property.update({
            where: { id: pv.existingPropertyId },
            data: propertyData,
          });
          propertyId = pv.existingPropertyId;
          updatedCount++;
        } else {
          // Yeni property — zorunlu alanları doldur (placeholder)
          const titleBase = `${p.blockName} - ${p.unitNumber}`;
          const created = await tx.property.create({
            data: {
              ...propertyData,
              title: titleBase,
              listingType: "SATILIK",
              propertyType: "DAIRE",
              price: 0,
              currency: "TRY",
              status: "ACTIVE",
              assignedAgentId: actor.id,
              branchId: actor.branchId ?? undefined,
            },
            select: { id: true },
          });
          propertyId = created.id;
          createdCount++;
        }

        propertyIdsForMatching.push(propertyId);

        // Görüşme notu (varsa)
        if (p.callLog) {
          await tx.propertyNote.create({
            data: {
              propertyId,
              userId: actor.id,
              kind: "CALL_LOG",
              content: p.callLog,
              source: "excel-import",
              importBatchId,
            },
          });
          notesCreated++;
        }
        // DURUM map dışı tek satır olarak da ek not (operationalNote zaten Property'de)
        // → ek PropertyNote açmaya gerek yok, operationalNote alanı liste'de kullanılıyor.
      }
    },
    { timeout: 60_000 }
  );

  // Audit log + matching tetikleme (transaction dışında)
  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "ProjectImport",
    entityId: projectId,
    newValue: { importBatchId, createdCount, updatedCount, customersCreated, notesCreated },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    importBatchId,
    summary: {
      ...summary,
      created: createdCount,
      updated: updatedCount,
      customersCreated,
      notesCreated,
    },
    rows: previewRows,
  });
}
