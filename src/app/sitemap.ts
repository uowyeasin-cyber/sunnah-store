import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/catalog';

// Every public shop page, for Google and Bing. Admin, checkout, receipts and accounts are left out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  const [products, cats] = await Promise.all([getProducts(), getCategories()]);
  return [
    { url: `${site}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/shop`, changeFrequency: 'weekly', priority: 0.9 },
    ...cats.filter(c => c._count.products > 0).map(c => ({ url: `${site}/c/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...products.map(p => ({ url: `${site}/p/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
