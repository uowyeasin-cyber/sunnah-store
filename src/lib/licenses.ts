import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';

// License server for copies of this store sold to clients. Each sold copy asks /api/license on every
// visit (cached a few minutes on its side). A copy without a key runs as a demo for its web address
// until the demo sessions or days run out; then it shows a locked page until the owner allows it here.
export type Site = { id: string; host: string; key: string; status: 'trial' | 'active' | 'blocked'; opens: number; maxOpens: number; maxDays: number; first: string; last: string; note: string };
export type Licenses = { opens: number; days: number; download: string; sites: Site[] };
const KEY = 'licenses';
export const SESSION_GAP = 30 * 60e3; // a new demo session starts after 30 minutes without visits
const DAY = 864e5;

export async function getLicenses(): Promise<Licenses> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const v = (row?.value || {}) as Partial<Licenses>;
  return { opens: v.opens ?? 3, days: v.days ?? 1, download: v.download || '/download/storefront-pro.zip', sites: v.sites || [] };
}
export async function saveLicenses(l: Licenses) {
  await db.setting.upsert({ where: { key: KEY }, update: { value: l }, create: { key: KEY, value: l } });
}
export const newKey = () => `SP-${randomBytes(9).toString('hex').toUpperCase().match(/.{6}/g)!.join('-')}`;
export const newId = () => randomBytes(6).toString('hex');
export const cleanHost = (h: string) => h.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '').slice(0, 120);

export type Answer = { status: 'active' | 'trial' | 'locked'; message: string; left?: { opens: number; days: number } };

export async function check(rawKey: string, rawHost: string): Promise<Answer> {
  const host = cleanHost(rawHost), key = rawKey.trim().toUpperCase().slice(0, 60);
  if (!host) return { status: 'locked', message: 'This copy could not tell its web address.' };
  const l = await getLicenses(), now = new Date();
  let answer: Answer;
  if (key) {
    const s = l.sites.find(x => x.key === key);
    if (!s) answer = { status: 'locked', message: 'This license key is not valid.' };
    else if (s.status === 'blocked') answer = { status: 'locked', message: 'This license has been switched off by the seller.' };
    else if (s.host && s.host !== host) answer = { status: 'locked', message: `This license key belongs to ${s.host}. Ask the seller to move it.` };
    else { s.host ||= host; s.status = 'active'; s.last = now.toISOString(); s.first ||= s.last; answer = { status: 'active', message: '' }; }
  } else {
    let s = l.sites.find(x => x.host === host && !x.key);
    if (!s) { s = { id: newId(), host, key: '', status: 'trial', opens: 0, maxOpens: l.opens, maxDays: l.days, first: now.toISOString(), last: '', note: '' }; l.sites.unshift(s); }
    if (!s.last || now.getTime() - new Date(s.last).getTime() > SESSION_GAP) s.opens++;
    s.last = now.toISOString();
    const usedDays = (now.getTime() - new Date(s.first).getTime()) / DAY;
    if (s.status === 'active') answer = { status: 'active', message: '' };
    else if (s.status === 'blocked') answer = { status: 'locked', message: 'This copy has been switched off by the seller.' };
    else if (s.opens > s.maxOpens || usedDays > s.maxDays) answer = { status: 'locked', message: 'The free demo has ended. Contact the seller to buy a license.' };
    else answer = { status: 'trial', message: 'Demo', left: { opens: Math.max(0, s.maxOpens - s.opens), days: Math.max(0, Math.ceil(s.maxDays - usedDays)) } };
  }
  l.sites = l.sites.slice(0, 500);
  await saveLicenses(l);
  return answer;
}
