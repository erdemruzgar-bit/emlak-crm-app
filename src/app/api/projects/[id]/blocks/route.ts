import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { z } from "zod/v4";

const blockCreateSchema = z.object({
  name: z.string().min(1),
  totalUnits: z.number().int().positive().optional(),
});

export async function POST(
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
    const parsed = blockCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id }, select: { id: true } });
    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
    }

    const block = await prisma.block.create({
      data: { ...parsed.data, projectId: id },
    });
    return NextResponse.json(block, { status: 201 });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Bu isimde blok zaten var" }, { status: 409 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
