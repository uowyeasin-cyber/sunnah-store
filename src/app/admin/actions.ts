'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { keepUpload, isVideoUrl, isAudioUrl, isImageUrl } from '@/lib/upload';
import { CAT_STYLES, type Fit, heroSlides, MOTIONS, type Motion, type NavItem, type Settings, type Slide } from '@/lib/settings';
const motionOf = (v: string): Motion => (MOTIONS.find(([k]) => k === v)?.[0] || 'fade');
import { badgeFrom } from '@/lib/badges';
import { after } from 'next/server';
import { allLangs, pingIndexNow } from '@/lib/indexnow';

// Every admin change: check the signer is an admin, write, then refresh the storefront cache.
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'item';
async function file(fd: FormData, k: string, folder: string) { return keepUpload(fd.get(k), folder); }
async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.setting.upsert({ where: { key }, update: { value: value as object }, create: { key, value: value as object } });
}
const done = () => updateTag('catalog');

export async function saveStore(fd: FormData) {
  await requireAdmin('settings', 'saveStore');
  const s = await getSettings();
  await setSetting('store', { ...s.store, name: str(fd, 'name') || s.store.name, mono: str(fd, 'mono').slice(0, 3), announce: str(fd, 'announce'), tagline: str(fd, 'tagline') });
  await setSetting('theme', { preset: str(fd, 'preset') || 'porcelain', accent: str(fd, 'accentOn') ? str(fd, 'accent') : '', font: str(fd, 'font'), body: str(fd, 'body'), radius: Math.min(20, Math.max(0, num(fd, 'radius'))) });
  done();
}

