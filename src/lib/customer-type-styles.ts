// Müşteri tipi renk şeması — sistemde tutarlı olması için tek yerde tanımlandı.
//
// Renk mantığı:
//   ALICI    → mavi (yeni gelen, satın almaya niyetli)
//   SATICI   → yeşil (mülkünü satıyor)
//   KIRACI   → turuncu (sıcak, aktif kiralayacak veya kiralayan)
//   KIRACI_ADAYI → açık turuncu (henüz kiralamadı)
//   EV_SAHIBI → mor (mülk sahibi, satıcı değil)
//
// Light + dark mode için Tailwind tokenları kullanılıyor.

export const DEFAULT_CUSTOMER_TYPE_LABELS: Record<string, string> = {
  BUYER: "Alıcı",
  SELLER: "Satıcı",
  TENANT: "Kiracı",
  TENANT_CANDIDATE: "Kiracı Adayı",
  LANDLORD: "Ev Sahibi",
};

export const CUSTOMER_TYPE_BADGE_COLORS: Record<string, string> = {
  BUYER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  SELLER: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200",
  TENANT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200",
  TENANT_CANDIDATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  LANDLORD: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
};

export const CUSTOMER_TYPE_DEFAULT_BADGE =
  "bg-surface-container text-on-surface-variant";

export function customerTypeBadgeClass(code: string | null | undefined): string {
  if (!code) return CUSTOMER_TYPE_DEFAULT_BADGE;
  return CUSTOMER_TYPE_BADGE_COLORS[code] ?? CUSTOMER_TYPE_DEFAULT_BADGE;
}
