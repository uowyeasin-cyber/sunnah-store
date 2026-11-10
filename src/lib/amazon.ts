import 'server-only';
import { key } from './keys';
import { money, type Channel } from './channels';
import { fresh, type Tok } from './chanToken';
import { canPrice, ourRows, saveMarketOrder, seen } from './marketOrder';

// Amazon Selling Partner API. The seller authorises our (private) app in Seller Central; Login with Amazon gives the tokens.
// Stock and price: Listings Items API by SKU. Orders: Orders API (the buyer's name and phone stay in Seller Central;
// Amazon only shares them with approved apps). Orders shipped by Amazon (FBA) do not take stock from our warehouses.
const LWA = 'https://api.amazon.com/auth/o2/token';
const app = () => ({ appId: key('AMAZON_APP_ID'), id: key('AMAZON_LWA_CLIENT_ID'), secret: key('AMAZON_LWA_CLIENT_SECRET') });
export const ready = () => !!(app().appId && app().id && app().secret);
export const keysNeeded = () => 'Amazon app ID and LWA client ID and secret';

// version=beta lets a private (draft) app be authorised by its own seller.
export const authUrl = (ch: Channel, _redirect: string, state: string) => `${ch.auth}/apps/authorize/consent?${new URLSearchParams({ application_id: app().appId, state, version: 'beta' })}`;

async function lwa(body: Record<string, string>) {
  const r = await fetch(LWA, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...body, client_id: app().id, client_secret: app().secret }), cache: 'no-store' }).then(r => r.json()).catch(() => ({ error: 'no answer' }));
  if (!r.access_token) throw new Error(`Amazon: ${r.error_description || r.error || 'no token'}`);
  return r as { access_token: string; refresh_token?: string; expires_in: number };
}
const tokOf = (r: Awaited<ReturnType<typeof lwa>>, account: string, old?: Tok): Tok => ({ access: r.access_token, refresh: r.refresh_token || old?.refresh || '', until: Date.now() + Number(r.expires_in || 3600) * 1000, account });
export async function exchange(_ch: Channel, p: URLSearchParams) {
  const seller = p.get('selling_partner_id') || '';
  if (!seller) throw new Error('Amazon did not send the seller ID');
  return tokOf(await lwa({ grant_type: 'authorization_code', code: p.get('spapi_oauth_code') || p.get('code') || '' }), seller);
}
const tok = (ch: Channel) => fresh(ch, 5 * 60e3, async t => tokOf(await lwa({ grant_type: 'refresh_token', refresh_token: t.refresh }), t.account, t));

async function call(ch: Channel, path: string, init: { method?: string; body?: unknown } = {}) {
  const t = await tok(ch);
  const res = await fetch(ch.gateway + path.replace('{seller}', encodeURIComponent(t.account)), { method: init.method || 'GET', headers: { 'x-amz-access-token': t.access, 'Content-Type': 'application/json', Accept: 'application/json' }, body: init.body ? JSON.stringify(init.body) : undefined, cache: 'no-store' });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${ch.name}: ${r.errors?.[0]?.message || `HTTP ${res.status}`}`);
  return r;
}

export async function push(ch: Channel) {
  const ours = await ourRows(ch), mk = ch.mkt!;
  const items: { sku: string; type: string }[] = [];
  for (let page = '', n = 0; n < 50; n++) {
    const r = await call(ch, `/listings/2021-08-01/items/{seller}?marketplaceIds=${mk}&includedData=summaries&pageSize=20${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
    for (const i of (r.items || []) as { sku: string; summaries?: { productType?: string }[] }[]) items.push({ sku: i.sku, type: i.summaries?.[0]?.productType || 'PRODUCT' });
    page = r.pagination?.nextToken;
    if (!page) break;
  }
  let synced = 0;
  for (const i of items) {
    const r = ours.get(i.sku);
    if (!r) continue;
    const patches: unknown[] = [{ op: 'replace', path: '/attributes/fulfillment_availability', value: [{ fulfillment_channel_code: 'DEFAULT', quantity: r.qty }] }];
    if (canPrice(ch)) patches.push({ op: 'replace', path: '/attributes/purchasable_offer', value: [{ marketplace_id: mk, currency: money(ch), our_price: [{ schedule: [{ value_with_tax: r.price }] }] }] });
    await call(ch, `/listings/2021-08-01/items/{seller}/${encodeURIComponent(i.sku)}?marketplaceIds=${mk}`, { method: 'PATCH', body: { productType: i.type, patches } });
    synced++;
  }
  return { listed: items.length, synced };
}

type AzOrder = { AmazonOrderId: string; OrderStatus: string; FulfillmentChannel?: string; OrderTotal?: { Amount: string; CurrencyCode: string }; ShippingAddress?: { City?: string; StateOrRegion?: string; PostalCode?: string; CountryCode?: string } };
export async function pull(ch: Channel, days = 3) {
  const r = await call(ch, `/orders/v0/orders?MarketplaceIds=${ch.mkt}&CreatedAfter=${encodeURIComponent(new Date(Date.now() - days * 864e5).toISOString())}`);
  const orders = (r.payload?.Orders || []) as AzOrder[];
  let added = 0;
  for (const o of orders) {
    if (/Pending|Canceled|Unfulfillable/.test(o.OrderStatus) || (await seen(ch, o.AmazonOrderId))) continue;
    const items = ((await call(ch, `/orders/v0/orders/${o.AmazonOrderId}/orderItems`)).payload?.OrderItems || []) as { SellerSKU?: string; Title: string; QuantityOrdered: number; ItemPrice?: { Amount: string } }[];
    const a = o.ShippingAddress || {}, fba = o.FulfillmentChannel === 'AFN';
    if (await saveMarketOrder(ch, { id: o.AmazonOrderId, country: a.CountryCode, city: a.City, state: a.StateOrRegion, zip: a.PostalCode, currency: o.OrderTotal?.CurrencyCode, total: Number(o.OrderTotal?.Amount) || 0, noStock: fba,
      note: fba ? 'Shipped by Amazon (FBA): no stock taken here.' : 'Buyer name and address are in Seller Central.', items: items.map(i => ({ sku: i.SellerSKU || '', name: i.Title, qty: i.QuantityOrdered || 1, price: (Number(i.ItemPrice?.Amount) || 0) / (i.QuantityOrdered || 1) })) })) added++;
  }
  return { seen: orders.length, added };
}
