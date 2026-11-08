import 'server-only';
import { randomInt } from 'node:crypto';
import { db } from './db';
import { getSettings } from './catalog';
import { sendMail } from './mail';

export const normCode = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
export const couponText = (c: { kind: string; value: number; minCents: number }) =>
  `${c.kind === 'pct' ? `${c.value}% off` : `$${(c.value / 100).toFixed(2)} off`}${c.minCents ? ` orders over $${(c.minCents / 100).toFixed(0)}` : ''}`;

// Checks a code for this email and order value (US cents). Gives the discount in US cents, or why it does not work.
export async function checkCoupon(code: string, email: string, subUsd: number) {
  const c = code ? await db.coupon.findUnique({ where: { code: normCode(code) } }) : null;
  if (!c || !c.on) return { error: 'That code does not exist.' };
  if (c.endsAt && c.endsAt < new Date()) return { error: 'That code has ended.' };
  if (c.maxUses && c.used >= c.maxUses) return { error: 'That code has been used up.' };
  if (c.email && c.email !== email.trim().toLowerCase()) return { error: 'That code belongs to another email.' };
  if (subUsd < c.minCents) return { error: `That code needs items over $${(c.minCents / 100).toFixed(2)}.` };
  const off = c.kind === 'pct' ? Math.round((subUsd * Math.min(90, c.value)) / 100) : Math.min(subUsd, c.value);
  return { coupon: c, off };
}

// Welcome gift: a one-use code for one new customer's email, sent by email.
export type Welcome = { on: boolean; pct: number; minUsd: number; days: number; line: string };
export const WELCOME_DEFAULT: Welcome = { on: false, pct: 10, minUsd: 20, days: 14, line: '' };
export async function getWelcome(): Promise<Welcome> {
  const r = await db.setting.findUnique({ where: { key: 'welcome' } });
  return { ...WELCOME_DEFAULT, ...((r?.value as Partial<Welcome>) || {}) };
}
export async function sendWelcomeGift(email: string) {
  const w = await getWelcome();
  if (!w.on || !email) return;
  const to = email.trim().toLowerCase();
  if (await db.coupon.findFirst({ where: { email: to, note: 'Welcome gift' } })) return;
  const code = `WELCOME-${randomInt(100000, 999999)}`;
  await db.coupon.create({ data: { code, kind: 'pct', value: w.pct, minCents: Math.round(w.minUsd * 100), maxUses: 1, email: to, note: 'Welcome gift', endsAt: new Date(Date.now() + w.days * 864e5) } });
  const { store } = await getSettings();
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  await sendMail(to, `A welcome gift from ${store.name}: ${w.pct}% off`, [
    `Welcome to ${store.name}!`, '', `Here is ${w.pct}% off your first order${w.minUsd ? ` over $${w.minUsd}` : ''}. Your code: ${code}`,
    `It works for ${w.days} days, once, with this email.`, ...(w.line ? ['', w.line] : []), '', `Shop: ${site}`,
  ].join('\n')).catch(e => console.error('welcome mail failed', e));
}
