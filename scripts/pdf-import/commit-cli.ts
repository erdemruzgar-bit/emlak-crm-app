/**
 * PDF Import — CLI commit (auth bypass).
 *
 * extracted-full.json dosyasındaki satırları doğrudan DB'ye yazar.
 * UI üzerinden yapmaya alternatif — operatör onayı CLI'da senkron olarak verir.
 *
 * Kullanım:
 *   npx tsx scripts/pdf-import/commit-cli.ts /home/crmadmin/pdf-import-work/extracted-full.json
 *
 * Çıkışlar:
 *   - importBatchId (UUID) — rollback için
 *   - createdProperties, createdBlocks, skippedConflicts
 *   - projectId
 *
 * Mantık tamamen src/app/api/projects/pdf-import/commit/route.ts ile aynı,
 * sadece auth + RBAC adımı atlanır; actor olarak ADMIN seed kullanıcısı kullanılır.
 */

import { randomUUID } from "crypto";
import * as fs from "fs";
import { prisma } from "../../src/lib/prisma";

interface ExtractedRow {
  parsel?: string;
  blockName: string;
  unitNumber: string;
  area?: number | null;
  zeminKatBrut?: number | null;
  asmaKatBrut?: number | null;
  dukkanOnAlani?: number | null;
  toplamSatisaEsasBrut?: number | null;
  floor?: number | null;
  viewType?: string;
  fiyat: number;
  aylikKira?: number | null;
  groupLabel?: string;
  sourcePage?: number;
}

interface InputJson {
  project: {
    name: string;
    code?: string;
    description?: string;
    city?: string;
    district?: string;
    developer?: string;
  };
  rows: ExtractedRow[];
  sitePlanImageUrls?: string[];
}

const ADMIN_EMAIL = process.env.PDF_IMPORT_ACTOR_EMAIL || "admin@emlakcrm.com";

