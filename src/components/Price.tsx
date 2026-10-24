'use client';
import { unitCents } from '@/lib/money';
import { useStore } from './StoreProvider';

export default function Price({ cents, pct = 0 }: { cents: number; pct?: number }) {
  const { price } = useStore();
  const u = unitCents(cents, pct);
  return u < cents ? <><s>{price(cents)}</s>{price(u)}</> : <>{price(cents)}</>;
}
