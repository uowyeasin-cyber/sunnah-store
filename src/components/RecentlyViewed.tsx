'use client';
import { useSyncExternalStore } from 'react';
import { useStore } from './StoreProvider';
import ProductCard from './ProductCard';

const KEY = 'pm-seen';
const parse = (raw: string): string[] => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; } };
const read = (): string[] => { try { return parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const subscribe = (cb: () => void) => { addEventListener('storage', cb); return () => removeEventListener('storage', cb); };

// Remembers a product page visit on this device (newest first, up to 12).
export function rememberSeen(slug: string) {
  try { localStorage.setItem(KEY, JSON.stringify([slug, ...read().filter(s => s !== slug)].slice(0, 12))); } catch {}
}

// Products this visitor looked at before, on this device only. Hidden until there is something to show.
export default function RecentlyViewed({ skip, brand }: { skip?: string; brand?: string }) {
  const { products, t } = useStore();
  const raw = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(KEY) || '[]'; } catch { return '[]'; } }, () => '[]');
  const seen = parse(raw);
  const list = seen.filter(s => s !== skip && products[s]).slice(0, 4).map(s => products[s]);
  if (!list.length) return null;
  return <section className="wrap recent"><div className="sec-head"><div><div className="kicker">{t('For you')}</div><h2>{t('Recently')} <em>{t('viewed')}</em></h2></div></div>
    <div className="grid">{list.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</div></section>;
}
