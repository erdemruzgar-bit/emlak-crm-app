-- Property: vatandaşlığa uygun = ayrı boolean alan
ALTER TABLE "Property" ADD COLUMN "isCitizenshipEligible" BOOLEAN;

-- Mevcut VATANDASLIGA_UYGUN değerlerini yeni alana taşı, eski alanı temizle
UPDATE "Property"
SET "isCitizenshipEligible" = TRUE,
    "ownerCitizenship" = NULL
WHERE "ownerCitizenship" = 'VATANDASLIGA_UYGUN';

-- Komisyon politikası tablosu
CREATE TABLE "CommissionPolicy" (
  "id" TEXT NOT NULL,
  "branchId" TEXT,
  "name" TEXT NOT NULL DEFAULT 'Varsayılan',
  "salesBuyerRate" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "salesSellerRate" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "rentTenantRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "rentLandlordRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "vatIncludedDefault" BOOLEAN NOT NULL DEFAULT true,
  "cobrokerOwnShare" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "agentShareOfOwnOffice" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "buyerSideAgentShare" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "payoutTemplate" TEXT NOT NULL DEFAULT 'CLASSIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommissionPolicy_branchId_key"
  ON "CommissionPolicy"("branchId");

ALTER TABLE "CommissionPolicy"
  ADD CONSTRAINT "CommissionPolicy_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Şirket geneli (default) politikası bir kayıt olarak oluştur
INSERT INTO "CommissionPolicy" ("id", "name", "updatedAt")
VALUES ('cmpolicy_default_001', 'Şirket Geneli', NOW());
