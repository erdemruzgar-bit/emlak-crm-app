import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readFile } from "fs/promises";
import { join } from "path";

// Sadece [a-z0-9-] izin verilir → path traversal koruması
const KEY_PATTERN = /^[a-z0-9-]+$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "Geçersiz yardım anahtarı" }, { status: 400 });
  }

  try {
    const path = join(process.cwd(), "docs", "help", `${key}.md`);
    const content = await readFile(path, "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Yardım içeriği bulunamadı" }, { status: 404 });
  }
}
