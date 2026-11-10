import 'server-only';
import { createHmac } from 'node:crypto';
import { key } from './keys';
import { fresh, type Tok } from './chanToken';
import { money, type Channel } from './channels';
import { canPrice, ourRows, saveMarketOrder, seen } from './marketOrder';

// TikTok Shop Partner API (version 202309). One app (Partner Center → App & Service) for every country.
// Sign = HMAC-SHA256(secret, secret + path + sorted query name+value + JSON body + secret), hex. The token goes in x-tts-access-token.
const API = 'https://open-api.tiktokglobalshop.com', AUTH = 'https://auth.tiktok-shops.com';
const app = () => ({ appKey: key('TIKTOK_APP_KEY'), secret: key('TIKTOK_APP_SECRET'), service: key('TIKTOK_SERVICE_ID') });
export const ready = () => !!(app().appKey && app().secret && app().service);
export const keysNeeded = () => 'TikTok Shop app key, secret and service ID';

export function authUrl(ch: Channel, _redirect: string, state: string) {
  const base = ch.mkt === 'US' ? 'https://services.us.tiktokshop.com' : 'https://services.tiktokshop.com';
  return `${base}/open/authorize?service_id=${encodeURIComponent(app().service)}&state=${encodeURIComponent(state)}`;
}

async function authCall(q: Record<string, string>) {
  const { appKey, secret } = app();
  const r = await fetch(`${AUTH}/api/v2/token/${q.grant_type === 'refresh_token' ? 'refresh' : 'get'}?${new URLSearchParams({ app_key: appKey, app_secret: secret, ...q })}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ code: -1, message: 'no answer' }));
  if (r.code !== 0) throw new Error(`TikTok Shop: ${r.message || r.code}`);
  return r.data as { access_token: string; access_token_expire_in: number; refresh_token: string; open_id?: string };
}
const tokOf = (d: Awaited<ReturnType<typeof authCall>>, old?: Tok): Tok => ({ access: d.access_token, refresh: d.refresh_token || old?.refresh || '', until: Number(d.access_token_expire_in) * 1000 || Date.now() + 6 * 864e5, account: old?.account || d.open_id || '', extra: old?.extra });

async function call(ch: Channel, path: string, q: Record<string, string | number> = {}, body?: unknown, t?: Tok) {
  const { appKey, secret } = app();
  if (!appKey || !secret) throw new Error(`Add the ${keysNeeded()} in Connections first`);
  const tk = t || await tok(ch);
  const p: Record<string, string> = { ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])), app_key: appKey, timestamp: String(Math.floor(Date.now() / 1000)) };
  if (tk.extra?.cipher && !path.startsWith('/authorization/')) p.shop_cipher = tk.extra.cipher;
  const json = body === undefined ? '' : JSON.stringify(body);
  const base = path + Object.keys(p).sort().map(k => k + p[k]).join('') + json;
  p.sign = createHmac('sha256', secret).update(secret + base + secret).digest('hex');
  const res = await fetch(`${API}${path}?${new URLSearchParams(p)}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'x-tts-access-token': tk.access }, body: json || undefined, cache: 'no-store' });
  const r = await res.json().catch(() => ({ code: res.status, message: `HTTP ${res.status}` }));
  if (r.code !== 0) throw new Error(`${ch.name}: ${r.message || r.code}`);
  return r.data || {};
}

// After the seller allows the app: token, then the shop for this country (its "cipher" goes on every shop call).
export async function exchange(ch: Channel, p: URLSearchParams) {
  const t = tokOf(await authCall({ auth_code: p.get('code') || '', grant_type: 'authorized_code' }));
  const shops = ((await call(ch, '/authorization/202309/shops', {}, undefined, t)).shops || []) as { cipher: string; id: string; region?: string; name?: string }[];
  const s = shops.find(x => x.region === ch.mkt) || shops[0];
  if (!s) throw new Error('This TikTok account has no shop');
  return { ...t, account: s.id, extra: { cipher: s.cipher, shop: s.name || '' } };
}
const tok = (ch: Channel) => fresh(ch, 864e5, async t => tokOf(await authCall({ refresh_token: t.refresh, grant_type: 'refresh_token' }), t));

export async function push(ch: Channel) {
  const ours = await ourRows(ch);
  let listed = 0, synced = 0;
  for (let page = '', n = 0; n < 20; n++) {
    const d = await call(ch, '/product/202309/products/search', { page_size: 100, ...(page ? { page_token: page } : {}) }, { status: 'ACTIVATE' });
    for (const p of (d.products || []) as { id: string; skus?: { id: string; seller_sku?: string }[] }[]) {
      const rows = (p.skus || []).filter(s => s.seller_sku).map(s => ({ id: s.id, r: ours.get(s.seller_sku!) })).filter(x => x.r);
      listed += (p.skus || []).length;
      if (!rows.length) continue;
      await call(ch, `/product/202309/products/${p.id}/inventory/update`, {}, { skus: rows.map(x => ({ id: x.id, inventory: [{ quantity: x.r!.qty }] })) });
      if (canPrice(ch)) await call(ch, `/product/202309/products/${p.id}/prices/update`, {}, { skus: rows.map(x => ({ id: x.id, price: { amount: String(x.r!.price), currency: money(ch) } })) });
      synced += rows.length;
    }
    if (!d.next_page_token) break;
    page = d.next_page_token;
  }
  return { listed, synced };
}

type TtOrder = { id: string; status: string; payment?: { total_amount?: string; currency?: string }; shipping_provider?: string; recipient_address?: { name?: string; phone_number?: string; full_address?: string; postal_code?: string; region_code?: string }; line_items?: { seller_sku?: string; product_name: string; sale_price?: string; tracking_number?: string }[] };
export async function pull(ch: Channel, days = 3) {
  const d = await call(ch, '/order/202309/orders/search', { page_size: 50 }, { create_time_ge: Math.floor(Date.now() / 1000) - days * 86400 });
  const orders = (d.orders || []) as TtOrder[];
  let added = 0;
  for (const o of orders) {
    if (/UNPAID|CANCEL/.test(o.status) || (await seen(ch, o.id))) continue;
    const a = o.recipient_address || {};
    // TikTok lists each unit as its own line.
    if (await saveMarketOrder(ch, { id: o.id, name: a.name, phone: a.phone_number, country: a.region_code, address: a.full_address, zip: a.postal_code, currency: o.payment?.currency, total: Number(o.payment?.total_amount) || 0, courier: o.shipping_provider,
      tracking: o.line_items?.find(i => i.tracking_number)?.tracking_number, items: (o.line_items || []).map(i => ({ sku: i.seller_sku || '', name: i.product_name, qty: 1, price: Number(i.sale_price) || 0 })) })) added++;
  }
  return { seen: orders.length, added };
}
