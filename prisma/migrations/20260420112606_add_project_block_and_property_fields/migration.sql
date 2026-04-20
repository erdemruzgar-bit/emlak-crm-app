-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('SAHIBI_OTURUYOR', 'KIRACILI', 'BOS', 'ARSIV');

-- CreateEnum
CREATE TYPE "OwnerCitizenship" AS ENUM ('TC', 'YABANCI');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('KONUT', 'ISYERI', 'KARMA', 'ARSA_IMARLI', 'ARSA_IMARSIZ');

-- CreateEnum
CREATE TYPE "KatMulkiyetiTipi" AS ENUM ('KAT_MULKIYETI', 'KAT_IRTIFAKI', 'ARSA_PAYLI', 'HISSELI', 'BAGIMSIZ_BOLUMSUZ');

-- CreateEnum
CREATE TYPE "FacingDirection" AS ENUM ('KUZEY', 'GUNEY', 'DOGU', 'BATI', 'KUZEY_DOGU', 'KUZEY_BATI', 'GUNEY_DOGU', 'GUNEY_BATI');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "ada" TEXT,
ADD COLUMN     "bagimsizBolumNo" TEXT,
ADD COLUMN     "blockId" TEXT,
ADD COLUMN     "facingDirection" "FacingDirection",
ADD COLUMN     "hasBalcony" BOOLEAN,
ADD COLUMN     "hasElevator" BOOLEAN,
ADD COLUMN     "hasParking" BOOLEAN,
ADD COLUMN     "katMulkiyetiTipi" "KatMulkiyetiTipi",
ADD COLUMN     "occupancyStatus" "OccupancyStatus",
ADD COLUMN     "ownerCitizenship" "OwnerCitizenship",
ADD COLUMN     "pafta" TEXT,
ADD COLUMN     "parsel" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "unitNumber" TEXT,
ADD COLUMN     "usageType" "UsageType";

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "address" TEXT,
    "developer" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalUnits" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Project_city_district_idx" ON "Project"("city", "district");

-- CreateIndex
CREATE INDEX "Block_projectId_idx" ON "Block"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_projectId_name_key" ON "Block"("projectId", "name");

-- CreateIndex
CREATE INDEX "Property_projectId_idx" ON "Property"("projectId");

-- CreateIndex
CREATE INDEX "Property_blockId_idx" ON "Property"("blockId");

-- CreateIndex
CREATE INDEX "Property_occupancyStatus_idx" ON "Property"("occupancyStatus");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
