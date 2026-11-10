import 'server-only';
import { key } from './keys';
import type { Channel } from './channels';
import { fresh, type Tok } from './chanToken';
import { chunks, ourRows, saveMarketOrder, seen } from './marketOrder';

// eBay REST APIs: Inventory (stock and price by SKU) and Fulfillment (orders). OAuth with the app's RuName as the return link.
// Listings must be Inventory API listings with our SKU (Seller Hub listings made by hand can be moved with eBay's "migrate" tool).
const API = 'https://api.ebay.com';
const SCOPES = ['https://api.ebay.com/oauth/api_scope', 'https://api.ebay.com/oauth/api_scope/sell.inventory', 'https://api.ebay.com/oauth/api_scope/sell.fulfillment'].join(' ');
const app = () => ({ id: key('EBAY_CLIENT_ID'), secret: key('EBAY_CLIENT_SECRET'), ru: key('EBAY_RUNAME') });
export const ready = () => !!(app().id && app().secret && app().ru);
export const keysNeeded = () => 'eBay App ID, Cert ID and RuName';

export const authUrl = (_ch: Channel, _redirect: string, state: string) => `https://auth.ebay.com/oauth2/authorize?${new URLSearchParams({ client_id: app().id, redirect_uri: app().ru, response_type: 'code', scope: SCOPES, state })}`;

async function tokenCall(body: Record<string, string>) {
  const { id, secret } = app();
  const r = await fetch(`${API}/identity/v1/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` }, body: new URLSearchParams(body), cache: 'no-store' }).then(r => r.json()).catch(() => ({ error: 'no answer' }));
  if (r.error || !r.access_token) throw new Error(`eBay: ${r.error_description || r.error || 'no token'}`);
  return r as { access_token: string; expires_in: number; refresh_token?: string };
}
const tokOf = (r: Awaited<ReturnType<typeof tokenCall>>, old?: Tok): Tok => ({ access: r.access_token, refresh: r.refresh_token || old?.refresh || '', until: Date.now() + Number(r.expires_in || 7200) * 1000, account: old?.account || '' });
export const exchange = async (_ch: Channel, p: URLSearchParams) => tokOf(await tokenCall({ grant_type: 'authorization_code', code: p.get('code') || '', redirect_uri: app().ru }));
const tok = (ch: Channel) => fresh(ch, 5 * 60e3, async t => tokOf(await tokenCall({ grant_type: 'refresh_token', refresh_token: t.refresh, scope: SCOPES }), t));

async function call(ch: Channel, path: string, body?: unknown) {
  const res = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${(await tok(ch)).access}`, 'Content-Type': 'application/json', 'Content-Language': 'en-US', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  if (res.status === 204) return {};
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`eBay: ${r.errors?.[0]?.longMessage || r.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return r;
}

export async function push(ch: Channel) {
  const ours = await ourRows(ch), skus: string[] = [];
  for (let offset = 0, n = 0; n < 20; n++, offset += 100) {
    const r = await call(ch, `/sell/inventory/v1/inventory_item?limit=100&offset=${offset}`);
    for (const i of (r.inventoryItems || []) as { sku: string }[]) skus.push(i.sku);
    if (offset + 100 >= Number(r.total || 0)) break;
  }
  const reqs = [];
  for (const sku of skus.filter(s => ours.has(s))) {
    const r = ours.get(sku)!;
    const offers = ((await call(ch, `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`)).offers || []) as { offerId: string; pricingSummary?: { price?: { currency?: string } } }[];
    // The price is only changed on offers sold in our channel currency (eBay.com in USD); other sites keep theirs.
    reqs.push({ sku, shipToLocationAvailability: { quantity: r.qty }, offers: offers.map(o => ({ offerId: o.offerId, availableQuantity: r.qty, ...((o.pricingSummary?.price?.currency || 'USD') === ch.cur ? { price: { value: r.price.toFixed(2), currency: ch.cur } } : {}) })) });
  }
  for (const part of chunks(reqs, 25)) await call(ch, '/sell/inventory/v1/bulk_update_price_quantity', { requests: part });
  return { listed: skus.length, synced: reqs.length };
}

type EbOrder = { orderId: string; orderPaymentStatus?: string; cancelStatus?: { cancelState?: string }; pricingSummary?: { total?: { value: string; currency: string } }; fulfillmentStartInstructions?: { shippingStep?: { shipTo?: { fullName?: string; primaryPhone?: { phoneNumber?: string }; contactAddress?: { addressLine1?: string; addressLine2?: string; city?: string; stateOrProvince?: string; postalCode?: string; countryCode?: string } } } }[]; lineItems?: { sku?: string; title: string; quantity: number; lineItemCost?: { value: string } }[] };
export async function pull(ch: Channel, days = 3) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const orders = ((await call(ch, `/sell/fulfillment/v1/order?limit=50&filter=${encodeURIComponent(`creationdate:[${since}..]`)}`)).orders || []) as EbOrder[];
  let added = 0;
  for (const o of orders) {
    if (o.orderPaymentStatus === 'PENDING' || o.orderPaymentStatus === 'FAILED' || /CANCEL/.test(o.cancelStatus?.cancelState || '') || (await seen(ch, o.orderId))) continue;
    const to = o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || {}, a = to.contactAddress || {};
    if (await saveMarketOrder(ch, { id: o.orderId, name: to.fullName, phone: to.primaryPhone?.phoneNumber, country: a.countryCode, address: [a.addressLine1, a.addressLine2].filter(Boolean).join(', '), city: a.city, state: a.stateOrProvince, zip: a.postalCode,
      currency: o.pricingSummary?.total?.currency, total: Number(o.pricingSummary?.total?.value) || 0, items: (o.lineItems || []).map(i => ({ sku: i.sku || '', name: i.title, qty: i.quantity || 1, price: (Number(i.lineItemCost?.value) || 0) / (i.quantity || 1) })) })) added++;
  }
  return { seen: orders.length, added };
}
