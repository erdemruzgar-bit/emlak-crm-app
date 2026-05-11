/**
 * Toplu mülk üretimi için yapıştırılabilir liste parser'ı.
 *
 * Beklenen format (tab veya çoklu boşluk ayraçlı, 3 sütun):
 *   <proje_kodu>  <blok_adı>  <birim_no>
 *
 * Örnek:
 *   2124  A1  21
 *   2124  A1  22
 *   2125  B1  33
 *
 * Tek tek boşluklarla yapıştırılan kodları toleranslı şekilde böler;
 * boş satırları ve trailing whitespace'i temizler.
 */

export interface ParsedBulkRow {
  lineNumber: number;
  /** Kullanıcının yazdığı proje tanımlayıcısı — kısa kod (Project.code) veya proje adı olabilir */
  projectRef: string;
  blockName: string;
  unitNumber: string;
}

export interface BulkPasteParseResult {
  rows: ParsedBulkRow[];
  errors: { lineNumber: number; raw: string; reason: string }[];
}

export const BULK_PASTE_MAX_ROWS = 1000;

export function parseBulkPaste(input: string): BulkPasteParseResult {
  const rows: ParsedBulkRow[] = [];
  const errors: { lineNumber: number; raw: string; reason: string }[] = [];

  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  let lineNumber = 0;
  for (const raw of lines) {
    lineNumber++;
    const trimmed = raw.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue; // yorum satırı

    // Önce TAB veya 2+ boşluk ile bölmeyi dene (kullanıcı Excel/Sheets'ten yapıştırdıysa)
    // Bulamazsa tek-boşluk bölme yap; bu durumda proje adı çok kelimeli olabilir → son 2 parça blok+birim
    let parts = trimmed.split(/\t+|\s{2,}/).filter((p) => p.length > 0);
    if (parts.length < 2) {
      // Çok kelimeli ama tek boşlukla yazılmış → boşluğa böl, son 2 parça blok+birim, kalanı proje adı
      parts = trimmed.split(/\s+/).filter((p) => p.length > 0);
    }
    if (parts.length < 3) {
      errors.push({
        lineNumber,
        raw,
        reason: "En az 3 sütun gerekli: proje (kod veya ad), blok, birim no",
      });
      continue;
    }

    // Son iki parça her zaman blok ve birim no; kalan parçalar proje adı/kodu olarak join edilir
    const unitNumber = parts[parts.length - 1];
    const blockName = parts[parts.length - 2];
    const projectRef = parts.slice(0, parts.length - 2).join(" ");

    if (unitNumber.length > 32) {
      errors.push({ lineNumber, raw, reason: "Birim no çok uzun (max 32 karakter)" });
      continue;
    }
    rows.push({ lineNumber, projectRef, blockName, unitNumber });

    if (rows.length >= BULK_PASTE_MAX_ROWS) {
      errors.push({
        lineNumber: lineNumber + 1,
        raw: "",
        reason: `Maksimum ${BULK_PASTE_MAX_ROWS} satır işlenebilir; geri kalan satırlar yok sayıldı`,
      });
      break;
    }
  }

  return { rows, errors };
}
