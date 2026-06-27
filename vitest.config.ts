import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Vitest yapılandırması — birim testleri (RBAC saf fonksiyonları vb.)
// node ortamı + globals (describe/it/expect import gerektirmeden de çalışır,
// ancak test dosyalarında açıkça import ediyoruz ki tsc/lint mutlu olsun).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // tsconfig "@/*" -> "./src/*" alias'ının vitest karşılığı
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
