'use server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { addCredit } from '@/lib/credit';
import { advance, sendToCourier } from '@/lib/fulfil';
import { DELIVERED } from '@/lib/tracking';
import type { Currency } from '@/lib/money';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const D = (n: number) => new Prisma.Decimal(n.toFixed(2));

export async function saveOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const status = Math.min(DELIVERED, Math.max(0, Number(fd.get('status')) || 0));
  const date = (k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);
  await advance(o.id, status, {
    manual: true, courier: str(fd, 'courier'), trackingNo: str(fd, 'trackingNo'), riderName: str(fd, 'riderName'), riderPhone: str(fd, 'riderPhone'),
    payStatus: str(fd, 'payStatus') || o.payStatus, etaFrom: date('etaFrom') ?? o.etaFrom, etaTo: date('etaTo') ?? o.etaTo,
  });
}

export async function bookCourier(fd: FormData) {
  await requireAdmin();
  await sendToCourier(str(fd, 'id')).catch(() => {}); // the reason is logged on the order
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

// Edit the customer, address, items, prices and delivery charge; totals are worked out again.
export async function editOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') }, include: { lines: true } });
  const { getSettings } = await import('@/lib/catalog');
  const { convert } = await import('@/lib/money');
  const cur = o.currency as Currency, { rates } = await getSettings();
  const n = (k: string) => Math.max(0, Number(fd.get(k)) || 0);
  await db.$transaction(async tx => {
    for (const l of o.lines) {
      const qty = Math.floor(n(`qty-${l.id}`));
      if (!qty) await tx.orderLine.delete({ where: { id: l.id } });
      else await tx.orderLine.update({ where: { id: l.id }, data: { qty, unit: D(n(`unit-${l.id}`)) } });
    }
    const add = str(fd, 'addProduct'), addQty = Math.floor(n('addQty'));
    if (add && addQty) {
      const p = await tx.product.findUniqueOrThrow({ where: { id: add } });
      const price = convert(p.priceCents, cur, rates);
      await tx.orderLine.create({ data: { orderId: o.id, productId: p.id, name: `${p.name}${p.kind === 'pen' ? ' · ' + p.sub : ''}`, qty: addQty, unit: D(price), full: D(price), cost: D(convert(p.costCents, cur, rates)) } });
    }
    const lines = await tx.orderLine.findMany({ where: { orderId: o.id } });
    const subtotal = lines.reduce((a, l) => a + Number(l.unit) * l.qty, 0), shipping = n('shipping');
    const total = Math.max(0, subtotal + shipping - Number(o.creditUsed));
    const events = [...(o.events as object[]), { at: new Date().toISOString(), step: -1, note: 'Order details edited in admin' }];
    await tx.order.update({ where: { id: o.id }, data: {
      name: str(fd, 'name') || o.name, email: str(fd, 'email') || o.email, phone: str(fd, 'phone') || o.phone, country: str(fd, 'country') || o.country,
      address: { address: str(fd, 'address'), city: str(fd, 'city'), zip: str(fd, 'zip') }, subtotal: D(subtotal), shipping: D(shipping), total: D(total), events,
    } });
  });
}

export async function deleteOrder(fd: FormData) {
  await requireAdmin();
  if (fd.get('sure') !== 'yes') throw new Error('Tick the box to confirm');
  await db.order.delete({ where: { id: str(fd, 'id') } });
  const { redirect } = await import('next/navigation');
  redirect('/admin/orders');
}
