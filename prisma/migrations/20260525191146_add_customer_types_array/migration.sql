-- AlterTable: Customer'a customerTypes (çoklu) ekle.
-- Mevcut customerType (tekli) korunur, customerTypes[0] ile senkron tutulur.
ALTER TABLE "Customer" ADD COLUMN "customerTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Data migration: mevcut tüm müşterilerin customerType değerini customerTypes array'ine kopyala.
-- Boş array varsayılan kaldığı sürece geriye uyumlu — UI çoklu seçim göstermeden önce backfill yapar.
UPDATE "Customer" SET "customerTypes" = ARRAY["customerType"]
WHERE "customerTypes" = ARRAY[]::TEXT[];
