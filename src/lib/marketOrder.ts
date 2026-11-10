import 'server-only';
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { DEFAULT_SETTINGS } from './settings';
import { convert, isCurrency, type Rates } from './money';
import { money, type Channel } from './channels';

// Shared by every marketplace link: what we send out (stock, price) and how their orders become orders here.

// Currency rates straight from the database (background jobs run outside the page cache).
export const getRates = async () => ((await db.setting.findUnique({ where: { key: 'rates' } }))?.value as Rates | undefined) || DEFAULT_SETTINGS.rates;
export const whOf = (ch: Channel) => (ch.cur === 'BDT' ? 'BD' : ch.cur === 'MYR' ? 'MY' : 'US');
// Prices are only sent when the marketplace sells in a currency we keep rates for (USD, MYR, BDT); elsewhere only stock is sent.
export const canPrice = (ch: Channel) => money(ch) === ch.cur;

// Our side of every listing: SKU (= product slug) → quantity in the matching warehouse and price in the channel currency.
export async function ourRows(ch: Channel) {
  const [products, rates] = await Promise.all([db.product.findMany({ where: { archived: false }, select: { slug: true, priceCents: true, stock: true, active: true } }), getRates()]);
  const wh = whOf(ch);
  return new Map(products.map(p => [p.slug, { qty: p.active ? Math.max(0, Number((p.stock as Record<string, number>)[wh] || 0)) : 0, price: convert(p.priceCents, ch.cur, rates) }]));
}

// About how many US dollars one unit is worth, for orders paid in currencies the store has no rate for.
const FX: Record<string, number> = { SGD: 0.75, IDR: 0.00006, THB: 0.029, PHP: 0.017, VND: 0.00004, PKR: 0.0036, LKR: 0.0033, NPR: 0.0074, INR: 0.0115, AED: 0.2723, SAR: 0.2667, QAR: 0.2747, KWD: 3.26, OMR: 2.6, BHD: 2.65, EGP: 0.02, TRY: 0.024, GBP: 1.3, EUR: 1.12, CAD: 0.72, AUD: 0.65, JPY: 0.0066, TWD: 0.031, BRL: 0.18, MXN: 0.054, CLP: 0.00105, COP: 0.00025, PLN: 0.26, KRW: 0.0007, CNY: 0.14, HKD: 0.128, NGN: 0.00065, KES: 0.0077, ZAR: 0.055 };

export type MItem = { sku: string; name: string; qty: number; price: number };
export type MOrder = { id: string; no?: string; name?: string; phone?: string; country?: string; address?: string; city?: string; zip?: string; state?: string; currency?: string; total?: number; items: MItem[]; tracking?: string; courier?: string; noStock?: boolean; note?: string };

export const seen = async (ch: Channel, id: string) => !!(await db.order.findFirst({ where: { payRef: `${ch.id}:${id}` }, select: { id: true } }));
const countryName = (c?: string) => { if (!c || c.length !== 2) return c || ''; try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(c.toUpperCase()) || c; } catch { return c; } };

// One marketplace order → an order here (source = the channel), so stock, reports and the ledger include it.
// The marketplace collects the money and delivers, so it is marked paid and our courier is not booked. Safe to call twice.
export async function saveMarketOrder(ch: Channel, o: MOrder) {
  const ref = `${ch.id}:${o.id}`;
  if (await seen(ch, o.id)) return false;
  const rates = await getRates();
  const paid = (o.currency || money(ch)).toUpperCase();
  let cur = paid, k = 1, fx = '';
  if (!isCurrency(paid)) { cur = 'USD'; if (FX[paid]) { k = FX[paid]; fx = ` Amounts converted from ${paid} at about ${FX[paid]} USD each; the exact payout is in the ${ch.name} seller centre.`; } else fx = ` Paid in ${paid}; amounts are shown as they came.`; }
  const c = cur as 'USD' | 'MYR' | 'BDT';
  const bySku = new Map((await db.product.findMany({ where: { slug: { in: o.items.map(i => i.sku).filter(Boolean) } } })).map(p => [p.slug, p]));
  const D = (n: number) => new Prisma.Decimal((Number.isFinite(n) ? n : 0).toFixed(2));
  const groups = new Map<string, { qty: number; price: number; name: string; productId: string | null; cost: number }>();
  for (const i of o.items) {
    const p = i.sku ? bySku.get(i.sku) : undefined, key = i.sku || i.name;
    const g = groups.get(key) || { qty: 0, price: (Number(i.price) || 0) * k, name: p ? p.name : i.name || i.sku, productId: p?.id || null, cost: p ? p.costCents / 100 : 0 };
    g.qty += Math.max(1, Number(i.qty) || 1); groups.set(key, g);
  }
  if (!groups.size) return false;
  const total = Number(o.total) > 0 ? Number(o.total) * k : [...groups.values()].reduce((n, g) => n + g.price * g.qty, 0);
  const wh = whOf(ch), now = new Date(), shown = o.no || o.id;
  const no = `${ch.id.split('-')[0].toUpperCase().slice(0, 3)}-${shown}`.slice(0, 40);
  await db.$transaction(async tx => {
    const made = await tx.order.create({ data: {
      no: (await tx.order.findUnique({ where: { no } })) ? `${no}-${randomInt(100, 999)}` : no,
      name: (o.name || '').trim().slice(0, 120) || `${ch.name} customer`,
      email: `${String(o.id).replace(/[^\w.-]/g, '')}@${ch.id}.marketplace.invalid`, phone: (o.phone || '').slice(0, 40), country: countryName(o.country) || ch.region.split(' / ')[0],
      address: { address: o.address || '', city: o.city || '', zip: o.zip || '', state: o.state || '' },
      currency: c, subtotal: D(total), saved: D(0), shipping: D(0), creditUsed: D(0), total: D(total), rewardEarned: D(0),
      payMethod: `ch:${ch.id}`, payStatus: 'paid', payRef: ref, source: ch.name, warehouse: wh, courier: o.courier || ch.name, trackingNo: o.tracking || '',
      events: [{ at: now.toISOString(), step: 0, note: 'Order placed' }, { at: now.toISOString(), step: -1, note: `From ${ch.name}, order ${shown}. ${ch.name} collects the payment and delivers.${fx}${o.note ? ` ${o.note}` : ''}`.slice(0, 400) }],
      lines: { create: [...groups.values()].map(g => ({ productId: g.productId, name: g.name.slice(0, 200), qty: g.qty, unit: D(g.price), full: D(g.price), cost: D(c === 'USD' ? g.cost : convert(Math.round(g.cost * 100), c, rates)) })) },
    } });
    if (!o.noStock) {
      const { takeStock, OutOfStock } = await import('./stock');
      const lines = [...groups.values()].filter(g => g.productId).map(g => ({ productId: g.productId!, qty: g.qty, name: g.name }));
      try { await takeStock(tx, wh, lines); await tx.order.update({ where: { id: made.id }, data: { stockHeld: true } }); }
      catch (e) { if (!(e instanceof OutOfStock)) throw e; }
    }
    const { record } = await import('./ledger');
    await record(tx, { dir: 'in', kind: 'marketplace', method: `ch:${ch.id}`, amount: total, currency: c, orderId: made.id, orderNo: made.no, ref, note: `${ch.name} order` });
  });
  return true;
}

export const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
