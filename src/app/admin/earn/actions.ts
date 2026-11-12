'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AD_TYPES, NET_PLACES, PROVIDERS, readEarn, saveEarn, shortCode, type NetUnit } from '@/lib/earn';

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
const on = (fd: FormData, k: string) => !!fd.get(k);
const int = (fd: FormData, k: string, d: number) => { const n = Math.floor(Number(fd.get(k))); return Number.isFinite(n) ? Math.max(-1, Math.min(n, 120)) : d; };
const done = () => { updateTag('catalog'); revalidatePath('/admin/earn'); };

export async function saveNetwork(fd: FormData) {
  await requireAdmin('earn', 'saveNetwork');
  const e = await readEarn();
  const types = fd.getAll('types').map(String).filter(x => AD_TYPES.some(([k]) => k === x));
  let client = str(fd, 'client', 60).replace(/\s/g, '');
  if (/^pub-/.test(client)) client = 'ca-' + client;
  e.net = { ...e.net, on: on(fd, 'on'), client, autoAds: on(fd, 'autoAds'), types, adsTxt: str(fd, 'adsTxt', 4000),
    hideFor: str(fd, 'hideFor', 1000).split(/[\s,]+/).filter(p => p.startsWith('/')) };
  await saveEarn(e); done();
}

export async function saveUnit(fd: FormData) {
  await requireAdmin('earn', 'saveUnit');
  const e = await readEarn(), id = str(fd, 'id', 40);
  if (fd.get('delete')) { e.net.units = e.net.units.filter(u => u.id !== id); await saveEarn(e); done(); return; }
  const pick = (k: string, list: [string, ...string[]][], d: string) => { const v = str(fd, k, 40); return list.some(x => x[0] === v) ? v : d; };
  const u: NetUnit = { id: id || Math.random().toString(36).slice(2, 10), on: on(fd, 'on'), name: str(fd, 'name', 80) || 'Ad unit',
    provider: pick('provider', PROVIDERS, 'custom'), type: pick('type', AD_TYPES, 'banner'), place: pick('place', NET_PLACES, 'footer'),
    slot: str(fd, 'slot', 30).replace(/\D/g, ''), code: str(fd, 'code', 20000) };
  const i = e.net.units.findIndex(x => x.id === id);
  if (i >= 0) e.net.units[i] = u; else e.net.units.push(u);
  await saveEarn(e); done();
}

export async function saveLinks(fd: FormData) {
  await requireAdmin('earn', 'saveLinks');
  const e = await readEarn();
  e.links = { on: on(fd, 'on'), wait: Math.max(0, int(fd, 'wait', 5)), houseAd: on(fd, 'houseAd'), note: str(fd, 'note', 200) };
  await saveEarn(e); done();
}

export async function saveShortLink(fd: FormData) {
  await requireAdmin('earn', 'saveShortLink');
  const id = str(fd, 'id', 40);
  if (fd.get('delete')) { await db.shortLink.delete({ where: { id } }); done(); return; }
  const target = str(fd, 'target', 2000);
  if (!/^https?:\/\/\S+$/.test(target) && !/^\/\S*$/.test(target)) throw new Error('The link must start with https:// or /');
  let code = str(fd, 'code', 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const data = { target, title: str(fd, 'title', 120), on: on(fd, 'on'), wait: int(fd, 'wait', -1) };
  if (id) { await db.shortLink.update({ where: { id }, data: code ? { ...data, code } : data }); done(); return; }
  code ||= shortCode();
  while (await db.shortLink.findUnique({ where: { code } })) code = shortCode();
  await db.shortLink.create({ data: { ...data, code } }); done();
}

export async function saveAdvertise(fd: FormData) {
  await requireAdmin('earn', 'saveAdvertise');
  const e = await readEarn();
  e.advertise = { on: on(fd, 'on'), title: str(fd, 'title', 120) || 'Advertise with us', text: str(fd, 'text', 2000), prices: str(fd, 'prices', 3000), whatsapp: str(fd, 'whatsapp', 30), email: str(fd, 'email', 120) };
  await saveEarn(e); done();
}
