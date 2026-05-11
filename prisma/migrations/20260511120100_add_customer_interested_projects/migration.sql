-- CreateTable: Müşteri ↔ Proje çoklu (M:N) ilişki, explicit join modeli
CREATE TABLE "CustomerInterestedProject" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "addedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInterestedProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerInterestedProject_customerId_projectId_key" ON "CustomerInterestedProject"("customerId", "projectId");
CREATE INDEX "CustomerInterestedProject_customerId_idx" ON "CustomerInterestedProject"("customerId");
CREATE INDEX "CustomerInterestedProject_projectId_idx" ON "CustomerInterestedProject"("projectId");

-- AddForeignKey
ALTER TABLE "CustomerInterestedProject" ADD CONSTRAINT "CustomerInterestedProject_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInterestedProject" ADD CONSTRAINT "CustomerInterestedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInterestedProject" ADD CONSTRAINT "CustomerInterestedProject_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