export async function saveSlides(fd: FormData) {
  await requireAdmin('homepage', 'saveSlides');
  const s = await getSettings();
  const before = heroSlides(s); // includes the old launch film and single buttons, so saving keeps them
  const ids = fd.getAll('id').map(String);
  const slides: Slide[] = [];
  const href = (v: string) => { v = v.trim(); return !v ? '/shop' : /^(https?:\/\/|\/|mailto:|tel:|#)/i.test(v) ? v.slice(0, 300) : v.includes('.') ? 'https://' + v.slice(0, 290) : '/' + v.replace(/^\/+/, '').slice(0, 290); };
  for (const [i, id] of ids.entries()) {
    if (fd.get(`del-${i}`)) continue;
    const old = before.find(x => x.id === id);
    let m = { image: old?.image || '', video: old?.video || '', audio: old?.audio || '', file: old?.file || '', fileName: old?.fileName || '', poster: old?.poster || '', videoTall: old?.videoTall || '' };
    if (fd.get(`clear-${i}`)) m = { image: '', video: '', audio: '', file: '', fileName: '', poster: '', videoTall: '' };
    const raw = fd.get(`media-${i}`);
    const url = await keepUpload(raw, 'slides', true) || (str(fd, `link-${i}`).match(/^https?:\/\/\S+$/)?.[0] ?? '');
    if (url) m = { ...mediaOf(url, raw), poster: '', videoTall: '' };
    const buttons = fd.getAll(`bl-${i}`).map(String).map((label, k) => ({ label: label.trim().slice(0, 40), href: href(String(fd.getAll(`bh-${i}`)[k] ?? '')), drop: !!fd.get(`bd-${i}-${k}`) }))
      .filter(b => b.label && !b.drop).map(({ label, href }) => ({ label, href }));
    const fit: Fit = fd.get(`whole-${i}`) ? 'contain' : 'cover';
    const layout = str(fd, `layout-${i}`) === 'full' ? 'full' : 'card', size = Math.min(70, Math.max(30, num(fd, `size-${i}`) || 48));
    slides.push({ id, eyebrow: str(fd, `eyebrow-${i}`), title: str(fd, `title-${i}`), italic: str(fd, `italic-${i}`), text: str(fd, `text-${i}`), product: str(fd, `product-${i}`), cta: '', look: str(fd, `look-${i}`) === 'light' ? 'light' : 'dark', motion: motionOf(str(fd, `motion-${i}`)), fit, layout, size, buttons, ...m });
  }
  // Add media: each picked file (any kind) becomes its own item, ready for text and buttons.
  const motion = motionOf(str(fd, 'newMotion'));
  for (const [n, v] of fd.getAll('newMedia').entries()) {
    const url = await keepUpload(v, 'slides', true);
    if (!url) continue;
    slides.push({ id: 's' + Date.now().toString(36) + n, eyebrow: '', title: '', italic: '', text: '', product: '', cta: '', look: 'dark', motion, fit: 'cover', buttons: [], ...mediaOf(url, v), poster: '', videoTall: '' });
  }
  if (fd.get('add')) slides.push({ id: 's' + Date.now(), eyebrow: '', title: 'Your headline', italic: '', text: '', product: '', cta: '', look: 'dark', image: '', video: '', motion: 'fade', fit: 'cover', buttons: [{ label: 'Shop now', href: '/shop' }] });
  const up = Number(fd.get('up'));
  if (up > 0 && up < slides.length) [slides[up - 1], slides[up]] = [slides[up], slides[up - 1]];
  await setSetting('slides', slides);
  if (s.film.on) await setSetting('film', { ...s.film, on: false }); // the film now lives in the list above
  await setSetting('slideSecs', Math.min(20, Math.max(3, num(fd, 'slideSecs') || 6.5)));
  await setSetting('heroHeight', Math.min(100, Math.max(0, Math.round(num(fd, 'heroHeight')))));
  const cs = str(fd, 'catStyle');
  const csOk = CAT_STYLES.find(([k]) => k === cs)?.[0];
  if (csOk) await setSetting('catStyle', csOk);
  done();
}

// Sorts an uploaded file into photo, video, sound or "other file" by its name.
function mediaOf(url: string, raw: FormDataEntryValue | null) {
  const name = (raw instanceof File ? raw.name : decodeURIComponent(url.split('/').pop() || '')).replace(/-[A-Za-z0-9]{20,}(?=\.[^.]+$)/, '').slice(0, 80);
  const e = { image: '', video: '', audio: '', file: '', fileName: '' };
  if (isVideoUrl(url)) return { ...e, video: url };
  if (isAudioUrl(url)) return { ...e, audio: url, fileName: name };
  if (isImageUrl(url) || /\/[^/.]+$/.test(url)) return { ...e, image: url };
  return { ...e, file: url, fileName: name };
}

export async function saveConnections(fd: FormData) {
  await requireAdmin('connections', 'saveConnections');
  const { SERVICES, saveKeys, storedKeys } = await import('@/lib/keys');
  const keys = await storedKeys(), clear = new Set(fd.getAll('clear').map(String));
  for (const s of SERVICES) for (const [env, , kind] of s.fields) {
    const v = str(fd, env);
    if (clear.has(s.id)) delete keys[env];
    else if (Array.isArray(kind) || v) keys[env] = v.slice(0, 500);
  }
  await saveKeys(Object.fromEntries(Object.entries(keys).filter(([, v]) => v)));
  const regions = (await getSettings()).regions;
  for (const r of Object.keys(regions) as (keyof typeof regions)[]) regions[r] = { courier: str(fd, `courier-${r}`) || regions[r].courier, cod: !!fd.get(`cod-${r}`) };
  await setSetting('regions', regions);
  const wh = (await getSettings()).warehouses;
  for (const w of ['BD', 'MY', 'US'] as const) wh[w] = Object.fromEntries((['name', 'phone', 'email', 'street', 'city', 'state', 'zip'] as const).map(k => [k, str(fd, `wh-${w}-${k}`).slice(0, 120)])) as typeof wh.BD;
  await setSetting('warehouses', wh);
  await setSetting('parcel', { kgPerItem: Math.max(0.01, num(fd, 'kgPerItem') || 0.2), cm: [0, 1, 2].map(i => Math.max(1, num(fd, `cm${i}`) || 10)) as [number, number, number] });
  done();
}

export async function savePayments(fd: FormData) {
  await requireAdmin('payments', 'savePayments');
  const ids = fd.getAll('id').map(String), labels = fd.getAll('label').map(String), where = fd.getAll('where').map(String), details = fd.getAll('details').map(String);
  await setSetting('manualPay', ids.map((id, i) => ({ id, label: labels[i].trim() || id, where: where[i] || 'all', details: details[i].trim().slice(0, 500), on: !!fd.get(`on-${i}`) })));
  done();
}

export async function saveMenu(fd: FormData) {
  await requireAdmin('menu', 'saveMenu');
  const n = fd.getAll('label').length;
  const nav: NavItem[] = [];
  for (let i = 0; i < n; i++) if (!fd.get(`del-${i}`)) nav.push({ label: String(fd.getAll('label')[i]), to: String(fd.getAll('to')[i]), show: !!fd.get(`show-${i}`) });
  if (fd.get('add')) nav.push({ label: 'New link', to: 'all', show: true });
  const up = Number(fd.get('up'));
  if (up > 0 && up < nav.length) [nav[up - 1], nav[up]] = [nav[up], nav[up - 1]];
  await setSetting('nav', nav);
  done();
}

export async function savePreorder(fd: FormData) {
  await requireAdmin('settings', 'savePreorder');
  await setSetting('preorder', { on: !!fd.get('on'), ships: str(fd, 'ships').slice(0, 120) || 'Ships in 4–6 weeks' });
  done();
}

export async function saveRules(fd: FormData) {
  await requireAdmin('settings', 'saveRules');
  await setSetting('rewardRate', Math.min(5, Math.max(0, num(fd, 'rewardRate'))));
  await setSetting('rates', { USD: 1, MYR: num(fd, 'MYR') || 4.7, BDT: num(fd, 'BDT') || 120 });
  await setSetting('holdReviews', !!fd.get('holdReviews'));
  await setSetting('allowVideoReviews', !!fd.get('allowVideoReviews'));
  await setSetting('popupDelay', Math.min(60, Math.max(0, num(fd, 'popupDelay'))));
  done();
}

export async function saveTeam(fd: FormData) {
  const me = await requireAdmin('team', 'saveTeam');
  const { isRole } = await import('@/lib/roles');
  const emails = fd.getAll('admin').map(String).map(s => s.trim().toLowerCase()).slice(0, 10);
  const picked = fd.getAll('role').map(String);
  const admins: string[] = [], roles: Record<string, string> = {};
  emails.forEach((e, i) => { if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !admins.includes(e)) { admins.push(e); roles[e] = isRole(picked[i]) ? picked[i] : 'owner'; } });
  // Keep the person saving in the list as an owner, so nobody locks themselves out.
  if (me.email) { if (!admins.includes(me.email)) admins.unshift(me.email); roles[me.email] = 'owner'; }
  while (admins.length < 5) admins.push('');
  await setSetting('admins', admins.slice(0, 10));
  await setSetting('roles', roles);
  done();
}

export async function saveProduct(fd: FormData) {
  await requireAdmin('products', 'saveProduct');
  const id = str(fd, 'id');
  const name = str(fd, 'name');
  if (!name) throw new Error('Name is required');
  const old = id ? await db.product.findUnique({ where: { id } }) : null;
  let images = old?.images || [];
  const remove = new Set(fd.getAll('removeImage').map(String));
  images = images.filter(u => !remove.has(u));
  for (const f of fd.getAll('images')) { const u = await keepUpload(f, 'products'); if (u) images.push(u); }
  let video = fd.get('clearVideo') ? '' : old?.video || '';
  const v = await file(fd, 'video', 'products'); if (v) video = v;
  const data = {
    name, sub: str(fd, 'sub'), details: str(fd, 'details'), priceCents: Math.round(num(fd, 'price') * 100), costCents: Math.round(num(fd, 'cost') * 100), kind: str(fd, 'kind') || 'gift', finish: str(fd, 'finish'),
    swatch: str(fd, 'swatch'), active: !!fd.get('active'), sort: num(fd, 'sort'), categoryId: str(fd, 'categoryId'), images, video,
    stock: { US: num(fd, 'stockUS'), MY: num(fd, 'stockMY'), BD: num(fd, 'stockBD') },
    dropship: !!fd.get('dropship'), supplierId: str(fd, 'supplierId').slice(0, 40), supplierSku: str(fd, 'supplierSku').slice(0, 120), supplierUrl: str(fd, 'supplierUrl').slice(0, 500),
  };
  let slug = slugify(str(fd, 'slug') || name);
  if (await db.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) slug += '-' + Date.now().toString(36).slice(-4);
  const p = id ? await db.product.update({ where: { id }, data: { ...data, slug } }) : await db.product.create({ data: { ...data, slug } });
  const label = str(fd, 'offerLabel');
  if (label) {
    const offer = { on: !!fd.get('offerOn'), label, pct: Math.min(90, Math.max(0, num(fd, 'offerPct'))), style: badgeFrom(fd, 'offerStyle'), endsAt: str(fd, 'offerEnds') ? new Date(str(fd, 'offerEnds') + 'T23:59:59') : null };
    await db.offer.upsert({ where: { productId: p.id }, update: offer, create: { ...offer, productId: p.id } });
  } else await db.offer.deleteMany({ where: { productId: p.id } });
  // A live product is announced to Bing/IndexNow right away, so it can show in search the same day.
  if (p.active) after(() => pingIndexNow(allLangs([`/p/${p.slug}`])));
  done();
  if (!id) redirect(`/admin/products/${p.id}?saved=1`);
}

export async function deleteProduct(fd: FormData) {
  await requireAdmin('products', 'deleteProduct');
  const id = str(fd, 'id');
  // Products with orders are hidden rather than deleted, so receipts stay intact.
  if (await db.orderLine.count({ where: { productId: id } })) await db.product.update({ where: { id }, data: { active: false } });
  else await db.product.delete({ where: { id } });
  done();
  redirect('/admin/products');
}

export async function saveCategories(fd: FormData) {
  await requireAdmin('categories', 'saveCategories');
  const ids = fd.getAll('id').map(String);
  for (const [i, id] of ids.entries()) {
    if (fd.get(`del-${i}`)) { if (!(await db.product.count({ where: { categoryId: id } }))) await db.category.delete({ where: { id } }); continue; }
    const icon = fd.get(`clearIcon-${i}`) ? '' : await keepUpload(fd.get(`icon-${i}`), 'categories');
    await db.category.update({ where: { id }, data: { name: str(fd, `name-${i}`), sort: num(fd, `sort-${i}`), ...(icon || fd.get(`clearIcon-${i}`) ? { image: icon } : {}) } });
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

// Home page collections in one place: add, rename, icon, order, delete, pick products, and how the icons move.
// A product sits in one collection: ticking it in another moves it there. Deleting a collection moves
// its products to the first collection that stays, and takes it out of the menu bar.
export async function saveHomeCollections(fd: FormData) {
  await requireAdmin('homepage', 'saveHomeCollections');
  const ids = fd.getAll('cid').map(String);
  const del = new Set(ids.filter((_, i) => fd.get(`cdel-${i}`)));
  const order = ids.filter(id => !del.has(id));
  const up = Number(fd.get('cup'));
  const ui = up > 0 ? order.indexOf(ids[up]) : -1;
  if (ui > 0) [order[ui - 1], order[ui]] = [order[ui], order[ui - 1]];
  const s = await getSettings();
  let nav = [...s.nav];
  // New collection first, so products can be ticked into it in the same save.
  const name = str(fd, 'newCat');
  let newId = '';
  if (name) {
    let slug = slugify(name);
    if (await db.category.findUnique({ where: { slug } })) slug += '-' + Date.now().toString(36).slice(-4);
    const icon = await keepUpload(fd.get('newIcon'), 'categories');
    newId = (await db.category.create({ data: { name, slug, sort: order.length, image: icon } })).id;
    order.push(newId);
    const at = nav.findIndex(n => n.to === 'track');
    nav.splice(at < 0 ? nav.length : at, 0, { label: name, to: `cat:${slug}`, show: true });
  }
  for (const [i, id] of ids.entries()) {
    if (del.has(id)) continue;
    const clear = !!fd.get(`cclear-${i}`), icon = clear ? '' : await keepUpload(fd.get(`cicon-${i}`), 'categories');
    await db.category.update({ where: { id }, data: { name: str(fd, `cname-${i}`) || undefined, sort: order.indexOf(id), ...(icon || clear ? { image: icon } : {}) } });
  }
  // Products: a product shows in every collection it is ticked in. Its main collection stays if still
  // ticked, otherwise the first ticked one. Not ticked anywhere: it keeps its main collection only.
  const ticks = new Map<string, string[]>();
  for (const [i, id] of ids.entries()) if (!del.has(id)) for (const p of fd.getAll(`cp-${i}`).map(String)) ticks.set(p, [...(ticks.get(p) || []), id]);
  if (newId) for (const p of fd.getAll('newProducts').map(String)) ticks.set(p, [...(ticks.get(p) || []), newId]);
  const fallback = order[0];
  const slugOf = new Map((await db.category.findMany({ select: { id: true, slug: true } })).map(c => [c.id, c.slug]));
  for (const p of await db.product.findMany({ select: { id: true, categoryId: true, alsoIn: true } })) {
    const t = [...new Set(ticks.get(p.id) || [])];
    const main = t.includes(p.categoryId) ? p.categoryId : t[0] || (del.has(p.categoryId) ? fallback || p.categoryId : p.categoryId);
    const alsoIn = t.filter(c => c !== main).map(c => slugOf.get(c)!).filter(Boolean);
    if (main !== p.categoryId || alsoIn.join() !== p.alsoIn.join()) await db.product.update({ where: { id: p.id }, data: { categoryId: main, alsoIn } });
  }
  if (del.size && fallback) {
    const gone = await db.category.findMany({ where: { id: { in: [...del] } } });
    for (const c of gone) if (!(await db.product.count({ where: { categoryId: c.id } }))) await db.category.delete({ where: { id: c.id } });
    nav = nav.filter(n => !gone.some(c => n.to === `cat:${c.slug}`));
  }
  await setSetting('nav', nav);
  const cs = CAT_STYLES.find(([k]) => k === str(fd, 'catStyle'))?.[0];
  if (cs) await setSetting('catStyle', cs);
  done();
}

export async function saveAd(fd: FormData) {
  await requireAdmin('ads', 'saveAd');
  const id = str(fd, 'id');
  if (fd.get('delete')) { await db.ad.delete({ where: { id } }); done(); return; }
  const old = id ? await db.ad.findUnique({ where: { id } }) : null;
  let image = old?.image || '', video = old?.video || '';
  if (fd.get('clearMedia')) image = video = '';
  const url = await keepUpload(fd.get('media'), 'ads');
  if (url) { if (isVideoUrl(url)) { video = url; image = ''; } else { image = url; video = ''; } }
  const date = (k: string) => (str(fd, k) ? new Date(str(fd, k) + (k === 'endsAt' ? 'T23:59:59' : 'T00:00:00')) : null);
  const data = { on: !!fd.get('on'), place: str(fd, 'place'), kicker: str(fd, 'kicker'), title: str(fd, 'title') || 'Untitled', text: str(fd, 'text'), cta: str(fd, 'cta'), link: str(fd, 'link'), style: str(fd, 'style') || 'dark', image, video, startsAt: date('startsAt'), endsAt: date('endsAt'), sort: num(fd, 'sort') };
  if (id) await db.ad.update({ where: { id }, data }); else await db.ad.create({ data });
  done();
}

export async function setReview(fd: FormData) {
  await requireAdmin('reviews', 'setReview');
  const id = str(fd, 'id'), to = str(fd, 'to');
  if (to === 'delete') await db.review.delete({ where: { id } });
  else await db.review.update({ where: { id }, data: { status: to === 'live' ? 'live' : 'hidden' } });
  done();
}

export async function editReview(fd: FormData) {
  await requireAdmin('reviews', 'editReview');
  const id = str(fd, 'id'), old = await db.review.findUniqueOrThrow({ where: { id } });
  const drop = new Set(fd.getAll('dropMedia').map(String));
  await db.review.update({ where: { id }, data: {
    name: str(fd, 'name').slice(0, 60) || old.name, place: str(fd, 'place').slice(0, 60), stars: Math.min(5, Math.max(1, num(fd, 'stars') || old.stars)),
    text: str(fd, 'text').slice(0, 2000) || old.text, verified: !!fd.get('verified'), status: str(fd, 'status') === 'live' ? 'live' : str(fd, 'status') === 'pending' ? 'pending' : 'hidden',
    media: old.media.filter(m => !drop.has(m)), createdAt: str(fd, 'date') ? new Date(str(fd, 'date') + 'T12:00:00Z') : old.createdAt,
  } });
  done();
}

// Stores only what differs from the built-in translation, so later built-in fixes still reach untouched text.
export async function saveTranslations(fd: FormData) {
  await requireAdmin('languages', 'saveTranslations');
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

export async function saveExpense(fd: FormData) {
  await requireAdmin('expenses', 'saveExpense');
  const amount = num(fd, 'amount');
  if (amount <= 0) throw new Error('Enter an amount');
  await db.expense.create({ data: { date: new Date(str(fd, 'date') || Date.now()), category: str(fd, 'category') || 'Other', note: str(fd, 'note').slice(0, 200), amount: amount.toFixed(2), currency: str(fd, 'currency') || 'USD' } });
}

export async function deleteExpense(fd: FormData) {
  await requireAdmin('expenses', 'deleteExpense');
  await db.expense.deleteMany({ where: { id: str(fd, 'id') } });
}
