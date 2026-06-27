import { z } from "zod/v4";

// Şifre politikası — tek kaynak (hem POST hem PUT kullanır).
// Kural: en az 8 karakter + en az bir harf (TR dahil) + en az bir özel karakter.
// Mevcut kullanıcıların girişini ETKİLEMEZ; yalnızca yeni/değiştirilen şifrelere uygulanır.

export const PASSWORD_MIN = 8;

// İnsan-okunur kural metni (UI ipucu ile aynı tutmak için burada da export edilir).
export const PASSWORD_RULE_TEXT =
  "Şifre en az 8 karakter olmalı ve en az bir harf ile bir özel karakter içermeli";

// Harf: İngilizce + Türkçe. Özel karakter: harf/rakam/boşluk DIŞINDAki herhangi bir sembol.
const HAS_LETTER = /[A-Za-zçğıöşüÇĞİÖŞÜ]/;
const HAS_SPECIAL = /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ\s]/;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, "Şifre en az 8 karakter olmalı")
  .refine(
    (v) => HAS_LETTER.test(v) && HAS_SPECIAL.test(v),
    "Şifre en az bir harf ve bir özel karakter içermeli (örn. !@#?*)"
  );
