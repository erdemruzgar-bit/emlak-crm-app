-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "createdById" TEXT;

-- CreateIndex
CREATE INDEX "Customer_createdById_idx" ON "Customer"("createdById");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: eski müşterilerde "ekleyen" alanı yok; atanan danışmanı ekleyen olarak kabul et
UPDATE "Customer" SET "createdById" = "assignedAgentId" WHERE "createdById" IS NULL AND "assignedAgentId" IS NOT NULL;
