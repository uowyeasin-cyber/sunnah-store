'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from './StoreProvider';

// /bag?i=slug*2,other*1 (from the abandoned-bag email) puts those items back in the bag and goes to checkout.
export default function BagRestore() {
  const { add, products, t } = useStore();
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const items = new URLSearchParams(location.search).get('i') || '';
    for (const part of items.split(',')) {
      const [slug, n] = part.split('*');
      if (slug && products[slug]) add(slug, Math.min(99, Math.max(1, Number(n) || 1)));
    }
    router.replace('/checkout');
  }, [add, products, router]);
  return <main className="wrap" style={{ padding: '80px 16px', textAlign: 'center' }}><p className="muted">{t('Getting your bag ready…')}</p></main>;
}
