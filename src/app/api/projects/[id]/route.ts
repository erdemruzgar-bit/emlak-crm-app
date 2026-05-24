import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod/v4";

const projectUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().trim().min(1).max(32).nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  developer: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),  // RBAC: bağlı şube — o şubenin AGENT'ları projedeki tüm ilanları görür
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { name: "asc" } },
      branch: { select: { id: true, name: true } },
      _count: { select: { properties: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "MANAGER")) {
    return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = projectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const data = { ...parsed.data };
    if (typeof data.code === "string") {
      const normalized = data.code.trim();
      data.code = normalized.length > 0 ? normalized : null;
    }
    let project;
    try {
      project = await prisma.project.update({
        where: { id },
        data,
        include: { blocks: true },
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json({ error: "Bu kısa kod başka bir projede kullanılıyor" }, { status: 409 });
      }
      throw err;
    }
    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      entity: "Project",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = extractActor(session);
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece ADMIN silebilir" }, { status: 403 });
  }

  const { id } = await params;
  try {
    // Bu projeye bağlı mülk var mı?
    const count = await prisma.property.count({ where: { projectId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Bu projeye bağlı ${count} mülk var. Önce mülkleri başka bir projeye taşıyın.` },
        { status: 409 }
      );
    }
    await prisma.project.delete({ where: { id } });
    await createAuditLog({
      userId: actor.id,
      action: "DELETE",
      entity: "Project",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ message: "Proje silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
