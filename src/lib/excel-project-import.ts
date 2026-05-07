// Sega/NET tarzı proje çalışma defterini Excel satırından yapısal forma dönüştürür.
// SAF FONKSİYON — Prisma/auth/file system import etmez, kolayca test edilir.
//
// Beklenen Türkçe başlıklar:
//   Blok | Daire | M2 | KAT | MANZARA | MUTFAK | ODA SAYISI |
//   Malik/Kiracı | Adı Soyadı | E-Posta | Telefon | DURUM | GÖRÜŞME NOTU

import { parseDualPhoneCell } from "./phone";

export interface RawProjectRow {
  [key: string]: unknown;
}

export interface ParsedRow {
  index: number;                             // Excel sıra no (header sonrası 2'den)
  raw: RawProjectRow;                        // Orijinal satır (debug için)
  blockName: string | null;
  unitNumber: string | null;
  area: number | null;
  floor: number | null;
  viewType: string | null;
  kitchenType: "ACIK" | "KAPALI" | null;
  rooms: string | null;
  hasBalcony: boolean | null;
  customerType: string;                      // CustomerTypeCatalog.code
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerAltPhone: string | null;
  occupancyStatus: string | null;            // OccupancyStatusCatalog.code (varsa)
  operationalNote: string | null;            // map dışı DURUM
  callLog: string | null;                    // GÖRÜŞME NOTU full
  errors: string[];
  warnings: string[];
}

const ROW_KEYS = {
  blok: ["Blok", "BLOK", "blok"],
  daire: ["Daire", "DAİRE", "DAIRE", "daire"],
  m2: ["M2", "m2", "Metrekare", "M²"],
  kat: ["KAT", "Kat", "kat"],
  manzara: ["MANZARA", "Manzara", "manzara"],
  mutfak: ["MUTFAK", "Mutfak", "mutfak"],
  oda: ["ODA SAYISI", "ODA", "Oda Sayısı", "Oda"],
  malik: ["Malik / Kiracı", "Malik/Kiracı", "MALIK / KIRACI", "Malik"],
  ad: ["Adı Soyadı", "Ad Soyad", "Adı  Soyadı", "İsim", "ISIM"],
  email: ["E-Posta", "E-posta", "Email", "E-Mail", "EMAIL"],
  tel: ["Telefon", "TELEFON", "Tel"],
  durum: ["DURUM", "Durum", "durum"],
  not: ["GÖRÜŞME NOTU", "Görüşme Notu", "Not", "NOT", "Açıklama"],
} as const;

