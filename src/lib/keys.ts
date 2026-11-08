import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { db } from './db';

// Saved keys are encrypted (AES-256-GCM) with SECRETS_KEY from the Vercel environment, so a copy of the
// database alone does not reveal them. Without SECRETS_KEY they are stored as before, and old plain values still read.
const sk = () => (process.env.SECRETS_KEY ? createHash('sha256').update(process.env.SECRETS_KEY).digest() : null);
function seal(v: string) {
  const k = sk();
  if (!k || !v) return v;
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', k, iv);
  const body = Buffer.concat([c.update(v, 'utf8'), c.final()]);
  return `enc:v1:${Buffer.concat([iv, c.getAuthTag(), body]).toString('base64')}`;
}
function open(v: string) {
  if (!v.startsWith('enc:v1:')) return v;
  const k = sk();
  if (!k) { console.error('A saved key is encrypted but SECRETS_KEY is not set'); return ''; }
  try {
    const raw = Buffer.from(v.slice(7), 'base64'), d = createDecipheriv('aes-256-gcm', k, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  } catch { console.error('A saved key could not be decrypted; save it again in Admin → Connections'); return ''; }
}

// Service keys (payment gateways, couriers) typed in Admin → Connections and kept in the database.
// A key left blank there falls back to the Vercel environment variable of the same name.
export const SECRETS = 'secrets';
type Field = [env: string, label: string, kind: 'secret' | 'text' | string[]];
export type Service = { id: string; name: string; group: 'Payments' | 'Couriers' | 'Social media' | 'AI'; does: string; signup: string; fields: Field[]; need: string[] };

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
  { id: 'steadfast', name: 'Steadfast Courier', group: 'Couriers', does: 'Bangladesh. Books each parcel by itself with the cash-on-delivery amount, and tracks it.',
    signup: 'https://steadfast.com.bd/', need: ['STEADFAST_API_KEY', 'STEADFAST_SECRET_KEY'],
    fields: [['STEADFAST_API_KEY', 'API key', 'text'], ['STEADFAST_SECRET_KEY', 'Secret key', 'secret']] },
  { id: 'pathao', name: 'Pathao Courier', group: 'Couriers', does: 'Bangladesh. Books each parcel by itself with the cash-on-delivery amount, and tracks it. Keys are in Pathao Merchant → Developers API.',
    signup: 'https://merchant.pathao.com/', need: ['PATHAO_CLIENT_ID', 'PATHAO_CLIENT_SECRET', 'PATHAO_USERNAME', 'PATHAO_PASSWORD', 'PATHAO_STORE_ID'],
    fields: [['PATHAO_CLIENT_ID', 'Client ID', 'text'], ['PATHAO_CLIENT_SECRET', 'Client secret', 'secret'], ['PATHAO_USERNAME', 'Merchant login email', 'text'], ['PATHAO_PASSWORD', 'Merchant login password', 'secret'], ['PATHAO_STORE_ID', 'Store ID', 'text'], ['PATHAO_SANDBOX', 'Mode', ['', '1']]] },
  { id: 'redx', name: 'RedX', group: 'Couriers', does: 'Bangladesh. Books each parcel by itself with the cash-on-delivery amount, and tracks it. Ask RedX for an API token.',
    signup: 'https://redx.com.bd/', need: ['REDX_TOKEN'],
    fields: [['REDX_TOKEN', 'API access token', 'secret'], ['REDX_SANDBOX', 'Mode', ['', '1']]] },
  { id: 'easyparcel', name: 'EasyParcel', group: 'Couriers', does: 'Malaysia. One account books J&T, Pos Laju, Ninja Van, City-Link, GDex, DHL eCommerce, and international DHL, FedEx and Aramex. Pays from your EasyParcel credit and gives a label to print.',
    signup: 'https://easyparcel.com/my/en/', need: ['EASYPARCEL_API_KEY'],
    fields: [['EASYPARCEL_API_KEY', 'API key', 'secret'], ['EASYPARCEL_SANDBOX', 'Mode', ['', '1']]] },
  { id: 'shippo', name: 'Shippo', group: 'Couriers', does: 'USA. One account books USPS, UPS, FedEx and DHL Express, in the USA and worldwide, at discounted rates, and gives a label to print.',
    signup: 'https://apps.goshippo.com/join', need: ['SHIPPO_TOKEN'],
    fields: [['SHIPPO_TOKEN', 'API token', 'secret']] },
  { id: 'ship24', name: 'Ship24 tracking', group: 'Couriers', does: 'Live tracking for every other courier: DHL, FedEx, Aramex, UPS, USPS, J&T, Pos Malaysia and 1,500 more. Put the tracking number on the order and the customer sees each step.',
    signup: 'https://dashboard.ship24.com/', need: ['SHIP24_API_KEY'],
    fields: [['SHIP24_API_KEY', 'API key', 'secret']] },
  { id: 'meta', name: 'Facebook and Instagram', group: 'Social media', does: 'Posts to your Facebook Page and Instagram from Admin → Social media, and brings back views, reach, shares, likes and comments. With an ads token it also brings back each ad’s views, reach, clicks and spend.',
    signup: 'https://developers.facebook.com/apps/', need: ['META_PAGE_ID', 'META_PAGE_TOKEN'],
    fields: [['META_PAGE_ID', 'Facebook Page ID', 'text'], ['META_PAGE_TOKEN', 'Page access token (long-lived)', 'secret'], ['META_IG_USER_ID', 'Instagram business account ID, optional', 'text'], ['META_ADS_TOKEN', 'Ads token with ads_read (system user), optional', 'secret']] },
  { id: 'capi', name: 'Server-side ad tracking (Meta Conversions API, Google Analytics)', group: 'Social media', does: 'Sends every order to Meta and Google from the server, so ads still learn when a browser blocks the pixel (ad blockers, iPhone privacy). Put the pixel and GA4 IDs in Admin → SEO & ads.',
    signup: 'https://business.facebook.com/events_manager2', need: ['META_CAPI_TOKEN'],
    fields: [['META_CAPI_TOKEN', 'Meta Conversions API access token (Events Manager → Settings)', 'secret'], ['GA4_API_SECRET', 'GA4 Measurement Protocol API secret, optional', 'secret']] },
  { id: 'youtube', name: 'YouTube', group: 'Social media', does: 'Brings back views, likes and comments for each YouTube video you add in Admin → Social media. Uploading stays in YouTube Studio.',
    signup: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com', need: ['YOUTUBE_API_KEY'],
    fields: [['YOUTUBE_API_KEY', 'YouTube Data API key', 'secret']] },
  { id: 'anthropic', name: 'AI shopping assistant (Claude)', group: 'AI', does: 'A chat button on the shop that answers product, shipping, order-status and returns questions from your real catalog and orders, in the customer’s language, and passes anything it cannot answer to your email. Pay-as-you-go with Anthropic; it stops itself after 400 replies a day.',
    signup: 'https://console.anthropic.com/settings/keys', need: ['ANTHROPIC_API_KEY'],
    fields: [['ANTHROPIC_API_KEY', 'API key (sk-ant-…)', 'secret'], ['ASSISTANT_MODEL', 'Model', ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']], ['ASSISTANT_ON', 'Chat button', ['', 'off']]] },
];
export const MODE_LABEL: Record<string, string> = { live: 'Live', sandbox: 'Test (sandbox)', '': 'Live', '1': 'Test (sandbox)', off: 'Hidden', 'claude-opus-5-5': 'Claude Opus 5.5 (best answers)', 'claude-sonnet-5-5': 'Claude Sonnet 5.5 (cheaper)', 'claude-haiku-5-5': 'Claude Haiku 5.5 (cheapest)' };

let cache: { at: number; v: Record<string, string> } | null = null;
// Call before key(): refreshes at most every 30 seconds per server instance.
export async function loadKeys(fresh = false) {
  if (cache && !fresh && Date.now() - cache.at < 30e3) return;
  const row = await db.setting.findUnique({ where: { key: SECRETS } });
  const v = (row?.value as Record<string, string>) || {};
  cache = { at: Date.now(), v: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, open(String(x))])) };
  // Keys saved before encryption was switched on are sealed the first time they are read.
  if (sk() && Object.values(v).some(x => x && !String(x).startsWith('enc:v1:'))) await saveKeys(cache.v);
}
export const key = (k: string) => cache?.v[k] || process.env[k] || '';
export const connected = (s: Service) => s.need.every(k => key(k));
// Where a key came from, for the admin page. Never returns the key itself.
export const keyHint = (k: string) => (cache?.v[k] ? `saved ••••${cache.v[k].slice(-4)}` : process.env[k] ? 'set in Vercel' : '');

export async function saveKeys(next: Record<string, string>) {
  const sealed = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, seal(v)]));
  await db.setting.upsert({ where: { key: SECRETS }, update: { value: sealed }, create: { key: SECRETS, value: sealed } });
  await loadKeys(true);
}
export const storedKeys = async () => { await loadKeys(true); return { ...cache!.v }; };
