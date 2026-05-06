import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractActor } from "@/lib/rbac";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const actor = extractActor(session);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const attachment = await prisma.contractAttachment.findUnique({
      where: { id: attachmentId },
      include: { contract: { select: { id: true, branchId: true, createdById: true } } },
    });

    if (!attachment || attachment.contract.id !== id) {
      return NextResponse.json({ error: "Eklenti bulunamadı" }, { status: 404 });
    }

    // Erişim: ADMIN, yetkili şubelerden MANAGER, oluşturan, yükleyen
    const canAccess =
      actor.role === "ADMIN" ||
      (actor.role === "MANAGER" && !!attachment.contract.branchId && actor.branchIds.includes(attachment.contract.branchId)) ||
      attachment.contract.createdById === actor.id ||
      attachment.uploadedById === actor.id;

    if (!canAccess) {
      return NextResponse.json({ error: "Erişim yetkiniz yok" }, { status: 403 });
    }

    // fileUrl formatı: "/uploads/contracts/xyz.pdf" — public altında oku
    // Path traversal koruması
    const relativePath = attachment.fileUrl.replace(/^\//, "");
    if (!relativePath.startsWith("uploads/") || relativePath.includes("..")) {
      return NextResponse.json({ error: "Geçersiz dosya yolu" }, { status: 400 });
    }

    const absPath = join(process.cwd(), "public", relativePath);
    const fileBuffer = await readFile(absPath);

    // Download mi inline preview mi?
    const mode = req.nextUrl.searchParams.get("mode");
    const disposition = mode === "inline" ? "inline" : "attachment";
    const safeName = attachment.fileName.replace(/[^\w\s.\-_]/g, "_");

    const headers = new Headers();
    headers.set("Content-Type", attachment.mimeType || "application/octet-stream");
    headers.set("Content-Length", String(fileBuffer.length));
    headers.set(
      "Content-Disposition",
      `${disposition}; filename="${safeName}"`
    );
    headers.set("Cache-Control", "private, no-cache");

    return new NextResponse(new Uint8Array(fileBuffer), { headers });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Dosya diskte bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
