import { test, expect } from "@playwright/test";

/**
 * Login akışı.
 * - Yanlış şifre reddedilir, /login'de kalınır
 * - Doğru şifre dashboard'a yönlendirir (auth.setup.ts ile zaten test edilmiş ama burada
 *   negatif senaryoları da kontrol ediyoruz)
 *
 * NOT: storageState ile zaten authenticated geliyoruz; bu yüzden bu testte
 * önce logout yapıp anonim olarak login akışını test ediyoruz.
 */

test.use({ storageState: { cookies: [], origins: [] } }); // anonim sessiona zorla

test.describe("Login akışı", () => {
  test("yanlış şifre reddedilir", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?posta|email/i).fill("admin@emlakcrm.com");
    await page.getByLabel(/parola|şifre|password/i).fill("wrong_password_xyz");
    await page.getByRole("button", { name: /giriş|login|sign in/i }).click();

    // Hata mesajı ya da /login'de kalma
    await page.waitForTimeout(1500);
    expect(page.url()).toContain("/login");
  });

  test("login sayfası render oluyor", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/e-?posta|email/i)).toBeVisible();
    await expect(page.getByLabel(/parola|şifre|password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /giriş|login|sign in/i })).toBeVisible();
  });
});
