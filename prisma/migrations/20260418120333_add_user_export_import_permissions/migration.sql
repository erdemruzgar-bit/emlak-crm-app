-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canExport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canImport" BOOLEAN NOT NULL DEFAULT false;
