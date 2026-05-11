/**
 * Toplu mülk üretimi — DRY-RUN ÖNİZLEME.
 *
 * Body: { raw: string, propertyType: PropertyType, listingType: string }
 * Çıktı: parse + kontrol; hiçbir kayıt oluşturulmaz.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { parseBulkPaste, BULK_PASTE_MAX_ROWS } from "@/lib/bulk-paste-parser";

const schema = z.object({
  raw: z.string().min(1, "Liste boş olamaz"),
  propertyType: z.enum(["DAIRE", "VILLA", "ISYERI", "MUSTAKILEV"]),
  listingType: z.string().default("SATILIK"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return NextResponse.json({ error: "Toplu üretim için ADMIN veya MANAGER yetkisi gerekli" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { raw } = parsed.data;
  const { rows, errors: parseErrors } = parseBulkPaste(raw);

  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: { total: 0, valid: 0, conflicts: 0, missingProjects: 0, missingBlocks: 0 },
      rows: [],
      parseErrors,
      missingProjectCodes: [],
      missingBlocks: [],
    });
  }

  // Tek seferde tüm referansları çek (hem code hem name ile eşleştirebilelim)
  const refs = Array.from(new Set(rows.map((r) => r.projectRef)));
  const refsLower = refs.map((r) => r.toLowerCase());
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { code: { in: refs } },
        { name: { in: refs, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, code: true, blocks: { select: { id: true, name: true } } },
  });

  // Map: hem code hem name (lowercase) -> project
  const projectByRef = new Map<string, typeof projects[number]>();
  for (const p of projects) {
    if (p.code) projectByRef.set(p.code.toLowerCase(), p);
    projectByRef.set(p.name.toLowerCase(), p);
  }
  const resolveProject = (ref: string) => projectByRef.get(ref.toLowerCase()) || null;

  // Çakışan unit kontrolü için tüm hedefleri tek query'de bul
  const targetTuples = rows
    .map((r) => {
      const project = resolveProject(r.projectRef);
      if (!project) return null;
      const block = project.blocks.find((b) => b.name.toLowerCase() === r.blockName.toLowerCase());
      if (!block) return null;
      return { projectId: project.id, blockId: block.id, unitNumber: r.unitNumber };
    })
    .filter((t): t is { projectId: string; blockId: string; unitNumber: string } => t !== null);
  void refsLower;

  const existing = targetTuples.length > 0
    ? await prisma.property.findMany({
        where: { OR: targetTuples },
        select: { projectId: true, blockId: true, unitNumber: true },
      })
    : [];
  const existingKey = (p: { projectId: string | null; blockId: string | null; unitNumber: string | null }) =>
    `${p.projectId}|${p.blockId}|${p.unitNumber}`;
  const existingSet = new Set(existing.map(existingKey));

  const missingProjectRefs = new Set<string>();
  const missingBlockKeys = new Set<string>(); // projectRef|blockName
  let valid = 0;
  let conflicts = 0;

  const previewRows = rows.map((r) => {
    const project = resolveProject(r.projectRef);
    if (!project) {
      missingProjectRefs.add(r.projectRef);
      return {
        lineNumber: r.lineNumber,
        projectCode: r.projectRef,
        blockName: r.blockName,
        unitNumber: r.unitNumber,
        status: "MISSING_PROJECT" as const,
        projectId: null,
        blockId: null,
      };
    }
    const block = project.blocks.find((b) => b.name.toLowerCase() === r.blockName.toLowerCase());
    if (!block) {
      missingBlockKeys.add(`${r.projectRef}|${r.blockName}`);
      return {
        lineNumber: r.lineNumber,
        projectCode: r.projectRef,
        blockName: r.blockName,
        unitNumber: r.unitNumber,
        status: "MISSING_BLOCK" as const,
        projectId: project.id,
        blockId: null,
        projectName: project.name,
      };
    }
    const key = `${project.id}|${block.id}|${r.unitNumber}`;
    if (existingSet.has(key)) {
      conflicts++;
      return {
        lineNumber: r.lineNumber,
        projectCode: r.projectRef,
        blockName: r.blockName,
        unitNumber: r.unitNumber,
        status: "CONFLICT" as const,
        projectId: project.id,
        blockId: block.id,
        projectName: project.name,
      };
    }
    valid++;
    return {
      lineNumber: r.lineNumber,
      projectCode: r.projectRef,
      blockName: r.blockName,
      unitNumber: r.unitNumber,
      status: "VALID" as const,
      projectId: project.id,
      blockId: block.id,
      projectName: project.name,
    };
  });

  return NextResponse.json({
    ok: true,
    maxRows: BULK_PASTE_MAX_ROWS,
    summary: {
      total: rows.length,
      valid,
      conflicts,
      missingProjects: missingProjectRefs.size,
      missingBlocks: missingBlockKeys.size,
    },
    rows: previewRows,
    parseErrors,
    missingProjectCodes: Array.from(missingProjectRefs),
    missingBlocks: Array.from(missingBlockKeys).map((k) => {
      const [projectCode, blockName] = k.split("|");
      return { projectCode, blockName };
    }),
  });
}
