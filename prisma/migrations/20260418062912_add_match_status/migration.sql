-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'INTERESTED', 'REJECTED');

-- AlterTable
ALTER TABLE "PropertyMatch" ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PropertyMatch_status_idx" ON "PropertyMatch"("status");
