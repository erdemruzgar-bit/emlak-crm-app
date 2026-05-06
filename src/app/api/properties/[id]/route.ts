import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { propertyUpdateSchema } from "@/lib/validations/property";
import { runPropertyMatching } from "@/lib/matching";
import { canEditProperty, canViewProperty, extractActor } from "@/lib/rbac";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        assignedAgent: { select: { name: true } },
        owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        branch: { select: { name: true } },
        project: { select: { id: true, name: true } },
        block: { select: { id: true, name: true } },
        matches: {
          include: { customer: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
    }

    const actor = extractActor(session);
    if (!canViewProperty(actor, property)) {
      return NextResponse.json({ error: "Bu ilanı görüntüleme yetkiniz yok" }, { status: 403 });
    }

    return NextResponse.json(property);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = propertyUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const old = await prisma.property.findUnique({ where: { id } });
    if (!old) {
      return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
    }

    const actor = extractActor(session);
    if (!canEditProperty(actor, old)) {
      await createAuditLog({
        userId: actor?.id,
        action: "DENIED_EDIT",
        entity: "Property",
        entityId: id,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
      });
      return NextResponse.json({ error: "Bu ilanı düzenleme yetkiniz yok" }, { status: 403 });
    }

    // Danışman değişimi: sadece MANAGER+ADMIN yetkili; MANAGER aynı şubeden seçebilir
    if (parsed.data.assignedAgentId !== undefined && parsed.data.assignedAgentId !== old.assignedAgentId) {
      if (actor?.role === "AGENT") {
        return NextResponse.json({ error: "Danışman atama yetkiniz yok" }, { status: 403 });
      }
      if (parsed.data.assignedAgentId) {
        const newAgent = await prisma.user.findUnique({
          where: { id: parsed.data.assignedAgentId },
          select: { id: true, isActive: true, branchId: true },
        });
        if (!newAgent || !newAgent.isActive) {
          return NextResponse.json({ error: "Seçilen danışman geçersiz" }, { status: 400 });
        }
        if (actor?.role === "MANAGER" && (!newAgent.branchId || !actor.branchIds.includes(newAgent.branchId))) {
          return NextResponse.json({ error: "Yalnızca yetkili olduğunuz şubelerdeki danışmana atayabilirsiniz" }, { status: 403 });
        }
      }
    }

    const property = await prisma.property.update({
      where: { id },
      data: parsed.data,
    });

    const user = session.user as unknown as Record<string, unknown>;
    await createAuditLog({
      userId: user.id as string,
      action: "UPDATE",
      entity: "Property",
      entityId: id,
      oldValue: { title: old.title, status: old.status },
      newValue: { title: property.title, status: property.status },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    runPropertyMatching(id).catch(() => {});

    return NextResponse.json(property);
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
  if (actor?.role !== "ADMIN") {
    await createAuditLog({
      userId: actor?.id,
      action: "DENIED_EDIT",
      entity: "Property",
      entityId: (await params).id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ error: "Sadece sistem yöneticisi ilan silebilir" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.appointment.updateMany({ where: { propertyId: id }, data: { propertyId: null } }),
      prisma.property.delete({ where: { id } }),
    ]);

    await createAuditLog({
      userId: actor.id,
      action: "DELETE",
      entity: "Property",
      entityId: id,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ message: "İlan silindi" });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
