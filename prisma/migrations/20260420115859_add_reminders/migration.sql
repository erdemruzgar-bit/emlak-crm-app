-- CreateEnum
CREATE TYPE "ReminderTargetType" AS ENUM ('CUSTOMER', 'PROPERTY', 'APPOINTMENT', 'CONTRACT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ReminderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "ReminderPriority" NOT NULL DEFAULT 'MEDIUM',
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "targetType" "ReminderTargetType" NOT NULL DEFAULT 'GENERAL',
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "Reminder_isDone_idx" ON "Reminder"("isDone");

-- CreateIndex
CREATE INDEX "Reminder_dueDate_idx" ON "Reminder"("dueDate");

-- CreateIndex
CREATE INDEX "Reminder_targetType_targetId_idx" ON "Reminder"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
