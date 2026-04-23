-- CreateTable: CustomerTypeCatalog
CREATE TABLE "CustomerTypeCatalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isTenantSide" BOOLEAN NOT NULL DEFAULT false,
    "isOwnerSide" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTypeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTypeCatalog_code_key" ON "CustomerTypeCatalog"("code");
CREATE INDEX "CustomerTypeCatalog_sortOrder_idx" ON "CustomerTypeCatalog"("sortOrder");

-- Seed default types
INSERT INTO "CustomerTypeCatalog" ("id", "code", "label", "isTenantSide", "isOwnerSide", "sortOrder", "isActive", "updatedAt") VALUES
  ('ctcat_buyer',     'BUYER',            'Alıcı',        true,  false, 10, true, CURRENT_TIMESTAMP),
  ('ctcat_seller',    'SELLER',           'Satıcı',       false, true,  20, true, CURRENT_TIMESTAMP),
  ('ctcat_tenant',    'TENANT',           'Kiracı',       true,  false, 30, true, CURRENT_TIMESTAMP),
  ('ctcat_tcand',     'TENANT_CANDIDATE', 'Kiracı Adayı', true,  false, 40, true, CURRENT_TIMESTAMP),
  ('ctcat_landlord',  'LANDLORD',         'Ev Sahibi',    false, true,  50, true, CURRENT_TIMESTAMP);

-- Alter Customer.customerType from enum to TEXT (keep data)
ALTER TABLE "Customer" ALTER COLUMN "customerType" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "customerType" TYPE TEXT USING "customerType"::text;
ALTER TABLE "Customer" ALTER COLUMN "customerType" SET DEFAULT 'BUYER';

-- Drop old enum
DROP TYPE "CustomerType";
