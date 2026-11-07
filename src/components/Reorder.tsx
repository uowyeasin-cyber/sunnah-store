'use client';
import { useStore } from './StoreProvider';

// Puts the items of a past order back in the bag. Products no longer sold are skipped.
export default function Reorder({ lines }: { lines: { slug: string; qty: number }[] }) {
  const { add, open, products, t, toast } = useStore();
  const live = lines.filter(l => products[l.slug]);
  if (!live.length) return null;
  return <button type="button" className="btn ghost sm" onClick={() => { live.forEach(l => add(l.slug, l.qty)); toast(t('Added to your bag')); open('bag'); }}>{t('Order again')}</button>;
}
