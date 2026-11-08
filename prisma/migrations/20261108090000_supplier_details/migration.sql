-- Supplier details found by Global sourcing
ALTER TABLE "Supplier" ADD COLUMN "website" TEXT NOT NULL DEFAULT '',
ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "source" TEXT NOT NULL DEFAULT '';
