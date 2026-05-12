import { z } from "zod/v4";

/**
 * PDF'ten Claude Vision ile çıkarılan ham satır.
 *
 * Tipik bir Meydan Başakşehir satırı:
 *   parsel="2124", blockName="A1", unitNumber="23",
 *   zeminKatBrut=198.30, asmaKatBrut=null, brut=198.30,
 *   tahsislerDahilBrut=239.56, dukkanOnAlani=41.26,
 *   otopark=null, duzAyak=null, toplamSatisaEsasBrut=318.6148,
 *   fiyat=106076640, aylikKira=589315
 *
 * Formüller (kullanıcının PDF'inden çıkarılan, doğrulanmıştır):
 *   - fiyat (PDF'teki) = liste_fiyatı × 1.20 (ÖNEMLİ: PDF'te zaten %20 yansımış)
 *   - aylikKira ≈ fiyat / 180  (180 ay = 15 yıllık kira süresi)
 */
export interface ExtractedRow {
  parsel: string;           // "2124", "2125", "2126"
  blockName: string;        // "A1", "A2", "B3", "D1", "A" (2126'da)
  unitNumber: string;       // "23", "85", "27"
  zeminKatBrut: number | null;
  asmaKatBrut: number | null;
  brut: number | null;
  tahsislerDahilBrut: number | null;
  dukkanOnAlani: number | null;
  otopark: number | null;
  duzAyak: number | null;
  toplamSatisaEsasBrut: number | null;
  fiyat: number;            // PDF'teki TL — ZATEN +%20 yansımış (sistem fiyatı budur)
  aylikKira: number | null; // PDF'teki aylık kira TL — fiyat/180 ile doğrulanır
  /** Hangi sayfada görünüyor (debug için) */
  sourcePage?: number;
  /** Hangi ara-toplam grubuna ait (operationalNote'a yansır) */
  groupLabel?: string;
  /** Vision'ın güven skorunu yansıtan opsiyonel notlar (operatörün dikkatini çekmek için) */
  warnings?: string[];
}

/**
 * Commit endpoint'in beklediği payload.
 * - rows: operatörün düzelttiği satırlar
 * - project: var olan veya oluşturulacak proje
 * - sitePlanImageUrls: vaziyet planı PNG URL'leri (önce /api/upload ile yüklenmiş olmalı)
 */
export const commitPayloadSchema = z.object({
  project: z.object({
    name: z.string().min(2).max(120),
    code: z.string().max(40).optional(),
    description: z.string().max(2000).optional(),
    city: z.string().max(80).optional(),
    district: z.string().max(80).optional(),
    developer: z.string().max(120).optional(),
  }),
  autoCreateBlocks: z.boolean().default(true),
  rows: z
    .array(
      z.object({
        blockName: z.string().min(1).max(40),
        unitNumber: z.string().min(1).max(32),
        // Parsel adı — Block.name'e dahil edilir ("2124-A1" gibi)
        parsel: z.string().max(40).optional(),
        area: z.number().nonnegative().nullable().optional(),           // m² (toplamSatisaEsasBrut tercih)
        zeminKatBrut: z.number().nonnegative().nullable().optional(),
        asmaKatBrut: z.number().nonnegative().nullable().optional(),
        dukkanOnAlani: z.number().nonnegative().nullable().optional(),
        floor: z.number().int().nullable().optional(),
        viewType: z.string().max(80).optional(),
        // Satış/kira fiyatı (zaten +%20 yansımış olarak gelir; price alanına direkt yazılır)
        fiyat: z.number().nonnegative(),
        aylikKira: z.number().nonnegative().nullable().optional(),
        groupLabel: z.string().max(80).optional(),
      })
    )
    .min(1)
    .max(500),
  sitePlanImageUrls: z.array(z.string().url().or(z.string().startsWith("/"))).max(20).default([]),
});

export type CommitPayload = z.infer<typeof commitPayloadSchema>;

export interface CommitResult {
  ok: true;
  projectId: string;
  importBatchId: string;
  createdProperties: number;
  skippedConflicts: number;
  createdBlocks: number;
  sitePlanCount: number;
}
