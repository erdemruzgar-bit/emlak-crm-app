// Bir bloğa toplu placeholder daire üretir (Faz 2).
// Örn: blok=A1, prefix="A1-", padding=3, start=1, end=30 → A1-001..A1-030
//
// RBAC: ADMIN/MANAGER (yetkili olduğu şubelerde). Yeni property'ler:
//   listingType=SATILIK, propertyType=DAIRE, price=0, status=ACTIVE,
//   assignedAgentId=actor.id, branchId=actor.branchId

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  blockId: z.string().min(1),
  startUnit: z.number().int().nonnegative(),
  endUnit: z.number().int().nonnegative(),
  unitPrefix: z.string().max(40).optional(),
  unitPadding: z.number().int().min(0).max(6).default(3),
  propertyType: z.enum(["DAIRE", "VILLA", "ARSA", "ISYERI", "MUSTAKILEV"]).default("DAIRE"),
  listingType: z.string().default("SATILIK"),
  defaultPrice: z.number().nonnegative().default(0),
}).refine((d) => d.endUnit >= d.startUnit, { message: "Bitiş ≥ başlangıç olmalı" })
  .refine((d) => d.endUnit - d.startUnit + 1 <= 500, { message: "Tek seferde en fazla 500 daire" });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "ADMIN" && actor.role !== "MANAGER") {
    return NextResponse.json({ error: "Toplu üretim için ADMIN veya MANAGER yetkisi gerekli" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { blockId, startUnit, endUnit, unitPrefix = "", unitPadding, propertyType, listingType, defaultPrice } = parsed.data;

  // Block'un bu projeye ait olduğunu doğrula
  const block = await prisma.block.findFirst({
    where: { id: blockId, projectId },
    select: { id: true, name: true },
  });
  if (!block) return NextResponse.json({ error: "Blok bu projeye ait değil" }, { status: 400 });

  // MANAGER yetkili şubesi kontrolü
  if (actor.role === "MANAGER" && !actor.branchId) {
    return NextResponse.json({ error: "Şubeniz atanmamış" }, { status: 400 });
  }

  // Çakışmaları kontrol et: aynı blockId + unitNumber
  const targetUnits: string[] = [];
  for (let i = startUnit; i <= endUnit; i++) {
    targetUnits.push(`${unitPrefix}${i.toString().padStart(unitPadding, "0")}`);
  }
  const existing = await prisma.property.findMany({
    where: { projectId, blockId, unitNumber: { in: targetUnits } },
    select: { unitNumber: true },
  });
  const existingSet = new Set(existing.map((p) => p.unitNumber).filter((u): u is string => Boolean(u)));
  const toCreate = targetUnits.filter((u) => !existingSet.has(u));

  let createdCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const unit of toCreate) {
      await tx.property.create({
        data: {
          projectId,
          blockId,
          unitNumber: unit,
          title: `${block.name} - ${unit}`,
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
  }, { timeout: 60_000 });

  await createAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Property",
    entityId: projectId,
    newValue: { bulkCreate: true, blockId, range: `${startUnit}-${endUnit}`, created: createdCount, skipped: existingSet.size },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    created: createdCount,
    skipped: existingSet.size,
    skippedUnits: Array.from(existingSet),
  });
}
