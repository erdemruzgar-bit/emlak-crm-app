import { test, expect } from "@playwright/test";

/**
 * Kritik sayfa smoke testleri — her birinin authenticated olarak yüklendiğini
 * ve temel UI elemanlarının render olduğunu doğrular. Hata varsa Playwright
 * console error'larını otomatik yakalar.
 */

const PAGES: Array<{
  path: string;
  title: RegExp;
  description: string;
}> = [
  { path: "/dashboard", title: /panel|dashboard|özet/i, description: "Dashboard" },
  { path: "/properties", title: /portföy/i, description: "Portföy" },
  { path: "/customers", title: /müşteri/i, description: "Müşteriler" },
  { path: "/projects", title: /proje/i, description: "Projeler" },
  { path: "/contracts", title: /kontrat|sözleşme/i, description: "Kontratlar" },
  { path: "/tasks", title: /görev|task/i, description: "Görevler" },
  { path: "/reminders", title: /hatırlat/i, description: "Hatırlatmalar" },
  { path: "/settings/branches", title: /şube/i, description: "Ayarlar/Şubeler" },
  { path: "/settings/users", title: /kullanıcı/i, description: "Ayarlar/Kullanıcılar" },
  { path: "/settings/projects", title: /proje/i, description: "Ayarlar/Projeler" },
];

test.describe("Kritik sayfa smoke testleri", () => {
  for (const p of PAGES) {
    test(`${p.description} (${p.path}) yüklenir, console error yok`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          // Bilinmeyen ama gürültü olan hataları filtrele
          const text = msg.text();
          if (
            !text.includes("Failed to load resource") &&
            !text.includes("ResizeObserver") &&
            !text.includes("hydration")
          ) {
            consoleErrors.push(text);
          }
        }
      });

      const resp = await page.goto(p.path, { waitUntil: "domcontentloaded" });
      expect(resp?.status() ?? 0, `${p.path} HTTP status`).toBeLessThan(400);

      // En azından bir başlık eşleşmeli
      await expect(page.getByRole("heading", { name: p.title }).first()).toBeVisible({
        timeout: 8_000,
      });

      // Sayfa render ettikten sonra console error olmamalı
      await page.waitForTimeout(1000);
      expect(consoleErrors, `${p.path} console error'ları`).toHaveLength(0);
    });
  }
});
