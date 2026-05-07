-- CreateEnum
CREATE TYPE "PropertyNoteKind" AS ENUM ('GENERAL', 'CALL_LOG', 'MEETING', 'OPERATIONAL_STATUS', 'IMPORTED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "altPhone" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "viewTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "operationalNote" TEXT,
ADD COLUMN     "viewType" TEXT;

-- CreateTable
CREATE TABLE "PropertyNote" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PropertyNoteKind" NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "source" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyNote_propertyId_createdAt_idx" ON "PropertyNote"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyNote_kind_idx" ON "PropertyNote"("kind");

-- CreateIndex
CREATE INDEX "PropertyNote_importBatchId_idx" ON "PropertyNote"("importBatchId");

-- AddForeignKey
ALTER TABLE "PropertyNote" ADD CONSTRAINT "PropertyNote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyNote" ADD CONSTRAINT "PropertyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
