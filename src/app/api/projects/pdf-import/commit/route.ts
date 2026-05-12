/**
 * PDF Import — Commit endpoint.
 *
 * Vision/operatör tarafından üretilmiş satırlar + opsiyonel vaziyet planı görselleri
 * sisteme tek transaction halinde yazılır.
 *
 * Akış:
 *   1. Project bul (name veya code) → yoksa create. sitePlanImageUrls append/replace.
 *   2. Her benzersiz "parsel-blockName" için Block bul/oluştur.
 *   3. Her satır için Property.create (propertyType=ISYERI, listingType=KIRALIK).
 *   4. Her property için PropertyNote (kind=IMPORTED, source=pdf-import, importBatchId).
 *   5. Audit log.
 *
 * RBAC: ADMIN veya MANAGER. MANAGER ise branchId zorunlu.
 *
 * Çakışmalar: (projectId, blockId, unitNumber) varsa atla, skippedConflicts'a say.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { commitPayloadSchema, type CommitResult } from "@/lib/pdf-import-types";

export async function POST(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return NextResponse.json(
      { error: "PDF içe aktarma için ADMIN veya MANAGER yetkisi gerekli" },
      { status: 403 }
    );
  }
  if (actor.role === "MANAGER" && !actor.branchId) {
    return NextResponse.json({ error: "Şubeniz atanmamış" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = commitPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { project: projInput, rows, sitePlanImageUrls, autoCreateBlocks } = parsed.data;
  const importBatchId = randomUUID();

  const result = await prisma.$transaction(
    async (tx) => {
      // 1) Project bul veya oluştur.
      //    Önce code ile, sonra name ile (case-insensitive).
      let project = projInput.code
        ? await tx.project.findUnique({
            where: { code: projInput.code },
            select: { id: true, name: true, code: true, sitePlanImageUrls: true },
          })
        : null;
      if (!project) {
        project = await tx.project.findFirst({
          where: { name: { equals: projInput.name, mode: "insensitive" } },
          select: { id: true, name: true, code: true, sitePlanImageUrls: true },
        });
      }
      if (!project) {
        const created = await tx.project.create({
          data: {
            name: projInput.name,
            code: projInput.code,
            description: projInput.description,
            city: projInput.city,
            district: projInput.district,
            developer: projInput.developer,
            sitePlanImageUrls,
          },
          select: { id: true, name: true, code: true, sitePlanImageUrls: true },
        });
        project = created;
      } else if (sitePlanImageUrls.length > 0) {
        // Mevcut projeye yeni vaziyet planları ekle (yinelemeleri ele)
        const merged = Array.from(new Set([...project.sitePlanImageUrls, ...sitePlanImageUrls]));
        await tx.project.update({
          where: { id: project.id },
          data: { sitePlanImageUrls: merged },
        });
        project.sitePlanImageUrls = merged;
      }

      // 2) Benzersiz blok adlarını topla. Parsel varsa "2124-A1" gibi composite name.
      const blockNameOf = (r: { parsel?: string; blockName: string }) =>
        r.parsel ? `${r.parsel}-${r.blockName}` : r.blockName;

      const uniqueBlockNames = Array.from(new Set(rows.map(blockNameOf)));
      const existingBlocks = await tx.block.findMany({
        where: { projectId: project.id, name: { in: uniqueBlockNames } },
        select: { id: true, name: true },
      });
      const blockMap = new Map<string, string>(existingBlocks.map((b) => [b.name, b.id]));

      let createdBlocks = 0;
      for (const name of uniqueBlockNames) {
        if (!blockMap.has(name)) {
          if (!autoCreateBlocks) {
            throw new Error(`Bilinmeyen blok: ${name}. autoCreateBlocks=false ve blok henüz tanımlı değil.`);
          }
          const created = await tx.block.create({
            data: { projectId: project.id, name },
            select: { id: true, name: true },
          });
          blockMap.set(created.name, created.id);
          createdBlocks++;
        }
      }

      // 3) Çakışmaları (mevcut unit'leri) toplu sorgula
      const tuples = rows.map((r) => ({
        projectId: project!.id,
        blockId: blockMap.get(blockNameOf(r))!,
        unitNumber: r.unitNumber,
      }));
      const existingProps = await tx.property.findMany({
        where: { OR: tuples },
        select: { projectId: true, blockId: true, unitNumber: true },
      });
      const conflictKey = (p: {
        projectId: string | null;
        blockId: string | null;
        unitNumber: string | null;
      }) => `${p.projectId}|${p.blockId}|${p.unitNumber}`;
      const conflictSet = new Set(existingProps.map(conflictKey));

      let createdProperties = 0;
      let skippedConflicts = 0;

      for (const r of rows) {
        const blockId = blockMap.get(blockNameOf(r))!;
        const key = `${project.id}|${blockId}|${r.unitNumber}`;
        if (conflictSet.has(key)) {
          skippedConflicts++;
          continue;
        }

        // area önceliği: toplamSatisaEsasBrut > area > zeminKatBrut
        const area = r.area ?? r.zeminKatBrut ?? null;

        // operationalNote: ham veri ve denetim için
        const listPrice = r.fiyat / 1.2; // PDF'teki fiyat +%20 yansımış; ham listeyi geri hesapla
        const noteParts: string[] = [];
        noteParts.push(`PDF import — Sistem fiyatı: ₺${r.fiyat.toLocaleString("tr-TR")}`);
        noteParts.push(`Ham liste (÷1.20): ₺${listPrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`);
        if (r.aylikKira != null) {
          noteParts.push(`Aylık kira: ₺${r.aylikKira.toLocaleString("tr-TR")}`);
        }
        if (r.zeminKatBrut != null) noteParts.push(`Zemin kat brüt: ${r.zeminKatBrut} m²`);
        if (r.asmaKatBrut != null) noteParts.push(`Asma kat brüt: ${r.asmaKatBrut} m²`);
        if (r.dukkanOnAlani != null) noteParts.push(`Dükkan önü kullanım: ${r.dukkanOnAlani} m²`);
        if (r.groupLabel) noteParts.push(`Grup: ${r.groupLabel}`);
        noteParts.push(`PDF başlığı: Kira 180 Ay (180 ay vadeli toplam tutar)`);

        const created = await tx.property.create({
          data: {
            projectId: project.id,
            blockId,
            unitNumber: r.unitNumber,
            title: `${blockNameOf(r)} - ${r.unitNumber}`,
            listingType: "KIRALIK",
            propertyType: "ISYERI",
            usageType: "ISYERI",
            status: "ACTIVE",
            price: r.fiyat,
            currency: "TRY",
            area: area ?? undefined,
            floor: r.floor ?? undefined,
            viewType: r.viewType,
            operationalNote: noteParts.join(" | "),
            assignedAgentId: actor.id,
            branchId: actor.branchId ?? undefined,
            city: projInput.city,
            district: projInput.district,
          },
          select: { id: true },
        });

        await tx.propertyNote.create({
          data: {
            propertyId: created.id,
            userId: actor.id,
            kind: "IMPORTED",
            source: "pdf-import",
            importBatchId,
            content: `${projInput.name} PDF'i — blok ${blockNameOf(r)}, birim ${r.unitNumber}${
              r.groupLabel ? `, grup ${r.groupLabel}` : ""
            }`,
          },
        });

        createdProperties++;
      }

      return {
        projectId: project.id,
        createdProperties,
        skippedConflicts,
        createdBlocks,
      };
    },
    { timeout: 120_000 }
  );

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Property",
    newValue: {
      pdfImport: true,
      importBatchId,
      projectId: result.projectId,
      created: result.createdProperties,
      skippedConflicts: result.skippedConflicts,
      createdBlocks: result.createdBlocks,
      sitePlanCount: sitePlanImageUrls.length,
      projectName: projInput.name,
    },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  }).catch(() => {});

  const response: CommitResult = {
    ok: true,
    projectId: result.projectId,
    importBatchId,
    createdProperties: result.createdProperties,
    skippedConflicts: result.skippedConflicts,
    createdBlocks: result.createdBlocks,
    sitePlanCount: sitePlanImageUrls.length,
  };
  return NextResponse.json(response);
}
