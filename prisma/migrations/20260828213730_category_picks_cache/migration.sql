-- CreateTable
CREATE TABLE "CategoryPicks" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemsHash" TEXT NOT NULL,
    "answersHash" TEXT NOT NULL DEFAULT '',
    "questions" JSONB,
    "picks" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryPicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryPicks_sessionId_idx" ON "CategoryPicks"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPicks_sessionId_category_itemsHash_answersHash_key" ON "CategoryPicks"("sessionId", "category", "itemsHash", "answersHash");

-- AddForeignKey
ALTER TABLE "CategoryPicks" ADD CONSTRAINT "CategoryPicks_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
