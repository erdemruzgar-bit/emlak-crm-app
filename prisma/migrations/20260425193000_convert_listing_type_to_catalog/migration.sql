-- CreateTable: ListingTypeCatalog
CREATE TABLE "ListingTypeCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingTypeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingTypeCatalog_code_key" ON "ListingTypeCatalog"("code");
CREATE INDEX "ListingTypeCatalog_sortOrder_idx" ON "ListingTypeCatalog"("sortOrder");

-- Seed default types
INSERT INTO "ListingTypeCatalog" ("id", "code", "label", "sortOrder", "isActive", "updatedAt") VALUES
  ('ltcat_satilik', 'SATILIK', 'Satılık', 10, true, CURRENT_TIMESTAMP),
  ('ltcat_kiralik', 'KIRALIK', 'Kiralık', 20, true, CURRENT_TIMESTAMP),
  ('ltcat_arsiv',   'ARSIV',   'Arşiv',   30, true, CURRENT_TIMESTAMP);

-- Alter Property.listingType from enum to TEXT (keep data)
ALTER TABLE "Property" ALTER COLUMN "listingType" TYPE TEXT USING "listingType"::text;

-- Drop old enum (only if no other references)
DROP TYPE "ListingType";
