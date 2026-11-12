'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin, signOut } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { db } from '@/lib/db';

export async function adminSignOut() { await signOut(); redirect('/admin'); }

// Turns the signed-in admin's own store alert emails on or off. Every admin has the same
// switch and nobody can change someone else's.
export async function setAlerts(fd: FormData) {
  const me = await requireAdmin();
  const mine = (me.email || '').toLowerCase();
  const email = mine;
  const s = await getSettings();
  const on = fd.get('on') === '1';
  const off = new Set((s.alertsOff || []).map(e => e.toLowerCase()));
  if (on) off.delete(email); else off.add(email);
  await db.setting.upsert({ where: { key: 'alertsOff' }, update: { value: [...off] }, create: { key: 'alertsOff', value: [...off] } });
  await db.adminLog.create({ data: { email: mine, area: 'team', action: 'setAlerts', detail: `${email} ${on ? 'on' : 'off'}` } }).catch(() => {});
  updateTag('catalog');
}
