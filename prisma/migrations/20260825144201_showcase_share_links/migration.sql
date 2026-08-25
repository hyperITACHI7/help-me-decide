-- AlterTable
ALTER TABLE "ShareLink" ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "shortlistId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ShareLinkItem" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShareLinkItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLinkItem_shareLinkId_itemId_key" ON "ShareLinkItem"("shareLinkId", "itemId");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLinkItem" ADD CONSTRAINT "ShareLinkItem_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "ShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLinkItem" ADD CONSTRAINT "ShareLinkItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WishlistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
