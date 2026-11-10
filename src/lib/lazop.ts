import 'server-only';
import { createHmac } from 'node:crypto';
import { key } from './keys';
import type { Channel } from './channels';
import { fresh, type Tok } from './chanToken';
import { canPrice, chunks, ourRows, saveMarketOrder, seen } from './marketOrder';

// Lazada and Daraz Open Platform ("LazOp"): one protocol for Daraz BD/PK/LK/NP and Lazada MY/SG/ID/TH/PH/VN.
// Every call is signed: HMAC-SHA256(app secret, api path + each param name and value, sorted by name), upper-case hex.
// The seller links their shop once (OAuth); the token is kept encrypted with the other keys and refreshed before it runs out.
// Our product slug is the SellerSku: list the product there with the same SKU (our product file has it) and the two stay in sync.

const fam = (ch: Channel) => (ch.id.startsWith('daraz') ? 'DARAZ' : 'LAZADA');
export const appKeys = (ch: Channel) => ({ appKey: key(`${fam(ch)}_APP_KEY`), secret: key(`${fam(ch)}_APP_SECRET`) });
export const ready = (ch: Channel) => !!(appKeys(ch).appKey && appKeys(ch).secret);
export const keysNeeded = (ch: Channel) => `${fam(ch) === 'DARAZ' ? 'Daraz' : 'Lazada'} app key and secret`;

export function sign(path: string, params: Record<string, string>, secret: string) {
  const base = path + Object.keys(params).sort().map(k => k + params[k]).join('');
  return createHmac('sha256', secret).update(base, 'utf8').digest('hex').toUpperCase();
}

// The page the seller opens to let this store manage their shop.
export function authUrl(ch: Channel, redirect: string, state: string) {
  const { appKey } = appKeys(ch);
  return `${ch.auth}?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(redirect)}&client_id=${encodeURIComponent(appKey)}&state=${encodeURIComponent(state)}`;
}

const authGateway = (ch: Channel) => (ch.id.startsWith('lazada') ? 'https://auth.lazada.com/rest' : ch.gateway!);

async function raw(gateway: string, path: string, params: Record<string, string>, method: 'GET' | 'POST', ch: Channel, token?: string) {
  const { appKey, secret } = appKeys(ch);
  if (!appKey || !secret) throw new Error(`Add the ${keysNeeded(ch)} in Connections first`);
  const p: Record<string, string> = { ...params, app_key: appKey, timestamp: String(Date.now()), sign_method: 'sha256', ...(token ? { access_token: token } : {}) };
  p.sign = sign(path, p, secret);
  const body = new URLSearchParams(p).toString();
  const res = await fetch(method === 'GET' ? `${gateway}${path}?${body}` : `${gateway}${path}`, method === 'GET' ? { cache: 'no-store' } : { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body, cache: 'no-store' });
  const r = await res.json().catch(() => ({ code: `HTTP ${res.status}` }));
  if (r.code && r.code !== '0' && r.code !== 0) throw new Error(`${ch.name}: ${r.message || r.code}`);
  return r;
}

const tokOf = (r: { access_token: string; refresh_token?: string; expires_in?: number; account?: string; country_user_info?: { seller_id?: string }[] }, old?: Tok): Tok => ({ access: r.access_token, refresh: r.refresh_token || old?.refresh || '', until: Date.now() + Number(r.expires_in || 0) * 1000, account: old?.account || String(r.account || r.country_user_info?.[0]?.seller_id || '') });
export async function exchange(ch: Channel, p: URLSearchParams) {
  return tokOf(await raw(authGateway(ch), '/auth/token/create', { code: p.get('code') || '' }, 'POST', ch));
}
const token = async (ch: Channel) => (await fresh(ch, 864e5, async t => tokOf(await raw(authGateway(ch), '/auth/token/refresh', { refresh_token: t.refresh }, 'POST', ch), t))).access;
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
export async function push(ch: Channel) {
  const [listed, ours] = await Promise.all([listedSkus(ch), ourRows(ch)]);
  const price = canPrice(ch);
  const rows = [...ours].filter(([sku]) => listed.has(sku)).map(([sku, r]) => `<Sku><SellerSku>${sku}</SellerSku><Quantity>${r.qty}</Quantity>${price ? `<Price>${r.price}</Price>` : ''}</Sku>`);
  for (const part of chunks(rows, 20))
    await call(ch, '/product/price_quantity/update', { payload: `<?xml version="1.0" encoding="UTF-8"?><Request><Product><Skus>${part.join('')}</Skus></Product></Request>` }, 'POST');
  return { listed: listed.size, synced: rows.length };
}

type LzOrder = { order_id: number | string; order_number?: number | string; price: string; statuses?: string[]; address_shipping?: Record<string, string>; customer_first_name?: string; customer_last_name?: string };
type LzItem = { sku?: string; name: string; item_price?: string; paid_price?: string; tracking_code?: string; shipment_provider?: string; currency?: string };

// New orders there → orders here.
export async function pull(ch: Channel, days = 3) {
  const r = await call(ch, '/orders/get', { created_after: new Date(Date.now() - days * 864e5).toISOString().replace(/\.\d{3}Z$/, '+00:00'), sort_by: 'created_at', sort_direction: 'DESC', limit: '100' });
  const orders = (r.data?.orders || []) as LzOrder[];
  let added = 0;
  for (const o of orders) {
    if (o.statuses?.some(s => /cancel|unpaid/i.test(s)) || (await seen(ch, String(o.order_id)))) continue;
    const items = ((await call(ch, '/order/items/get', { order_id: String(o.order_id) })).data || []) as LzItem[];
    const a = o.address_shipping || {};
    if (await saveMarketOrder(ch, {
      id: String(o.order_id), no: String(o.order_number || o.order_id), currency: items[0]?.currency,
      name: [a.first_name || o.customer_first_name, a.last_name || o.customer_last_name].filter(Boolean).join(' '), phone: a.phone,
      address: [a.address1, a.address2, a.address3].filter(Boolean).join(', '), city: a.city, zip: a.post_code, state: a.address4,
      total: Number(o.price) || 0, items: items.map(i => ({ sku: i.sku || '', name: i.name, qty: 1, price: Number(i.item_price || i.paid_price || 0) })),
      tracking: items.find(i => i.tracking_code)?.tracking_code, courier: items.find(i => i.shipment_provider)?.shipment_provider,
    })) added++;
  }
  return { seen: orders.length, added };
}
