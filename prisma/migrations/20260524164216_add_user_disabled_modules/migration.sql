-- AlterTable: User'a disabledModules ekle (modül-bazlı yetkilendirme).
-- Boş array default → tüm modüller açık (geriye uyumlu).
ALTER TABLE "User" ADD COLUMN "disabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[];