function pick(row: RawProjectRow, keys: readonly string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function pickNumber(row: RawProjectRow, keys: readonly string[]): number | null {
  const s = pick(row, keys);
  if (!s) return null;
  // Türkçe sayı: virgül → nokta
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (!isFinite(n)) return null;
  return n;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const t = full.trim().replace(/\s+/g, " ");
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/**
 * "2+1 ( TERASLI )" → { rooms: "2+1", hasBalcony: true }
 * "1+1" → { rooms: "1+1", hasBalcony: null }
 * "" → { rooms: null, hasBalcony: null }
 */
function parseRoomCell(input: string): { rooms: string | null; hasBalcony: boolean | null } {
  if (!input) return { rooms: null, hasBalcony: null };
  const m = input.match(/(\d+\s*\+\s*\d+|\d+|stüdyo|dubleks)/i);
  const rooms = m ? m[0].replace(/\s+/g, "") : null;
  const hasBalcony = /TERAS|BALKON/i.test(input) ? true : null;
  return { rooms, hasBalcony };
}

const OCC_MAP: Array<[RegExp, string]> = [
  [/KENDİSİ\s*OTUR|SAHIBI\s*OTUR/i, "SAHIBI_OTURUYOR"],
  [/KAPORA/i, "KAPORA_ALINDI"],
  [/SÖZLEŞME|SOZLESME/i, "SOZLESME_ALINDI"],
  [/KİRACI|KIRACI|KİRADA|KIRADA|KİRAYA\s*VERİL|KİRALIYOR|KIRALIYOR|KİRAYA\s*VERIL/i, "KIRACILI"],
  [/\bBOŞ\b|\bBOS\b|BOŞTA|BOSTA/i, "BOS"],
  [/ARŞİV|ARSIV/i, "ARSIV"],
];

/**
 * "KİRALIYOR / 40.000 TL / 2 DEPOZİTO" → { occupancyStatus: "KIRACILI", operationalNote: full }
 * "FAGO KARLOTTAN ALMIŞ TAKİP!" → { occupancyStatus: null, operationalNote: full }
 */
function mapOccupancy(durum: string): { occupancyStatus: string | null; operationalNote: string | null } {
  if (!durum) return { occupancyStatus: null, operationalNote: null };
  for (const [re, code] of OCC_MAP) {
    if (re.test(durum)) {
      // Eşleşen ama ek bilgi içeren uzun durum'u operasyonel nota yaz (>40 karakter)
      const opNote = durum.length > 40 ? durum : null;
      return { occupancyStatus: code, operationalNote: opNote };
    }
  }
  // Eşleşme yoksa tüm metni operasyonel nota at
  return { occupancyStatus: null, operationalNote: durum };
}

const CUSTOMER_TYPE_MAP: Array<[RegExp, string]> = [
  [/KAT\s*MAL|MAL\s*SAH|EV\s*SAH|MALIK|MAL[İI]K|SAH[İI]B/i, "LANDLORD"],
  [/KIRACI|KİRACI|TENANT/i, "TENANT"],
];

function mapCustomerType(input: string): string {
  if (!input) return "LANDLORD";
  for (const [re, code] of CUSTOMER_TYPE_MAP) {
    if (re.test(input)) return code;
  }
  return "LANDLORD";
}

function mapKitchen(input: string): "ACIK" | "KAPALI" | null {
  if (!input) return null;
  if (/AÇIK|ACIK|OPEN/i.test(input)) return "ACIK";
  if (/KAPALI|CLOSED/i.test(input)) return "KAPALI";
  return null;
}

/**
 * Tek bir Excel satırını parse eder. errors boş ise satır geçerli.
 */
export function parseProjectRow(row: RawProjectRow, index: number): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const blockName = pick(row, ROW_KEYS.blok) || null;
  const unitNumber = pick(row, ROW_KEYS.daire) || null;

  if (!blockName) errors.push("Blok kolonu boş");
  if (!unitNumber) errors.push("Daire kolonu boş");

  const m2 = pickNumber(row, ROW_KEYS.m2);
  // Excel'de M2=0 placeholder; null olarak ele al
  const area = m2 != null && m2 > 0 ? m2 : null;

  const floor = pickNumber(row, ROW_KEYS.kat);
  const viewType = pick(row, ROW_KEYS.manzara) || null;
  const kitchenType = mapKitchen(pick(row, ROW_KEYS.mutfak));

  const odaCell = pick(row, ROW_KEYS.oda);
  const { rooms, hasBalcony } = parseRoomCell(odaCell);

  const customerType = mapCustomerType(pick(row, ROW_KEYS.malik));

  const fullName = pick(row, ROW_KEYS.ad);
  const { firstName, lastName } = splitName(fullName);
  if (!firstName) warnings.push("Sahip adı boş — kayıt sahipsiz oluşturulacak");

  const email = pick(row, ROW_KEYS.email) || null;

  const telCell = pick(row, ROW_KEYS.tel);
  const { phone, altPhone } = parseDualPhoneCell(telCell);
  if (!phone && !email && firstName) {
    warnings.push("Telefon ve e-posta yok — sahip dedupe yapılamaz");
  }

  const durumCell = pick(row, ROW_KEYS.durum);
  const { occupancyStatus, operationalNote } = mapOccupancy(durumCell);

  const callLog = pick(row, ROW_KEYS.not) || null;

  return {
    index,
    raw: row,
    blockName,
    unitNumber,
    area,
    floor: floor != null ? Math.round(floor) : null,
    viewType,
    kitchenType,
    rooms,
    hasBalcony,
    customerType,
    ownerFirstName: firstName,
    ownerLastName: lastName,
    ownerEmail: email,
    ownerPhone: phone,
    ownerAltPhone: altPhone,
    occupancyStatus,
    operationalNote,
    callLog,
    errors,
    warnings,
  };
}

export function parseProjectRows(rows: RawProjectRow[]): ParsedRow[] {
  return rows.map((r, i) => parseProjectRow(r, i + 2)); // +2 çünkü Excel 1-indexed + header
}
