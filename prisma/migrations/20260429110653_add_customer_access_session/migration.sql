-- CreateTable
CREATE TABLE "CustomerAccessSession" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reasonCategory" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fields" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "exitNoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "CustomerAccessSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerAccessSession_customerId_idx" ON "CustomerAccessSession"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAccessSession_userId_idx" ON "CustomerAccessSession"("userId");

-- CreateIndex
CREATE INDEX "CustomerAccessSession_startedAt_idx" ON "CustomerAccessSession"("startedAt");

-- CreateIndex
CREATE INDEX "CustomerAccessSession_status_idx" ON "CustomerAccessSession"("status");

-- AddForeignKey
ALTER TABLE "CustomerAccessSession" ADD CONSTRAINT "CustomerAccessSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAccessSession" ADD CONSTRAINT "CustomerAccessSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAccessSession" ADD CONSTRAINT "CustomerAccessSession_exitNoteId_fkey" FOREIGN KEY ("exitNoteId") REFERENCES "CustomerNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
