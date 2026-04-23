-- CreateEnum
CREATE TYPE "ParkingType" AS ENUM ('ACIK', 'KAPALI');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "parkingSpotCount" INTEGER,
ADD COLUMN     "parkingType" "ParkingType";
