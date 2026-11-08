import 'server-only';
import { createHash } from 'node:crypto';
import { db } from './db';
import { key, loadKeys } from './keys';
import { rawSeo } from './seo';

// Server-side purchase events: they reach Meta and Google even when the browser blocks pixels
// (ad blockers, iPhone privacy), so ads learn from every real order, not only the visible ones.
const sha = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

export async function serverPurchase(orderId: string) {
  const [o, seo] = await Promise.all([db.order.findUnique({ where: { id: orderId }, include: { lines: true } }), rawSeo()]);
  if (!o) return;
  await loadKeys();
  const value = Number(o.total), currency = o.currency, t = Math.floor(o.createdAt.getTime() / 1000);
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  const jobs: Promise<unknown>[] = [];
  const capi = key('META_CAPI_TOKEN');
  if (seo.pixels.meta && capi) jobs.push(fetch(`https://graph.facebook.com/v23.0/${seo.pixels.meta}/events?access_token=${encodeURIComponent(capi)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ data: [{ event_name: 'Purchase', event_time: t, event_id: o.no, action_source: 'website', event_source_url: `${site}/order/${o.id}`,
      user_data: { em: o.email ? [sha(o.email)] : undefined, ph: o.phone ? [sha(o.phone.replace(/\D/g, ''))] : undefined, country: o.country ? [sha(o.country)] : undefined },
      custom_data: { value, currency, order_id: o.no, contents: o.lines.map(l => ({ id: l.productId || l.name, quantity: l.qty })), content_type: 'product' } }] }),
  }));
  const ga = key('GA4_API_SECRET');
  if (seo.pixels.ga4 && ga) jobs.push(fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${seo.pixels.ga4}&api_secret=${encodeURIComponent(ga)}`, {
    method: 'POST', signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ client_id: o.customerId || o.id, events: [{ name: 'purchase', params: { transaction_id: o.no, value, currency, items: o.lines.map(l => ({ item_id: l.productId || l.name, item_name: l.name, quantity: l.qty, price: Number(l.unit) })) } }] }),
  }));
  const r = await Promise.allSettled(jobs);
  r.forEach(x => x.status === 'rejected' && console.error('server purchase event failed', x.reason));
}
export const serverPurchaseSafe = (id: string) => serverPurchase(id).catch(e => console.error('server purchase failed', e));
