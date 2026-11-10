import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from './db';

type Tx = Prisma.TransactionClient;
type Entry = { dir: 'in' | 'out' | 'credit'; kind: string; method?: string; amount: number; currency: string; orderId?: string | null; orderNo?: string; ref?: string; note?: string; by?: string; at?: Date };

export async function record(tx: Tx | typeof db, e: Entry) {
  if (!(e.amount > 0)) return;
  await tx.ledgerEntry.create({ data: { ...e, method: e.method || '', amount: new Prisma.Decimal(e.amount.toFixed(2)), orderNo: e.orderNo || '', ref: e.ref || '', note: (e.note || '').slice(0, 300), by: e.by || '' } });
}

// The one place an order's payment status changes by hand. Moving to "paid" books the money in;
// moving away from "paid" (other than a refund, which has its own entry) books it back out.
export async function setPayStatus(orderId: string, next: string, by: string) {
  const changed = await changePayStatus(orderId, next, by);
  // Marked paid by hand: dropship items go to their supplier now, like an online payment.
  if (changed && next === 'paid') await import('./automation').then(a => a.dropshipNowSafe(orderId));
  return changed;
}

function changePayStatus(orderId: string, next: string, by: string) {
  return db.$transaction(async tx => {
    const o = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (o.payStatus === next) return false;
    const claimed = await tx.order.updateMany({ where: { id: orderId, payStatus: o.payStatus }, data: { payStatus: next } });
    if (!claimed.count) return false;
    const base = { amount: Number(o.total), currency: o.currency, orderId: o.id, orderNo: o.no, method: o.payMethod, by };
    if (next === 'paid') await record(tx, { ...base, dir: 'in', kind: o.payStatus === 'cod' ? 'cod' : 'manual', note: o.payStatus === 'cod' ? 'Cash on delivery collected' : 'Marked paid in admin' });
    else if (o.payStatus === 'paid' && next !== 'refunded') await record(tx, { ...base, dir: 'out', kind: 'reversal', note: `Payment status changed from paid to ${next}` });
    return true;
  });
}

// Sums per currency for a time range, for the Ledger page and reports.
export async function totals(from: Date, to: Date) {
  const [rows, exp] = await Promise.all([
    db.ledgerEntry.groupBy({ by: ['currency', 'dir'], where: { at: { gte: from, lt: to } }, _sum: { amount: true } }),
    db.expense.groupBy({ by: ['currency'], where: { date: { gte: from, lt: to } }, _sum: { amount: true } }),
  ]);
  const out: Record<string, { in: number; out: number; credit: number; expenses: number }> = {};
  const at = (c: string) => (out[c] ||= { in: 0, out: 0, credit: 0, expenses: 0 });
  for (const r of rows) at(r.currency)[r.dir as 'in' | 'out' | 'credit'] += Number(r._sum.amount || 0);
  for (const e of exp) at(e.currency).expenses += Number(e._sum.amount || 0);
  return out;
}
