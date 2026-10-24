import 'server-only';
import { key as env, loadKeys } from './keys';
import type { Sender, Settings } from './settings';

// Courier connections, by warehouse. Each books by itself once its keys are saved in Admin → Connections.
// Bangladesh: Steadfast, Pathao, RedX. Malaysia: EasyParcel (J&T, Pos Laju, Ninja Van, DHL… and international).
// USA: Shippo (USPS, UPS, FedEx, DHL Express). Tracking: Steadfast, Pathao, RedX directly; Ship24 for the rest.
// Steps match lib/tracking: 2 accepted, 3 picked up, 4 in transit, 5 out for delivery, 6 delivered.
export { loadKeys };

type Line = { name: string; qty: number; unit: unknown };
export type Parcel = { no: string; name: string; email: string; phone: string; country: string; address: unknown; total: number; currency: string; codDue: number; courier: string; lines: Line[] };
export type Booked = { trackingNo: string; ref: string; label?: string; courier?: string };
type Ctx = { from: Sender; parcel: Settings['parcel'] };

const json = (r: Response) => r.json().catch(() => ({}));
const addr = (p: Parcel) => p.address as Record<string, string>;
const items = (p: Parcel) => p.lines.reduce((n, l) => n + l.qty, 0);
const kg = (p: Parcel, c: Ctx) => Math.max(0.1, Math.round(items(p) * c.parcel.kgPerItem * 100) / 100);
const what = (p: Parcel) => p.lines.map(l => `${l.qty} x ${l.name}`).join(', ').slice(0, 200);
// Bangladeshi couriers want a local 11-digit number (01XXXXXXXXX).
const bdPhone = (ph: string) => { const d = ph.replace(/\D/g, ''); return d.startsWith('880') ? d.slice(2) : d.startsWith('1') && d.length === 10 ? '0' + d : d; };
const fail = (who: string, r: Record<string, unknown>) => new Error(`${who}: ${String(r.message || r.error || r.error_remark || JSON.stringify(r.errors || r)).slice(0, 300)}`);

// ── Steadfast (Bangladesh) ──────────────────────────────────────────────
const sf = (path: string, init?: RequestInit) => fetch(`${env('STEADFAST_BASE') || 'https://portal.packzy.com/api/v1'}${path}`, {
  ...init, headers: { 'Api-Key': env('STEADFAST_API_KEY'), 'Secret-Key': env('STEADFAST_SECRET_KEY'), 'Content-Type': 'application/json' },
}).then(json);
export const steadfastReady = () => !!(env('STEADFAST_API_KEY') && env('STEADFAST_SECRET_KEY'));

async function bookSteadfast(p: Parcel): Promise<Booked> {
  const a = addr(p);
  const r = await sf('/create_order', { method: 'POST', body: JSON.stringify({
    invoice: p.no, recipient_name: p.name, recipient_phone: bdPhone(p.phone), recipient_address: [a.address, a.city, a.zip].filter(Boolean).join(', ').slice(0, 250),
    cod_amount: Math.round(p.codDue), note: '' }) });
  if (r.status !== 200 || !r.consignment) throw fail('Steadfast', r);
  return { trackingNo: String(r.consignment.tracking_code), ref: String(r.consignment.consignment_id) };
}

