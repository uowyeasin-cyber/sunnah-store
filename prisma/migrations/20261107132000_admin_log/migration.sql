CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminLog_at_idx" ON "AdminLog"("at");
