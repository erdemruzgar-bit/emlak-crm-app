import { test, expect } from "@playwright/test";

/**
 * Yeni İlan formu — form açılıyor mu, alanlar render oluyor mu, çoklu listing
 * tipi seçimi çalışıyor mu. Non-destructive: form doldurulur AMA kaydet'e
 * basılmaz (DB'ye gerçek kayıt yazmak istemiyoruz E2E'de).
 *
 * Türkçe karakter notu: getByRole + regex Türkçe büyük/küçük (İ↔i) için
 * case-insensitive değil. Exact string kullanmak veya regex'i karakter-sınıfı
 * olarak yazmak daha güvenli.
 */

test.describe("Yeni İlan formu", () => {
  test("form açılıyor, başlık görünür", async ({ page }) => {
    await page.goto("/properties/new");
    await expect(page.getByRole("heading", { name: "Yeni İlan" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByPlaceholder(/Kadıköy/)).toBeVisible();
  });

  test("çoklu listing tipi seçimi (Satılık + Kiralık) çalışır", async ({ page }) => {
    await page.goto("/properties/new");
    await page.getByRole("button", { name: "Satılık", exact: true }).click();
    await page.getByRole("button", { name: "Kiralık", exact: true }).click();

    // Her ikisi seçili → satış + aylık kira alanları görünür
    await expect(page.getByText(/Satış Fiyatı/i)).toBeVisible();
    await expect(page.getByText(/Aylık Kira/i)).toBeVisible();
  });

  test("tek listing tipi (sadece Satılık) sadece satış fiyatını gösterir", async ({ page }) => {
    await page.goto("/properties/new");
    await page.getByRole("button", { name: "Satılık", exact: true }).click();
    await expect(page.getByText(/Satış Fiyatı/i)).toBeVisible();
    await expect(page.getByText(/Aylık Kira/i)).not.toBeVisible();
  });

  test("emlak tipi seçenekleri render olur", async ({ page }) => {
    await page.goto("/properties/new");
    for (const t of ["Daire", "Villa", "Arsa", "İşyeri", "Müstakil Ev"]) {
      await expect(page.getByRole("button", { name: t, exact: true })).toBeVisible();
    }
  });
});