// ── Pathao (Bangladesh) ─────────────────────────────────────────────────
const pathaoBase = () => (env('PATHAO_SANDBOX') ? 'https://courier-api-sandbox.pathao.com' : 'https://api-hermes.pathao.com');
export const pathaoReady = () => ['PATHAO_CLIENT_ID', 'PATHAO_CLIENT_SECRET', 'PATHAO_USERNAME', 'PATHAO_PASSWORD', 'PATHAO_STORE_ID'].every(k => env(k));
let pathaoTok: { v: string; exp: number } | null = null;
async function pathao(path: string, init?: RequestInit) {
  if (!pathaoTok || pathaoTok.exp < Date.now()) {
    const r = await fetch(`${pathaoBase()}/aladdin/api/v1/issue-token`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({
      client_id: env('PATHAO_CLIENT_ID'), client_secret: env('PATHAO_CLIENT_SECRET'), username: env('PATHAO_USERNAME'), password: env('PATHAO_PASSWORD'), grant_type: 'password' }) }).then(json);
    if (!r.access_token) throw fail('Pathao sign-in', r);
    pathaoTok = { v: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60e3 };
  }
  return fetch(`${pathaoBase()}${path}`, { ...init, headers: { Authorization: `Bearer ${pathaoTok.v}`, 'Content-Type': 'application/json', Accept: 'application/json' } }).then(json);
}
// Pathao wants its own city and zone ids; match them by name from the customer's city and address.
async function pathaoArea(a: Record<string, string>) {
  const text = `${a.address} ${a.city}`.toLowerCase();
  const cities: { city_id: number; city_name: string }[] = (await pathao('/aladdin/api/v1/city-list')).data?.data || [];
  const city = cities.find(c => (a.city || '').toLowerCase().includes(c.city_name.toLowerCase())) || cities.find(c => text.includes(c.city_name.toLowerCase()));
  if (!city) return {};
  const zones: { zone_id: number; zone_name: string }[] = (await pathao(`/aladdin/api/v1/cities/${city.city_id}/zone-list`)).data?.data || [];
  const zone = zones.find(z => text.includes(z.zone_name.toLowerCase()));
  return { recipient_city: city.city_id, ...(zone ? { recipient_zone: zone.zone_id } : {}) };
}
async function bookPathao(p: Parcel, c: Ctx): Promise<Booked> {
  const a = addr(p);
  const r = await pathao('/aladdin/api/v1/orders', { method: 'POST', body: JSON.stringify({
    store_id: Number(env('PATHAO_STORE_ID')), merchant_order_id: p.no, recipient_name: p.name, recipient_phone: bdPhone(p.phone),
    recipient_address: [a.address, a.city, a.zip].filter(Boolean).join(', ').padEnd(10, ' ').slice(0, 220), ...(await pathaoArea(a)),
    delivery_type: 48, item_type: 2, item_quantity: items(p), item_weight: Math.max(0.5, kg(p, c)), amount_to_collect: Math.round(p.codDue), item_description: what(p) }) });
  const id = r.data?.consignment_id;
  if (!id) throw fail('Pathao', r);
  return { trackingNo: String(id), ref: String(id) };
}
const PATHAO_STEP: Record<string, number> = { pending: 2, pickup_requested: 2, assigned_for_pickup: 2, picked: 3, in_transit: 4, at_the_sorting_hub: 4, received_at_last_mile_hub: 4, assigned_for_delivery: 5, delivered: 6, partial_delivery: 6 };

// ── RedX (Bangladesh) ───────────────────────────────────────────────────
const redxBase = () => (env('REDX_SANDBOX') ? 'https://sandbox.redx.com.bd/v1.0.0-beta' : 'https://openapi.redx.com.bd/v1.0.0-beta');
export const redxReady = () => !!env('REDX_TOKEN');
const redx = (path: string, init?: RequestInit) => fetch(`${redxBase()}${path}`, { ...init, headers: { 'API-ACCESS-TOKEN': `Bearer ${env('REDX_TOKEN')}`, 'Content-Type': 'application/json' } }).then(json);
async function bookRedx(p: Parcel, c: Ctx): Promise<Booked> {
  const a = addr(p);
  let areas: { id: number; name: string }[] = a.zip ? (await redx(`/areas?post_code=${encodeURIComponent(a.zip)}`)).areas || [] : [];
  if (!areas.length && a.city) areas = (await redx(`/areas?district_name=${encodeURIComponent(a.city)}`)).areas || [];
  const area = areas.find(x => `${a.address}`.toLowerCase().includes(x.name.toLowerCase())) || areas[0];
  if (!area) throw new Error('RedX: no delivery area found for this postcode or city. Check the address, or book in the RedX app.');
  const r = await redx('/parcel', { method: 'POST', body: JSON.stringify({
    customer_name: p.name, customer_phone: bdPhone(p.phone), delivery_area: area.name, delivery_area_id: area.id, customer_address: [a.address, a.city, a.zip].filter(Boolean).join(', '),
    merchant_invoice_id: p.no, cash_collection_amount: String(Math.round(p.codDue)), parcel_weight: Math.round(kg(p, c) * 1000), instruction: '', value: String(Math.round(p.total)) }) });
  if (!r.tracking_id) throw fail('RedX', r);
  return { trackingNo: String(r.tracking_id), ref: String(r.tracking_id) };
}
const REDX_STEP: Record<string, number> = { 'pickup-pending': 2, 'pickup-in-progress': 2, 'ready-for-delivery': 4, 'delivery-in-progress': 5, delivered: 6 };

