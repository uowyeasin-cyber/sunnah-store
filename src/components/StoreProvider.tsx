'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatPrice, isCurrency, type Currency, type Rates } from '@/lib/money';
import type { CardProduct } from '@/lib/catalog';
import { makeT, type Dict, type Lang, type T } from '@/lib/i18n';

type Line = { slug: string; qty: number; off?: boolean }; // off: left in the bag but not in this checkout
type Drawer = null | 'bag' | 'wish' | 'account';
type Me = { email: string; admin: boolean } | null;
type Store = {
  me: Me; refreshMe: () => void;
  products: Record<string, CardProduct>;
  bag: Line[]; wish: string[]; cur: Currency; rates: Rates; drawer: Drawer;
  add: (slug: string, qty?: number) => void; setQty: (slug: string, qty: number) => void;
  toggleWish: (slug: string) => void; pick: (slug: string, on: boolean) => void; setCur: (c: Currency) => void; open: (d: Drawer) => void;
  price: (usdCents: number) => string; toast: (msg: string) => void; message: string;
  lang: Lang; t: T;
  pre: string; // pre-order shipping note, empty when selling from stock
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx) as Store;

const read = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function StoreProvider({ products, rates, lang, dict, pre = '', children }: { products: CardProduct[]; rates: Rates; lang: Lang; dict: Dict; pre?: string; children: React.ReactNode }) {
  const t = useMemo(() => makeT(dict), [dict]);
  const [bag, setBag] = useState<Line[]>([]);
  const [wish, setWish] = useState<string[]>([]);
  const [cur, setCurState] = useState<Currency>('USD');
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [message, setMessage] = useState('');
  const [me, setMe] = useState<Me>(null);
  const refreshMe = useCallback(() => { fetch('/api/me').then(r => r.json()).then(setMe).catch(() => {}); }, []);
  useEffect(refreshMe, [refreshMe]);

  // Restore after hydration so server and first client render match.
  useEffect(() => {
    setBag(read('pm-bag', [])); setWish(read('pm-wish', []));
    const c = read('pm-cur', '');
    if (isCurrency(c)) setCurState(c);
    else { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; setCurState(tz === 'Asia/Dhaka' ? 'BDT' : tz === 'Asia/Kuala_Lumpur' ? 'MYR' : 'USD'); }
  }, []);

  const byslug = useMemo(() => Object.fromEntries(products.map(p => [p.slug, p])), [products]);
  const toast = useCallback((m: string) => { setMessage(m); setTimeout(() => setMessage(x => (x === m ? '' : x)), 2400); }, []);
  const setQty = useCallback((slug: string, qty: number) => setBag(b => { const next = qty > 0 ? (b.some(l => l.slug === slug) ? b.map(l => (l.slug === slug ? { ...l, qty } : l)) : [...b, { slug, qty }]) : b.filter(l => l.slug !== slug); write('pm-bag', next); return next; }), []);
  const add = useCallback((slug: string, qty = 1) => setBag(b => { const l = b.find(x => x.slug === slug); const next = l ? b.map(x => (x.slug === slug ? { ...x, qty: x.qty + qty } : x)) : [...b, { slug, qty }]; write('pm-bag', next); return next; }), []);
  const pick = useCallback((slug: string, on: boolean) => setBag(b => { const next = b.map(l => (l.slug === slug ? { ...l, off: !on } : l)); write('pm-bag', next); return next; }), []);
  const toggleWish = useCallback((slug: string) => setWish(w => { const next = w.includes(slug) ? w.filter(x => x !== slug) : [...w, slug]; write('pm-wish', next); return next; }), []);
  const setCur = useCallback((c: Currency) => { setCurState(c); write('pm-cur', c); }, []);
  const price = useCallback((c: number) => formatPrice(c, cur, rates), [cur, rates]);

  const value = { me, refreshMe, products: byslug, bag: bag.filter(l => byslug[l.slug]), wish: wish.filter(s => byslug[s]), cur, rates, drawer, add, setQty, toggleWish, pick, setCur, open: setDrawer, price, toast, message, lang, t, pre };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
