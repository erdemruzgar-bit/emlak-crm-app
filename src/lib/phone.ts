// Telefon yardımcıları — Türkiye numara normalize, çift telefon hücresi parse,
// görüntü formatı.
//
// Excel'de gelen tipik formatlar:
//   "Cep: 0532 573 53 67"
//   "Cep: 0532 573 53 67 / Diğer: 0212 555 12 34"
//   "Cep: 0532 573 53 67\nDiğer: 00532 576 7230"
//   "0 532 573 53 67"
//   "+90 532 573 53 67"

const PREFIX_RE = /^(?:cep|gsm|tel|diğer|diger|cell|mobile|phone)\s*[:.\-]?\s*/i;

/**
 * Türkiye telefonu E.164 benzeri ("+905XXXXXXXXX") formata getirir.
 * Geçersiz / boş girdide null döner.
 */
export function normalizeTrPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(PREFIX_RE, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return null;

  // 0090... → 90...
  let d = digits.replace(/^00/, "");
  // 90 prefix yoksa ekle
  if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  else if (d.length === 11 && d.startsWith("0")) d = "9" + d;
  // 12 hane ve "90" ile başlıyorsa OK
  if (d.length !== 12 || !d.startsWith("90")) {
    // Bilinen patternlere uymuyor — kullanıcıdan emin değiliz, yine de digits'i geri ver
    return digits.length >= 7 ? digits : null;
  }
  return "+" + d;
}

/**
 * Excel telefon hücresinin "Cep / Diğer" formatını ayırır.
 * Tek değer varsa altPhone null olur.
 */
export function parseDualPhoneCell(cell: string | null | undefined): {
  phone: string | null;
  altPhone: string | null;
} {
  if (!cell) return { phone: null, altPhone: null };

  // Slash, newline, " ve " ya da virgül + Diğer/Cep kelimesi ile böl
  const parts = cell
    .split(/[\n\/,]|(?:\s+ve\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const phones: string[] = [];
  for (const part of parts) {
    const norm = normalizeTrPhone(part);
    if (norm && !phones.includes(norm)) phones.push(norm);
  }

  return {
    phone: phones[0] ?? null,
    altPhone: phones[1] ?? null,
  };
}

/**
 * "+905325735367" → "0532 573 53 67" (Türkiye standart görünümü).
 * Standart formata uymayan girdilerde olduğu gibi döner.
 */
export function formatTrPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) {
    const d = digits.slice(2);
    return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  }
  return value;
}

/**
 * Maskelenmiş gösterim: "5** *** ** 67" — son 2 hane görünür.
 * AGENT'a KVKK kapısı arkasında gösterilir.
 */
export function maskPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  const tail = digits.slice(-2);
  return `5** *** ** ${tail}`;
}

/**
 * Customer dedupe için: telefonun son 10 hanesini döner (operatör/ülke kodundan
 * bağımsız). Eşleşme aramada "endsWith" yerine bunu kullanırız.
 */
export function phoneDedupeKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}
