-- OccupancyStatus enum'u dinamik kataloğa (OccupancyStatusCatalog) çevir.
-- Mevcut Property.occupancyStatus verisi enum string'leri olarak korunur.

-- 1. Yeni katalog tablosu
CREATE TABLE "OccupancyStatusCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OccupancyStatusCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OccupancyStatusCatalog_code_key" ON "OccupancyStatusCatalog"("code");
CREATE INDEX "OccupancyStatusCatalog_sortOrder_idx" ON "OccupancyStatusCatalog"("sortOrder");

-- 2. Property.occupancyStatus enum -> TEXT (mevcut veriler enum etiketleriyle korunur)
ALTER TABLE "Property"
    ALTER COLUMN "occupancyStatus" TYPE TEXT USING "occupancyStatus"::TEXT;

-- 3. Artık ihtiyaç olmayan enum tipini kaldır
DROP TYPE "OccupancyStatus";

-- 4. Varsayılan seçenekleri seed et (mevcut Property kayıtlarındaki kodlarla birebir uyumlu)
INSERT INTO "OccupancyStatusCatalog" ("id", "code", "label", "sortOrder", "isActive", "createdAt", "updatedAt") VALUES
    ('occstat_sahibi_oturuyor', 'SAHIBI_OTURUYOR', 'Sahibi Oturuyor', 10, true, NOW(), NOW()),
    ('occstat_kiracili',        'KIRACILI',        'Kiracılı',        20, true, NOW(), NOW()),
    ('occstat_bos',             'BOS',             'Boş',             30, true, NOW(), NOW()),
    ('occstat_kapora_alindi',   'KAPORA_ALINDI',   'Kapora Alındı',   40, true, NOW(), NOW()),
    ('occstat_sozlesme_alindi', 'SOZLESME_ALINDI', 'Sözleşme Alındı', 50, true, NOW(), NOW()),
    ('occstat_arsiv',           'ARSIV',           'Arşiv',           60, true, NOW(), NOW());
