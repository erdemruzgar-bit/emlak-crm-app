// Excel export/import yardımcıları — exceljs üzerinden (xlsx/SheetJS yerine,
// 2026-05-24 high-severity ReDoS + prototype pollution zafiyetlerinden ötürü).
// Önemli: tüm fonksiyonlar Promise döndürür; caller'lar `await` ile çağırmalı.
import ExcelJS from "exceljs";

// Her sütun başlığı + genişlik tanımı
export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  transform?: (value: unknown, row: T) => string | number | null;
}

// Hücreye yazılabilir değere normalize et (Date/Array/object güvenle string'e çevrilir)
function normalizeCell(value: unknown): string | number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toLocaleString("tr-TR");
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number") return value;
  return String(value);
}

// Veriyi .xlsx buffer'ına çevir
export async function buildExcel<T>(
  data: T[],
  columns: ColumnDef<T>[],
  sheetName = "Sheet1"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: String(c.key),
    width: c.width ?? 18,
  }));

  for (const row of data) {
    const rowObj: Record<string, string | number | null> = {};
    for (const c of columns) {
      const raw = (row as Record<string, unknown>)[c.key as string];
      const transformed = c.transform ? c.transform(raw, row) : normalizeCell(raw);
      rowObj[String(c.key)] = transformed ?? null;
    }
    sheet.addRow(rowObj);
  }

  // Başlık satırını kalın yap (görsel ipucu)
  sheet.getRow(1).font = { bold: true };

  const ab = await workbook.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

// Birden fazla sheet ile workbook üret (reports/export gibi durumlar için)
export interface SheetSpec<T> {
  name: string;
  data: T[];
  columns: ColumnDef<T>[];
}

export async function buildExcelMultiSheet(sheets: SheetSpec<unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name);
    sheet.columns = spec.columns.map((c) => ({
      header: c.header,
      key: String(c.key),
      width: c.width ?? 18,
    }));
    for (const row of spec.data) {
      const rowObj: Record<string, string | number | null> = {};
      for (const c of spec.columns) {
        const raw = (row as Record<string, unknown>)[c.key as string];
        const transformed = c.transform ? c.transform(raw, row) : normalizeCell(raw);
        rowObj[String(c.key)] = transformed ?? null;
      }
      sheet.addRow(rowObj);
    }
    sheet.getRow(1).font = { bold: true };
  }
  const ab = await workbook.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

// İçe aktarma: .xlsx veya .csv ArrayBuffer -> satır array'i (ilk sheet, başlık satırı = key'ler)
export async function parseExcel(buffer: ArrayBuffer | Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs load: Buffer ya da ArrayBuffer/Uint8Array kabul ediyor; ts tip uyumu için ArrayBuffer kullan
  const ab: ArrayBuffer = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    : (buffer as ArrayBuffer);
  await workbook.xlsx.load(ab);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  // İlk satır = başlıklar
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, unknown>[] = [];
  // 2. satırdan itibaren veri
  for (let i = 2; i <= sheet.actualRowCount; i++) {
    const row = sheet.getRow(i);
    if (!row.hasValues) continue;
    const obj: Record<string, unknown> = {};
    let hasAny = false;
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (!header) continue;
      const cell = row.getCell(j + 1);
      const v = cell.value;
      // exceljs date'leri Date objesi olarak döner; raw:false'a eşdeğer için string'e çeviriyoruz.
      // Ama bazı caller'lar (parseTrDate) hem Date hem string kabul ediyor — Date'i olduğu gibi bırakıyoruz.
      let value: unknown = v;
      if (v && typeof v === "object" && "richText" in v) {
        // Rich text → düz metin birleştir
        value = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
      } else if (v && typeof v === "object" && "text" in v) {
        // Hyperlink veya formula sonucu
        value = (v as { text: unknown }).text;
      } else if (v && typeof v === "object" && "result" in v) {
        // Formula sonucu
        value = (v as { result: unknown }).result;
      }
      if (value != null && value !== "") hasAny = true;
      obj[header] = value ?? null;
    }
    if (hasAny) rows.push(obj);
  }
  return rows;
}

// HTTP response'u döndürmek için Next.js helper
export function excelResponse(buffer: Buffer, filename: string): Response {
  const encoded = encodeURIComponent(filename);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
    },
  });
}

// Türkçe tarih string → Date (DD.MM.YYYY veya ISO). Date objesi gelirse aynısı döner.
export function parseTrDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return null;
  // ISO format (YYYY-MM-DD veya YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD.MM.YYYY veya DD/MM/YYYY
  const m = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}
