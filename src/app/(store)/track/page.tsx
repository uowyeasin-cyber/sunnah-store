import Link from 'next/link';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { currentCustomer } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import TrackForm from '@/components/TrackForm';

export const metadata = { title: 'Track order' };

// Signed-in customers also see their orders and store credit history here.
async function Mine() {
  const c = await currentCustomer();
  if (!c) return <p className="muted" style={{ fontSize: '.9rem' }}>Signed in? Your orders and store credit show here. Sign in from the account icon.</p>;
  const [orders, ledger] = await Promise.all([
    db.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.creditEntry.findMany({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const cur = c.currency as Currency;
  return <>
    <section className="panel"><div className="kicker">Your orders</div>
      {orders.length ? orders.map(o => <div className="sum-row" key={o.id}><Link href={`/order/${o.id}`}>{o.no}</Link><span>{STEPS[o.status]}</span><span>{formatAmount(Number(o.total), o.currency as Currency)}</span></div>) : <p className="muted">No orders yet.</p>}
    </section>
    <section className="panel"><div className="kicker">Store credit</div><h3 style={{ margin: '6px 0 12px' }}>{formatAmount(Number(c.credit), cur)}</h3>
      {ledger.map(e => <div className="sum-row" key={e.id}><span>{e.note}<br /><small className="muted">{e.createdAt.toLocaleDateString('en-US')}</small></span><span>{Number(e.amount) > 0 ? '+' : '−'}{formatAmount(Math.abs(Number(e.amount)), cur)}</span></div>)}
    </section>
  </>;
}

export default function Track() {
  return <div className="wrap view" style={{ display: 'grid', gap: 24, maxWidth: 640, margin: '48px auto' }}>
    <section className="panel"><div className="kicker">Orders</div><h2>Track your order</h2><TrackForm /></section>
    <Suspense fallback={null}><Mine /></Suspense>
  </div>;
}
