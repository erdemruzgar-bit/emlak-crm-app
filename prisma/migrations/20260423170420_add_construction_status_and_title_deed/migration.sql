-- CreateEnum
CREATE TYPE "ConstructionStatus" AS ENUM ('INSAAT_HALINDE', 'OTURUMA_HAZIR');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "constructionStatus" "ConstructionStatus",
ADD COLUMN     "hasTitleDeed" BOOLEAN;
