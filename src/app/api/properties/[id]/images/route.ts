import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { canEditProperty, extractActor, loadPropertyForRbac } from "@/lib/rbac";

async function ensureCanEdit(req: NextRequest, session: unknown, propertyId: string) {
  const prop = await loadPropertyForRbac(propertyId);
  if (!prop) {
    return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
  }
  const actor = extractActor(session);
  if (!canEditProperty(actor, prop)) {
    await createAuditLog({
      userId: actor?.id,
      action: "DENIED_EDIT",
      entity: "PropertyImage",
      entityId: propertyId,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });
    return NextResponse.json({ error: "Bu ilanın fotoğraflarını düzenleme yetkiniz yok" }, { status: 403 });
  }
  return null;
}

// POST /api/properties/:id/images — Add image(s)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const denied = await ensureCanEdit(req, session, id);
  if (denied) return denied;

  const body = await req.json();
  const { urls } = body as { urls: string[] };

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "En az bir URL gerekli" }, { status: 400 });
  }

  const existingCount = await prisma.propertyImage.count({ where: { propertyId: id } });

  const images = await prisma.propertyImage.createManyAndReturn({
    data: urls.map((url, i) => ({
      url,
      propertyId: id,
      order: existingCount + i,
      isPrimary: existingCount === 0 && i === 0,
    })),
  });

  const user = session.user as unknown as Record<string, unknown>;
  await createAuditLog({
    userId: user.id as string,
    action: "CREATE",
    entity: "PropertyImage",
    entityId: id,
    newValue: { count: urls.length },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(images, { status: 201 });
}

// PUT /api/properties/:id/images — Replace all images
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const denied = await ensureCanEdit(req, session, id);
  if (denied) return denied;

  const body = await req.json();
  const { urls } = body as { urls: string[] };

  if (!Array.isArray(urls)) {
    return NextResponse.json({ error: "urls array gerekli" }, { status: 400 });
  }

  await prisma.propertyImage.deleteMany({ where: { propertyId: id } });

  let images: unknown[] = [];
  if (urls.length > 0) {
    images = await prisma.propertyImage.createManyAndReturn({
      data: urls.map((url, i) => ({
        url,
        propertyId: id,
        order: i,
        isPrimary: i === 0,
      })),
    });
  }

  const user = session.user as unknown as Record<string, unknown>;
  await createAuditLog({
    userId: user.id as string,
    action: "UPDATE",
    entity: "PropertyImage",
    entityId: id,
    newValue: { count: urls.length },
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json(images);
}

// DELETE /api/properties/:id/images — Delete an image
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const denied = await ensureCanEdit(req, session, id);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json({ error: "imageId gerekli" }, { status: 400 });
  }

  await prisma.propertyImage.delete({ where: { id: imageId } });

  const user = session.user as unknown as Record<string, unknown>;
  await createAuditLog({
    userId: user.id as string,
    action: "DELETE",
    entity: "PropertyImage",
    entityId: imageId,
    ipAddress: req.headers.get("x-forwarded-for") || undefined,
  });

  return NextResponse.json({ success: true });
}
