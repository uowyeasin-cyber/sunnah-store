import 'server-only';
import { Prisma } from '@prisma/client';
import { getSettings } from './catalog';
import type { Currency } from './money';

const D = (n: number) => new Prisma.Decimal(n.toFixed(2));

// Credit lives in the customer's currency; amounts from an order in another currency go through USD.
export async function addCredit(tx: Prisma.TransactionClient, customerId: string, amount: number, from: string, note: string, orderNo: string) {
  const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
  let cur = c.currency;
  if (Number(c.credit) === 0 && cur !== from) cur = (await tx.customer.update({ where: { id: c.id }, data: { currency: from } })).currency;
  const { rates } = await getSettings();
  const value = cur === from ? amount : (amount / rates[from as Currency]) * rates[cur as Currency];
  await tx.customer.update({ where: { id: c.id }, data: { credit: { increment: D(value) } } });
  await tx.creditEntry.create({ data: { customerId: c.id, amount: D(value), note, orderNo } });
}

// Purchase reward is paid once, when the order is first delivered.
export async function payReward(tx: Prisma.TransactionClient, o: { no: string; customerId: string | null; rewardEarned: Prisma.Decimal; currency: string }) {
  if (!o.customerId || Number(o.rewardEarned) <= 0) return;
  if (await tx.creditEntry.findFirst({ where: { orderNo: o.no, note: { startsWith: 'Reward' } } })) return;
  await addCredit(tx, o.customerId, Number(o.rewardEarned), o.currency, `Reward for order ${o.no}`, o.no);
}
