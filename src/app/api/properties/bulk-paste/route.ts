/**
 * Toplu mülk üretimi — COMMIT.
 *
 * Body: {
 *   raw: string,
 *   propertyType: PropertyType,
 *   listingType: string,
 *   defaultPrice?: number,
 *   autoCreateBlocks?: boolean,    // varsayılan false; true ise eksik bloklar oluşturulur
 * }
 *
 * Tüm işlem tek transaction içinde — bir satır hata verirse hiçbir kayıt yazılmaz.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { parseBulkPaste, BULK_PASTE_MAX_ROWS } from "@/lib/bulk-paste-parser";

const schema = z.object({
  raw: z.string().min(1, "Liste boş olamaz"),
  propertyType: z.enum(["DAIRE", "VILLA", "ISYERI", "MUSTAKILEV"]),
  listingType: z.string().default("SATILIK"),
  defaultPrice: z.number().nonnegative().default(0),
  autoCreateBlocks: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return NextResponse.json({ error: "Toplu üretim için ADMIN veya MANAGER yetkisi gerekli" }, { status: 403 });
  }
  if (actor.role === "MANAGER" && !actor.branchId) {
    return NextResponse.json({ error: "Şubeniz atanmamış" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { raw, propertyType, listingType, defaultPrice, autoCreateBlocks } = parsed.data;
  const { rows } = parseBulkPaste(raw);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Geçerli satır yok" }, { status: 400 });
  }
  if (rows.length > BULK_PASTE_MAX_ROWS) {
    return NextResponse.json({ error: `En fazla ${BULK_PASTE_MAX_ROWS} satır işlenebilir` }, { status: 400 });
  }

  const refs = Array.from(new Set(rows.map((r) => r.projectRef)));
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { code: { in: refs } },
        { name: { in: refs, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, code: true, blocks: { select: { id: true, name: true } } },
  });
  const projectByRef = new Map<string, typeof projects[number]>();
  for (const p of projects) {
    if (p.code) projectByRef.set(p.code.toLowerCase(), p);
    projectByRef.set(p.name.toLowerCase(), p);
  }
  const resolveProject = (ref: string) => projectByRef.get(ref.toLowerCase()) || null;

  // Eksik projeler — devam edilemez
  const missingProjects = refs.filter((r) => !resolveProject(r));
  if (missingProjects.length > 0) {
    return NextResponse.json(
      {
        error: `Bilinmeyen proje: ${missingProjects.join(", ")}. Proje adı veya kısa kodu eşleşmedi. Ayarlar → Projeler ekranından kısa kod atayabilir veya tam proje adıyla yeniden deneyebilirsiniz.`,
        missingProjects,
      },
      { status: 400 },
    );
  }

  // Eksik blokları topla
  const missingBlocks: { projectCode: string; projectId: string; blockName: string }[] = [];
  for (const r of rows) {
    const project = resolveProject(r.projectRef)!;
    const block = project.blocks.find((b) => b.name.toLowerCase() === r.blockName.toLowerCase());
    if (!block) {
      const key = `${project.id}|${r.blockName.toLowerCase()}`;
      if (!missingBlocks.some((m) => `${m.projectId}|${m.blockName.toLowerCase()}` === key)) {
        missingBlocks.push({ projectCode: r.projectRef, projectId: project.id, blockName: r.blockName });
      }
    }
  }

  if (missingBlocks.length > 0 && !autoCreateBlocks) {
    return NextResponse.json(
      {
        error: `Bilinmeyen blok(lar): ${missingBlocks.map((m) => `${m.projectCode}/${m.blockName}`).join(", ")}. "Eksik blokları otomatik oluştur" seçeneğini açın veya bu blokları Ayarlar → Projeler altında elle ekleyin.`,
        missingBlocks,
      },
      { status: 400 },
    );
  }

  // Çakışmaları (zaten var olan unit'leri) bul
  type Tuple = { projectId: string; blockId: string; unitNumber: string };
  const planned: { row: typeof rows[number]; projectId: string; blockId: string }[] = [];
  let createdBlocks = 0;

  const result = await prisma.$transaction(async (tx) => {
    // Eksik blokları oluştur, mapping'i güncelle
    if (autoCreateBlocks) {
      for (const mb of missingBlocks) {
        const created = await tx.block.create({
          data: { projectId: mb.projectId, name: mb.blockName },
          select: { id: true, name: true, projectId: true },
        });
        const project = resolveProject(mb.projectCode)!;
        project.blocks.push({ id: created.id, name: created.name });
        createdBlocks++;
      }
    }

    // Her satırı blockId ile eşle
    for (const r of rows) {
      const project = resolveProject(r.projectRef)!;
      const block = project.blocks.find((b) => b.name.toLowerCase() === r.blockName.toLowerCase())!;
      planned.push({ row: r, projectId: project.id, blockId: block.id });
    }

    // Çakışmaları transaction içinde tespit et
    const tuples: Tuple[] = planned.map((p) => ({
      projectId: p.projectId,
      blockId: p.blockId,
      unitNumber: p.row.unitNumber,
    }));
    const existing = await tx.property.findMany({
      where: { OR: tuples },
      select: { projectId: true, blockId: true, unitNumber: true },
    });
    const existingSet = new Set(existing.map((p) => `${p.projectId}|${p.blockId}|${p.unitNumber}`));

    const toCreate = planned.filter((p) => !existingSet.has(`${p.projectId}|${p.blockId}|${p.row.unitNumber}`));
    const skippedConflicts = planned.length - toCreate.length;

    let createdCount = 0;
    for (const item of toCreate) {
      const block = resolveProject(item.row.projectRef)!.blocks.find((b) => b.id === item.blockId)!;
      await tx.property.create({
        data: {
          projectId: item.projectId,
          blockId: item.blockId,
          unitNumber: item.row.unitNumber,
          title: `${block.name} - ${item.row.unitNumber}`,
          listingType,
          propertyType,
          price: defaultPrice,
          currency: "TRY",
          status: "ACTIVE",
          assignedAgentId: actor.id,
          branchId: actor.branchId ?? undefined,
        },
      });
      createdCount++;
    }

    return { createdCount, skippedConflicts, createdBlocks };
  }, { timeout: 90_000 });

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Property",
    newValue: {
      bulkPaste: true,
      rows: rows.length,
      created: result.createdCount,
      skippedConflicts: result.skippedConflicts,
      createdBlocks: result.createdBlocks,
      propertyType,
      projectRefs: refs,
    },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    created: result.createdCount,
    skippedConflicts: result.skippedConflicts,
    createdBlocks: result.createdBlocks,
  });
}
