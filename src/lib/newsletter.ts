import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { sendMail } from './mail';
import { getSettings } from './catalog';

// Newsletter with double opt-in, and the abandoned-bag reminder. Every campaign email carries an unsubscribe link.
export const SEND_LIMIT = 450; // per send; Gmail allows about 500 emails a day
const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribe(raw: string, lang = 'en', source = '') {
  const email = raw.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 160) return { error: 'Enter a valid email' };
  const old = await db.subscriber.findUnique({ where: { email } });
  if (old?.confirmedAt && !old.unsubscribed) return { ok: true, already: true };
  if (old && !old.confirmedAt && Date.now() - old.createdAt.getTime() < 10 * 60e3) return { ok: true }; // a code was just sent
  const token = randomBytes(18).toString('base64url');
  await db.subscriber.upsert({ where: { email }, update: { token, unsubscribed: false, confirmedAt: null, createdAt: new Date(), lang }, create: { email, token, lang, source: source.slice(0, 40) } });
  const { store } = await getSettings();
  await sendMail(email, `Confirm your ${store.name} newsletter`, `Tap to confirm you want news and offers from ${store.name}:\n\n${site()}/api/newsletter?confirm=${token}\n\nIf you did not ask for this, ignore this email.`);
  return { ok: true };
}

export async function confirm(token: string) {
  const r = await db.subscriber.updateMany({ where: { token }, data: { confirmedAt: new Date(), unsubscribed: false } });
  return r.count > 0;
}
export async function unsubscribe(token: string) {
  const r = await db.subscriber.updateMany({ where: { token }, data: { unsubscribed: true } });
  return r.count > 0;
}

// Sends one campaign to confirmed subscribers, oldest first, up to SEND_LIMIT. Returns how many went out.
export async function sendCampaign(subject: string, body: string, by: string, onlyTo = '') {
  const list = onlyTo ? [{ email: onlyTo, token: '' }] : await db.subscriber.findMany({ where: { confirmedAt: { not: null }, unsubscribed: false }, orderBy: { createdAt: 'asc' }, take: SEND_LIMIT, select: { email: true, token: true } });
  let sent = 0, failed = 0;
  for (const s of list) {
    const foot = s.token ? `\n\n—\nUnsubscribe: ${site()}/api/newsletter?unsubscribe=${s.token}` : '\n\n— (test email)';
    try { await sendMail(s.email, subject, body + foot); sent++; } catch (e) { failed++; console.error('campaign mail failed', e); }
  }
  if (!onlyTo) await db.mailCampaign.create({ data: { subject, body, sent, failed, by } });
  return { sent, failed };
}

// Checkout saves the bag with the email typed; a placed order clears it.
export async function rememberBag(email: string, lines: { slug: string; qty: number }[], lang = 'en') {
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e) || !lines.length) return;
  const clean = lines.slice(0, 20).map(l => ({ slug: String(l.slug).slice(0, 80), qty: Math.min(99, Math.max(1, Math.floor(l.qty) || 1)) }));
  await db.cartLead.upsert({ where: { email: e }, update: { lines: clean, lang, remindedAt: null }, create: { email: e, lines: clean, lang } });
}
export const forgetBag = (email: string) => db.cartLead.deleteMany({ where: { email: email.trim().toLowerCase() } });

// One reminder per bag, 24 hours to 7 days after it was left, only if no order came from that email since.
export async function remindBags() {
  const now = Date.now();
  const leads = await db.cartLead.findMany({ where: { remindedAt: null, updatedAt: { lt: new Date(now - 24 * 3600e3), gt: new Date(now - 7 * 86400e3) } }, take: 100 });
  const { store } = await getSettings();
  let sent = 0;
  for (const l of leads) {
    const ordered = await db.order.count({ where: { email: l.email, createdAt: { gt: new Date(l.updatedAt.getTime() - 3600e3) } } });
    if (ordered) { await db.cartLead.delete({ where: { id: l.id } }); continue; }
    const items = (l.lines as { slug: string; qty: number }[]).map(x => `${x.slug}*${x.qty}`).join(',');
    try {
      await sendMail(l.email, `You left something in your ${store.name} bag`, `Your bag is saved. Pick up where you left off:\n\n${site()}/bag?i=${encodeURIComponent(items)}\n\nQuestions? Just reply to this email.`);
      await db.cartLead.update({ where: { id: l.id }, data: { remindedAt: new Date() } });
      sent++;
    } catch (e) { console.error('bag reminder failed', e); }
  }
  return { checked: leads.length, sent };
}
