import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/catalog';
import { alternates, langPath, siteUrl } from '@/lib/seoUrls';

// Every public shop page in all four languages, for Google and Bing. Admin, checkout, receipts and accounts are left out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, cats] = await Promise.all([getProducts(), getCategories()]);
  const page = (path: string, changeFrequency: 'weekly' | 'monthly' | 'yearly', priority: number, images?: string[]) =>
    ({ url: siteUrl() + langPath('en', path), changeFrequency, priority, alternates: { languages: alternates('en', path).languages }, ...(images?.length ? { images } : {}) });
  const abs = (u: string) => (u.startsWith('/') ? siteUrl() + u : u);
  return [
    page('/', 'weekly', 1),
    page('/shop', 'weekly', 0.9),
    ...products.map(p => page(`/p/${p.slug}`, 'weekly', 0.8, p.images.slice(0, 5).map(abs))),
    ...cats.filter(c => c._count.products > 0).map(c => page(`/c/${c.slug}`, 'weekly', 0.7)),
    page('/help', 'monthly', 0.4),
    page('/privacy', 'yearly', 0.2),
    page('/terms', 'yearly', 0.2),
  ];
}
