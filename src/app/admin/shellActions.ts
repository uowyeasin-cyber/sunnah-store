'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin, signOut } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { db } from '@/lib/db';
import { mainOwner } from '@/lib/roles';

export async function adminSignOut() { await signOut(); redirect('/admin'); }

// Turns store alert emails on or off for one admin. Everyone can switch their own;
// only the main owner (first admin in the list) can switch someone else's.
export async function setAlerts(fd: FormData) {
  const me = await requireAdmin();
  const mine = (me.email || '').toLowerCase();
  const email = String(fd.get('email') || mine).trim().toLowerCase();
  const s = await getSettings();
  if (!s.admins.some(a => a && a.toLowerCase() === email)) throw new Error('Not an admin');
  if (email !== mine && mine !== mainOwner(s.admins)) throw new Error('Not allowed');
  const on = fd.get('on') === '1';
  const off = new Set((s.alertsOff || []).map(e => e.toLowerCase()));
  if (on) off.delete(email); else off.add(email);
  await db.setting.upsert({ where: { key: 'alertsOff' }, update: { value: [...off] }, create: { key: 'alertsOff', value: [...off] } });
  await db.adminLog.create({ data: { email: mine, area: 'team', action: 'setAlerts', detail: `${email} ${on ? 'on' : 'off'}` } }).catch(() => {});
  updateTag('catalog');
}
