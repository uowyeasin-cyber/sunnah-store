'use client';
import { unitCents } from '@/lib/money';
import type { CardProduct } from '@/lib/catalog';
import { useStore } from './StoreProvider';

// A product price, struck through when an offer or a live sale campaign takes money off. Pass p to include campaigns.
export default function Price({ cents, pct = 0, p }: { cents: number; pct?: number; p?: Pick<CardProduct, 'offer' | 'cats'> }) {
  const { price, pctFor } = useStore();
  const u = unitCents(cents, Math.max(pct, p ? pctFor(p) : 0));
  return u < cents ? <><s>{price(cents)}</s>{price(u)}</> : <>{price(cents)}</>;
}
