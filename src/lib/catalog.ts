import { cacheLife, cacheTag } from 'next/cache';
import { db } from './db';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { dictFor, makeT, type Lang } from './i18n';

// Storefront reads. Cached and tagged "catalog"; admin changes call updateTag('catalog').
// Passing a language returns shop text translated (English when no translation exists).

async function rawSettings(): Promise<Settings> {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const rows = await db.setting.findMany();
  const s = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const r of rows) s[r.key] = r.value;
  return s as Settings;
}

export async function getDict(lang: Lang) {
  return dictFor(lang, (await rawSettings()).translations);
}
const tFor = async (lang: Lang) => makeT(await getDict(lang));

export async function getSettings(lang: Lang = 'en'): Promise<Settings> {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const s = await rawSettings();
  if (lang === 'en') return s;
  const t = await tFor(lang);
  return { ...s, store: { ...s.store, announce: t(s.store.announce), tagline: t(s.store.tagline) }, nav: s.nav.map(n => ({ ...n, label: t(n.label) })),
    slides: s.slides.map(x => ({ ...x, eyebrow: t(x.eyebrow), title: t(x.title), italic: t(x.italic), text: t(x.text), cta: t(x.cta) })) };
}

const productInclude = { category: true, offer: true } as const;

export async function getCategories(lang: Lang = 'en') {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const t = await tFor(lang);
  const list = await db.category.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { products: { where: { active: true } } } } } });
  return list.map(c => ({ ...c, name: t(c.name) }));
}

export async function getProducts(lang: Lang = 'en') {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const t = await tFor(lang);
  const list = await db.product.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: productInclude });
  return list.map(p => toCard(p, t));
}

export async function getProduct(slug: string, lang: Lang = 'en') {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const t = await tFor(lang);
  const p = await db.product.findUnique({ where: { slug }, include: productInclude });
  return p && p.active ? { ...toCard(p, t), details: t(p.details), stock: p.stock as Record<string, number> } : null;
}

export async function getAds(lang: Lang = 'en') {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');
  const t = await tFor(lang);
  const now = new Date();
  const list = await db.ad.findMany({ where: { on: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { sort: 'asc' } });
  return list.map(a => ({ ...a, kicker: t(a.kicker), title: t(a.title), text: t(a.text), cta: t(a.cta) }));
}

export async function getLiveReviews(productId?: string) {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');
  return db.review.findMany({ where: { status: 'live', ...(productId ? { productId } : {}) }, orderBy: { createdAt: 'desc' }, take: 12 });
}

type Row = Awaited<ReturnType<typeof db.product.findMany<{ include: typeof productInclude }>>>[number];
export type CardProduct = ReturnType<typeof toCard>;
function toCard(p: Row, t: (s: string) => string = s => s) {
  const o = p.offer && p.offer.on && (!p.offer.endsAt || p.offer.endsAt > new Date()) ? p.offer : null;
  return {
    id: p.id, slug: p.slug, name: t(p.name), sub: t(p.sub), kind: p.kind, finish: p.finish, swatch: p.swatch,
    image: p.images[0] || '', images: p.images, video: p.video, priceCents: p.priceCents,
    category: { slug: p.category.slug, name: t(p.category.name) },
    offer: o ? { label: t(o.label), pct: o.pct, style: o.style, endsAt: o.endsAt?.toISOString() || null } : null,
  };
}
