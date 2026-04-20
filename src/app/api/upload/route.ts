import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { auth } from "@/lib/auth";

const ALLOWED_IMAGE = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_DOCUMENT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Dosya çok büyük (max 100MB)" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE.includes(file.type);
    const isVideo = ALLOWED_VIDEO.includes(file.type);
    const isDocument = ALLOWED_DOCUMENT.includes(file.type);

    if (!isImage && !isVideo && !isDocument) {
      return NextResponse.json({
        error: "Desteklenmeyen dosya türü. JPG, PNG, WEBP, MP4, MOV, PDF veya Word belgesi yükleyebilirsiniz."
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const subfolder = formData.get("folder")?.toString() || "";
    const safeSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, "");
    const uploadDir = safeSubfolder
      ? join(process.cwd(), "public", "uploads", safeSubfolder)
      : join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const defaultExt = isVideo ? ".mp4" : isDocument ? ".pdf" : ".jpg";
    const safeExt = extname(file.name).toLowerCase() || defaultExt;
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    const publicPath = safeSubfolder
      ? `/uploads/${safeSubfolder}/${filename}`
      : `/uploads/${filename}`;

    return NextResponse.json({
      url: publicPath,
      mediaType: isVideo ? "video" : isDocument ? "document" : "image",
      mimeType: file.type,
      name: file.name,
      size: file.size,
    });
  } catch {
    return NextResponse.json({ error: "Yükleme sırasında hata oluştu" }, { status: 500 });
  }
}
