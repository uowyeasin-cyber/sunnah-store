-- CreateTable
CREATE TABLE "Scheduled" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'reminder',
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT NOT NULL DEFAULT '',
    "by" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scheduled_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scheduled_status_at_idx" ON "Scheduled"("status", "at");

