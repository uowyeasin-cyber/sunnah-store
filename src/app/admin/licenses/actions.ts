'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { cleanHost, extend, getLicenses, newId, newKey, PLANS, saveLicenses, type Plan, type Site } from '@/lib/licenses';

const planOf = (v: FormDataEntryValue | null): Plan => (PLANS.find(p => p[0] === v)?.[0] || 'lifetime');
const dateOf = (v: FormDataEntryValue | null) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';

const num = (v: FormDataEntryValue | null, d: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : d; };

export async function saveDemoRules(fd: FormData) {
  await requireAdmin('licenses', 'saveDemoRules');
  const l = await getLicenses();
  l.opens = num(fd.get('opens'), l.opens); l.days = num(fd.get('days'), l.days);
  l.download = String(fd.get('download') || '').trim().slice(0, 500) || l.download;
  l.on = !!fd.get('on'); l.grace = num(fd.get('grace'), l.grace);
  for (const [p] of PLANS) l.prices[p] = String(fd.get(`price-${p}`) || '').trim().slice(0, 80);
  l.contact = String(fd.get('contact') || '').trim().slice(0, 300);
  await saveLicenses(l); revalidatePath('/admin/licenses');
}

export async function createKey(fd: FormData) {
  await requireAdmin('licenses', 'createKey');
  const l = await getLicenses();
  const s: Site = { id: newId(), host: cleanHost(String(fd.get('host') || '')), key: newKey(), status: 'active', opens: 0, maxOpens: 0, maxDays: 0, first: '', last: '', note: String(fd.get('note') || '').slice(0, 200) };
  s.plan = planOf(fd.get('plan')); s.expires = extend(s.plan);
  l.sites.unshift(s); await saveLicenses(l); revalidatePath('/admin/licenses');
}

export async function saveSite(fd: FormData) {
  const id = String(fd.get('id'));
  await requireAdmin('licenses', 'saveSite', id);
  const l = await getLicenses();
  if (fd.get('delete')) l.sites = l.sites.filter(s => s.id !== id);
  else {
    const s = l.sites.find(x => x.id === id);
    if (s) {
      const st = String(fd.get('status'));
      if (st === 'trial' || st === 'active' || st === 'blocked') s.status = st;
      s.maxOpens = num(fd.get('maxOpens'), s.maxOpens); s.maxDays = num(fd.get('maxDays'), s.maxDays);
      if (fd.get('reset')) { s.opens = 0; s.first = new Date().toISOString(); }
      if (s.key) s.host = cleanHost(String(fd.get('host') || ''));
      s.note = String(fd.get('note') || '').slice(0, 200);
      const plan = planOf(fd.get('plan'));
      if (plan !== s.plan) { s.plan = plan; s.expires = extend(plan); }
      else s.expires = plan === 'lifetime' ? '' : dateOf(fd.get('expires')) || s.expires || extend(plan);
      if (fd.get('renew') && plan !== 'lifetime') { s.expires = extend(plan, s.expires); if (s.status === 'blocked') s.status = 'active'; }
    }
  }
  await saveLicenses(l); revalidatePath('/admin/licenses');
}
