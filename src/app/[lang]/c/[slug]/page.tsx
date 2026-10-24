import { notFound } from 'next/navigation';
import { getAds, getCategories, getDict, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import ProductCard from '@/components/ProductCard';
import { AdSlot } from '@/components/Ads';

// New products and categories added in admin render on first visit, then stay cached.
export const instant = false;

export async function generateStaticParams() {
  return (await getCategories()).map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/c/[slug]'>) {
  const { slug, lang } = await params;
  return { title: (await getCategories(isLang(lang) ? lang : 'en')).find(c => c.slug === slug)?.name };
}

export default async function CategoryPage({ params }: PageProps<'/[lang]/c/[slug]'>) {
  const { slug, lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [cats, products, ads, s, dict] = await Promise.all([getCategories(lang), getProducts(lang), getAds(lang), getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  const cat = cats.find(c => c.slug === slug);
  if (!cat) notFound();
  const list = products.filter(p => p.category.slug === slug);
  return (
    <div className="view"><section className="wrap">
      <div className="sec-head"><div><div className="kicker">{t('Collection')}</div><h2>{cat.name}</h2><p className="muted" style={{ marginTop: 8 }}>{t(list.length === 1 ? '{n} product' : '{n} products', { n: list.length })}</p></div></div>
      <AdSlot ads={ads} place="category" products={products} brand={s.store.name} wrap={false} />
      {list.length ? <div className="grid">{list.map(p => <ProductCard key={p.id} p={p} brand={s.store.name} />)}</div> : <p className="empty">{t('New pieces are coming to this collection soon.')}</p>}
    </section></div>
  );
}
