'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { newSale, SALE_TEMPLATES, SALE_LOOKS, SALE_PLACES, shareCfg, type SaleEvent, type SaleLook, type SalePlace, type ShareCfg } from '@/lib/promo';

const str = (fd: FormData, k: string, n = 200) => String(fd.get(k) ?? '').trim().slice(0, n);
const num = (fd: FormData, k: string, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(fd.get(k)) || 0));
const save = async (key: string, value: unknown) => { await db.setting.upsert({ where: { key }, update: { value: value as object }, create: { key, value: value as object } }); updateTag('catalog'); };
const sales = async () => ((await getSettings()).sales || []) as SaleEvent[];
// A typed time is the admin's own clock; tz is the browser's offset from UTC in minutes.
const utc = (v: string, tz: number) => { const t = Date.parse(v + ':00Z'); return Number.isFinite(t) ? new Date(t + tz * 60e3).toISOString() : ''; };

export async function addSale(fd: FormData) {
  const tp = SALE_TEMPLATES.find(x => x.key === fd.get('template')) || SALE_TEMPLATES[0];
  const name = str(fd, 'name', 80) || tp.label;
  await requireAdmin('sales', 'addSale', name);
  const ev = { ...newSale(), name, kicker: tp.key === 'blank' ? name : tp.kicker, title: tp.title, text: tp.text, look: tp.look };
  // Dates: the template's day in Bangladesh time (next one coming), else starting tomorrow. The admin changes them on the form.
  const now = new Date(), y = now.getUTCFullYear();
  let start = tp.month >= 0 ? Date.UTC(y, tp.month, tp.day) - 6 * 3600e3 : Date.UTC(y, now.getUTCMonth(), now.getUTCDate() + 1) - 6 * 3600e3;
  if (tp.month >= 0 && start + tp.days * 864e5 < now.getTime()) start = Date.UTC(y + 1, tp.month, tp.day) - 6 * 3600e3;
  ev.startsAt = new Date(start).toISOString(); ev.endsAt = new Date(start + tp.days * 864e5 - 60e3).toISOString();
  await save('sales', [...(await sales()), ev]);
  redirect(`/admin/sales?open=${ev.id}#s-${ev.id}`);
}

export async function saveSale(fd: FormData) {
  const id = str(fd, 'id', 20);
  await requireAdmin('sales', 'saveSale', `${id} ${str(fd, 'name')}`);
  const tz = Number(fd.get('tz')) || 0;
  const list = await sales();
  const old = list.find(e => e.id === id);
  if (!old) redirect('/admin/sales?note=' + encodeURIComponent('That campaign is gone.'));
  const labels = fd.getAll('joinLabel').map(String), urls = fd.getAll('joinUrl').map(String);
  const ev: SaleEvent = {
    ...old!, on: fd.get('on') === 'on', name: str(fd, 'name', 80) || 'Sale', kicker: str(fd, 'kicker', 60), title: str(fd, 'title', 120), text: str(fd, 'text', 300),
    startsAt: utc(str(fd, 'startsAt'), tz) || old!.startsAt, endsAt: utc(str(fd, 'endsAt'), tz) || old!.endsAt, teaser: fd.get('teaser') === 'on',
    pct: Math.round(num(fd, 'pct', 0, 90)), cats: fd.getAll('cats').map(String).filter(Boolean), code: str(fd, 'code', 24).toUpperCase(),
    cta: str(fd, 'cta', 40), link: str(fd, 'link', 300), image: fd.get('noImage') === 'on' ? '' : str(fd, 'imageFile', 500) || str(fd, 'image', 500),
    look: (SALE_LOOKS.some(([k]) => k === fd.get('look')) ? fd.get('look') : 'red') as SaleLook,
    places: fd.getAll('places').map(String).filter(p => SALE_PLACES.some(([k]) => k === p)) as SalePlace[],
    share: fd.get('share') === 'on', shareText: str(fd, 'shareText', 160),
    join: urls.map((u, i) => ({ label: (labels[i] || '').trim().slice(0, 40), url: u.trim().slice(0, 300) })).filter(j => /^https?:\/\//.test(j.url)).slice(0, 8),
  };
  if (Date.parse(ev.endsAt) <= Date.parse(ev.startsAt)) redirect(`/admin/sales?open=${id}&note=` + encodeURIComponent('The end time must be after the start time.') + `#s-${id}`);
  await save('sales', list.map(e => (e.id === id ? ev : e)));
  redirect(`/admin/sales?saved=${id}#s-${id}`);
}

export async function saleSwitch(fd: FormData) {
  const id = str(fd, 'id', 20), on = fd.get('on') === '1';
  await requireAdmin('sales', on ? 'saleOn' : 'saleOff', id);
  await save('sales', (await sales()).map(e => (e.id === id ? { ...e, on } : e)));
  redirect('/admin/sales');
}

export async function deleteSale(fd: FormData) {
  const id = str(fd, 'id', 20);
  await requireAdmin('sales', 'deleteSale', id);
  await save('sales', (await sales()).filter(e => e.id !== id));
  redirect('/admin/sales?note=' + encodeURIComponent('Campaign deleted.'));
}

export async function copySale(fd: FormData) {
  const id = str(fd, 'id', 20);
  await requireAdmin('sales', 'copySale', id);
  const list = await sales(), src = list.find(e => e.id === id);
  if (!src) redirect('/admin/sales');
  const ev = { ...src!, id: newSale().id, on: false, name: `${src!.name} (copy)` };
  await save('sales', [...list, ev]);
  redirect(`/admin/sales?open=${ev.id}#s-${ev.id}`);
}

export async function saveShare(fd: FormData) {
  await requireAdmin('share', 'saveShare');
  const old = shareCfg((await getSettings()).share);
  const v: ShareCfg = { ...old, on: fd.get('on') === 'on', rewardPct: num(fd, 'rewardPct', 0, 30), maxReward: num(fd, 'maxReward', 0, 1000), friendPct: num(fd, 'friendPct', 0, 50),
    unlock: fd.get('unlock') === 'on', unlockPct: num(fd, 'unlockPct', 0, 50), text: str(fd, 'text', 200) };
  await save('share', v);
  redirect('/admin/share?saved=1');
}
