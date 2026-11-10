-- Supplier unit price before shipping, for dropship cost sync
ALTER TABLE "Product" ADD COLUMN "supplierCost" INTEGER NOT NULL DEFAULT 0;
