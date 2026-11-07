-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL DEFAULT 'schedule',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "summary" TEXT NOT NULL DEFAULT '',
    "ms" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationTask" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT NOT NULL DEFAULT '',
    "decidedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationRun_job_at_idx" ON "AutomationRun"("job", "at");

-- CreateIndex
CREATE INDEX "AutomationTask_status_createdAt_idx" ON "AutomationTask"("status", "createdAt");

