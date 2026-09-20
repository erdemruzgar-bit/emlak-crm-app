// Müşteri telefon doğrulaması için birim testleri.
//
// 20 Eyl 2026: Yurt dışı numaralar reddediliyordu ("7 916 074 41 63" -> 400).
// Kural TR üst kümesi olacak şekilde genişletildi. Bu dosyanın ASIL işi, TR
// davranışının bit bit aynı kaldığını kanıtlamak — canlı DB'de 704 telefon
// kaydı var ve doğrulama gevşerken bir TR kaydının bile "düzenlenemez" veya
// "bozuk ama kabul edilir" hale gelmemesi gerekiyor.

import { describe, it, expect } from "vitest";
import { customerCreateSchema } from "@/lib/validations/customer";

function accepts(phone: string): boolean {
  return customerCreateSchema.safeParse({
    firstName: "Ferit",
    lastName: "Gültekin",
    customerType: "ALICI",
    consents: { acikRiza: true, aydinlatma: true, pazarlama: false },
    phone,
  }).success;
}

describe("telefon doğrulama — TR (mevcut davranış korunmalı)", () => {
  const gecerli = [
    ["temiz cep", "05323208592"],
    ["boşluklu cep", "0532 320 85 92"],
    ["trailing space (25 May regresyonu)", "0532 320 85 92 "],
    ["leading + trailing space", " 0532 320 85 92 "],
    ["sabit hat İstanbul", "0212 555 12 34"],
    ["+90 prefix", "+90 532 320 85 92"],
    ["90 prefix artısız", "90 532 320 85 92"],
    ["parantezli tire", "+90 (532) 320-85-92"],
    ["0 öneksiz 10 hane", "5323208592"],
    ["boş string (opsiyonel alan)", ""],
  ] as const;

  it.each(gecerli)("kabul: %s", (_ad, phone) => {
    expect(accepts(phone)).toBe(true);
  });

  const gecersiz = [
    ["9 hane — eksik", "532320859"],
    ["harf içeren", "0532ABCDEFG"],
    ["+90 ile eksik hane (yurt dışı dalından sızmamalı)", "+90 532 320 85 9"],
    ["+90 ile fazla hane", "+9053232085921"],
    ["90 ile eksik hane, artısız", "90532320859"],
    ["sadece artı", "+"],
    ["çift artı", "++905323208592"],
    ["artı ortada", "0532+3208592"],
  ] as const;

  it.each(gecersiz)("red: %s", (_ad, phone) => {
    expect(accepts(phone)).toBe(false);
  });
});

describe("telefon doğrulama — yurt dışı (yeni)", () => {
  const gecerli = [
    ["Rusya, artılı", "+7 916 074 41 63"],
    ["Rusya, artısız — müşterinin bildirdiği girdi", "7 916 074 41 63"],
    ["Rusya, artılı bitişik", "+79160744163"],
    ["Almanya", "+49 151 23456789"],
    ["Birleşik Krallık", "+44 20 7946 0958"],
    ["BAE", "+971 50 123 4567"],
    ["ABD", "+1 212 555 1234"],
    ["Azerbaycan", "+994 50 123 45 67"],
    ["00 çıkış öneki ile Rusya", "007 916 074 41 63"],
    ["E.164 üst sınırı — 15 hane", "+123456789012345"],
  ] as const;

  it.each(gecerli)("kabul: %s", (_ad, phone) => {
    expect(accepts(phone)).toBe(true);
  });

  const gecersiz = [
    ["16 hane — E.164 üstü", "+1234567890123456"],
    ["ülke kodu 0 ile başlayamaz", "+0123456789"],
    ["artısız 10 hane — TR ile ayırt edilemez, eksik TR olabilir", "7916074416"],
    ["artısız 7 hane", "7916074"],
  ] as const;

  it.each(gecersiz)("red: %s", (_ad, phone) => {
    expect(accepts(phone)).toBe(false);
  });
});

describe("telefon doğrulama — TR/yurt dışı sınırı", () => {
  it("00 öneki TR numarasını yurt dışına kaydırmaz (Excel'den gelen gerçek format)", () => {
    // src/lib/phone.ts başlığında "Excel'de gelen tipik format" olarak belgeli.
    // Yanlış kurgulanırsa +532 diye var olmayan bir ülkeye ait numara olur.
    expect(accepts("00532 576 7230")).toBe(true);
  });

  it("0090 öneki TR olarak çözülür", () => {
    expect(accepts("0090 532 320 85 92")).toBe(true);
  });

  it("hata mesajı 'telefon' kelimesini içerir (healthcheck bu substring'e bakıyor)", () => {
    const r = customerCreateSchema.safeParse({
      firstName: "Ferit",
      lastName: "Gültekin",
      customerType: "ALICI",
      consents: { acikRiza: true, aydinlatma: true, pazarlama: false },
      phone: "532320859",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes("telefon"))).toBe(true);
    }
  });
});
