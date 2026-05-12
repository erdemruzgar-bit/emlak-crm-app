/**
 * PDF Import — Vision Extract Script
 *
 * Akış:
 *   1. PDF → 300 DPI PNG'ler (pdftoppm)
 *   2. Her sayfayı Claude Vision'a gönder → "is_table_page" + tablo satırları JSON
 *   3. Tablo olmayan sayfaları (vaziyet planı) ayır → planPageImages[]
 *   4. Tüm sonuçları birleştirip work/extracted.json yaz
 *
 * Kullanım:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/pdf-import/extract.ts \
 *     "/path/to/file.pdf" [output.json]
 *
 * Çıktı, projects/pdf-import sayfasına yapıştırılabilir.
 *
 * NOT: pdftoppm sistemde kurulu olmalı (apt install poppler-utils).
 */

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const MODEL = "claude-opus-4-7";

const SYSTEM_PROMPT = `Sen bir Türkçe gayrimenkul tablosu okuyucususun. Sana taranmış bir PDF sayfasının görüntüsü verilecek.

İki sayfa türü vardır:
1) **Tablo sayfası** — dükkan listesi içerir. Sütunlar (soldan sağa):
   - Parsel (ör. "2124", "2125", "2126")
   - Blok No (ör. "A1-23", "A-85", "D1-2") — sol tarafı blok adı, sağ tarafı birim no
   - Zemin Kat Brüt (m²)
   - Asma Kat Brüt (m²) — genelde boş, dash veya rakam
   - Brüt (toplam, m²)
   - Tahsisler Dahil Toplam Brüt Alan (m²)
   - Dükkan Ön Kullanım Alanı (m²)
   - Otopark (m² veya boş)
   - DüzAyak (m² veya boş)
   - Toplam Satışa Esas Brüt Alan (m²)
   - Fiyat (TL, binlik nokta + virgül ondalık — Türkçe locale)
   - Aylık Kiralama Bedeli (TL)

   "Ara Toplam (N)" gibi özet satırları VARSA atla (data row değildir; data_rows dizisine ekleme).
   "GENEL TOPLAM" satırını da atla.

2) **Vaziyet planı sayfası** — mimari plan, çizim, dükkan yerleşimi. Tablo YOKTUR.

Yanıtını **sadece** aşağıdaki JSON şemasında ver, başka hiçbir metin ekleme:
{
  "is_table_page": boolean,
  "data_rows": [
    {
      "parsel": "2124",
      "blockName": "A1",         // Blok No'nun sol tarafı; "A-85" gibi tek harfli ise "A"
      "unitNumber": "23",        // Blok No'nun sağ tarafı; "A-85" → "85"
      "zeminKatBrut": 198.30,    // null ise null
      "asmaKatBrut": null,
      "brut": 198.30,
      "tahsislerDahilBrut": 239.56,
      "dukkanOnAlani": 41.26,
      "otopark": null,
      "duzAyak": null,
      "toplamSatisaEsasBrut": 318.6148,
      "fiyat": 106076640,        // PDF'teki TL (Türkçe locale parse edilmiş)
      "aylikKira": 589315,
      "groupLabel": null         // "Ara Toplam (41)" gibi gruplama bilgisi varsa
    }
  ],
  "warnings": ["okunamayan hücre var: satır 3 fiyat"]
}

Türkçe sayı parse: "1.234.567,89" → 1234567.89. "—" veya boş hücreler null.`;

interface ExtractedRow {
  parsel: string;
  blockName: string;
  unitNumber: string;
  zeminKatBrut: number | null;
  asmaKatBrut: number | null;
  brut: number | null;
  tahsislerDahilBrut: number | null;
  dukkanOnAlani: number | null;
  otopark: number | null;
  duzAyak: number | null;
  toplamSatisaEsasBrut: number | null;
  fiyat: number;
  aylikKira: number | null;
  groupLabel: string | null;
  sourcePage?: number;
}

interface PageResult {
  is_table_page: boolean;
  data_rows: ExtractedRow[];
  warnings?: string[];
}

