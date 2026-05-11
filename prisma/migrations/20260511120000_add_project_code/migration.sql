-- AlterTable: Project'e kullanıcı tarafından atanan kısa kod (toplu yapıştırma akışı için)
ALTER TABLE "Project" ADD COLUMN "code" TEXT;

-- CreateIndex (unique on nullable column — birden çok NULL'a izin verir)
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
