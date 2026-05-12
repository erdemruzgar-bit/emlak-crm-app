import { defineConfig, devices } from "@playwright/test";

/**
 * Emlak CRM E2E test konfigürasyonu.
 *
 * Çalıştırmak için canlı servisin (http://127.0.0.1:3000) ayakta olması gerekir.
 *  - Geliştirme: `npm run dev` ardından `npm run e2e`
 *  - Prod: `sudo systemctl restart emlak-crm` ardından `npm run e2e`
 *
 * Sadece chromium (headless) — multi-browser overkill, sunucu kaynak tüketir.
 * Çoklu testleri paralel çalıştırma kapatıldı (canlı DB'ye eşzamanlı yazımdan
 * kaçınmak için workers: 1).
 *
 * Auth: setup project ile tek seferlik admin login yapılır, cookie state
 * `playwright/.auth/admin.json` içine kaydedilir, diğer testler bunu re-use eder.
 */

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 12_000,
    // Prod URL https olsa bile self-signed sertifikalı dev için yardımcı
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
