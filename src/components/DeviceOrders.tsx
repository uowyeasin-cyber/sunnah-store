'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { deviceOrders } from '@/app/actions';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import { useStore } from './StoreProvider';

type O = Awaited<ReturnType<typeof deviceOrders>>[number];

// Orders placed or opened on this device: tap one to see its live tracking.
export default function DeviceOrders() {
  const { t } = useStore();
  const [list, setList] = useState<O[] | null>(null);
  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem('pm-orders') || '[]'); } catch {}
    if (ids.length) deviceOrders(ids).then(setList).catch(() => setList([])); else setList([]);
  }, []);
  if (!list?.length) return null;
  return <section className="panel"><div className="kicker">{t('Your orders')}</div>
    <div className="my-orders">{list.map(o => <Link key={o.id} href={`/order/${o.id}`} className="my-order">
      <div><b>{o.no}</b><small className="muted">{new Date(o.at).toLocaleDateString()} · {o.items}</small></div>
      <div className="mo-step"><span>{t(STEPS[o.status])}</span><i><em style={{ width: `${(o.status / (STEPS.length - 1)) * 100}%` }} /></i></div>
      <div className="num">{formatAmount(o.total, o.currency as Currency)} <span aria-hidden="true">→</span></div>
    </Link>)}</div>
  </section>;
}
