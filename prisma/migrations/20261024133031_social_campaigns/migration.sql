-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "campaign" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'post',
    "target" TEXT NOT NULL DEFAULT '/',
    "message" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "spend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT NOT NULL DEFAULT '',
    "syncNote" TEXT NOT NULL DEFAULT '',
    "syncedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_code_key" ON "Campaign"("code");
