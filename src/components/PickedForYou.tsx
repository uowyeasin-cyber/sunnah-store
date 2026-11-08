'use client';
import { useSyncExternalStore } from 'react';
import { useStore } from './StoreProvider';
import ProductCard from './ProductCard';

const sub = (cb: () => void) => { addEventListener('storage', cb); return () => removeEventListener('storage', cb); };
const snap = () => { try { return localStorage.getItem('pm-seen') || '[]'; } catch { return '[]'; } };

// Suggestions from the collections this visitor looked at or saved, leaving out what they have already seen.
export default function PickedForYou({ brand }: { brand?: string }) {
  const { products, wish, bag, t } = useStore();
  const raw = useSyncExternalStore(sub, snap, () => '[]');
  let seen: string[] = [];
  try { const v = JSON.parse(raw); if (Array.isArray(v)) seen = v; } catch {}
  const known = new Set([...seen, ...wish, ...bag.map(l => l.slug)]);
  const cats = new Set([...known].map(s => products[s]?.category.slug).filter(Boolean));
  if (!cats.size) return null;
  const list = Object.values(products).filter(p => cats.has(p.category.slug) && !known.has(p.slug)).slice(0, 4);
  if (!list.length) return null;
  return <section className="wrap recent"><div className="sec-head"><div><div className="kicker">{t('Based on what you liked')}</div><h2>{t('Picked')} <em>{t('for you')}</em></h2></div></div>
    <div className="grid" data-n={Math.min(list.length, 8)}>{list.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</div></section>;
}
