import { test, expect } from "@playwright/test";

/**
 * Portföy sayfası — liste yükleniyor mu, filtre/pagination çalışıyor mu.
 * Non-destructive: hiçbir kayıt oluşturulmaz/silinmez, sadece okuma.
 *
 * NOT: "Yeni İlan" link'i sidebar'da DA var, sayfa header'ında DA. Strict
 * mode multiple match'i önlemek için scope (main) kullanıyoruz.
 */

test.describe("Portföy sayfası", () => {
  test("portföy sayfası açılır, ilanlar listelenir", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("heading", { name: "Portföy" })).toBeVisible();
    // 'X ilan' yazısı gözüküyor (yeni pagination ile gerçek toplam)
    await expect(page.getByText(/\d+ ilan/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("yeni ilan link/butonu görünür ve tıklanır", async ({ page }) => {
    await page.goto("/properties");
    // Sidebar'daki "Yeni İlan" link'ini kullan (her zaman görünür)
    const newLink = page.getByRole("link", { name: "Yeni İlan", exact: true }).first();
    await expect(newLink).toBeVisible();
    await newLink.click();
    await expect(page).toHaveURL(/\/properties\/new/);
  });

  test("excel toolbar butonları görünüyor", async ({ page }) => {
    await page.goto("/properties");
    await expect(page.getByRole("button", { name: /Excel'e A[lt]/i })).toBeVisible();
  });

  test("filtre paneli açılır", async ({ page }) => {
    await page.goto("/properties");
    const filterButton = page.getByRole("button", { name: /Filtreler/ });
    await expect(filterButton).toBeVisible();
    // Açmadan önce combobox sayısı
    const beforeCount = await page.getByRole("combobox").count();
    await filterButton.click();
    await page.waitForTimeout(500);
    // Açıldıktan sonra: filtre dropdown'ları (Emlak Tipi, Durum, Şehir, Proje, vb.)
    const afterCount = await page.getByRole("combobox").count();
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