// ── EasyParcel (Malaysia, also international from Malaysia) ─────────────
// One account books J&T, Pos Laju, Ninja Van, City-Link, GDex, DHL eCommerce, Aramex, DHL Express and more.
export const easyparcelReady = () => !!env('EASYPARCEL_API_KEY');
const epBase = () => (env('EASYPARCEL_SANDBOX') ? 'https://demo.connect.easyparcel.my/?ac=' : 'https://connect.easyparcel.my/?ac=');
async function ep(action: string, row: Record<string, string | number>) {
  const f = new URLSearchParams({ api: env('EASYPARCEL_API_KEY') });
  for (const [k, v] of Object.entries(row)) f.set(`bulk[0][${k}]`, String(v));
  const r = await fetch(epBase() + action, { method: 'POST', body: f }).then(json);
  if (String(r.api_status).toLowerCase() !== 'success') throw fail('EasyParcel', r);
  return r.result?.[0] || {};
}
// Malaysian state code from the postcode, as EasyParcel wants it.
const MY_STATE: [number, number, string][] = [[1, 2, 'pls'], [5, 9, 'kdh'], [10, 14, 'png'], [15, 18, 'ktn'], [20, 24, 'trg'], [25, 28, 'phg'], [30, 36, 'prk'], [39, 39, 'phg'], [40, 48, 'sgr'], [50, 60, 'kul'], [62, 62, 'pjy'], [63, 68, 'sgr'], [69, 69, 'phg'], [70, 73, 'nsn'], [75, 78, 'mlk'], [79, 86, 'jhr'], [87, 87, 'lbn'], [88, 91, 'sbh'], [93, 98, 'srw']];
const myState = (zip: string) => { const n = Number(zip.slice(0, 2)); return MY_STATE.find(([a, b]) => n >= a && n <= b)?.[2] || ''; };
async function bookEasyParcel(p: Parcel, c: Ctx): Promise<Booked> {
  const a = addr(p), to = isoOf(p.country), local = to === 'MY', [l, w, h] = c.parcel.cm, today = new Date().toISOString().slice(0, 10);
  const pick = { pick_code: c.from.zip, pick_state: myState(c.from.zip), pick_country: 'MY' };
  const send = { send_code: a.zip || '', send_state: local ? myState(a.zip || '') : a.state || '', send_country: to };
  const rates = (await ep('EPRateCheckingBulk', { ...pick, ...send, weight: kg(p, c), length: l, width: w, height: h, date_coll: today })).rates as { service_id: string; courier_name: string; price: string }[] || [];
  if (!rates.length) throw new Error('EasyParcel: no courier offers this route');
  const want = p.courier.toLowerCase().split(/[\s(]/)[0];
  const rate = rates.find(r => r.courier_name.toLowerCase().includes(want)) || [...rates].sort((x, y) => Number(x.price) - Number(y.price))[0];
  const order = await ep('EPSubmitOrderBulk', {
    ...pick, ...send, weight: kg(p, c), length: l, width: w, height: h, content: what(p).slice(0, 35), value: Math.round(p.total), service_id: rate.service_id, collect_date: today, sms: 0, reference: p.no,
    pick_name: c.from.name, pick_contact: c.from.phone, pick_addr1: c.from.street, pick_city: c.from.city,
    send_name: p.name, send_contact: p.phone, send_email: p.email, send_addr1: a.address || '', send_city: a.city || '' });
  if (!order.order_number) throw fail('EasyParcel', order);
  const paid = await ep('EPPayOrderBulk', { order_no: order.order_number });
  const parcel = paid.parcel?.[0];
  if (!parcel?.awb) throw new Error(`EasyParcel: order ${order.order_number} made but not paid. Top up EasyParcel credit, then pay it there.`);
  return { trackingNo: String(parcel.awb), ref: String(order.order_number), label: parcel.awb_id_link || '', courier: rate.courier_name };
}

// ── Shippo (USA warehouse, domestic and international) ──────────────────
export const shippoReady = () => !!env('SHIPPO_TOKEN');
const shippo = (path: string, body: unknown) => fetch(`https://api.goshippo.com${path}`, { method: 'POST', headers: { Authorization: `ShippoToken ${env('SHIPPO_TOKEN')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json);
async function bookShippo(p: Parcel, c: Ctx): Promise<Booked> {
  const a = addr(p), to = isoOf(p.country), [length, width, height] = c.parcel.cm, f = c.from;
  const customs = to === 'US' ? undefined : (await shippo('/customs/declarations/', {
    certify: true, certify_signer: f.name, contents_type: 'MERCHANDISE', non_delivery_option: 'RETURN', eel_pfc: 'NOEEI_30_37_a',
    items: p.lines.map(l => ({ description: l.name.slice(0, 45), quantity: l.qty, net_weight: (l.qty * c.parcel.kgPerItem).toFixed(2), mass_unit: 'kg', value_amount: (Number(l.unit) * l.qty).toFixed(2), value_currency: p.currency, origin_country: 'US' })),
  })).object_id;
  const sh = await shippo('/shipments/', {
    address_from: { name: f.name, street1: f.street, city: f.city, state: f.state, zip: f.zip, country: 'US', phone: f.phone, email: f.email },
    address_to: { name: p.name, street1: a.address, city: a.city, state: a.state || '', zip: a.zip, country: to, phone: p.phone, email: p.email },
    parcels: [{ length, width, height, distance_unit: 'cm', weight: kg(p, c), mass_unit: 'kg' }], customs_declaration: customs, async: false,
  });
  const rates: { object_id: string; provider: string; amount: string }[] = sh.rates || [];
  if (!rates.length) throw fail('Shippo (no rates, check both addresses)', sh.messages?.[0] || sh);
  const want = p.courier.toLowerCase().split(' ')[0];
  const rate = rates.find(r => r.provider.toLowerCase().includes(want)) || [...rates].sort((x, y) => Number(x.amount) - Number(y.amount))[0];
  const t = await shippo('/transactions/', { rate: rate.object_id, label_file_type: 'PDF', async: false });
  if (t.status !== 'SUCCESS') throw fail('Shippo', t.messages?.[0] || t);
  return { trackingNo: String(t.tracking_number), ref: String(t.object_id), label: t.label_url || '', courier: rate.provider };
}

// ── Choosing and booking ────────────────────────────────────────────────
// Name → ISO code ("Malaysia" → "MY"), from the browser-standard region names.
let isoMap: Map<string, string> | null = null;
export function isoOf(country: string) {
  if (!isoMap) {
    isoMap = new Map();
    const dn = new Intl.DisplayNames(['en'], { type: 'region' }), A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const x of A) for (const y of A) { try { const n = dn.of(x + y); if (n && n !== x + y) isoMap.set(n.toLowerCase(), x + y); } catch {} }
    isoMap.set('turkey', 'TR');
  }
  return isoMap.get(country.toLowerCase()) || '';
}

const is = (courier: string, re: RegExp) => re.test(courier);
// Which connected service books this order, or null when it must be booked by hand.
export function bookerFor(o: { warehouse: string; courier: string; cod: boolean }): { name: string; book: (p: Parcel, c: Ctx) => Promise<Booked> } | null {
  if (o.warehouse === 'BD') {
    if (is(o.courier, /steadfast/i) && steadfastReady()) return { name: 'Steadfast', book: bookSteadfast };
    if (is(o.courier, /pathao/i) && pathaoReady()) return { name: 'Pathao', book: bookPathao };
    if (is(o.courier, /redx/i) && redxReady()) return { name: 'RedX', book: bookRedx };
    return null;
  }
  // Outside Bangladesh these services don't collect cash, so cash-on-delivery parcels are booked by hand.
  if (o.cod) return null;
  if (o.warehouse === 'MY' && easyparcelReady()) return { name: 'EasyParcel', book: bookEasyParcel };
  if (o.warehouse === 'US' && shippoReady()) return { name: 'Shippo', book: bookShippo };
  return null;
}

// ── Tracking ────────────────────────────────────────────────────────────
export type TrackResult = { step: number; eta?: Date; riderName?: string; riderPhone?: string } | null;
const SF_STEP: Record<string, number> = { pending: 2, in_review: 2, hold: 4, delivered_approval_pending: 6, partial_delivered_approval_pending: 6, delivered: 6, partial_delivered: 6 };
const SHIP24_STEP: Record<string, number> = { info_received: 2, in_transit: 4, available_for_pickup: 5, out_for_delivery: 5, failed_attempt: 5, delivered: 6 };

export async function track(courier: string, trackingNo: string): Promise<TrackResult> {
  if (!trackingNo) return null;
  await loadKeys();
  if (is(courier, /steadfast/i) && steadfastReady()) {
    const r = await sf(`/status_by_trackingcode/${encodeURIComponent(trackingNo)}`);
    return r.delivery_status in SF_STEP ? { step: SF_STEP[r.delivery_status] } : null;
  }
  if (is(courier, /pathao/i) && pathaoReady()) {
    const s = String((await pathao(`/aladdin/api/v1/orders/${encodeURIComponent(trackingNo)}/info`)).data?.order_status || '').toLowerCase().replace(/[\s-]+/g, '_');
    return s in PATHAO_STEP ? { step: PATHAO_STEP[s] } : null;
  }
  if (is(courier, /redx/i) && redxReady()) {
    const s = String((await redx(`/parcel/info/${encodeURIComponent(trackingNo)}`)).parcel?.status || '');
    return s in REDX_STEP ? { step: REDX_STEP[s] } : null;
  }
  if (!env('SHIP24_API_KEY')) return null;
  const r = await fetch('https://api.ship24.com/public/v1/trackers/track', { method: 'POST', headers: { Authorization: `Bearer ${env('SHIP24_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ trackingNumber: trackingNo }) }).then(json);
  const sh = r.data?.trackings?.[0]?.shipment;
  const step = SHIP24_STEP[sh?.statusMilestone];
  if (step === undefined) return null;
  const eta = sh.delivery?.estimatedDeliveryDate;
  return { step, eta: eta ? new Date(eta) : undefined };
}
