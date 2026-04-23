-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_name_key" ON "RoomType"("name");

-- CreateIndex
CREATE INDEX "RoomType_sortOrder_idx" ON "RoomType"("sortOrder");

-- Seed: yaygın oda tipleri
INSERT INTO "RoomType" ("id", "name", "sortOrder") VALUES
  (gen_random_uuid()::text, '1+0', 10),
  (gen_random_uuid()::text, '1+1', 20),
  (gen_random_uuid()::text, '2+1', 30),
  (gen_random_uuid()::text, '3+1', 40),
  (gen_random_uuid()::text, '4+1', 50),
  (gen_random_uuid()::text, '5+1', 60),
  (gen_random_uuid()::text, '6+1', 70),
  (gen_random_uuid()::text, '2+2', 80),
  (gen_random_uuid()::text, '3+2', 90),
  (gen_random_uuid()::text, '4+2', 100),
  (gen_random_uuid()::text, '5+2', 110);
