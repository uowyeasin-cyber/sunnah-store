'use server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { DELIVERED, STEPS } from '@/lib/tracking';
import type { Currency } from '@/lib/money';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const D = (n: number) => new Prisma.Decimal(n.toFixed(2));
type Ev = { at: string; step: number; note: string };

// Credit lives in the customer's currency; amounts from an order in another currency go through USD.
async function addCredit(tx: Prisma.TransactionClient, customerId: string, amount: number, from: string, note: string, orderNo: string) {
  const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
  let cur = c.currency;
  if (Number(c.credit) === 0 && cur !== from) cur = (await tx.customer.update({ where: { id: c.id }, data: { currency: from } })).currency;
  const { rates } = await getSettings();
  const value = cur === from ? amount : (amount / rates[from as Currency]) * rates[cur as Currency];
  await tx.customer.update({ where: { id: c.id }, data: { credit: { increment: D(value) } } });
  await tx.creditEntry.create({ data: { customerId: c.id, amount: D(value), note, orderNo } });
}

export async function saveOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const status = Math.min(DELIVERED, Math.max(0, Number(fd.get('status')) || 0));
  const events = o.events as Ev[];
  if (status !== o.status) events.push({ at: new Date().toISOString(), step: status, note: STEPS[status] });
  const date = (k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);
  await db.$transaction(async tx => {
    await tx.order.update({ where: { id: o.id }, data: {
      status, events, manual: true, courier: str(fd, 'courier'), trackingNo: str(fd, 'trackingNo'), riderName: str(fd, 'riderName'), riderPhone: str(fd, 'riderPhone'),
      payStatus: str(fd, 'payStatus') || o.payStatus, etaFrom: date('etaFrom') ?? o.etaFrom, etaTo: date('etaTo') ?? o.etaTo,
    } });
    // Purchase reward is paid once, when the order is first marked delivered.
    if (status === DELIVERED && o.customerId && Number(o.rewardEarned) > 0 && !(await tx.creditEntry.findFirst({ where: { orderNo: o.no, note: { startsWith: 'Reward' } } })))
      await addCredit(tx, o.customerId, Number(o.rewardEarned), o.currency, `Reward for order ${o.no}`, o.no);
  });
}

export async function refundOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const amount = Math.min(Number(o.total) + Number(o.creditUsed), Math.max(0, Number(fd.get('amount')) || 0));
  if (!o.customerId || !amount) return;
  await db.$transaction(async tx => {
    await addCredit(tx, o.customerId!, amount, o.currency, `Refund for order ${o.no}${str(fd, 'reason') ? ` · ${str(fd, 'reason')}` : ''}`, o.no);
    await tx.order.update({ where: { id: o.id }, data: { payStatus: 'refunded' } });
  });
}