async function main() {
  const [jsonPath] = process.argv.slice(2);
  if (!jsonPath) {
    console.error("Kullanım: npx tsx scripts/pdf-import/commit-cli.ts <extracted.json>");
    process.exit(2);
  }
  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON bulunamadı: ${jsonPath}`);
    process.exit(2);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const input: InputJson = JSON.parse(raw);

  const actor = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, email: true, role: true, branchId: true, name: true },
  });
  if (!actor) {
    console.error(`Aktör bulunamadı: ${ADMIN_EMAIL}. PDF_IMPORT_ACTOR_EMAIL env ile başka kullanıcı seçilebilir.`);
    process.exit(2);
  }
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    console.error(`Aktör ADMIN veya MANAGER olmalı (${actor.email} rol: ${actor.role})`);
    process.exit(2);
  }

  console.log(`→ Aktör: ${actor.name} (${actor.role})`);
  console.log(`→ JSON: ${jsonPath}`);
  console.log(`→ Satır: ${input.rows.length}`);

  const importBatchId = randomUUID();
  const sitePlanImageUrls = input.sitePlanImageUrls || [];

  const result = await prisma.$transaction(
    async (tx) => {
      // 1) Project bul/oluştur
      let project = input.project.code
        ? await tx.project.findUnique({
            where: { code: input.project.code },
            select: { id: true, name: true, code: true, sitePlanImageUrls: true },
          })
        : null;
      if (!project) {
        project = await tx.project.findFirst({
          where: { name: { equals: input.project.name, mode: "insensitive" } },
          select: { id: true, name: true, code: true, sitePlanImageUrls: true },
        });
      }
      if (!project) {
        const created = await tx.project.create({
          data: {
            name: input.project.name,
            code: input.project.code,
            description: input.project.description,
            city: input.project.city,
            district: input.project.district,
            developer: input.project.developer,
            sitePlanImageUrls,
          },
          select: { id: true, name: true, code: true, sitePlanImageUrls: true },
        });
        project = created;
        console.log(`→ Project oluşturuldu: ${project.name} (${project.id})`);
      } else if (sitePlanImageUrls.length > 0) {
        const merged = Array.from(new Set([...project.sitePlanImageUrls, ...sitePlanImageUrls]));
        await tx.project.update({
          where: { id: project.id },
          data: { sitePlanImageUrls: merged },
        });
        project.sitePlanImageUrls = merged;
        console.log(`→ Project zaten var: ${project.name} (sitePlan URL'ler eklendi)`);
      } else {
        console.log(`→ Project zaten var: ${project.name}`);
      }

      // 2) Bloklar
      const blockNameOf = (r: ExtractedRow) =>
        r.parsel ? `${r.parsel}-${r.blockName}` : r.blockName;
      const uniqueBlockNames = Array.from(new Set(input.rows.map(blockNameOf)));
      const existingBlocks = await tx.block.findMany({
        where: { projectId: project.id, name: { in: uniqueBlockNames } },
        select: { id: true, name: true },
      });
      const blockMap = new Map<string, string>(existingBlocks.map((b) => [b.name, b.id]));
      let createdBlocks = 0;
      for (const name of uniqueBlockNames) {
        if (!blockMap.has(name)) {
          const c = await tx.block.create({
            data: { projectId: project.id, name },
            select: { id: true, name: true },
          });
          blockMap.set(c.name, c.id);
          createdBlocks++;
        }
      }
      console.log(`→ Blok: ${uniqueBlockNames.length} (yeni: ${createdBlocks})`);

      // 3) Çakışmalar
      const tuples = input.rows.map((r) => ({
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
      const skippedKeys: string[] = [];

      for (const r of input.rows) {
        const blockId = blockMap.get(blockNameOf(r))!;
        const key = `${project.id}|${blockId}|${r.unitNumber}`;
        if (conflictSet.has(key)) {
          skippedConflicts++;
          skippedKeys.push(`${blockNameOf(r)}/${r.unitNumber}`);
          continue;
        }

        const area = r.toplamSatisaEsasBrut ?? r.area ?? r.zeminKatBrut ?? null;
        const listPrice = r.fiyat / 1.2;
        const noteParts: string[] = [];
        noteParts.push(`PDF import — Sistem fiyatı: ₺${r.fiyat.toLocaleString("tr-TR")}`);
        noteParts.push(
          `Ham liste (÷1.20): ₺${listPrice.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`
        );
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
            city: input.project.city,
            district: input.project.district,
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
            content: `${input.project.name} PDF'i — blok ${blockNameOf(r)}, birim ${r.unitNumber}${
              r.groupLabel ? `, grup ${r.groupLabel}` : ""
            }${r.sourcePage ? `, sayfa ${r.sourcePage}` : ""}`,
          },
        });

        createdProperties++;
      }

      // Audit
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "CREATE",
          entity: "Property",
          newValue: JSON.stringify({
            pdfImport: true,
            importBatchId,
            projectId: project.id,
            created: createdProperties,
            skippedConflicts,
            createdBlocks,
            sitePlanCount: sitePlanImageUrls.length,
            projectName: input.project.name,
            via: "commit-cli",
          }),
        },
      });

      return {
        projectId: project.id,
        createdProperties,
        skippedConflicts,
        createdBlocks,
        skippedKeys,
      };
    },
    { timeout: 180_000 }
  );

  console.log("\n=== SONUÇ ===");
  console.log(`Project ID:         ${result.projectId}`);
  console.log(`Import Batch ID:    ${importBatchId}`);
  console.log(`Oluşturulan ilan:   ${result.createdProperties}`);
  console.log(`Atlanan (çakışma):  ${result.skippedConflicts}`);
  console.log(`Yeni blok:          ${result.createdBlocks}`);
  if (result.skippedKeys.length) {
    console.log("\nAtlanan satırlar:");
    for (const k of result.skippedKeys) console.log("  -", k);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("HATA:", e);
  await prisma.$disconnect();
  process.exit(1);
});
