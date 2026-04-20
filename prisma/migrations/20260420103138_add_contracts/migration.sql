-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('KIRA', 'SATIS', 'KOMISYON');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'RENEWED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ContractAttachmentCategory" AS ENUM ('KONTRAT_PDF', 'KOMISYON_SOZLESMESI', 'TAPU', 'KIMLIK', 'DEPOZITO_DEKONTU', 'EK_DOKUMAN');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "propertyId" TEXT,
    "customerId" TEXT,
    "ownerCustomerId" TEXT,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "depositAmount" DOUBLE PRECISION,
    "commissionRate" DOUBLE PRECISION,
    "commissionAmount" DOUBLE PRECISION,
    "commissionSplit" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAttachment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "ContractAttachmentCategory" NOT NULL DEFAULT 'EK_DOKUMAN',
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_propertyId_idx" ON "Contract"("propertyId");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE INDEX "Contract_contractType_idx" ON "Contract"("contractType");

-- CreateIndex
CREATE INDEX "ContractAttachment_contractId_idx" ON "ContractAttachment"("contractId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_ownerCustomerId_fkey" FOREIGN KEY ("ownerCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