async function extractPage(
  client: Anthropic,
  pngPath: string,
  pageNum: number
): Promise<PageResult> {
  const imageBytes = fs.readFileSync(pngPath);
  const imageBase64 = imageBytes.toString("base64");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: imageBase64 },
          },
          { type: "text", text: `Sayfa ${pageNum}'i çıkar.` },
        ],
      },
    ],
  });

  const textBlock = res.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`Sayfa ${pageNum}: model metin yanıt vermedi`);
  }
  let raw = textBlock.text.trim();
  // ```json ... ``` bloklarını temizle
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

  let parsed: PageResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Sayfa ${pageNum}: JSON parse hatası. Ham yanıt:\n${raw.slice(0, 400)}`);
  }
  return parsed;
}

async function main() {
  const [pdfArg, outArg] = process.argv.slice(2);
  if (!pdfArg) {
    console.error("Kullanım: npx tsx scripts/pdf-import/extract.ts <pdf-path> [output.json]");
    process.exit(2);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY env değişkeni gerekli.");
    process.exit(2);
  }
  if (!fs.existsSync(pdfArg)) {
    console.error(`PDF bulunamadı: ${pdfArg}`);
    process.exit(2);
  }

  const workDir = path.resolve(path.dirname(pdfArg), "pdf-import-work");
  fs.mkdirSync(workDir, { recursive: true });

  // 1) PDF → PNG'ler (300 DPI)
  console.log("→ PDF'i 300 DPI PNG'lere çeviriyorum…");
  const pngPrefix = path.join(workDir, "page");
  // İlgili PNG'leri temizle (idempotent çalışma)
  for (const f of fs.readdirSync(workDir)) {
    if (f.startsWith("page-") && f.endsWith(".png")) fs.unlinkSync(path.join(workDir, f));
  }
  execSync(`pdftoppm -r 300 -png "${pdfArg}" "${pngPrefix}"`, { stdio: "inherit" });

  const pages = fs
    .readdirSync(workDir)
    .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
    .sort((a, b) => {
      const an = parseInt(a.match(/page-(\d+)/)?.[1] || "0");
      const bn = parseInt(b.match(/page-(\d+)/)?.[1] || "0");
      return an - bn;
    });
  console.log(`→ ${pages.length} sayfa bulundu.`);

  // 2) Her sayfayı Vision'a sor
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const allRows: ExtractedRow[] = [];
  const planPages: string[] = [];
  const allWarnings: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const pngPath = path.join(workDir, pages[i]);
    console.log(`→ Sayfa ${pageNum}/${pages.length} işleniyor: ${pages[i]}`);
    try {
      const result = await extractPage(client, pngPath, pageNum);
      if (result.is_table_page) {
        for (const row of result.data_rows) {
          allRows.push({ ...row, sourcePage: pageNum });
        }
        console.log(`   tablo · ${result.data_rows.length} satır`);
      } else {
        planPages.push(pages[i]);
        console.log("   vaziyet planı (tablo değil)");
      }
      if (result.warnings) allWarnings.push(...result.warnings.map((w) => `sayfa ${pageNum}: ${w}`));
    } catch (e) {
      console.error(`   HATA: ${e instanceof Error ? e.message : e}`);
      allWarnings.push(`sayfa ${pageNum}: çıkarma hatası - ${e instanceof Error ? e.message : ""}`);
    }
  }

  // 3) Sonucu yaz
  const output = {
    project: {
      name: "Meydan Başakşehir",
      code: "MEYDAN",
      description:
        "Kiralık dükkanlar — 180 ay vadeli kira sözleşmesi. Fiyatlar liste × %20 yansıtılmış (PDF). Aylık kira ≈ fiyat / 180.",
      city: "İstanbul",
      district: "Başakşehir",
    },
    rows: allRows,
    planPageFiles: planPages.map((p) => path.join(workDir, p)),
    sitePlanImageUrls: [],
    warnings: allWarnings,
    extractedAt: new Date().toISOString(),
    pdf: pdfArg,
  };

  const outputPath = outArg || path.join(workDir, "extracted.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✓ ${allRows.length} satır, ${planPages.length} plan sayfası → ${outputPath}`);
  if (allWarnings.length) {
    console.log(`\n⚠ ${allWarnings.length} uyarı:`);
    for (const w of allWarnings.slice(0, 10)) console.log("  -", w);
  }
  console.log(`\nSıradaki adım:`);
  console.log(`  1) Plan sayfalarını /api/upload üzerinden yükle (UI yapacak)`);
  console.log(`  2) Bu JSON'u /projects/pdf-import sayfasına yapıştır`);
  console.log(`  3) Operatör kontrol et + "İçe aktar" düğmesine bas`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
