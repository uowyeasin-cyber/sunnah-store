import 'server-only';
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { convert, formatAmount, unitCents, type Currency } from './money';
import { getSettings } from './catalog';
import { payMethodsFor, shippingFor } from './shipping';
import { STEPS } from './tracking';
import { sendMail } from './mail';

export type CheckoutInput = {
  lines: { slug: string; qty: number }[];
  name: string; email: string; phone: string; country: string; address: string; city: string; zip: string;
  pay: string; useCredit: boolean;
};

const D = (n: number) => new Prisma.Decimal(n.toFixed(2));
const round = (n: number, cur: Currency) => (cur === 'BDT' ? Math.round(n) : Math.round(n * 100) / 100);

// Prices are re-read from the database; the browser only sends product slugs and quantities.
export async function quote(input: Pick<CheckoutInput, 'lines' | 'country'>, customerCredit = 0, useCredit = false) {
  const s = await getSettings();
  const slugs = input.lines.map(l => l.slug);
  const products = await db.product.findMany({ where: { slug: { in: slugs }, active: true }, include: { offer: true } });
  const lines = input.lines.flatMap(l => {
    const p = products.find(x => x.slug === l.slug); const qty = Math.min(99, Math.max(1, Math.floor(l.qty)));
    if (!p) return [];
    const o = p.offer && p.offer.on && (!p.offer.endsAt || p.offer.endsAt > new Date()) ? p.offer : null;
    return [{ p, qty, unitUsd: unitCents(p.priceCents, o?.pct || 0), fullUsd: p.priceCents }];
  });
  const subUsd = lines.reduce((a, l) => a + l.unitUsd * l.qty, 0);
  const ship = shippingFor(input.country, subUsd);
  const cur = ship.currency;
  const c = (usd: number) => convert(usd, cur, s.rates);
  const priced = lines.map(l => ({ ...l, unit: c(l.unitUsd), full: c(l.fullUsd) }));
  const subtotal = round(priced.reduce((a, l) => a + l.unit * l.qty, 0), cur);
  const full = round(priced.reduce((a, l) => a + l.full * l.qty, 0), cur);
  const shipping = c(ship.costCents);
  const credit = useCredit ? Math.min(customerCredit, subtotal + shipping) : 0;
  const total = round(subtotal + shipping - credit, cur);
  const reward = round(((subtotal - credit > 0 ? subtotal - credit : 0) * s.rewardRate) / 100, cur);
  return { lines: priced, cur, ship, subtotal, saved: round(full - subtotal, cur), shipping, credit, total, reward };
}

export async function placeOrder(input: CheckoutInput) {
  const email = input.email.trim().toLowerCase();
  if (!input.lines.length) return { error: 'Your bag is empty.' };
  if (!input.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.phone.replace(/\D/g, '').length < 6 || !input.address.trim() || !input.country) return { error: 'Please fill in your name, email, phone and address.' };
  if (!payMethodsFor(input.country).some(m => m.id === input.pay)) return { error: 'Choose a payment method.' };
  // The account is created at checkout from the email; nothing to register first.
  const customer = await db.customer.upsert({ where: { email }, update: { name: input.name, country: input.country, address: { address: input.address, city: input.city, zip: input.zip } }, create: { email, name: input.name, country: input.country, address: { address: input.address, city: input.city, zip: input.zip } } });
  const q0 = await quote(input);
  // Credit is held in one currency; a customer's first order sets it.
  if (Number(customer.credit) === 0 && customer.currency !== q0.cur) customer.currency = (await db.customer.update({ where: { id: customer.id }, data: { currency: q0.cur } })).currency;
  const sameCur = customer.currency === q0.cur;
  const q = await quote(input, sameCur ? Number(customer.credit) : 0, input.useCredit && sameCur);
  if (!q.lines.length) return { error: 'These items are no longer available.' };
  const now = new Date();
  const no = `PM-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${randomInt(10000, 99999)}`;
  const day = (n: number) => new Date(Date.now() + n * 864e5);
  const order = await db.$transaction(async tx => {
    const o = await tx.order.create({ data: {
      no, customerId: customer.id, name: input.name.trim(), email, phone: input.phone.trim(), country: input.country,
      address: { address: input.address.trim(), city: input.city.trim(), zip: input.zip.trim() }, currency: q.cur,
      subtotal: D(q.subtotal), saved: D(q.saved), shipping: D(q.shipping), creditUsed: D(q.credit), total: D(q.total), rewardEarned: D(q.reward),
      payMethod: input.pay, payStatus: input.pay === 'cod' || q.total === 0 ? 'cod' : 'pending', warehouse: q.ship.warehouse, courier: q.ship.courier,
      etaFrom: day(q.ship.days[0]), etaTo: day(q.ship.days[1]), events: [{ at: now.toISOString(), step: 0, note: STEPS[0] }],
      lines: { create: q.lines.map(l => ({ productId: l.p.id, name: `${l.p.name}${l.p.kind === 'pen' ? ' · ' + l.p.sub : ''}`, qty: l.qty, unit: D(l.unit), full: D(l.full) })) },
    } });
    if (q.credit > 0) {
      await tx.customer.update({ where: { id: customer.id }, data: { credit: { decrement: D(q.credit) } } });
      await tx.creditEntry.create({ data: { customerId: customer.id, amount: D(-q.credit), note: `Used on order ${no}`, orderNo: no } });
    }
    return o;
  });
  await sendReceipt(order.id).catch(e => console.error('receipt mail failed', e));
  return { id: order.id };
}

export async function sendReceipt(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { lines: true } });
  const s = await getSettings();
  const cur = o.currency as Currency;
  const f = (d: Prisma.Decimal) => formatAmount(Number(d), cur);
  const url = `${process.env.SITE_URL || 'http://localhost:3000'}/order/${o.id}`;
  await sendMail(o.email, `Your ${s.store.name} order ${o.no}`, [
    `Thank you, ${o.name}. Order ${o.no} is placed.`, '',
    ...o.lines.map(l => `${l.qty} × ${l.name}  ${f(l.unit)}`), '',
    `Total: ${f(o.total)}${Number(o.saved) ? `  (you saved ${f(o.saved)})` : ''}`,
    `Arrives ${o.etaFrom?.toDateString()} – ${o.etaTo?.toDateString()} by ${o.courier}.`, '', `Receipt and tracking: ${url}`,
  ].join('\n'));
}
