// Excel export/import yardımcıları — xlsx (SheetJS) üzerinden
import * as XLSX from "xlsx";

// Her sütun başlığı + genişlik tanımı
export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  transform?: (value: unknown, row: T) => string | number | null;
}

// Veriyi .xlsx buffer'ına çevir
export function buildExcel<T>(
  data: T[],
  columns: ColumnDef<T>[],
  sheetName = "Sheet1"
): Buffer {
  const wb = XLSX.utils.book_new();

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const raw = (row as Record<string, unknown>)[c.key as string];
      if (c.transform) return c.transform(raw, row);
      if (raw == null) return "";
      if (raw instanceof Date) return raw.toLocaleString("tr-TR");
      if (Array.isArray(raw)) return raw.join(", ");
      if (typeof raw === "object") return JSON.stringify(raw);
      return raw as string | number;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Sütun genişlikleri
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));

  // Başlık satırı biçimlendirme (xlsx open-source, cell styling kısıtlı)
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buf as Buffer;
}

// İçe aktarma: .xlsx veya .csv ArrayBuffer -> satır array'i
export function parseExcel(buffer: ArrayBuffer | Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: false, // tarihleri string olarak al; custom parser'da Date'e çeviririz
  });
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

// Türkçe tarih string → Date (DD.MM.YYYY veya ISO)
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
