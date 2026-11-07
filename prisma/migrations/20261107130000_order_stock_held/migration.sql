-- Whether this order took units out of warehouse stock, so deleting it can put them back.
ALTER TABLE "Order" ADD COLUMN "stockHeld" BOOLEAN NOT NULL DEFAULT false;
