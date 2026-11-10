import 'server-only';
import { key, loadKeys } from './keys';
import { sign } from './lazop';
import { fresh, linked, type Tok } from './chanToken';

// AliExpress Open Platform, Dropshipping API (openservice.aliexpress.com), the same API DSers and AutoDS use.
// Make a "Dropshipping" app there, put its App Key and App Secret in Connections → Suppliers, then press Link AliExpress.
// Methods are signed like Lazada (same Alibaba platform): HMAC-SHA256 over the sorted names and values, upper-case hex.
export const AE = { id: 'aliexpress', name: 'AliExpress' };
const GW = 'https://api-sg.aliexpress.com';
const app = () => ({ appKey: key('ALIEXPRESS_APP_KEY'), secret: key('ALIEXPRESS_APP_SECRET') });
export const aeReady = async () => { await loadKeys(); return !!(app().appKey && app().secret); };
export const aeLinked = async () => !!(await linked(AE));

export const authUrl = (redirect: string) => `${GW}/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(redirect)}&client_id=${encodeURIComponent(app().appKey)}&state=aliexpress`;

async function send(path: string, params: Record<string, string>, token?: string) {
  const { appKey, secret } = app();
  if (!appKey || !secret) throw new Error('Add the AliExpress app key and secret in Connections → Suppliers first');
  const p: Record<string, string> = { ...params, app_key: appKey, timestamp: String(Date.now()), sign_method: 'sha256', ...(token ? { access_token: token, session: token } : {}) };
  p.sign = sign(path === '/sync' ? '' : path, p, secret);
  const res = await fetch(`${GW}${path === '/sync' ? '/sync' : `/rest${path}`}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: new URLSearchParams(p), cache: 'no-store' });
  const r = await res.json().catch(() => ({ code: `HTTP ${res.status}` }));
  const err = r.error_response || (r.code && r.code !== '0' && r.code !== 0 ? r : null);
  if (err) throw new Error(`AliExpress: ${err.msg || err.message || err.sub_msg || err.code}`);
  return r;
}

const tokOf = (r: { access_token: string; refresh_token?: string; expires_in?: number; user_id?: string; seller_id?: string }, old?: Tok): Tok => ({ access: r.access_token, refresh: r.refresh_token || old?.refresh || '', until: Date.now() + Number(r.expires_in || 0) * 1000, account: old?.account || String(r.user_id || r.seller_id || '') });
export const exchange = async (code: string) => tokOf(await send('/auth/token/create', { code }));
const token = async () => (await fresh(AE, 864e5, async t => tokOf(await send('/auth/token/refresh', { refresh_token: t.refresh }), t))).access;

// Calls one API method and returns what is inside "<method>_response".
async function method(name: string, params: Record<string, string>) {
  const r = await send('/sync', { method: name, ...params }, await token());
  const body = r[`${name.replace(/\./g, '_')}_response`] || r;
  const res = body.result ?? body;
  if (res && typeof res === 'object' && (res.rsp_code && String(res.rsp_code) !== '200' && String(res.rsp_code) !== '0') && !res.ae_item_base_info_dto) throw new Error(`AliExpress: ${res.rsp_msg || res.rsp_code}`);
  return res;
}

// Field names differ a little between AliExpress API versions: look for the first matching key anywhere in the answer.
function find(o: unknown, keys: string[]): unknown {
  if (!o || typeof o !== 'object') return undefined;
  for (const k of keys) if (k in (o as object) && (o as Record<string, unknown>)[k] !== '' && (o as Record<string, unknown>)[k] != null) return (o as Record<string, unknown>)[k];
  for (const v of Object.values(o as object)) { const f = find(v, keys); if (f !== undefined) return f; }
  return undefined;
}
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === 'object' ? (Object.values(v).find(Array.isArray) as T[]) || [v as T] : []);

export const productId = (link: string) => (link.match(/(?:item\/|productId=|^)(\d{8,20})/) || [])[1] || '';

export type AeVariant = { sku: string; name: string; price: number; stock: number; image: string };
export type AeProduct = { id: string; name: string; description: string; images: string[]; variants: AeVariant[] };
export async function product(id: string, country = 'US'): Promise<AeProduct> {
  const r = await method('aliexpress.ds.product.get', { product_id: id, ship_to_country: country, target_currency: 'USD', target_language: 'en' }) as Record<string, unknown>;
  const base = (r.ae_item_base_info_dto || {}) as { subject?: string; detail?: string; mobile_detail?: string };
  const imgs = String((r.ae_multimedia_info_dto as { image_urls?: string } | undefined)?.image_urls || '').split(';').filter(u => /^https?:\/\//.test(u)).map(u => u.replace(/^http:/, 'https:'));
  const skus = arr<Record<string, unknown>>((r.ae_item_sku_info_dtos as Record<string, unknown> | undefined)?.ae_item_sku_info_d_t_o ?? r.ae_item_sku_info_dtos);
  const variants = skus.map(s => {
    const props = arr<{ sku_property_value?: string; property_value_definition_name?: string; sku_image?: string }>((s.ae_sku_property_dtos as Record<string, unknown> | undefined)?.ae_sku_property_d_t_o ?? s.ae_sku_property_dtos);
    return { sku: String(s.sku_attr ?? s.id ?? ''), name: props.map(p => p.property_value_definition_name || p.sku_property_value).filter(Boolean).join(' / '), price: Number(s.offer_sale_price || s.sku_price || 0), stock: Number(s.sku_available_stock ?? s.ipm_sku_stock ?? 0), image: (props.find(p => p.sku_image)?.sku_image || '').replace(/^http:/, 'https:') };
  });
  if (!base.subject) throw new Error('AliExpress did not return this product (check the link, or the product does not ship to that country)');
  return { id, name: base.subject, description: String(base.detail || base.mobile_detail || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000), images: imgs.slice(0, 10), variants };
}

export type AeShipTo = { name: string; phone: string; country: string; state: string; city: string; address: string; zip: string };
// Places the order on AliExpress for the customer's address. AliExpress takes the payment from your saved card or balance,
// or the order waits for payment in AliExpress → My orders. Supplier line SKU is "<product id>|<sku attr>".
export async function placeOrder(ref: string, to: AeShipTo, items: { sku: string; quantity: number }[], note: string) {
  const r = await method('aliexpress.ds.order.create', {
    param_place_order_request4_open_api_d_t_o: JSON.stringify({
      out_order_id: ref,
      logistics_address: { full_name: to.name, contact_person: to.name, mobile_no: to.phone, phone_country: '', country: to.country, province: to.state || to.city, city: to.city, address: to.address, zip: to.zip },
      product_items: items.map(i => { const [pid, attr = ''] = i.sku.split('|'); return { product_id: Number(pid), product_count: i.quantity, sku_attr: attr, order_memo: note.slice(0, 500) }; }),
    }),
    ds_extend_request: JSON.stringify({ payment: { pay_currency: 'USD' } }),
  });
  if (find(r, ['is_success']) === false) throw new Error(`AliExpress: ${find(r, ['error_msg', 'error_code']) || 'order refused'}`);
  const ids = find(r, ['order_list', 'number']);
  const id = String((Array.isArray(ids) ? ids[0] : (arr<string>(ids)[0] ?? ids)) || '');
  if (!id) throw new Error('AliExpress did not return an order number');
  return { ref: id };
}

// Tracking number once the seller has shipped it.
export async function orderStatus(orderId: string) {
  const r = await method('aliexpress.trade.ds.order.get', { single_order_query: JSON.stringify({ order_id: Number(orderId) }) });
  return { status: String(find(r, ['order_status']) || ''), trackingNo: String(find(r, ['logistics_no', 'tracking_number', 'mail_no']) || ''), carrier: String(find(r, ['logistics_service', 'carrier_name', 'logistics_service_name']) || '') };
}
