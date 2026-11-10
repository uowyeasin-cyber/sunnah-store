import 'server-only';
import { createHmac } from 'node:crypto';
import { key } from './keys';
import type { Channel } from './channels';
import { fresh, type Tok } from './chanToken';
import { canPrice, chunks, ourRows, saveMarketOrder, seen } from './marketOrder';

// Shopee Open Platform v2 (open.shopee.com). One partner app covers every Shopee country; each shop links once.
// Sign = HMAC-SHA256(partner key, partner_id + api path + timestamp [+ access_token + shop_id]), lower-case hex.
// Our product slug is the SKU (item SKU, or the variation SKU for items with variations).
const HOST = 'https://partner.shopeemobile.com';
const ids = () => ({ pid: key('SHOPEE_PARTNER_ID'), pkey: key('SHOPEE_PARTNER_KEY') });
export const ready = () => !!(ids().pid && ids().pkey);
export const keysNeeded = () => 'Shopee partner ID and key';

function url(path: string, q: Record<string, string | number> = {}, t?: Tok) {
  const { pid, pkey } = ids();
  if (!pid || !pkey) throw new Error('Add the Shopee partner ID and key in Connections first');
  const ts = Math.floor(Date.now() / 1000);
  const u = new URL(HOST + path);
  u.searchParams.set('partner_id', pid); u.searchParams.set('timestamp', String(ts));
  u.searchParams.set('sign', createHmac('sha256', pkey).update(`${pid}${path}${ts}${t ? t.access + t.account : ''}`).digest('hex'));
  if (t) { u.searchParams.set('access_token', t.access); u.searchParams.set('shop_id', t.account); }
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, String(v));
  return u.toString();
}
async function req(u: string, body?: unknown) {
  const res = await fetch(u, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' } : { cache: 'no-store' });
  const r = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (r.error) throw new Error(`Shopee: ${r.message || r.error}`);
  return r;
}

// Shopee sends the seller back with ?code=…&shop_id=… (it keeps no state, so the channel is in the return link's path).
export const authUrl = (ch: Channel, redirect: string) => url('/api/v2/shop/auth_partner', { redirect: `${redirect}/${ch.id}` });
const tokOf = (r: { access_token: string; refresh_token?: string; expire_in?: number }, shop: string, old?: Tok): Tok => ({ access: r.access_token, refresh: r.refresh_token || old?.refresh || '', until: Date.now() + Number(r.expire_in || 14400) * 1000, account: shop });
export async function exchange(_ch: Channel, p: URLSearchParams) {
  const code = p.get('code'), shop = p.get('shop_id');
  if (!code || !shop) throw new Error('Shopee did not send the shop. Link a shop account, not a main account.');
  return tokOf(await req(url('/api/v2/auth/token/get'), { code, shop_id: Number(shop), partner_id: Number(ids().pid) }), shop);
}
const tok = (ch: Channel) => fresh(ch, 10 * 60e3, async t => tokOf(await req(url('/api/v2/auth/access_token/get'), { refresh_token: t.refresh, shop_id: Number(t.account), partner_id: Number(ids().pid) }), t.account, t));
const get = async (ch: Channel, path: string, q: Record<string, string | number>) => req(url(path, q, await tok(ch)));
const post = async (ch: Channel, path: string, body: unknown) => req(url(path, {}, await tok(ch)), body);

// SKU → item and variation there.
async function listed(ch: Channel) {
  const items: number[] = [];
  for (let offset = 0, n = 0; n < 40; n++) {
    const r = (await get(ch, '/api/v2/product/get_item_list', { offset, page_size: 100, item_status: 'NORMAL' })).response || {};
    for (const i of r.item || []) items.push(i.item_id);
    if (!r.has_next_page) break;
    offset = r.next_offset;
  }
  const map = new Map<string, { item: number; model: number }>();
  for (const part of chunks(items, 50)) {
    const list = ((await get(ch, '/api/v2/product/get_item_base_info', { item_id_list: part.join(',') })).response?.item_list || []) as { item_id: number; item_sku?: string; has_model?: boolean }[];
    for (const i of list) {
      if (i.has_model) {
        const models = ((await get(ch, '/api/v2/product/get_model_list', { item_id: i.item_id })).response?.model || []) as { model_id: number; model_sku?: string }[];
        for (const m of models) if (m.model_sku) map.set(m.model_sku, { item: i.item_id, model: m.model_id });
      } else if (i.item_sku) map.set(i.item_sku, { item: i.item_id, model: 0 });
    }
  }
  return map;
}

export async function push(ch: Channel) {
  const [map, ours] = await Promise.all([listed(ch), ourRows(ch)]);
  const byItem = new Map<number, { model: number; qty: number; price: number }[]>();
  for (const [sku, at] of map) { const r = ours.get(sku); if (r) byItem.set(at.item, [...(byItem.get(at.item) || []), { model: at.model, ...r }]); }
  let synced = 0;
  for (const [item, rows] of byItem) {
    await post(ch, '/api/v2/product/update_stock', { item_id: item, stock_list: rows.map(r => ({ model_id: r.model, seller_stock: [{ stock: r.qty }] })) });
    if (canPrice(ch)) await post(ch, '/api/v2/product/update_price', { item_id: item, price_list: rows.map(r => ({ model_id: r.model, original_price: r.price })) });
    synced += rows.length;
  }
  return { listed: map.size, synced };
}

type SpOrder = { order_sn: string; order_status: string; currency?: string; total_amount?: number; shipping_carrier?: string; recipient_address?: { name?: string; phone?: string; full_address?: string; city?: string; state?: string; zipcode?: string; region?: string }; item_list?: { item_sku?: string; model_sku?: string; item_name: string; model_quantity_purchased?: number; model_discounted_price?: number; model_original_price?: number }[] };
export async function pull(ch: Channel, days = 3) {
  const to = Math.floor(Date.now() / 1000), from = to - Math.min(15, days) * 86400;
  const sns: string[] = [];
  for (let cursor = '', n = 0; n < 20; n++) {
    const r = (await get(ch, '/api/v2/order/get_order_list', { time_range_field: 'create_time', time_from: from, time_to: to, page_size: 100, cursor, response_optional_fields: 'order_status' })).response || {};
    for (const o of (r.order_list || []) as { order_sn: string; order_status?: string }[]) if (!/UNPAID|CANCEL/.test(o.order_status || '')) sns.push(o.order_sn);
    if (!r.more) break;
    cursor = r.next_cursor;
  }
  const fresh: string[] = [];
  for (const sn of sns) if (!(await seen(ch, sn))) fresh.push(sn);
  let added = 0;
  for (const part of chunks(fresh, 50)) {
    const list = ((await get(ch, '/api/v2/order/get_order_detail', { order_sn_list: part.join(','), response_optional_fields: 'buyer_username,recipient_address,item_list,total_amount,shipping_carrier' })).response?.order_list || []) as SpOrder[];
    for (const o of list) {
      const a = o.recipient_address || {};
      if (await saveMarketOrder(ch, { id: o.order_sn, name: a.name, phone: a.phone, country: a.region, address: a.full_address, city: a.city, state: a.state, zip: a.zipcode, currency: o.currency, total: o.total_amount, courier: o.shipping_carrier,
        items: (o.item_list || []).map(i => ({ sku: i.model_sku || i.item_sku || '', name: i.item_name, qty: i.model_quantity_purchased || 1, price: i.model_discounted_price || i.model_original_price || 0 })) })) added++;
    }
  }
  return { seen: sns.length, added };
}
