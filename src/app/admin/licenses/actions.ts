'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { cleanHost, getLicenses, newId, newKey, saveLicenses, type Site } from '@/lib/licenses';

const num = (v: FormDataEntryValue | null, d: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : d; };

export async function saveDemoRules(fd: FormData) {
  await requireAdmin('licenses', 'saveDemoRules');
  const l = await getLicenses();
  l.opens = num(fd.get('opens'), l.opens); l.days = num(fd.get('days'), l.days);
  l.download = String(fd.get('download') || '').trim().slice(0, 500) || l.download;
  await saveLicenses(l); revalidatePath('/admin/licenses');
}

export async function createKey(fd: FormData) {
  await requireAdmin('licenses', 'createKey');
  const l = await getLicenses();
  const s: Site = { id: newId(), host: cleanHost(String(fd.get('host') || '')), key: newKey(), status: 'active', opens: 0, maxOpens: 0, maxDays: 0, first: '', last: '', note: String(fd.get('note') || '').slice(0, 200) };
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
    }
  }
  await saveLicenses(l); revalidatePath('/admin/licenses');
}
