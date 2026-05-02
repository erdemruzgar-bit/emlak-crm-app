-- CreateTable
CREATE TABLE "_UserAuthorizedBranches" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserAuthorizedBranches_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserAuthorizedBranches_B_index" ON "_UserAuthorizedBranches"("B");

-- AddForeignKey
ALTER TABLE "_UserAuthorizedBranches" ADD CONSTRAINT "_UserAuthorizedBranches_A_fkey" FOREIGN KEY ("A") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAuthorizedBranches" ADD CONSTRAINT "_UserAuthorizedBranches_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
