-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "listingTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "monthlyRent" DOUBLE PRECISION;
