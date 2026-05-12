/**
 * Lint baseline kontrolü.
 *
 * Mevcut `eslint` çıktısını alır, baseline'da olmayan YENİ warning varsa fail eder.
 * Pre-deploy zincirine eklenirse: kullanıcı yeni kod ekleyince eski uyarıları
 * dert etmeden, yalnızca yeni eklediği bug habercilerini düzeltmeye odaklanır.
 *
 * Kullanım:
 *   npm run lint:baseline:check
 *
 * Çıkış kodu:
 *   0 → tüm warning'ler baseline'da (yeni yok)
 *   1 → baseline'da olmayan yeni warning veya error var
 *   2 → baseline dosyası yok (önce update gerek)
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BASELINE_PATH = path.resolve("scripts/lint-baseline.json");

interface LintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
}
interface LintFile {
  filePath: string;
  messages: LintMessage[];
}
interface Baseline {
  warnings: Record<string, string[]>;
  totalWarnings: number;
}

const COLORS = process.stdout.isTTY
  ? { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", dim: "\x1b[2m", reset: "\x1b[0m" }
  : { red: "", green: "", yellow: "", dim: "", reset: "" };

function repoRelative(absPath: string): string {
  return path.relative(path.resolve("."), absPath).replace(/\\/g, "/");
}

function main() {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(
      `${COLORS.red}Baseline dosyası yok: ${BASELINE_PATH}${COLORS.reset}\n` +
        `Önce: npm run lint:baseline:update`
    );
    process.exit(2);
  }
  const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));

  console.log(`Lint kontrolü... (baseline: ${baseline.totalWarnings} warning)`);
  let stdout: string;
  try {
    stdout = execSync("npx eslint . -f json", { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  } catch (e) {
    stdout = (e as { stdout?: string }).stdout || "";
    if (!stdout) {
      console.error("ESLint çıktı vermedi.");
      process.exit(1);
    }
  }
  const files: LintFile[] = JSON.parse(stdout);

  const newWarnings: { file: string; line: number; rule: string; message: string }[] = [];
  const newErrors: { file: string; line: number; rule: string; message: string }[] = [];

  for (const f of files) {
    const rel = repoRelative(f.filePath);
    const baselineForFile = new Set(baseline.warnings[rel] ?? []);
    for (const m of f.messages) {
      const rule = m.ruleId ?? "unknown";
      const item = { file: rel, line: m.line, rule, message: m.message };
      if (m.severity === 2) {
        newErrors.push(item);
      } else if (m.severity === 1) {
        const fp = `${m.line}:${rule}`;
        if (!baselineForFile.has(fp)) {
          newWarnings.push(item);
        }
      }
    }
  }

  // Rapor
  if (newErrors.length > 0) {
    console.log(`${COLORS.red}\n✗ ${newErrors.length} yeni ERROR:${COLORS.reset}`);
    for (const e of newErrors.slice(0, 20)) {
      console.log(`  ${COLORS.red}error${COLORS.reset} ${e.file}:${e.line}  ${COLORS.dim}${e.rule}${COLORS.reset}  ${e.message}`);
    }
    if (newErrors.length > 20) console.log(`  ${COLORS.dim}... ve ${newErrors.length - 20} fazla${COLORS.reset}`);
  }
  if (newWarnings.length > 0) {
    console.log(`${COLORS.yellow}\n⚠ ${newWarnings.length} yeni WARNING (baseline'da yok):${COLORS.reset}`);
    for (const w of newWarnings.slice(0, 20)) {
      console.log(`  ${COLORS.yellow}warn${COLORS.reset}  ${w.file}:${w.line}  ${COLORS.dim}${w.rule}${COLORS.reset}  ${w.message}`);
    }
    if (newWarnings.length > 20) console.log(`  ${COLORS.dim}... ve ${newWarnings.length - 20} fazla${COLORS.reset}`);
  }

  if (newErrors.length === 0 && newWarnings.length === 0) {
    console.log(`${COLORS.green}✓ Tüm warning'ler baseline'da, yeni hata/uyarı yok${COLORS.reset}`);
    process.exit(0);
  }

  console.log(
    `\n${COLORS.dim}İpucu: bilinçli yeni warning ekledinizse baseline'ı güncelleyin: ${COLORS.reset}npm run lint:baseline:update`
  );
  process.exit(1);
}

main();
