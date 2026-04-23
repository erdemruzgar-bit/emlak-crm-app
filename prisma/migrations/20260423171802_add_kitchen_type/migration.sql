-- CreateEnum
CREATE TYPE "KitchenType" AS ENUM ('ACIK', 'KAPALI');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "kitchenType" "KitchenType";
