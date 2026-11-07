import 'server-only';
import type { Prisma } from '@prisma/client';

// Stock lives per warehouse in Product.stock ({ "BD": 30, "MY": 4, "US": 10 }).
// Each change is one SQL statement, so two orders at once cannot both take the last unit.
type Line = { productId: string; qty: number; name?: string };
const WH = /^[A-Z]{2,4}$/;

export class OutOfStock extends Error {}

export async function takeStock(tx: Prisma.TransactionClient, warehouse: string, lines: Line[]) {
  if (!WH.test(warehouse)) throw new OutOfStock('No warehouse ships to this address yet.');
  for (const l of lines) {
    const n = await tx.$executeRaw`UPDATE "Product" SET stock = jsonb_set(stock, ARRAY[${warehouse}], to_jsonb(COALESCE((stock->>${warehouse})::int, 0) - ${l.qty}))
      WHERE id = ${l.productId} AND COALESCE((stock->>${warehouse})::int, 0) >= ${l.qty}`;
    if (!n) throw new OutOfStock(`${l.name || 'An item'} is out of stock for your country. Lower the quantity or remove it.`);
  }
}

export async function returnStock(tx: Prisma.TransactionClient, warehouse: string, lines: Line[]) {
  if (!WH.test(warehouse)) return;
  for (const l of lines)
    await tx.$executeRaw`UPDATE "Product" SET stock = jsonb_set(stock, ARRAY[${warehouse}], to_jsonb(COALESCE((stock->>${warehouse})::int, 0) + ${l.qty})) WHERE id = ${l.productId}`;
}
