import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';

// License server for copies of this store sold to clients. Each sold copy asks /api/license on every
// visit (cached a few minutes on its side). A copy without a key runs as a demo for its web address
// until the demo sessions or days run out; then it shows a locked page until the owner allows it here.
// plan: how long an allowed copy may run. lifetime never ends; monthly and yearly end on `expires` (ISO date)
// unless the owner renews. `grace` extra days keep a paid shop open while the renewal payment arrives.
export type Plan = 'lifetime' | 'monthly' | 'yearly';
export const PLANS: [Plan, string, number][] = [['lifetime', 'Lifetime', 0], ['monthly', 'Monthly', 1], ['yearly', 'Yearly', 12]];
export type Site = { id: string; host: string; key: string; status: 'trial' | 'active' | 'blocked'; opens: number; maxOpens: number; maxDays: number; first: string; last: string; note: string; plan?: Plan; expires?: string };
// on: false switches the whole lock off (every copy runs freely). prices are only shown on /get-app.
export type Licenses = { on: boolean; opens: number; days: number; grace: number; download: string; prices: Record<Plan, string>; contact: string; sites: Site[] };
const KEY = 'licenses';
export const SESSION_GAP = 30 * 60e3; // a new demo session starts after 30 minutes without visits
const DAY = 864e5;

export async function getLicenses(): Promise<Licenses> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const v = (row?.value || {}) as Partial<Licenses>;
  return { on: v.on ?? true, opens: v.opens ?? 3, days: v.days ?? 1, grace: v.grace ?? 3, download: v.download || '/download/storefront-pro.zip',
    prices: { lifetime: '', monthly: '', yearly: '', ...v.prices }, contact: v.contact || '', sites: v.sites || [] };
}
export async function saveLicenses(l: Licenses) {
  await db.setting.upsert({ where: { key: KEY }, update: { value: l }, create: { key: KEY, value: l } });
}
export const newKey = () => `SP-${randomBytes(9).toString('hex').toUpperCase().match(/.{6}/g)!.join('-')}`;
export const newId = () => randomBytes(6).toString('hex');
// End date after one more period of the plan, counted from the later of today and the current end date.
export function extend(plan: Plan, from = ''): string {
  const months = PLANS.find(p => p[0] === plan)?.[2] || 0;
  if (!months) return '';
  const d = new Date(Math.max(Date.now(), from ? new Date(from).getTime() || 0 : 0));
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
const expired = (s: Site, grace: number, now: Date) => !!s.expires && s.plan !== 'lifetime' && now.getTime() > new Date(s.expires).getTime() + (grace + 1) * DAY;
const endedMsg = (s: Site) => `This ${s.plan || ''} license ended on ${s.expires}. Contact the seller to renew.`;
export const cleanHost = (h: string) => h.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '').slice(0, 120);

export type Answer = { status: 'active' | 'trial' | 'locked'; message: string; left?: { opens: number; days: number } };

export async function check(rawKey: string, rawHost: string): Promise<Answer> {
  const host = cleanHost(rawHost), key = rawKey.trim().toUpperCase().slice(0, 60);
  if (!host) return { status: 'locked', message: 'This copy could not tell its web address.' };
  const l = await getLicenses(), now = new Date();
  if (!l.on) return { status: 'active', message: '' };
  let answer: Answer;
  if (key) {
    const s = l.sites.find(x => x.key === key);
    if (!s) answer = { status: 'locked', message: 'This license key is not valid.' };
    else if (s.status === 'blocked') answer = { status: 'locked', message: 'This license has been switched off by the seller.' };
    else if (s.host && s.host !== host) answer = { status: 'locked', message: `This license key belongs to ${s.host}. Ask the seller to move it.` };
    else if (expired(s, l.grace, now)) answer = { status: 'locked', message: endedMsg(s) };
    else { s.host ||= host; s.status = 'active'; s.last = now.toISOString(); s.first ||= s.last; answer = { status: 'active', message: '' }; }
  } else {
    let s = l.sites.find(x => x.host === host && !x.key);
    if (!s) { s = { id: newId(), host, key: '', status: 'trial', opens: 0, maxOpens: l.opens, maxDays: l.days, first: now.toISOString(), last: '', note: '' }; l.sites.unshift(s); }
    if (!s.last || now.getTime() - new Date(s.last).getTime() > SESSION_GAP) s.opens++;
    s.last = now.toISOString();
    const usedDays = (now.getTime() - new Date(s.first).getTime()) / DAY;
    if (s.status === 'active') answer = expired(s, l.grace, now) ? { status: 'locked', message: endedMsg(s) } : { status: 'active', message: '' };
    else if (s.status === 'blocked') answer = { status: 'locked', message: 'This copy has been switched off by the seller.' };
    else if (s.opens > s.maxOpens || usedDays > s.maxDays) answer = { status: 'locked', message: 'The free demo has ended. Contact the seller to buy a license.' };
    else answer = { status: 'trial', message: 'Demo', left: { opens: Math.max(0, s.maxOpens - s.opens), days: Math.max(0, Math.ceil(s.maxDays - usedDays)) } };
  }
  l.sites = l.sites.slice(0, 500);
  await saveLicenses(l);
  return answer;
}
