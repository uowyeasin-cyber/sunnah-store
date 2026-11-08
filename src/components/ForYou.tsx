'use client';
import { useSyncExternalStore } from 'react';
import { useStore } from './StoreProvider';
import ProductCard from './ProductCard';

const sub = (cb: () => void) => { addEventListener('storage', cb); return () => removeEventListener('storage', cb); };
const snap = () => { try { return localStorage.getItem('pm-seen') || '[]'; } catch { return '[]'; } };

// One section for the visitor: what they looked at last, then picks from the same collections.
// Shown once they have seen something; recently viewed come first and are marked.
export default function ForYou({ brand }: { brand?: string }) {
  const { products, wish, bag, t } = useStore();
  const raw = useSyncExternalStore(sub, snap, () => '[]');
  let seen: string[] = [];
  try { const v = JSON.parse(raw); if (Array.isArray(v)) seen = v.filter((s: string) => products[s]); } catch {}
  if (!seen.length) return null;
  const recent = seen.slice(0, 4);
  const known = new Set([...seen, ...wish, ...bag.map(l => l.slug)]);
  const cats = new Set([...known].map(s => products[s]?.category.slug).filter(Boolean));
  const all = Object.values(products);
  const picks = [...all.filter(p => cats.has(p.category.slug) && !known.has(p.slug)), ...all.filter(p => !cats.has(p.category.slug) && !known.has(p.slug))].slice(0, 8 - recent.length);
  const list = [...recent.map(s => products[s]), ...picks];
  return <section className="wrap for-you">
    <div className="sec-head"><div><div className="kicker">{t('For you')}</div><h2>{t('Recently viewed')} <em>{t('& picked for you')}</em></h2></div></div>
    <div className="grid" data-n={Math.min(list.length, 8)}>{list.map(p => <div key={p.id} className="fy-item">{recent.includes(p.slug) && <span className="fy-tag">{t('Viewed')}</span>}<ProductCard p={p} brand={brand} /></div>)}</div>
  </section>;
}
