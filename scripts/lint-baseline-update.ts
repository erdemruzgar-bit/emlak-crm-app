/**
 * Lint baseline güncelleyici.
 *
 * Mevcut `npm run lint` çıktısını alır, her warning'i `dosya:satır:kural` formatında
 * kaydeder ve `scripts/lint-baseline.json`'a yazar.
 *
 * Bu snapshot'tan sonra `npm run lint:baseline:check` ile karşılaştırma yapılır —
 * baseline'da olmayan YENİ warning varsa fail eder.
 *
 * Kullanım:
 *   npm run lint:baseline:update    # mevcut tüm warning'leri "kabul edilmiş" olarak kaydet
 *
 * NOT: Sadece warning'ler kaydedilir. Error'lar zaten eslint.config.mjs'de
 * `error` seviyesinde, pre-deploy'da blocking.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BASELINE_PATH = path.resolve("scripts/lint-baseline.json");

interface LintMessage {
  ruleId: string | null;
  severity: number; // 1=warn, 2=error
  message: string;
  line: number;
  column: number;
}
interface LintFile {
  filePath: string;
  messages: LintMessage[];
}

function repoRelative(absPath: string): string {
  const root = path.resolve(".");
  return path.relative(root, absPath).replace(/\\/g, "/");
}

function main() {
  console.log("Lint çalıştırılıyor (JSON format)...");
  let stdout: string;
  try {
    stdout = execSync("npx eslint . -f json", { encoding: "utf-8" });
  } catch (e) {
    // eslint exit kodu warning'lerde de non-zero olabilir; stdout'tan al
    stdout = (e as { stdout?: string }).stdout || "";
    if (!stdout) {
      console.error("ESLint çıktı vermedi.");
      process.exit(1);
    }
  }

  const files: LintFile[] = JSON.parse(stdout);
  const baseline: Record<string, string[]> = {};
  let totalWarnings = 0;
  let totalErrors = 0;

  for (const f of files) {
    const rel = repoRelative(f.filePath);
    const fingerprints: string[] = [];
    for (const m of f.messages) {
      if (m.severity === 2) {
        totalErrors++;
        continue; // error'ları baseline'a alma
      }
      totalWarnings++;
      const fp = `${m.line}:${m.ruleId ?? "unknown"}`;
      fingerprints.push(fp);
    }
    if (fingerprints.length > 0) {
      baseline[rel] = fingerprints.sort();
    }
  }

  // Stabil sıralı yaz (dosya yolları alfabetik)
  const sortedBaseline: Record<string, string[]> = {};
  for (const key of Object.keys(baseline).sort()) {
    sortedBaseline[key] = baseline[key];
  }

  const output = {
    generatedAt: new Date().toISOString(),
    totalFiles: Object.keys(sortedBaseline).length,
    totalWarnings,
    totalErrors,
    note:
      "Bu dosya, mevcut kod tabanındaki kabul edilmiş ESLint warning'lerinin snapshot'ıdır. " +
      "Yeni warning eklenirse `lint:baseline:check` script'i fail eder. " +
      "Güncellemek için: npm run lint:baseline:update",
    warnings: sortedBaseline,
  };

  fs.writeFileSync(BASELINE_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `✓ Baseline güncellendi: ${totalWarnings} warning, ${Object.keys(sortedBaseline).length} dosya. ` +
    `(error: ${totalErrors})`
  );
  console.log(`Dosya: ${BASELINE_PATH}`);
}

main();
