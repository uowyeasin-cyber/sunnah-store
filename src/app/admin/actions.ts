'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { saveUpload } from '@/lib/upload';
import type { NavItem, Settings, Slide } from '@/lib/settings';

// Every admin change: check the signer is an admin, write, then refresh the storefront cache.
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'item';
async function file(fd: FormData, k: string, folder: string) { const f = fd.get(k); return f instanceof File && f.size ? saveUpload(f, folder) : ''; }
async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.setting.upsert({ where: { key }, update: { value: value as object }, create: { key, value: value as object } });
}
const done = () => updateTag('catalog');

export async function saveStore(fd: FormData) {
  await requireAdmin();
  const s = await getSettings();
  await setSetting('store', { ...s.store, name: str(fd, 'name') || s.store.name, mono: str(fd, 'mono').slice(0, 3), announce: str(fd, 'announce'), tagline: str(fd, 'tagline') });
  await setSetting('theme', { preset: str(fd, 'preset') || 'porcelain', accent: str(fd, 'accentOn') ? str(fd, 'accent') : '', font: str(fd, 'font'), body: str(fd, 'body'), radius: Math.min(20, Math.max(0, num(fd, 'radius'))) });
  done();
}

export async function saveSlides(fd: FormData) {
  await requireAdmin();
  const s = await getSettings();
  const ids = fd.getAll('id').map(String);
  const slides: Slide[] = [];
  for (const [i, id] of ids.entries()) {
    if (fd.get(`del-${i}`)) continue;
    const old = s.slides.find(x => x.id === id);
    let image = old?.image || '', video = old?.video || '';
    if (fd.get(`clear-${i}`)) image = video = '';
    const up = fd.get(`media-${i}`);
    if (up instanceof File && up.size) { const url = await saveUpload(up, 'slides'); if (up.type.startsWith('video/')) { video = url; image = ''; } else { image = url; video = ''; } }
    slides.push({ id, eyebrow: str(fd, `eyebrow-${i}`), title: str(fd, `title-${i}`), italic: str(fd, `italic-${i}`), text: str(fd, `text-${i}`), product: str(fd, `product-${i}`), cta: str(fd, `cta-${i}`), look: str(fd, `look-${i}`) === 'dark' ? 'dark' : 'light', image, video });
  }
  if (fd.get('add')) slides.push({ id: 's' + Date.now(), eyebrow: 'New', title: 'Your headline', italic: '', text: '', product: '', cta: 'Discover', look: 'light', image: '', video: '' });
  const up = Number(fd.get('up'));
  if (up > 0 && up < slides.length) [slides[up - 1], slides[up]] = [slides[up], slides[up - 1]];
  await setSetting('slides', slides);
  await setSetting('slideSecs', Math.min(20, Math.max(3, num(fd, 'slideSecs') || 6.5)));
  done();
}

export async function saveMenu(fd: FormData) {
  await requireAdmin();
  const n = fd.getAll('label').length;
  const nav: NavItem[] = [];
  for (let i = 0; i < n; i++) if (!fd.get(`del-${i}`)) nav.push({ label: String(fd.getAll('label')[i]), to: String(fd.getAll('to')[i]), show: !!fd.get(`show-${i}`) });
  if (fd.get('add')) nav.push({ label: 'New link', to: 'all', show: true });
  const up = Number(fd.get('up'));
  if (up > 0 && up < nav.length) [nav[up - 1], nav[up]] = [nav[up], nav[up - 1]];
  await setSetting('nav', nav);
  done();
}

export async function saveRules(fd: FormData) {
  await requireAdmin();
  await setSetting('rewardRate', Math.min(5, Math.max(0, num(fd, 'rewardRate'))));
  await setSetting('rates', { USD: 1, MYR: num(fd, 'MYR') || 4.7, BDT: num(fd, 'BDT') || 120 });
  await setSetting('holdReviews', !!fd.get('holdReviews'));
  await setSetting('allowVideoReviews', !!fd.get('allowVideoReviews'));
  await setSetting('popupDelay', Math.min(60, Math.max(0, num(fd, 'popupDelay'))));
  done();
}

export async function saveTeam(fd: FormData) {
  const me = await requireAdmin();
  const admins = fd.getAll('admin').map(String).map(s => s.trim().toLowerCase()).slice(0, 5);
  // Keep the person saving in the list, so nobody locks themselves out.
  if (me.email && !admins.includes(me.email)) admins[0] = me.email;
  while (admins.length < 5) admins.push('');
  await setSetting('admins', admins);
  done();
}

