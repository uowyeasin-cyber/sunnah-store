import 'server-only';
import { createHmac, randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { key, loadKeys, saveKeys, storedKeys } from './keys';
import { channel, type Channel } from './channels';
import { DEFAULT_SETTINGS } from './settings';
import { convert, type Rates } from './money';

// Currency rates straight from the database (background jobs run outside the page cache).
const getSettings = async () => ({ rates: ((await db.setting.findUnique({ where: { key: 'rates' } }))?.value as Rates | undefined) || DEFAULT_SETTINGS.rates });

// Lazada and Daraz Open Platform ("LazOp"): one protocol for Daraz BD/PK/LK/NP and Lazada MY/SG/ID/TH/PH/VN.
// Every call is signed: HMAC-SHA256(app secret, api path + each param name and value, sorted by name), upper-case hex.
// The seller links their shop once (OAuth); the token is kept encrypted with the other keys and refreshed before it runs out.
// Our product slug is the SellerSku: list the product there with the same SKU (our product file has it) and the two stay in sync.

const fam = (ch: Channel) => (ch.id.startsWith('daraz') ? 'DARAZ' : 'LAZADA');
export const appKeys = (ch: Channel) => ({ appKey: key(`${fam(ch)}_APP_KEY`), secret: key(`${fam(ch)}_APP_SECRET`) });
const tokenName = (ch: Channel) => `CH_TOKEN_${ch.id.toUpperCase().replace(/-/g, '_')}`;
type Tok = { access: string; refresh: string; until: number; account: string };

export function sign(path: string, params: Record<string, string>, secret: string) {
  const base = path + Object.keys(params).sort().map(k => k + params[k]).join('');
  return createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

export async function linked(ch: Channel) {
  await loadKeys();
  try { return JSON.parse(key(tokenName(ch)) || 'null') as Tok | null; } catch { return null; }
}
async function saveTok(ch: Channel, t: Tok | null) {
  const all = await storedKeys();
  if (t) all[tokenName(ch)] = JSON.stringify(t); else delete all[tokenName(ch)];
  await saveKeys(all);
}

// The page the seller opens to let this store manage their shop.
export function authUrl(ch: Channel, redirect: string, state: string) {
  const { appKey } = appKeys(ch);
  return `${ch.auth}?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(redirect)}&client_id=${encodeURIComponent(appKey)}&state=${encodeURIComponent(state)}`;
}

const authGateway = (ch: Channel) => (ch.id.startsWith('lazada') ? 'https://auth.lazada.com/rest' : ch.gateway!);

async function raw(gateway: string, path: string, params: Record<string, string>, method: 'GET' | 'POST', ch: Channel, token?: string) {
  const { appKey, secret } = appKeys(ch);
  if (!appKey || !secret) throw new Error(`Add the ${fam(ch) === 'DARAZ' ? 'Daraz' : 'Lazada'} app key and secret in Connections first`);
  const p: Record<string, string> = { ...params, app_key: appKey, timestamp: String(Date.now()), sign_method: 'sha256', ...(token ? { access_token: token } : {}) };
  p.sign = sign(path, p, secret);
  const body = new URLSearchParams(p).toString();
  const res = await fetch(method === 'GET' ? `${gateway}${path}?${body}` : `${gateway}${path}`, method === 'GET' ? { cache: 'no-store' } : { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body, cache: 'no-store' });
  const r = await res.json().catch(() => ({ code: `HTTP ${res.status}` }));
  if (r.code && r.code !== '0' && r.code !== 0) throw new Error(`${ch.name}: ${r.message || r.code}`);
  return r;
}

export async function exchangeCode(ch: Channel, code: string) {
  const r = await raw(authGateway(ch), '/auth/token/create', { code }, 'POST', ch);
  await saveTok(ch, { access: r.access_token, refresh: r.refresh_token, until: Date.now() + Number(r.expires_in || 0) * 1000, account: String(r.account || r.country_user_info?.[0]?.seller_id || '') });
}
export const unlink = (ch: Channel) => saveTok(ch, null);

async function token(ch: Channel) {
  const t = await linked(ch);
  if (!t) throw new Error(`${ch.name} is not linked yet`);
  if (t.until - Date.now() > 864e5) return t.access;
  const r = await raw(authGateway(ch), '/auth/token/refresh', { refresh_token: t.refresh }, 'POST', ch);
  await saveTok(ch, { ...t, access: r.access_token, refresh: r.refresh_token || t.refresh, until: Date.now() + Number(r.expires_in || 0) * 1000 });
  return r.access_token as string;
}
const call = async (ch: Channel, path: string, params: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET') => raw(ch.gateway!, path, params, method, ch, await token(ch));

// SKUs the seller has listed there.
async function listedSkus(ch: Channel) {
  const skus = new Set<string>();
  for (let offset = 0; offset < 2000; offset += 50) {
    const r = await call(ch, '/products/get', { filter: 'all', limit: '50', offset: String(offset) });
    const list = (r.data?.products || []) as { skus?: { SellerSku?: string }[] }[];
    for (const p of list) for (const s of p.skus || []) if (s.SellerSku) skus.add(s.SellerSku);
    if (list.length < 50) break;
  }
  return skus;
}

// Our stock and price → their listing, for every product listed there with our SKU.
export async function pushStock(id: string) {
  const ch = channel(id)!;
  const [listed, products, s] = await Promise.all([listedSkus(ch), db.product.findMany({ where: { archived: false }, select: { slug: true, priceCents: true, stock: true, active: true, offer: true } }), getSettings()]);
  const wh = ch.cur === 'BDT' ? 'BD' : ch.cur === 'MYR' ? 'MY' : 'US';
  const rows = products.filter(p => listed.has(p.slug)).map(p => {
    const qty = p.active ? Math.max(0, Number((p.stock as Record<string, number>)[wh] || 0)) : 0;
    const price = convert(p.priceCents, ch.cur, s.rates);
    return `<Sku><SellerSku>${p.slug}</SellerSku><Quantity>${qty}</Quantity><Price>${price}</Price></Sku>`;
  });
  for (let i = 0; i < rows.length; i += 20)
    await call(ch, '/product/price_quantity/update', { payload: `<?xml version="1.0" encoding="UTF-8"?><Request><Product><Skus>${rows.slice(i, i + 20).join('')}</Skus></Product></Request>` }, 'POST');
  return { listed: listed.size, synced: rows.length };
}

type LzOrder = { order_id: number | string; order_number?: number | string; created_at: string; price: string; statuses?: string[]; address_shipping?: Record<string, string>; customer_first_name?: string; customer_last_name?: string };
type LzItem = { sku?: string; name: string; item_price?: string; paid_price?: string; tracking_code?: string; shipment_provider?: string };

// New orders there → orders here (source = the channel), so stock, reports and the ledger include them.
// The marketplace collects the money and delivers, so these are marked paid and our courier is not booked.
export async function pullOrders(id: string, days = 3) {
  const ch = channel(id)!;
  const r = await call(ch, '/orders/get', { created_after: new Date(Date.now() - days * 864e5).toISOString().replace(/\.\d{3}Z$/, '+00:00'), sort_by: 'created_at', sort_direction: 'DESC', limit: '100' });
  const orders = (r.data?.orders || []) as LzOrder[];
  const wh = ch.cur === 'BDT' ? 'BD' : ch.cur === 'MYR' ? 'MY' : 'US';
  const country = ch.region.split(' / ')[0];
  let added = 0;
  for (const o of orders) {
    const ref = `${ch.id}:${o.order_id}`;
    if (o.statuses?.some(s => /cancel|unpaid/i.test(s))) continue;
    if (await db.order.findFirst({ where: { payRef: ref }, select: { id: true } })) continue;
    const items = ((await call(ch, '/order/items/get', { order_id: String(o.order_id) })).data || []) as LzItem[];
    const bySku = new Map((await db.product.findMany({ where: { slug: { in: items.map(i => i.sku || '').filter(Boolean) } } })).map(p => [p.slug, p]));
    const a = o.address_shipping || {};
    const total = Number(o.price) || items.reduce((n, i) => n + Number(i.paid_price || i.item_price || 0), 0);
    const D = (n: number) => new Prisma.Decimal(n.toFixed(2));
    const groups = new Map<string, { qty: number; price: number; name: string; productId: string | null; cost: number }>();
    for (const i of items) {
      const p = i.sku ? bySku.get(i.sku) : undefined, k = i.sku || i.name;
      const g = groups.get(k) || { qty: 0, price: Number(i.item_price || i.paid_price || 0), name: p ? p.name : i.name, productId: p?.id || null, cost: p ? p.costCents / 100 : 0 };
      g.qty++; groups.set(k, g);
    }
    const s = await getSettings();
    const tracking = items.find(i => i.tracking_code)?.tracking_code || '';
    const now = new Date(), no = `${ch.id.split('-')[0].toUpperCase().slice(0, 3)}-${o.order_number || o.order_id}`.slice(0, 40);
    await db.$transaction(async tx => {
      const made = await tx.order.create({ data: {
        no: (await tx.order.findUnique({ where: { no } })) ? `${no}-${randomInt(100, 999)}` : no,
        name: [a.first_name || o.customer_first_name, a.last_name || o.customer_last_name].filter(Boolean).join(' ') || ch.name + ' customer',
        email: `${String(o.order_id)}@${ch.id}.marketplace.invalid`, phone: a.phone || '', country,
        address: { address: [a.address1, a.address2, a.address3].filter(Boolean).join(', '), city: a.city || '', zip: a.post_code || '', state: a.address4 || '' },
        currency: ch.cur, subtotal: D(total), saved: D(0), shipping: D(0), creditUsed: D(0), total: D(total), rewardEarned: D(0),
        payMethod: `ch:${ch.id}`, payStatus: 'paid', payRef: ref, source: ch.name, warehouse: wh, courier: items.find(i => i.shipment_provider)?.shipment_provider || ch.name, trackingNo: tracking,
        events: [{ at: now.toISOString(), step: 0, note: 'Order placed' }, { at: now.toISOString(), step: -1, note: `From ${ch.name}, order ${o.order_number || o.order_id}. ${ch.name} collects the payment and delivers.` }],
        lines: { create: [...groups.values()].map(g => ({ productId: g.productId, name: g.name, qty: g.qty, unit: D(g.price), full: D(g.price), cost: D(ch.cur === 'USD' ? g.cost : convert(Math.round(g.cost * 100), ch.cur, s.rates)) })) },
      } });
      const { takeStock, OutOfStock } = await import('./stock');
      const lines = [...groups.values()].filter(g => g.productId).map(g => ({ productId: g.productId!, qty: g.qty, name: g.name }));
      try { await takeStock(tx, wh, lines); await tx.order.update({ where: { id: made.id }, data: { stockHeld: true } }); }
      catch (e) { if (!(e instanceof OutOfStock)) throw e; }
      const { record } = await import('./ledger');
      await record(tx, { dir: 'in', kind: 'marketplace', method: `ch:${ch.id}`, amount: total, currency: ch.cur, orderId: made.id, orderNo: made.no, ref, note: `${ch.name} order` });
    });
    added++;
  }
  return { seen: orders.length, added };
}
