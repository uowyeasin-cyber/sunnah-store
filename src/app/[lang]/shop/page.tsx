import { alternates } from '@/lib/seoUrls';
import { Suspense } from 'react';
import { getCategories, getDict, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import ShopBrowser from '@/components/ShopBrowser';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: 'Shop', alternates: alternates(isLang(lang) ? lang : 'en', '/shop') };
}

async function Results({ searchParams, lang }: { searchParams: Promise<{ q?: string }>; lang: Lang }) {
  const [{ q = '' }, products, s, dict, cats] = await Promise.all([searchParams, getProducts(lang), getSettings(lang), getDict(lang), getCategories(lang)]);
  const t = makeT(dict);
  const term = q.trim().toLowerCase();
  const list = term ? products.filter(p => `${p.name} ${p.sub} ${p.category.name}`.toLowerCase().includes(term)) : products;
  return <>
    <div className="sec-head"><div><div className="kicker">{t(term ? 'Search' : 'The collection')}</div><h2>{term ? t('Results for “{q}”', { q }) : t('All products')}</h2></div>
      <form action="/shop" className="shop-search" role="search"><input name="q" defaultValue={q} placeholder={t('Search')} aria-label={t('Search')} /><button className="btn sm">{t('Search')}</button></form></div>
    <ShopBrowser key={term} products={list} cats={cats.map(c => ({ slug: c.slug, name: c.name }))} brand={s.store.name} empty="Nothing matches that search yet." />
  </>;
}

export default async function Shop({ searchParams, params }: PageProps<'/[lang]/shop'>) {
  const { lang } = await params;
  return <div className="view"><section className="wrap"><Suspense fallback={<div style={{ minHeight: '60vh' }} />}><Results searchParams={searchParams as Promise<{ q?: string }>} lang={isLang(lang) ? lang : 'en'} /></Suspense></section></div>;
}
