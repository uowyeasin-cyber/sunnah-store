import { Suspense } from 'react';
import { getDict, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import ProductCard from '@/components/ProductCard';

export const metadata = { title: 'Shop' };

async function Results({ searchParams, lang }: { searchParams: Promise<{ q?: string }>; lang: Lang }) {
  const [{ q = '' }, products, s, dict] = await Promise.all([searchParams, getProducts(lang), getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  const term = q.trim().toLowerCase();
  const list = term ? products.filter(p => `${p.name} ${p.sub} ${p.category.name}`.toLowerCase().includes(term)) : products;
  return <>
    <div className="sec-head"><div><div className="kicker">{t(term ? 'Search' : 'The collection')}</div><h2>{term ? t('Results for “{q}”', { q }) : t('All products')}</h2><p className="muted" style={{ marginTop: 8 }}>{t(list.length === 1 ? '{n} product' : '{n} products', { n: list.length })}</p></div></div>
    {list.length ? <div className="grid">{list.map(p => <ProductCard key={p.id} p={p} brand={s.store.name} />)}</div> : <p className="empty">{t('Nothing matches that search yet.')}</p>}
  </>;
}

export default async function Shop({ searchParams, params }: PageProps<'/[lang]/shop'>) {
  const { lang } = await params;
  return <div className="view"><section className="wrap"><Suspense fallback={<div style={{ minHeight: '60vh' }} />}><Results searchParams={searchParams as Promise<{ q?: string }>} lang={isLang(lang) ? lang : 'en'} /></Suspense></section></div>;
}
