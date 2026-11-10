-- A product can show in more than one collection
ALTER TABLE "Product" ADD COLUMN "alsoIn" TEXT[] DEFAULT ARRAY[]::TEXT[];
