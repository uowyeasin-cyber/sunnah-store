import { Suspense } from 'react';
import { getProducts, getSettings } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';

export const metadata = { title: 'Shop' };

async function Results({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = '' }, products, s] = await Promise.all([searchParams, getProducts(), getSettings()]);
  const t = q.trim().toLowerCase();
  const list = t ? products.filter(p => `${p.name} ${p.sub} ${p.category.name}`.toLowerCase().includes(t)) : products;
  return <>
    <div className="sec-head"><div><div className="kicker">{t ? 'Search' : 'The collection'}</div><h2>{t ? `Results for “${q}”` : 'All products'}</h2><p className="muted" style={{ marginTop: 8 }}>{list.length} {list.length === 1 ? 'product' : 'products'}</p></div></div>
    {list.length ? <div className="grid">{list.map(p => <ProductCard key={p.id} p={p} brand={s.store.name} />)}</div> : <p className="empty">Nothing matches that search yet.</p>}
  </>;
}

export default function Shop({ searchParams }: PageProps<'/shop'>) {
  return <div className="view"><section className="wrap"><Suspense fallback={<div style={{ minHeight: '60vh' }} />}><Results searchParams={searchParams as Promise<{ q?: string }>} /></Suspense></section></div>;
}
