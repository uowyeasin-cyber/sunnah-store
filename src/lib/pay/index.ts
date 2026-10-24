import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';

// Online payments. Each gateway turns on when its keys are set; until then checkout only offers what works.
// PAY_DEMO=1 adds a fake gateway for local testing and must never be set in production.
const env = (k: string) => process.env[k] || '';
const sslBase = () => (env('SSLCZ_SANDBOX') ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com');
const ppBase = () => (env('PAYPAL_ENV') === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

export const GATEWAY: Record<string, 'stripe' | 'paypal' | 'ssl' | 'tng'> = { card: 'stripe', fpx: 'stripe', paypal: 'paypal', bkash: 'ssl', nagad: 'ssl', sslcommerz: 'ssl', tng: 'tng' };
export function gatewayReady(method: string) {
  if (method === 'cod') return true;
  if (env('PAY_DEMO')) return true;
  const g = GATEWAY[method];
  return g === 'stripe' ? !!env('STRIPE_SECRET_KEY') : g === 'paypal' ? !!(env('PAYPAL_CLIENT_ID') && env('PAYPAL_SECRET')) : g === 'ssl' ? !!(env('SSLCZ_STORE_ID') && env('SSLCZ_STORE_PASS')) : g === 'tng' ? !!env('TNG_GATEWAY_URL') : false;
}

type Order = NonNullable<Awaited<ReturnType<typeof load>>>;
const load = (id: string) => db.order.findUnique({ where: { id }, include: { lines: true } });
const cents = (o: Order) => Math.round(Number(o.total) * 100);

// Returns the gateway page to send the customer to.
export async function startPayment(id: string, site: string): Promise<string> {
  const o = await load(id);
  if (!o) throw new Error('No such order');
  const back = `${site}/order/${o.id}`;
  if (o.payStatus !== 'pending' && o.payStatus !== 'failed') return back;
  if (env('PAY_DEMO')) return `${site}/api/pay/demo?o=${o.id}`;
  const g = GATEWAY[o.payMethod];
  if (g === 'stripe') {
    const f = new URLSearchParams({ mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': o.currency.toLowerCase(), 'line_items[0][price_data][unit_amount]': String(cents(o)),
      'line_items[0][price_data][product_data][name]': `Order ${o.no}`, customer_email: o.email, client_reference_id: o.id, 'metadata[order]': o.id,
      success_url: `${site}/api/pay/stripe?o=${o.id}&s={CHECKOUT_SESSION_ID}`, cancel_url: `${back}?pay=cancelled` });
    f.append('payment_method_types[]', o.payMethod === 'fpx' ? 'fpx' : 'card');
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}` }, body: f }).then(r => r.json());
    if (!r.url) throw new Error(r.error?.message || 'Stripe error');
    await db.order.update({ where: { id: o.id }, data: { payRef: r.id } });
    return r.url;
  }
  if (g === 'paypal') {
    const r = await fetch(`${ppBase()}/v2/checkout/orders`, { method: 'POST', headers: { Authorization: `Bearer ${await ppToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
      intent: 'CAPTURE', purchase_units: [{ reference_id: o.id, custom_id: o.id, description: `Order ${o.no}`, amount: { currency_code: o.currency, value: Number(o.total).toFixed(2) } }],
      application_context: { return_url: `${site}/api/pay/paypal?o=${o.id}`, cancel_url: `${back}?pay=cancelled`, user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING' } }) }).then(r => r.json());
    const url = r.links?.find((l: { rel: string }) => l.rel === 'approve')?.href;
    if (!url) throw new Error(r.message || 'PayPal error');
    await db.order.update({ where: { id: o.id }, data: { payRef: r.id } });
    return url;
  }
  if (g === 'ssl') {
    const addr = o.address as Record<string, string>;
    const f = new URLSearchParams({ store_id: env('SSLCZ_STORE_ID'), store_passwd: env('SSLCZ_STORE_PASS'), total_amount: Number(o.total).toFixed(2), currency: o.currency, tran_id: o.no,
      success_url: `${site}/api/pay/ssl`, fail_url: `${site}/api/pay/ssl`, cancel_url: `${site}/api/pay/ssl`, ipn_url: `${site}/api/pay/ssl`,
      cus_name: o.name, cus_email: o.email, cus_phone: o.phone, cus_add1: addr.address || '-', cus_city: addr.city || '-', cus_postcode: addr.zip || '-', cus_country: o.country,
      shipping_method: 'Courier', num_of_item: String(o.lines.reduce((n, l) => n + l.qty, 0)), ship_name: o.name, ship_add1: addr.address || '-', ship_city: addr.city || '-', ship_postcode: addr.zip || '-', ship_country: o.country,
      product_name: o.lines.map(l => l.name).join(', ').slice(0, 250), product_category: 'Personal care', product_profile: 'physical-goods', value_a: o.id });
    if (o.payMethod === 'bkash') f.set('multi_card_name', 'bkash');
    const r = await fetch(`${sslBase()}/gwprocess/v4/api.php`, { method: 'POST', body: f }).then(r => r.json());
    if (!r.GatewayPageURL) throw new Error(r.failedreason || 'SSLCommerz error');
    return r.GatewayPageURL;
  }
  throw new Error('This payment method is not set up yet');
}

async function ppToken() {
  const r = await fetch(`${ppBase()}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${env('PAYPAL_CLIENT_ID')}:${env('PAYPAL_SECRET')}`).toString('base64')}` }, body: new URLSearchParams({ grant_type: 'client_credentials' }) }).then(r => r.json());
  return r.access_token as string;
}

// Marks paid only when the gateway's amount and currency match the order.
export async function markPaid(id: string, ref: string, amount: number, currency: string) {
  const o = await load(id);
  if (!o || o.payStatus === 'paid') return;
  if (Math.abs(amount - Number(o.total)) > 0.01 || currency.toUpperCase() !== o.currency) { console.error('payment mismatch', o.no, amount, currency); return; }
  const events = [...(o.events as object[]), { at: new Date().toISOString(), step: o.status, note: `Payment received (${o.payMethod.toUpperCase()})` }];
  await db.order.update({ where: { id }, data: { payStatus: 'paid', payRef: ref, events } });
  const { sendToCourierSafe } = await import('@/lib/fulfil');
  await sendToCourierSafe(id);
}
export const markFailed = (id: string) => db.order.updateMany({ where: { id, payStatus: 'pending' }, data: { payStatus: 'failed' } });

export async function verifyStripe(id: string, session: string) {
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session)}`, { headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}` } }).then(r => r.json());
  if (r.metadata?.order === id && r.payment_status === 'paid') await markPaid(id, r.payment_intent || r.id, r.amount_total / 100, r.currency);
}

// Stripe webhook signature: HMAC-SHA256 of "t.body" with the endpoint secret.
export function stripeSigOk(body: string, header: string) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const want = createHmac('sha256', env('STRIPE_WEBHOOK_SECRET')).update(`${parts.t}.${body}`).digest();
  const got = Buffer.from(parts.v1, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function capturePaypal(id: string, token: string) {
  const o = await load(id);
  if (!o || o.payRef !== token) return;
  const r = await fetch(`${ppBase()}/v2/checkout/orders/${encodeURIComponent(token)}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${await ppToken()}`, 'Content-Type': 'application/json' } }).then(r => r.json());
  const cap = r.purchase_units?.[0]?.payments?.captures?.[0];
  if (r.status === 'COMPLETED' && cap) await markPaid(id, cap.id, Number(cap.amount.value), cap.amount.currency_code);
  else await markFailed(id);
}

// SSLCommerz posts back val_id; ask its validator what really happened.
export async function verifySsl(valId: string) {
  const q = new URLSearchParams({ val_id: valId, store_id: env('SSLCZ_STORE_ID'), store_passwd: env('SSLCZ_STORE_PASS'), format: 'json' });
  const r = await fetch(`${sslBase()}/validator/api/validationserverAPI.php?${q}`).then(r => r.json());
  if ((r.status === 'VALID' || r.status === 'VALIDATED') && r.value_a) await markPaid(r.value_a, r.bank_tran_id || valId, Number(r.currency_amount ?? r.amount), r.currency_type ?? r.currency);
  return r.value_a as string | undefined;
}


// What checkout may offer right now for this country.
export const isManual = (method: string) => method.startsWith('m-');
export const readyMethods = async (country: string) => {
  const { payMethodsFor } = await import('@/lib/shipping');
  const { getSettings } = await import('@/lib/catalog');
  const manual = (await getSettings()).manualPay.filter(m => m.on && m.details.trim() && (m.where === 'all' || m.where === country))
    .map(m => ({ id: 'm-' + m.id, label: m.label, note: m.details, manual: true }));
  return [...payMethodsFor(country).filter(m => gatewayReady(m.id)).map(m => ({ ...m, manual: false })), ...manual];
};
