import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import { join, extname } from "path";

// Next.js prod modunda public/ altındaki dosyaları başlangıçta tarıyor; sonradan
// yüklenen dosyalar 404 veriyor. Bu API rotası dosyaları dinamik okuyup stream
// eder. Middleware /uploads/* → /api/uploads/* rewrite yapıyor, bu sayede DB'deki
// mevcut URL'ler (/uploads/xxx) değişmeden çalışmaya devam eder.

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Upload'ları yalnızca oturum açmış kullanıcılar görsün
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  // Path traversal koruması
  for (const s of segments) {
    if (!s || s.includes("..") || s.includes("/") || s.includes("\\")) {
      return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
    }
  }

  const absPath = join(process.cwd(), "public", "uploads", ...segments);
  try {
    const stats = await stat(absPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: "Dosya değil" }, { status: 404 });
    }

    const buf = await readFile(absPath);
    const ext = extname(absPath).toLowerCase();
    const mime = MIME_BY_EXT[ext] || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", mime);
    headers.set("Content-Length", String(buf.length));
    // Tarayıcı cache'i: 1 saat (uploads immutable — aynı URL aynı dosya)
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("ETag", `"${stats.size}-${stats.mtimeMs}"`);

    return new NextResponse(new Uint8Array(buf), { headers });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
