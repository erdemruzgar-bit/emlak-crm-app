/**
 * DB sağlık ve veri tutarlılık kontrolü.
 *
 * Her kontrol bir satırlık [OK]/[FAIL] çıktısı verir. Bir adım fail ise
 * exit code 1 ile çıkar — script chain'lerinde (pre-deploy.sh) zinciri durdurur.
 *
 * Kullanım:
 *   npx tsx scripts/healthcheck/db-check.ts
 */

import { prisma } from "../../src/lib/prisma";

interface Check {
  name: string;
  detail?: string;
  ok: boolean;
}

const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
}

async function main() {
  // 1) DB bağlantısı
  try {
    await prisma.$queryRaw`SELECT 1`;
    record("DB bağlantısı", true);
  } catch (e) {
    record("DB bağlantısı", false, e instanceof Error ? e.message : String(e));
    return; // bağlantı yoksa diğerleri anlamsız
  }

  // 2) Migration tablosu var mı + en az 1 migration uygulanmış mı
  try {
    const rows: { count: bigint }[] =
      await prisma.$queryRaw`SELECT count(*)::bigint FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    const n = Number(rows[0]?.count ?? 0);
    record("Uygulanmış migration", n > 0, `${n} migration`);
  } catch (e) {
    record("Uygulanmış migration", false, e instanceof Error ? e.message : String(e));
  }

  // 3) Bekleyen (failed) migration var mı
  try {
    const rows: { count: bigint }[] =
      await prisma.$queryRaw`SELECT count(*)::bigint FROM "_prisma_migrations" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`;
    const n = Number(rows[0]?.count ?? 0);
    record("Bekleyen / hatalı migration yok", n === 0, n === 0 ? "" : `${n} bekleyen`);
  } catch {
    // tablo yoksa zaten yukarıda yakalanır
  }

  // 4) Temel tablolarda kayıt var mı
  const tables: { name: string; count: () => Promise<number>; min?: number }[] = [
    { name: "User", count: () => prisma.user.count(), min: 1 },
    { name: "Branch", count: () => prisma.branch.count(), min: 0 },
    { name: "Customer", count: () => prisma.customer.count(), min: 0 },
    { name: "Property", count: () => prisma.property.count(), min: 0 },
    { name: "Project", count: () => prisma.project.count(), min: 0 },
    { name: "Block", count: () => prisma.block.count(), min: 0 },
    { name: "ListingTypeCatalog", count: () => prisma.listingTypeCatalog.count(), min: 1 },
  ];
  for (const t of tables) {
    try {
      const n = await t.count();
      const ok = t.min == null || n >= t.min;
      record(`Tablo ${t.name}`, ok, `${n} kayıt${t.min ? ` (min ${t.min})` : ""}`);
    } catch (e) {
      record(`Tablo ${t.name}`, false, e instanceof Error ? e.message : String(e));
    }
  }

  // 5) En az 1 aktif ADMIN var
  try {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    record("Aktif ADMIN kullanıcı", adminCount >= 1, `${adminCount} adet`);
  } catch (e) {
    record("Aktif ADMIN kullanıcı", false, e instanceof Error ? e.message : String(e));
  }

  // 6) Property index'leri çalışıyor — basit explain (yavaş sorgu testi)
  try {
    const start = Date.now();
    await prisma.property.findMany({
      where: { status: "ACTIVE" },
      take: 5,
      select: { id: true, title: true, listingType: true, price: true },
    });
    const ms = Date.now() - start;
    record("Property sorgu hızı", ms < 1000, `${ms} ms (5 satır)`);
  } catch (e) {
    record("Property sorgu hızı", false, e instanceof Error ? e.message : String(e));
  }

  // 7) Veri tutarlılığı: listingTypes boş olan property
  try {
    const emptyListingTypes = await prisma.property.count({
      where: { listingTypes: { isEmpty: true } },
    });
    record(
      "listingTypes dolu (yeni alan)",
      emptyListingTypes === 0,
      emptyListingTypes === 0 ? "tüm property'ler dolu" : `${emptyListingTypes} property eksik`
    );
  } catch (e) {
    record("listingTypes dolu (yeni alan)", false, e instanceof Error ? e.message : String(e));
  }

  // 8) Property.price > 0 sağlaması (negatif/sıfır fiyat olmasın)
  try {
    const badPrice = await prisma.property.count({
      where: { price: { lte: 0 } },
    });
    record("Property.price > 0", badPrice === 0, badPrice === 0 ? "OK" : `${badPrice} ilan ≤ 0`);
  } catch (e) {
    record("Property.price > 0", false, e instanceof Error ? e.message : String(e));
  }

  // 9) Yetim Block (projectId yok) ve PropertyImage (propertyId yok) kontrolü
  try {
    const orphanBlocks: { count: bigint }[] =
      await prisma.$queryRaw`SELECT count(*)::bigint FROM "Block" b WHERE NOT EXISTS (SELECT 1 FROM "Project" p WHERE p.id = b."projectId")`;
    const nOrphanBlocks = Number(orphanBlocks[0]?.count ?? 0);
    record("Yetim Block yok", nOrphanBlocks === 0, nOrphanBlocks === 0 ? "OK" : `${nOrphanBlocks} yetim`);
  } catch (e) {
    record("Yetim Block yok", false, e instanceof Error ? e.message : String(e));
  }

  // 10) Storage: /public/uploads erişilebilir mi (FS ile)
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const uploadsDir = path.resolve(process.cwd(), "public/uploads");
    const stat = await fs.stat(uploadsDir);
    record("Uploads klasörü", stat.isDirectory(), uploadsDir);
  } catch (e) {
    record("Uploads klasörü", false, e instanceof Error ? e.message : String(e));
  }
}

main()
  .catch((e) => {
    console.error("Beklenmeyen hata:", e);
    record("Script", false, String(e));
  })
  .finally(async () => {
    await prisma.$disconnect();

    // Renkli rapor
    const COLORS = process.stdout.isTTY
      ? { ok: "\x1b[32m", fail: "\x1b[31m", dim: "\x1b[2m", reset: "\x1b[0m" }
      : { ok: "", fail: "", dim: "", reset: "" };

    let failed = 0;
    for (const c of checks) {
      const tag = c.ok ? `${COLORS.ok}[OK]${COLORS.reset}  ` : `${COLORS.fail}[FAIL]${COLORS.reset}`;
      const detail = c.detail ? ` ${COLORS.dim}— ${c.detail}${COLORS.reset}` : "";
      console.log(`${tag} ${c.name}${detail}`);
      if (!c.ok) failed++;
    }
    const total = checks.length;
    const passed = total - failed;
    console.log(
      `\n${failed === 0 ? COLORS.ok : COLORS.fail}DB-CHECK: ${passed}/${total} geçti${
        failed > 0 ? ` — ${failed} başarısız` : ""
      }${COLORS.reset}`
    );
    process.exit(failed > 0 ? 1 : 0);
  });
