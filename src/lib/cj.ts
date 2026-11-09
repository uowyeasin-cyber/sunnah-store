import 'server-only';
import { db } from './db';
import { key, loadKeys } from './keys';

// CJ Dropshipping API 2.0 (developers.cjdropshipping.com). One API key from CJ → My CJ → Authorization → API.
// The access token lasts about 180 days; it is kept in the database and fetched again when it runs out or is refused.
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN = 'cjToken';

export const cjReady = async () => { await loadKeys(); return !!key('CJ_API_KEY'); };

async function token(fresh = false) {
  await loadKeys();
  const apiKey = key('CJ_API_KEY');
  if (!apiKey) throw new Error('Connect CJ Dropshipping in Admin → Connections first');
  const row = await db.setting.findUnique({ where: { key: TOKEN } });
  const t = row?.value as { token: string; until: string; forKey: string } | undefined;
  if (!fresh && t?.token && t.forKey === apiKey.slice(-6) && new Date(t.until).getTime() > Date.now() + 864e5) return t.token;
  const r = await fetch(`${BASE}/authentication/getAccessToken`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey }) }).then(r => r.json());
  if (!r?.result || !r.data?.accessToken) throw new Error(`CJ login failed: ${r?.message || 'no token'}`);
  const value = { token: r.data.accessToken, until: r.data.accessTokenExpiryDate || new Date(Date.now() + 150 * 864e5).toISOString(), forKey: apiKey.slice(-6) };
  await db.setting.upsert({ where: { key: TOKEN }, update: { value }, create: { key: TOKEN, value } });
  return value.token;
}

async function call<T = unknown>(path: string, init: { method?: 'GET' | 'POST'; query?: Record<string, string | number>; body?: unknown } = {}, retry = true): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(init.query || {})) url.searchParams.set(k, String(v));
  const res = await fetch(url, { method: init.method || 'GET', headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': await token() }, body: init.body ? JSON.stringify(init.body) : undefined, cache: 'no-store' });
  const r = await res.json().catch(() => ({ result: false, message: `HTTP ${res.status}` }));
  // 1600001 and similar: token refused. Get a new one once.
  if ((!r.result && /token/i.test(String(r.message))) || res.status === 401) { if (retry) { await token(true); return call(path, init, false); } }
  if (!r.result) throw new Error(`CJ: ${r.message || `HTTP ${res.status}`}`);
  return r.data as T;
}

export type CjHit = { pid: string; name: string; image: string; price: number };
export async function search(q: string, page = 1): Promise<CjHit[]> {
  const d = await call<{ content?: { productList?: { id: string; nameEn: string; bigImage: string; sellPrice: string }[] }[] }>('/product/listV2', { query: { keyWord: q.slice(0, 100), page, size: 20 } });
  return (d.content || []).flatMap(c => c.productList || []).map(p => ({ pid: p.id, name: p.nameEn, image: p.bigImage, price: Number(String(p.sellPrice).split(/[-~]/)[0]) || 0 }));
}

export type CjVariant = { vid: string; sku: string; name: string; price: number; image: string; stock: number };
export type CjProduct = { pid: string; name: string; description: string; images: string[]; price: number; variants: CjVariant[] };
type Inv = { totalInventory?: number; cjInventory?: number; factoryInventory?: number };
export async function product(pid: string): Promise<CjProduct> {
  const d = await call<{ pid: string; productNameEn: string; description: string; productImageSet?: string[]; productImage?: string; sellPrice: number | string; variants?: { vid: string; variantSku: string; variantNameEn: string; variantSellPrice: number; variantImage: string; inventories?: Inv[] }[] }>('/product/query', { query: { pid } });
  const imgs = Array.isArray(d.productImageSet) ? d.productImageSet : typeof d.productImage === 'string' ? (() => { try { return JSON.parse(d.productImage); } catch { return [d.productImage]; } })() : [];
  return {
    pid: d.pid, name: d.productNameEn, description: String(d.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000), images: imgs.filter(Boolean).slice(0, 10), price: Number(String(d.sellPrice).split(/[-~]/)[0]) || 0,
    variants: (d.variants || []).map(v => ({ vid: v.vid, sku: v.variantSku, name: v.variantNameEn || v.variantSku, price: Number(v.variantSellPrice) || 0, image: v.variantImage || '', stock: (v.inventories || []).reduce((a, i) => a + Number(i.totalInventory ?? (Number(i.cjInventory || 0) + Number(i.factoryInventory || 0))), 0) })),
  };
}

// The cheapest way to ship these variants from China (or the first warehouse that has them) to the customer's country.
export async function cheapestShipping(to: string, items: { vid: string; quantity: number }[], from = 'CN') {
  const d = await call<{ logisticName: string; logisticPrice: number; logisticAging: string }[]>('/logistic/freightCalculate', { method: 'POST', body: { startCountryCode: from, endCountryCode: to, products: items } });
  return [...(d || [])].sort((a, b) => a.logisticPrice - b.logisticPrice)[0] || null;
}

export type ShipTo = { name: string; phone: string; country: string; countryName: string; state: string; city: string; address: string; zip: string; email: string };
// Places the order and pays it from the CJ wallet balance (payType 2). CJ ships it blind: no invoice, no prices, no CJ logo.
export async function placeOrder(ref: string, to: ShipTo, items: { vid: string; quantity: number }[], note: string) {
  const ship = await cheapestShipping(to.country, items);
  if (!ship) throw new Error(`CJ has no shipping to ${to.country} for these items`);
  const d = await call<{ orderId: string; orderStatus?: string }>('/shopping/order/createOrderV2', { method: 'POST', body: {
    orderNumber: ref, shippingCountryCode: to.country, shippingCountry: to.countryName, shippingProvince: to.state || to.city, shippingCity: to.city, shippingAddress: to.address,
    shippingZip: to.zip, shippingPhone: to.phone, shippingCustomerName: to.name, email: to.email, remark: note.slice(0, 500), logisticName: ship.logisticName, fromCountryCode: 'CN', payType: 2, products: items,
  } });
  return { ref: d.orderId, carrier: ship.logisticName, cost: ship.logisticPrice };
}

// Order status and tracking number once CJ has shipped it.
export async function orderStatus(orderId: string) {
  const d = await call<{ orderStatus?: string; trackNumber?: string; logisticName?: string }>('/shopping/order/getOrderDetail', { query: { orderId } });
  return { status: String(d?.orderStatus || ''), trackingNo: String(d?.trackNumber || ''), carrier: String(d?.logisticName || '') };
}
