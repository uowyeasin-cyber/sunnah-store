ALTER TABLE "Customer" ADD COLUMN "refCode" TEXT;
CREATE UNIQUE INDEX "Customer_refCode_key" ON "Customer"("refCode");
ALTER TABLE "Order" ADD COLUMN "referrer" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "refReward" DECIMAL(12,2) NOT NULL DEFAULT 0;
