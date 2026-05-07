// Bir projenin tüm dairelerini, sahibini, son notunu, görüşme sayısını döndürür.
// Owner hassas alanları (telefon, e-posta) AGENT için maskelidir;
// "Göster" akışı mevcut /api/customers/[id]/access-sessions üzerinden işler.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { applyAccessMask } from "@/lib/access-control";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const actor = extractActor(session);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const url = new URL(req.url);
  const blockId = url.searchParams.get("blockId") || undefined;
  const search = (url.searchParams.get("search") || "").trim();
  const hasOwner = url.searchParams.get("hasOwner") || ""; // "yes" | "no" | ""
  const occupancy = url.searchParams.get("occupancyStatus") || undefined;

  // RBAC: AGENT yalnızca yetkili olduğu şubelerin daireleri
  // (MANAGER ve ADMIN tüm projeyi görür; MANAGER'ın **düzenleme** kapsamı
  // canEditProperty ile satır bazlı kontrol edilir)
  const branchClause: Record<string, unknown> | undefined =
    actor.role === "AGENT"
      ? actor.branchIds.length
        ? { branchId: { in: actor.branchIds } }
        : { branchId: "__no_branch__" }
      : undefined;

  const where: Record<string, unknown> = {
    projectId,
    ...(blockId ? { blockId } : {}),
    ...(occupancy ? { occupancyStatus: occupancy } : {}),
    ...(branchClause ?? {}),
  };

  if (search) {
    where.OR = [
      { unitNumber: { contains: search, mode: "insensitive" } },
      { owner: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      } },
    ];
  }

  if (hasOwner === "yes") where.ownerId = { not: null };
  else if (hasOwner === "no") where.ownerId = null;

  const properties = await prisma.property.findMany({
    where,
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
      status: true,
      branchId: true,
      assignedAgentId: true,
      block: { select: { id: true, name: true } },
      owner: {
        select: {
          id: true,
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
        take: 1,
        select: {
          id: true,
          kind: true,
          content: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
      _count: { select: { notes: true, appointments: true } },
    },
    orderBy: [{ block: { name: "asc" } }, { unitNumber: "asc" }],
  });

  // Owner hassas alanlarını maskele (AGENT için)
  const result = properties.map((p) => {
    let masked = p.owner;
    let ownerSensitiveGated = false;
    if (p.owner) {
      const m = applyAccessMask(p.owner, actor);
      ownerSensitiveGated = m.sensitiveGated;
      masked = {
        ...p.owner,
        phone: m.phone,
        email: m.email,
        // altPhone ayrı bir hassas alan; phone ile aynı kapı
        altPhone: m.sensitiveGated ? null : p.owner.altPhone,
        tcKimlikNo: m.tcKimlikNo,
      };
    }

    const lastNote = p.notes[0];
    return {
      id: p.id,
      unitNumber: p.unitNumber,
      area: p.area,
      floor: p.floor,
      rooms: p.rooms,
      viewType: p.viewType,
      kitchenType: p.kitchenType,
      hasBalcony: p.hasBalcony,
      occupancyStatus: p.occupancyStatus,
      operationalNote: p.operationalNote,
      status: p.status,
      branchId: p.branchId,
      assignedAgentId: p.assignedAgentId,
      block: p.block,
      owner: masked,
      ownerSensitiveGated,
      lastNote: lastNote
        ? {
            id: lastNote.id,
            kind: lastNote.kind,
            contentPreview: lastNote.content.slice(0, 140),
            createdAt: lastNote.createdAt,
            userName: lastNote.user?.name ?? null,
          }
        : null,
      noteCount: p._count.notes,
      appointmentCount: p._count.appointments,
    };
  });

  return NextResponse.json({ properties: result, total: result.length });
}
