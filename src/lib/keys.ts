import 'server-only';
import { db } from './db';

// Service keys (payment gateways, couriers) typed in Admin → Connections and kept in the database.
// A key left blank there falls back to the Vercel environment variable of the same name.
export const SECRETS = 'secrets';
type Field = [env: string, label: string, kind: 'secret' | 'text' | string[]];
export type Service = { id: string; name: string; group: 'Payments' | 'Couriers'; does: string; signup: string; fields: Field[]; need: string[] };

export const SERVICES: Service[] = [
  { id: 'stripe', name: 'Stripe', group: 'Payments', does: 'Cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and FPX online banking in Malaysia. Works for the USA, Malaysia and worldwide.',
    signup: 'https://dashboard.stripe.com/register', need: ['STRIPE_SECRET_KEY'],
    fields: [['STRIPE_SECRET_KEY', 'Secret key (sk_live_…)', 'secret'], ['STRIPE_WEBHOOK_SECRET', 'Webhook signing secret (whsec_…), optional', 'secret']] },
  { id: 'paypal', name: 'PayPal', group: 'Payments', does: 'PayPal balance and cards, worldwide.',
    signup: 'https://developer.paypal.com/dashboard/applications/live', need: ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET'],
    fields: [['PAYPAL_CLIENT_ID', 'Client ID', 'text'], ['PAYPAL_SECRET', 'Secret', 'secret'], ['PAYPAL_ENV', 'Mode', ['live', 'sandbox']]] },
  { id: 'ssl', name: 'SSLCommerz', group: 'Payments', does: 'bKash, Nagad, Rocket, Bangladeshi cards and internet banking.',
    signup: 'https://sslcommerz.com/', need: ['SSLCZ_STORE_ID', 'SSLCZ_STORE_PASS'],
    fields: [['SSLCZ_STORE_ID', 'Store ID', 'text'], ['SSLCZ_STORE_PASS', 'Store password', 'secret'], ['SSLCZ_SANDBOX', 'Mode', ['', '1']]] },
  { id: 'steadfast', name: 'Steadfast Courier', group: 'Couriers', does: 'Bangladesh. Books the parcel by itself when an order is ready, with cash-on-delivery amount, and tracks it.',
    signup: 'https://steadfast.com.bd/', need: ['STEADFAST_API_KEY', 'STEADFAST_SECRET_KEY'],
    fields: [['STEADFAST_API_KEY', 'API key', 'text'], ['STEADFAST_SECRET_KEY', 'Secret key', 'secret']] },
  { id: 'ship24', name: 'Ship24 tracking', group: 'Couriers', does: 'Live tracking for DHL, FedEx, Aramex, UPS, USPS, J&T, Pos Malaysia, Pathao, RedX and 1,500 more couriers. Put the tracking number on the order and the customer sees each step.',
    signup: 'https://dashboard.ship24.com/', need: ['SHIP24_API_KEY'],
    fields: [['SHIP24_API_KEY', 'API key', 'secret']] },
];
export const MODE_LABEL: Record<string, string> = { live: 'Live', sandbox: 'Test (sandbox)', '': 'Live', '1': 'Test (sandbox)' };

let cache: { at: number; v: Record<string, string> } | null = null;
// Call before key(): refreshes at most every 30 seconds per server instance.
export async function loadKeys(fresh = false) {
  if (cache && !fresh && Date.now() - cache.at < 30e3) return;
  const row = await db.setting.findUnique({ where: { key: SECRETS } });
  cache = { at: Date.now(), v: (row?.value as Record<string, string>) || {} };
}
export const key = (k: string) => cache?.v[k] || process.env[k] || '';
export const connected = (s: Service) => s.need.every(k => key(k));
// Where a key came from, for the admin page. Never returns the key itself.
export const keyHint = (k: string) => (cache?.v[k] ? `saved ••••${cache.v[k].slice(-4)}` : process.env[k] ? 'set in Vercel' : '');

export async function saveKeys(next: Record<string, string>) {
  await db.setting.upsert({ where: { key: SECRETS }, update: { value: next }, create: { key: SECRETS, value: next } });
  await loadKeys(true);
}
export const storedKeys = async () => { await loadKeys(true); return { ...cache!.v }; };
