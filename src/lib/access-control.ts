// Hassas Veri Erişim Kontrolü (KVKK)
// AGENT rolü hassas alanları (telefon, email, TC) görmek için CustomerAccessSession açar.
// ADMIN ve MANAGER muaftır — her zaman açık veri görür.
//
// İlgili modeller: CustomerAccessSession, CustomerNote (exit note)

import type { SessionActor } from "./rbac";

export const SENSITIVE_FIELDS = ["phone", "email", "tc"] as const;
export type SensitiveField = typeof SENSITIVE_FIELDS[number];

export const ACCESS_REASON_CATEGORIES = [
  { code: "GORUSME", label: "Görüşme / Arama" },
  { code: "TAKIP", label: "Takip / Hatırlatma" },
  { code: "TEKLIF", label: "Teklif Hazırlama" },
  { code: "SOZLESME", label: "Sözleşme İşlemi" },
  { code: "DIGER", label: "Diğer" },
] as const;

export const ACCESS_REASON_CODES = ACCESS_REASON_CATEGORIES.map((c) => c.code);

// AGENT rolü için hassas veri kapısı uygulanır mı?
// (Müşteriyi ekleyen kullanıcı kendisi ise kapı atlanır — bkz. requiresAccessGateFor)
export function requiresAccessGate(actor: SessionActor | null): boolean {
  if (!actor) return false;
  return actor.role === "AGENT";
}

// Belirli bir müşteri için kapı uygulanır mı?
// Kural: AGENT kendi eklediği (createdById === actor.id) müşteriyi her zaman açık görür.
// Başka birinin eklediği müşteri için maskeleme + gerekçe akışı zorunlu.
export function requiresAccessGateFor(
  actor: SessionActor | null,
  customer: { createdById: string | null }
): boolean {
  if (!requiresAccessGate(actor)) return false;
  if (!actor) return false;
  if (customer.createdById && customer.createdById === actor.id) return false;
  return true;
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  // Türkiye için tipik: 5XX XXX XX XX
  const last2 = digits.slice(-2);
  return `5** *** ** ${last2}`;
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const name = email.slice(0, at);
  const domain = email.slice(at);
  const visible = name.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(2, name.length - 1))}${domain}`;
}

export function maskTc(tc: string | null | undefined): string | null {
  if (!tc) return null;
  const digits = tc.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${digits.slice(0, 2)}*****${digits.slice(-2)}`;
}

export interface MaskedCustomerFields {
  phone: string | null;
  email: string | null;
  tcKimlikNo: string | null;
  // Maskelenmiş kopyalar — UI revealing oluncaya kadar bunları gösterir
  phoneMasked: string | null;
  emailMasked: string | null;
  tcKimlikNoMasked: string | null;
  // Frontend'e bu alanın gerçekten erişim kapısının arkasında olup olmadığını söyler
  sensitiveGated: boolean;
}

export function applyAccessMask(
  customer: { phone: string | null; email: string | null; tcKimlikNo: string | null; createdById?: string | null },
  actor: SessionActor | null,
  options: { revealedFields?: SensitiveField[] } = {}
): MaskedCustomerFields {
  const gated = requiresAccessGateFor(actor, { createdById: customer.createdById ?? null });
  const revealed = new Set(options.revealedFields ?? []);

  // ADMIN/MANAGER veya 'kendi eklediği' AGENT — her şey açık
  if (!gated) {
    return {
      phone: customer.phone,
      email: customer.email,
      tcKimlikNo: customer.tcKimlikNo,
      phoneMasked: maskPhone(customer.phone),
      emailMasked: maskEmail(customer.email),
      tcKimlikNoMasked: maskTc(customer.tcKimlikNo),
      sensitiveGated: false,
    };
  }

  // AGENT — yalnızca aktif oturumda revealed olan alanlar açık döner
  return {
    phone: revealed.has("phone") ? customer.phone : null,
    email: revealed.has("email") ? customer.email : null,
    tcKimlikNo: revealed.has("tc") ? customer.tcKimlikNo : null,
    phoneMasked: maskPhone(customer.phone),
    emailMasked: maskEmail(customer.email),
    tcKimlikNoMasked: maskTc(customer.tcKimlikNo),
    sensitiveGated: true,
  };
}