export async function saveProduct(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const name = str(fd, 'name');
  if (!name) throw new Error('Name is required');
  const old = id ? await db.product.findUnique({ where: { id } }) : null;
  let images = old?.images || [];
  const remove = new Set(fd.getAll('removeImage').map(String));
  images = images.filter(u => !remove.has(u));
  for (const f of fd.getAll('images')) if (f instanceof File && f.size) images.push(await saveUpload(f, 'products'));
  let video = fd.get('clearVideo') ? '' : old?.video || '';
  const v = await file(fd, 'video', 'products'); if (v) video = v;
  const data = {
    name, sub: str(fd, 'sub'), details: str(fd, 'details'), priceCents: Math.round(num(fd, 'price') * 100), kind: str(fd, 'kind') || 'gift', finish: str(fd, 'finish'),
    swatch: str(fd, 'swatch'), active: !!fd.get('active'), sort: num(fd, 'sort'), categoryId: str(fd, 'categoryId'), images, video,
    stock: { US: num(fd, 'stockUS'), MY: num(fd, 'stockMY'), BD: num(fd, 'stockBD') },
  };
  let slug = slugify(str(fd, 'slug') || name);
  if (await db.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) slug += '-' + Date.now().toString(36).slice(-4);
  const p = id ? await db.product.update({ where: { id }, data: { ...data, slug } }) : await db.product.create({ data: { ...data, slug } });
  const label = str(fd, 'offerLabel');
  if (label) {
    const offer = { on: !!fd.get('offerOn'), label, pct: Math.min(90, Math.max(0, num(fd, 'offerPct'))), style: str(fd, 'offerStyle') || 'pill', endsAt: str(fd, 'offerEnds') ? new Date(str(fd, 'offerEnds') + 'T23:59:59') : null };
    await db.offer.upsert({ where: { productId: p.id }, update: offer, create: { ...offer, productId: p.id } });
  } else await db.offer.deleteMany({ where: { productId: p.id } });
  done();
  if (!id) redirect(`/admin/products/${p.id}?saved=1`);
}

export async function deleteProduct(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  // Products with orders are hidden rather than deleted, so receipts stay intact.
  if (await db.orderLine.count({ where: { productId: id } })) await db.product.update({ where: { id }, data: { active: false } });
  else await db.product.delete({ where: { id } });
  done();
  redirect('/admin/products');
}

export async function saveCategories(fd: FormData) {
  await requireAdmin();
  const ids = fd.getAll('id').map(String);
  for (const [i, id] of ids.entries()) {
    if (fd.get(`del-${i}`)) { if (!(await db.product.count({ where: { categoryId: id } }))) await db.category.delete({ where: { id } }); continue; }
    await db.category.update({ where: { id }, data: { name: str(fd, `name-${i}`), sort: num(fd, `sort-${i}`) } });
  }
  const name = str(fd, 'newName');
  if (name) {
    let slug = slugify(name);
    if (await db.category.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36).slice(-4);
    await db.category.create({ data: { name, slug, sort: ids.length } });
    const s = await getSettings();
    const nav = [...s.nav]; const at = nav.findIndex(n => n.to === 'track');
    nav.splice(at < 0 ? nav.length : at, 0, { label: name, to: `cat:${slug}`, show: true });
    await setSetting('nav', nav);
  }
  done();
}

export async function saveAd(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  if (fd.get('delete')) { await db.ad.delete({ where: { id } }); done(); return; }
  const old = id ? await db.ad.findUnique({ where: { id } }) : null;
  let image = old?.image || '', video = old?.video || '';
  if (fd.get('clearMedia')) image = video = '';
  const up = fd.get('media');
  if (up instanceof File && up.size) { const url = await saveUpload(up, 'ads'); if (up.type.startsWith('video/')) { video = url; image = ''; } else { image = url; video = ''; } }
  const date = (k: string) => (str(fd, k) ? new Date(str(fd, k) + (k === 'endsAt' ? 'T23:59:59' : 'T00:00:00')) : null);
  const data = { on: !!fd.get('on'), place: str(fd, 'place'), kicker: str(fd, 'kicker'), title: str(fd, 'title') || 'Untitled', text: str(fd, 'text'), cta: str(fd, 'cta'), link: str(fd, 'link'), style: str(fd, 'style') || 'dark', image, video, startsAt: date('startsAt'), endsAt: date('endsAt'), sort: num(fd, 'sort') };
  if (id) await db.ad.update({ where: { id }, data }); else await db.ad.create({ data });
  done();
}

export async function setReview(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), to = str(fd, 'to');
  if (to === 'delete') await db.review.delete({ where: { id } });
  else await db.review.update({ where: { id }, data: { status: to === 'live' ? 'live' : 'hidden' } });
  done();
}

// Stores only what differs from the built-in translation, so later built-in fixes still reach untouched text.
export async function saveTranslations(fd: FormData) {
  await requireAdmin();
  const { dictFor } = await import('@/lib/i18n');
  const out: Settings['translations'] = {};
  for (const l of ['bn', 'ar', 'hi'] as const) {
    const base = dictFor(l);
    const mine: Record<string, string> = {};
    for (let i = 0; fd.has(`key${i}`); i++) {
      const k = str(fd, `key${i}`), v = str(fd, `${l}${i}`);
      if (v && v !== base[k]) mine[k] = v;
    }
    out[l] = mine;
  }
  await setSetting('translations', out);
  done();
}
