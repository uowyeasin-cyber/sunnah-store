-- Dropshipping: products linked to a supplier, purchase orders made for a customer order
ALTER TABLE "Product" ADD COLUMN "dropship" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "supplierId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "supplierSku" TEXT NOT NULL DEFAULT '',
ADD COLUMN "supplierUrl" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Supplier" ADD COLUMN "api" TEXT NOT NULL DEFAULT '';

ALTER TABLE "PurchaseOrder" ADD COLUMN "saleId" TEXT NOT NULL DEFAULT '',
ADD COLUMN "saleNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "shipTo" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "supplierRef" TEXT NOT NULL DEFAULT '',
ADD COLUMN "trackingNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN "carrier" TEXT NOT NULL DEFAULT '',
ADD COLUMN "error" TEXT NOT NULL DEFAULT '';

CREATE INDEX "PurchaseOrder_saleId_idx" ON "PurchaseOrder"("saleId");

ALTER TABLE "PurchaseLine" ADD COLUMN "sku" TEXT NOT NULL DEFAULT '';
