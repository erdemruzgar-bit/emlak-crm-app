-- AlterTable: Project'e branchId ekle (FK, ON DELETE SET NULL).
-- Mevcut projeler için null kalır; null branchId = eski RBAC davranışı sürer.
ALTER TABLE "Project" ADD COLUMN "branchId" TEXT;

-- Foreign key constraint (branch silinirse projedeki branchId NULL'a düşer)
ALTER TABLE "Project" ADD CONSTRAINT "Project_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index (RBAC sorgularında WHERE project.branchId IN (...) hızlı olsun)
CREATE INDEX "Project_branchId_idx" ON "Project"("branchId");
