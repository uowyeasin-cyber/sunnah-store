import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { key } from './keys';
import type { Channel } from './channels';
import { canPrice, ourRows, saveMarketOrder, seen } from './marketOrder';

// Walmart Marketplace API: no "link" page; the seller's own API keys (Seller Center → Settings → API Key Management) are enough.
const app = () => ({ id: key('WALMART_CLIENT_ID'), secret: key('WALMART_CLIENT_SECRET') });
export const ready = () => !!(app().id && app().secret);
export const keysNeeded = () => 'Walmart client ID and secret';
export const keyOnly = true;
const TOKEN = 'walmartToken';

async function token(ch: Channel) {
  const row = (await db.setting.findUnique({ where: { key: TOKEN } }))?.value as { t: string; until: number; id: string } | undefined;
  if (row && row.id === app().id && row.until - Date.now() > 120e3) return row.t;
  const { id, secret } = app();
  if (!id || !secret) throw new Error(`Add the ${keysNeeded()} in Connections first`);
  const r = await fetch(`${ch.gateway}/v3/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'WM_SVC.NAME': 'Walmart Marketplace', 'WM_QOS.CORRELATION_ID': randomUUID() }, body: 'grant_type=client_credentials', cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
  if (!r.access_token) throw new Error(`Walmart: ${r.error?.[0]?.description || r.error_description || 'login failed'}`);
  const value = { t: r.access_token, until: Date.now() + Number(r.expires_in || 900) * 1000, id };
  await db.setting.upsert({ where: { key: TOKEN }, update: { value }, create: { key: TOKEN, value } });
  return value.t;
}
async function call(ch: Channel, path: string, init: { method?: string; body?: unknown } = {}) {
  const res = await fetch(ch.gateway + path, { method: init.method || 'GET', headers: { 'WM_SEC.ACCESS_TOKEN': await token(ch), 'WM_SVC.NAME': 'Walmart Marketplace', 'WM_QOS.CORRELATION_ID': randomUUID(), Accept: 'application/json', 'Content-Type': 'application/json' }, body: init.body ? JSON.stringify(init.body) : undefined, cache: 'no-store' });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Walmart: ${r.errors?.error?.[0]?.description || r.errors?.[0]?.description || `HTTP ${res.status}`}`);
  return r;
}

export async function push(ch: Channel) {
  const ours = await ourRows(ch), skus: string[] = [];
  for (let cursor = '*', n = 0; cursor && n < 20; n++) {
    const r = await call(ch, `/v3/items?limit=200&nextCursor=${encodeURIComponent(cursor)}`);
    for (const i of (r.ItemResponse || []) as { sku: string }[]) skus.push(i.sku);
    cursor = r.nextCursor;
  }
  let synced = 0;
  for (const sku of skus.filter(s => ours.has(s))) {
    const r = ours.get(sku)!;
    await call(ch, `/v3/inventory?sku=${encodeURIComponent(sku)}`, { method: 'PUT', body: { sku, quantity: { unit: 'EACH', amount: r.qty } } });
    if (canPrice(ch)) await call(ch, '/v3/price', { method: 'PUT', body: { sku, pricing: [{ currentPriceType: 'BASE', currentPrice: { currency: 'USD', amount: r.price } }] } });
    synced++;
  }
  return { listed: skus.length, synced };
}

type WmLine = { item?: { productName?: string; sku?: string }; orderLineQuantity?: { amount?: string }; charges?: { charge?: { chargeType?: string; chargeAmount?: { amount?: number; currency?: string } }[] }; orderLineStatuses?: { orderLineStatus?: { status?: string }[] } };
type WmOrder = { purchaseOrderId: string; customerOrderId?: string; shippingInfo?: { phone?: string; postalAddress?: { name?: string; address1?: string; address2?: string; city?: string; state?: string; postalCode?: string; country?: string } }; orderLines?: { orderLine?: WmLine[] } };
export async function pull(ch: Channel, days = 3) {
  const r = await call(ch, `/v3/orders?limit=100&createdStartDate=${encodeURIComponent(new Date(Date.now() - days * 864e5).toISOString())}`);
  const orders = (r.list?.elements?.order || []) as WmOrder[];
  let added = 0;
  for (const o of orders) {
    const lines = (o.orderLines?.orderLine || []).filter(l => !(l.orderLineStatuses?.orderLineStatus || []).some(s => s.status === 'Cancelled'));
    if (!lines.length || (await seen(ch, o.purchaseOrderId))) continue;
    const a = o.shippingInfo?.postalAddress || {};
    const items = lines.map(l => { const qty = Number(l.orderLineQuantity?.amount) || 1, c = (l.charges?.charge || []).find(x => x.chargeType === 'PRODUCT'); return { sku: l.item?.sku || '', name: l.item?.productName || '', qty, price: (Number(c?.chargeAmount?.amount) || 0) / qty, cur: c?.chargeAmount?.currency }; });
    if (await saveMarketOrder(ch, { id: o.purchaseOrderId, no: o.customerOrderId, name: a.name, phone: o.shippingInfo?.phone, country: a.country === 'USA' ? 'US' : a.country, address: [a.address1, a.address2].filter(Boolean).join(', '), city: a.city, state: a.state, zip: a.postalCode, currency: items[0]?.cur || 'USD', items })) added++;
  }
  return { seen: orders.length, added };
}
