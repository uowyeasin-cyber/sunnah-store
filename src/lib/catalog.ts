import { cacheLife, cacheTag } from 'next/cache';
import { db } from './db';
import { DEFAULT_SETTINGS, type Settings } from './settings';

// Storefront reads. Cached and tagged "catalog"; admin changes call updateTag('catalog').

export async function getSettings(): Promise<Settings> {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const rows = await db.setting.findMany();
  const s = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const r of rows) s[r.key] = r.value;
  return s as Settings;
}

const productInclude = { category: true, offer: true } as const;

export async function getCategories() {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  return db.category.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { products: { where: { active: true } } } } } });
}

export async function getProducts() {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const list = await db.product.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: productInclude });
  return list.map(toCard);
}

export async function getProduct(slug: string) {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const p = await db.product.findUnique({ where: { slug }, include: productInclude });
  return p && p.active ? { ...toCard(p), details: p.details, stock: p.stock as Record<string, number> } : null;
}

export async function getAds() {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');
  const now = new Date();
  return db.ad.findMany({ where: { on: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { sort: 'asc' } });
}

export async function getLiveReviews(productId?: string) {
  'use cache';
  cacheTag('catalog');
  cacheLife('hours');
  return db.review.findMany({ where: { status: 'live', ...(productId ? { productId } : {}) }, orderBy: { createdAt: 'desc' }, take: 12 });
}

type Row = Awaited<ReturnType<typeof db.product.findMany<{ include: typeof productInclude }>>>[number];
export type CardProduct = ReturnType<typeof toCard>;
function toCard(p: Row) {
  const o = p.offer && p.offer.on && (!p.offer.endsAt || p.offer.endsAt > new Date()) ? p.offer : null;
  return {
    id: p.id, slug: p.slug, name: p.name, sub: p.sub, kind: p.kind, finish: p.finish, swatch: p.swatch,
    image: p.images[0] || '', images: p.images, video: p.video, priceCents: p.priceCents,
    category: { slug: p.category.slug, name: p.category.name },
    offer: o ? { label: o.label, pct: o.pct, style: o.style, endsAt: o.endsAt?.toISOString() || null } : null,
  };
}
