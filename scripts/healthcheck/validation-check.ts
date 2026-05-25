/**
 * Schema validation regression testleri.
 *
 * Validation schema bug'larını CI/CD'de yakalamak için. Her test, geçmişte
 * gerçekten yaşanmış bir bug veya kritik bir input pattern'i temsil eder.
 *
 * Yeni regresyon ortaya çıkarsa: ilgili schema'yı düzelt, buraya kayıt ekle.
 *
 * Çalıştırma:
 *   npx tsx scripts/healthcheck/validation-check.ts
 *
 * Exit code: hata varsa 1 (script chain durur), başarılıysa 0.
 */

import { customerCreateSchema, customerUpdateSchema } from "../../src/lib/validations/customer";

interface Case {
  name: string;
  schema: typeof customerCreateSchema | typeof customerUpdateSchema;
  input: unknown;
  expect: "pass" | "fail";
  // Eğer "fail" beklendiyse, hata mesajının bu substring'i içermesi beklenir (opsiyonel).
  expectErrorContains?: string;
}

const cases: Case[] = [
  // ─── Telefon (regresyon: 2026-05-25 trailing space) ───
  {
    name: "Telefon: temiz cep numarası",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "05323208592" }),
    expect: "pass",
  },
  {
    name: "Telefon: cep numarası boşluklu",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "0532 320 85 92" }),
    expect: "pass",
  },
  {
    name: "Telefon: REGRESYON — trailing space (25 May bug)",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "0532 320 85 92 " }),
    expect: "pass", // trim sayesinde geçmeli
  },
  {
    name: "Telefon: leading + trailing space",
    schema: customerCreateSchema,
    input: validCustomer({ phone: " 0532 320 85 92 " }),
    expect: "pass",
  },
  {
    name: "Telefon: sabit hat İstanbul",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "0212 555 12 34" }),
    expect: "pass",
  },
  {
    name: "Telefon: +90 prefix",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "+90 532 320 85 92" }),
    expect: "pass",
  },
  {
    name: "Telefon: parantezli tire",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "+90 (532) 320-85-92" }),
    expect: "pass",
  },
  {
    name: "Telefon: boş string (opsiyonel)",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "" }),
    expect: "pass",
  },
  {
    name: "Telefon: 9 hane (eksik)",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "532320859" }),
    expect: "fail",
    expectErrorContains: "telefon",
  },
  {
    name: "Telefon: harf içeren",
    schema: customerCreateSchema,
    input: validCustomer({ phone: "0532ABCDEFG" }),
    expect: "fail",
  },

  // ─── Talep profili sayısal alanlar (regresyon: 2026-05-24 null reddedildi) ───
  {
    name: "minBudget null kabul edilir (REGRESYON 24 May)",
    schema: customerUpdateSchema,
    input: { minBudget: null, maxBudget: null, minArea: null, maxArea: null },
    expect: "pass",
  },
  {
    name: "downPaymentPercent null kabul edilir",
    schema: customerUpdateSchema,
    input: { downPaymentPercent: null },
    expect: "pass",
  },
  {
    name: "preferredListingTypes çoklu seçim (kira+satılık)",
    schema: customerUpdateSchema,
    input: { preferredListingTypes: ["SATILIK", "KIRALIK"] },
    expect: "pass",
  },
  {
    name: "Bütçe min > max (custom refine)",
    schema: customerUpdateSchema,
    input: { minBudget: 5_000_000, maxBudget: 1_000_000 },
    expect: "fail",
    expectErrorContains: "Max bütçe",
  },
  {
    name: "m² min > max",
    schema: customerUpdateSchema,
    input: { minArea: 200, maxArea: 100 },
    expect: "fail",
    expectErrorContains: "Max m²",
  },

  // ─── Müşteri oluşturma temel ───
  {
    name: "Müşteri create: zorunlu alanlar (ad/soyad/tip + consents)",
    schema: customerCreateSchema,
    input: {
      firstName: "Ali",
      lastName: "Veli",
      customerType: "BUYER",
      consents: { acikRiza: true, aydinlatma: true, pazarlama: false },
    },
    expect: "pass",
  },
  {
    name: "Müşteri create: customerTypes çoklu (BUYER + TENANT_CANDIDATE)",
    schema: customerCreateSchema,
    input: {
      firstName: "Ali",
      lastName: "Veli",
      customerType: "BUYER",
      customerTypes: ["BUYER", "TENANT_CANDIDATE"],
      consents: { acikRiza: true, aydinlatma: true, pazarlama: false },
    },
    expect: "pass",
  },
  {
    name: "Müşteri update: customerTypes (kira+satılık çoklu)",
    schema: customerUpdateSchema,
    input: { customerTypes: ["BUYER", "TENANT"] },
    expect: "pass",
  },
  {
    name: "Müşteri create: kısa ad (min 2)",
    schema: customerCreateSchema,
    input: { ...validCustomer({}), firstName: "A" },
    expect: "fail",
    expectErrorContains: "Ad",
  },
  {
    name: "Müşteri create: customerType eksik",
    schema: customerCreateSchema,
    input: {
      firstName: "Ali",
      lastName: "Veli",
      consents: { acikRiza: true, aydinlatma: true, pazarlama: false },
    },
    expect: "fail",
  },
];

function validCustomer(overrides: Record<string, unknown>) {
  return {
    firstName: "Ali",
    lastName: "Veli",
    customerType: "BUYER",
    consents: { acikRiza: true, aydinlatma: true, pazarlama: false },
    ...overrides,
  };
}

let passed = 0;
let failed = 0;
const errors: string[] = [];

for (const c of cases) {
  const result = c.schema.safeParse(c.input);
  const actuallyPassed = result.success;
  const expectedPass = c.expect === "pass";

  if (actuallyPassed === expectedPass) {
    if (c.expect === "fail" && c.expectErrorContains && result.success === false) {
      const issuesStr = JSON.stringify(result.error.issues).toLowerCase();
      if (!issuesStr.includes(c.expectErrorContains.toLowerCase())) {
        failed++;
        errors.push(`✗ ${c.name}: hata mesajında '${c.expectErrorContains}' beklendi ama yok\n   issues=${issuesStr.slice(0, 200)}`);
        continue;
      }
    }
    passed++;
    console.log(`✓ ${c.name}`);
  } else {
    failed++;
    if (result.success) {
      errors.push(`✗ ${c.name}: pass beklendi ama parse geçti (bu fail bekleniyor)`);
    } else {
      errors.push(`✗ ${c.name}: ${c.expect} beklendi ama parse fail oldu\n   issues=${JSON.stringify(result.error.issues).slice(0, 300)}`);
    }
  }
}

console.log("");
console.log(`VALIDATION-CHECK: ${passed}/${cases.length} geçti`);
if (failed > 0) {
  console.error("");
  for (const e of errors) console.error(e);
  process.exit(1);
}
