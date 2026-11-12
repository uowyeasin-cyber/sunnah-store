import { alternates } from '@/lib/seoUrls';
import { notFound } from 'next/navigation';
import { getAds, getCategories, getDict, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import ShopBrowser from '@/components/ShopBrowser';
import { AdSlot } from '@/components/Ads';
import NetAds from '@/components/NetAds';

// New products and categories added in admin render on first visit, then stay cached.
export const instant = false;

export async function generateStaticParams() {
  return (await getCategories()).map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/c/[slug]'>) {
  const { slug, lang } = await params;
  const L: Lang = isLang(lang) ? lang : 'en';
  const [cats, products, { store }] = await Promise.all([getCategories(L), getProducts(L), getSettings(L)]);
  const c = cats.find(c => c.slug === slug);
  if (!c) return {};
  const names = products.filter(p => p.cats.includes(slug)).slice(0, 4).map(p => p.name).join(', ');
  return { title: c.name, description: `${c.name} · ${store.name}${names ? `: ${names}` : ''}${store.tagline ? `. ${store.tagline}` : ''}`.slice(0, 160),
    alternates: alternates(L, `/c/${slug}`) };
}

export default async function CategoryPage({ params }: PageProps<'/[lang]/c/[slug]'>) {
  const { slug, lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [cats, products, ads, s, dict] = await Promise.all([getCategories(lang), getProducts(lang), getAds(lang), getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  const cat = cats.find(c => c.slug === slug);
  if (!cat) notFound();
  const list = products.filter(p => p.cats.includes(slug));
  return (
    <div className="view"><section className="wrap">
      <div className="sec-head"><div><div className="kicker">{t('Collection')}</div><h2>{cat.name}</h2></div></div>
      <AdSlot ads={ads} place="category" products={products} brand={s.store.name} wrap={false} />
      <NetAds place="category" wrap={false} />
      <ShopBrowser products={list} brand={s.store.name} empty="New pieces are coming to this collection soon." />
    </section></div>
  );
}
