'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { record } from '@/lib/ledger';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// A movement that did not come through an order: a courier's cash-on-delivery payout, a bank fee refund, a loan.
export async function addEntry(fd: FormData) {
  const amount = Number(fd.get('amount')) || 0;
  if (amount <= 0) throw new Error('Enter an amount');
  const dir = str(fd, 'dir') === 'out' ? 'out' : 'in';
  const currency = ['BDT', 'MYR', 'USD'].includes(str(fd, 'currency')) ? str(fd, 'currency') : 'USD';
  const me = await requireAdmin('ledger', 'addLedgerEntry', `${dir} ${currency} ${amount.toFixed(2)}`);
  const at = str(fd, 'date') ? new Date(str(fd, 'date')) : new Date();
  await record(db, { dir, kind: 'other', method: str(fd, 'method').slice(0, 60), amount, currency, ref: str(fd, 'ref').slice(0, 120), note: str(fd, 'note'), by: me.email || '', at });
  revalidatePath('/admin/ledger');
}

export async function deleteEntry(fd: FormData) {
  await requireAdmin('ledger', 'deleteLedgerEntry', str(fd, 'id'));
  await db.ledgerEntry.deleteMany({ where: { id: str(fd, 'id'), kind: 'other' } }); // only hand-made entries; order money is corrected by changing the order
  revalidatePath('/admin/ledger');
}

// Paid orders from before the ledger existed get their entry once, dated when the order was placed.
export async function backfill() {
  const me = await requireAdmin('ledger', 'backfillLedger');
  const paid = await db.order.findMany({ where: { payStatus: { in: ['paid', 'refunded'] }, total: { gt: 0 } }, select: { id: true, no: true, total: true, currency: true, payMethod: true, payRef: true, createdAt: true } });
  const have = new Set((await db.ledgerEntry.findMany({ where: { dir: 'in', orderId: { in: paid.map(o => o.id) } }, select: { orderId: true } })).map(e => e.orderId));
  for (const o of paid.filter(o => !have.has(o.id))) await record(db, { dir: 'in', kind: 'manual', method: o.payMethod, amount: Number(o.total), currency: o.currency, orderId: o.id, orderNo: o.no, ref: o.payRef, note: 'Added from past paid order', by: me.email || '', at: o.createdAt });
  revalidatePath('/admin/ledger');
}
