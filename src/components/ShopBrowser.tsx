'use client';
import { useMemo, useState } from 'react';
import type { CardProduct } from '@/lib/catalog';
import { unitCents } from '@/lib/money';
import ProductCard from './ProductCard';
import { useStore } from './StoreProvider';

type Sort = 'featured' | 'low' | 'high' | 'new';

// Filters and sorting over a product list, all in the browser so it is instant.
export default function ShopBrowser({ products, cats, brand, empty }: { products: CardProduct[]; cats?: { slug: string; name: string }[]; brand?: string; empty: string }) {
  const { t } = useStore();
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<Sort>('featured');
  const [offer, setOffer] = useState(false);
  const hasOffers = products.some(p => p.offer);
  const list = useMemo(() => {
    const price = (p: CardProduct) => unitCents(p.priceCents, p.offer?.pct || 0);
    const l = products.filter(p => (!cat || p.cats.includes(cat)) && (!offer || p.offer));
    if (sort === 'low') return [...l].sort((a, b) => price(a) - price(b));
    if (sort === 'high') return [...l].sort((a, b) => price(b) - price(a));
    if (sort === 'new') return [...l].reverse();
    return l;
  }, [products, cat, sort, offer]);
  const usedCats = cats?.filter(c => products.some(p => p.cats.includes(c.slug))) || [];
  return <>
    {(usedCats.length > 1 || products.length > 1) && <div className="shop-filters">
      {usedCats.length > 1 && <div className="shop-chips" role="group" aria-label={t('Collection')}>
        <button className={!cat ? 'on' : ''} aria-pressed={!cat} onClick={() => setCat('')}>{t('All')}</button>
        {usedCats.map(c => <button key={c.slug} className={cat === c.slug ? 'on' : ''} aria-pressed={cat === c.slug} onClick={() => setCat(cat === c.slug ? '' : c.slug)}>{c.name}</button>)}
      </div>}
      <div className="filter-end">
        {hasOffers && <label className="toggle"><input type="checkbox" checked={offer} onChange={e => setOffer(e.target.checked)} />{t('On offer')}</label>}
        <label className="sort"><select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label={t('Sort by')}>
          <option value="featured">{t('Featured')}</option><option value="new">{t('Newest')}</option><option value="low">{t('Price: low to high')}</option><option value="high">{t('Price: high to low')}</option>
        </select></label>
      </div>
    </div>}
    <p className="muted count">{t(list.length === 1 ? '{n} product' : '{n} products', { n: list.length })}</p>
    {list.length ? <div className="grid" data-n={Math.min(list.length, 8)}>{list.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</div> : <p className="empty">{t(empty)}</p>}
  </>;
}
