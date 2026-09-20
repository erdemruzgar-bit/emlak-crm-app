import { z } from "zod/v4";

// TR telefon format kontrolü — boşluk/tire/parantez toleranslı, 10 haneli numara
// (cep 5XX veya sabit hat 2XX/3XX/4XX). +90 / 90 / 0 prefix opsiyonel.
// Trim öncesi yapılır — leading/trailing space kullanıcı hatasını affeder.
// DEĞİŞTİRİLMEDİ: TR davranışı birebir korunmalı, altındaki isValidPhone bunu ilk dal olarak kullanır.
const trPhoneRegex = /^(?:\+?90)?[\s\-()]*0?[2-5]\d{2}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}$/;

// Yurt dışı numara desteği (20 Eyl 2026). Müşteri "7 916 074 41 63" gibi bir numarayı
// giremiyordu; kural TR'ye kilitliydi. Kural seti, TR davranışını üst küme olarak korur:
//
//  1) "+90"/"90" ile başlayan girdi SADECE trPhoneRegex'e tabidir. Aksi halde eksik haneli
//     bir TR numarası ("+90 532 320 85 9") başındaki "+" sayesinde yurt dışı dalına düşüp
//     sessizce kabul edilirdi — bugün reddedilen bozuk numaralar yarın DB'ye girerdi.
//  2) "00" uluslararası çıkış önekidir, AMA "00532 576 7230" gerçek bir TR yazımıdır
//     (bkz. src/lib/phone.ts başlığındaki Excel formatları). "00" atıldıktan sonra kalan
//     kısım TR kalıbına uyuyorsa TR sayılır; uymuyorsa yurt dışı.
//  3) "+" yazılmadan girilen yurt dışı numarası da kabul edilir — danışmanlar numarayı
//     WhatsApp'tan "7 916 074 41 63" diye kopyalıyor. Ayrım ölçütü: 11-15 hane ve "0" ile
//     başlamıyor olması. Böylece "532320859" (9 haneli eksik TR) reddedilmeye devam eder.
//
// Değer NORMALİZE EDİLMEZ, kullanıcının yazdığı gibi saklanır. Canlı DB'de 704 telefon
// 10 farklı yazımda duruyor (368 "NNNNNNNNNNN", 255 "NNNN NNN NN NN", 1 "+NN ..."); tek
// taraflı normalize yeni kayıtları eskilerden ayırır ve ham string üzerinde çalışan
// arama/dedupe/maskeleme davranışını bozardı.
const phoneAllowedChars = /^[0-9+\s\-().]+$/;

// E.164 üst sınırı 15 hane. "0" ile başlayan ülke kodu yoktur.
function isIntlDigits(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0");
}

function isValidPhone(val: string): boolean {
  if (!phoneAllowedChars.test(val)) return false; // harf / kontrol karakteri
  const compact = val.replace(/[\s\-().]/g, "");
  if ((compact.match(/\+/g)?.length ?? 0) > 1) return false;
  if (compact.includes("+") && !compact.startsWith("+")) return false;

  const digits = compact.replace(/\D/g, "");
  if (!digits) return false;

  // (1) TR kapısı — "+90"/"90" ile başlayan her şey yalnızca TR kuralına tabi
  if (/^\+?90/.test(compact)) return trPhoneRegex.test(val);

  // (2) "00" çıkış öneki — kalanı önce TR olarak dene
  if (digits.startsWith("00")) {
    const rest = digits.slice(2);
    return trPhoneRegex.test(rest) || isIntlDigits(rest);
  }

  // (3) Bugünkü TR kuralı — davranış aynen korunuyor
  if (trPhoneRegex.test(val)) return true;

  // (4) "+" ile yazılmış yurt dışı numarası
  if (compact.startsWith("+")) return isIntlDigits(digits);

  // (5) "+" olmadan yazılmış yurt dışı numarası. "0" ile başlıyorsa TR yazımıdır, yurt dışı
  //     sayılamaz; 11 hane alt sınırı eksik haneli TR numaralarının sızmasını engeller.
  if (digits.startsWith("0")) return false;
  return digits.length >= 11 && isIntlDigits(digits);
}

