-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "preferredListingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
