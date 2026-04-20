import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const projectCreateSchema = z.object({
  name: z.string().min(2, "Proje adı en az 2 karakter olmalı"),
  city: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  developer: z.string().optional(),
  description: z.string().optional(),
  blocks: z
    .array(
      z.object({
        name: z.string().min(1),
        totalUnits: z.number().int().positive().optional(),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const projects = await prisma.project.findMany({
      where,
      include: {
        blocks: { orderBy: { name: "asc" } },
        _count: { select: { properties: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = projectCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { blocks, ...projectData } = parsed.data;

    const project = await prisma.project.create({
      data: {
        ...projectData,
        blocks: blocks && blocks.length > 0 ? { create: blocks } : undefined,
      },
      include: { blocks: true },
    });

    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      entity: "Project",
      entityId: project.id,
      newValue: { name: project.name, blocks: blocks?.length ?? 0 },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