const trPhoneSchema = z
  .string()
  .transform((val) => val.trim())
  .refine(
    (val) => val === "" || isValidPhone(val),
    { message: "Geçersiz telefon formatı. Türkiye için 10 haneli numara girin (örn. 0532 123 45 67), yurt dışı numarayı ülke koduyla yazın (örn. +7 916 074 41 63)" },
  )
  .nullable()
  .optional()
  .or(z.literal(""));

// Frontend'den `null` gelen DB-nullable alanlar için (boş/silinmiş alan = null).
// `.optional()` undefined'ı, `.nullable()` null'ı kabul eder; ikisi de gerek.
const optionalString = z.string().nullable().optional();

// Talep profili alanları
const demandProfileFields = {
  stage: z.enum(["LEAD", "QUALIFIED", "ACTIVE", "SHOWING", "OFFER", "CONTRACT", "CLOSED", "LOST"]).nullable().optional(),
  minBudget: z.number().min(0).nullable().optional(),
  maxBudget: z.number().min(0).nullable().optional(),
  budgetCurrency: optionalString,
  urgency: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable().optional(),
  desiredMoveDate: optionalString, // ISO date string
  preferredTypes: z.array(z.string()).optional(),
  preferredListingTypes: z.array(z.string()).optional(), // ["SATILIK", "KIRALIK"] — ListingTypeCatalog.code
  preferredCities: z.array(z.string()).optional(),
  preferredDistricts: z.array(z.string()).optional(),
  minArea: z.number().min(0).nullable().optional(),
  maxArea: z.number().min(0).nullable().optional(),
  minRooms: optionalString,
  maxRooms: optionalString,
  preferredFeatures: z.array(z.string()).optional(),
  financingMethod: z.enum(["NAKIT", "KREDI", "TAKAS"]).nullable().optional(),
  preApprovalStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]).nullable().optional(),
  downPaymentPercent: z.number().min(0).max(100).nullable().optional(),
  tags: z.array(z.string()).optional(),
  notesSummary: optionalString,
  lastContactDate: optionalString,
  nextFollowUpDate: optionalString,
  // Müşterinin ilgilendiği projeler/siteler (Project.id'ler)
  interestedProjectIds: z.array(z.string()).optional(),
};

// Min > Max ilişkilerini doğrulayan ortak superRefine
const refineBudgetAndArea = (
  data: { minBudget?: number | null; maxBudget?: number | null; minArea?: number | null; maxArea?: number | null },
  ctx: z.RefinementCtx,
) => {
  if (data.minBudget != null && data.maxBudget != null && data.minBudget > data.maxBudget) {
    ctx.addIssue({
      code: "custom",
      path: ["maxBudget"],
      message: "Max bütçe min bütçeden büyük olmalı",
    });
  }
  if (data.minArea != null && data.maxArea != null && data.minArea > data.maxArea) {
    ctx.addIssue({
      code: "custom",
      path: ["maxArea"],
      message: "Max m² min m²'den büyük olmalı",
    });
  }
};

export const customerCreateSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalı"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalı"),
  email: z.email("Geçerli bir e-posta adresi girin").optional().or(z.literal("")),
  phone: trPhoneSchema,
  tcKimlikNo: z.string().length(11, "TC Kimlik No 11 haneli olmalı").optional().or(z.literal("")),
  address: z.string().optional(),
  customerType: z.string().min(1, "Müşteri tipi gerekli"),
  customerTypes: z.array(z.string()).optional(),  // Çoklu seçim (kira adayı + alıcı vb). Boşsa [customerType] otomatik.
  source: z.string().optional(),
  assignedAgentId: z.string().nullable().optional(),
  branchId: z.string().optional(),
  consents: z.object({
    acikRiza: z.boolean(),
    aydinlatma: z.boolean(),
    pazarlama: z.boolean(),
  }),
  ...demandProfileFields,
}).superRefine(refineBudgetAndArea);

export const customerUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.email().nullable().optional().or(z.literal("")),
  phone: trPhoneSchema,
  address: optionalString,
  customerType: z.string().min(1).optional(),
  customerTypes: z.array(z.string()).optional(),  // Çoklu seçim — gönderilirse customerType ile senkronize edilir
  source: optionalString,
  assignedAgentId: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
  ...demandProfileFields,
}).superRefine(refineBudgetAndArea);

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
