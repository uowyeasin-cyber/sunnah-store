import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { db } from './db';

// Site SEO, search-engine verification and ad pixels, edited in Admin → SEO & ads.
export type Pixels = { meta: string; ga4: string; gads: string; gadsLabel: string; tiktok: string; snap: string; pinterest: string };
export type Seo = {
  title: string; description: string; keywords: string; ogImage: string;
  verify: { google: string; bing: string; yandex: string; pinterest: string; facebook: string };
  pixels: Pixels;
  products: Record<string, { title: string; description: string }>;
};
export const SEO_DEFAULT: Seo = {
  title: '', description: '', keywords: '', ogImage: '',
  verify: { google: '', bing: '', yandex: '', pinterest: '', facebook: '' },
  pixels: { meta: '', ga4: '', gads: '', gadsLabel: '', tiktok: '', snap: '', pinterest: '' },
  products: {},
};
export const SEO_KEY = 'seo';

export async function rawSeo(): Promise<Seo> {
  const r = await db.setting.findUnique({ where: { key: SEO_KEY } });
  const v = (r?.value || {}) as Partial<Seo>;
  return { ...SEO_DEFAULT, ...v, verify: { ...SEO_DEFAULT.verify, ...(v.verify || {}) }, pixels: { ...SEO_DEFAULT.pixels, ...(v.pixels || {}) }, products: v.products || {} };
}
export async function getSeo(): Promise<Seo> {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  return rawSeo();
}
export async function saveSeo(s: Seo) {
  await db.setting.upsert({ where: { key: SEO_KEY }, update: { value: s }, create: { key: SEO_KEY, value: s } });
}

// Only letters, numbers and - _ . : survive, so a pasted ID can never inject a script.
export const cleanId = (v: unknown) => String(v || '').trim().replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 80);
