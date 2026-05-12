import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Setup project — tek seferlik admin login yapar, cookie state'i diske kaydeder.
 * Diğer testler bu state'i re-use eder, her teste login tekrarlanmaz.
 *
 * Admin kullanıcısı: seed'den gelen `admin@emlakcrm.com` / `123456`.
 * Üretimde bu kullanıcı varsa kullanılır; yoksa E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD env ile özelleştirilebilir.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@emlakcrm.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "123456";
const AUTH_DIR = "playwright/.auth";
const AUTH_FILE = path.join(AUTH_DIR, "admin.json");

setup("admin login", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/login");
  // next-auth Credentials form: e-posta + şifre input'larını bul
  await page.getByLabel(/e-?posta|email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/parola|şifre|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /giriş|login|sign in/i }).click();

  // Dashboard / properties / herhangi auth-gerekli sayfaya redirect
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 10_000,
  });
  // Cookie set edilmiş mi sanity check
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => /next-auth|authjs/.test(c.name));
  expect(sessionCookie, "next-auth session cookie set edilmedi").toBeTruthy();

  await page.context().storageState({ path: AUTH_FILE });
});
