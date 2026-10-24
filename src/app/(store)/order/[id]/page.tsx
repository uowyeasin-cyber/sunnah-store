import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/catalog';
import { formatAmount, type Currency } from '@/lib/money';
import { barcodeSvg, qrSvg } from '@/lib/codes';
import { STEPS } from '@/lib/tracking';
import Timeline from '@/components/Timeline';

export const instant = false;
export const metadata = { title: 'Your receipt', robots: { index: false } };

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, s] = await Promise.all([db.order.findUnique({ where: { id }, include: { lines: true } }), getSettings()]);
  if (!o) notFound();
  const cur = o.currency as Currency;
  const f = (n: unknown) => formatAmount(Number(n), cur);
  const url = `${process.env.SITE_URL || ''}/order/${o.id}`;
  const [qr, bar] = await Promise.all([qrSvg(url || o.no), Promise.resolve(barcodeSvg(o.no))]);
  const day = (d: Date | null) => d?.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const addr = o.address as Record<string, string>;
  return (
    <div className="receipt">
      <div className="top"><div><div className="kicker">{s.store.name} · Receipt</div><h2>Thank you, {o.name.split(' ')[0]}.</h2></div><div className="num" style={{ textAlign: 'right' }}>{o.no}<br /><small>{o.createdAt.toLocaleString('en-US')}</small></div></div>
      <div className="body">
        <div className="codes"><div className="qr" dangerouslySetInnerHTML={{ __html: qr }} /><div className="bar" dangerouslySetInnerHTML={{ __html: bar }} /></div>
        <div className="kv">
          <div><span>Order number</span>{o.no}</div><div><span>Order ID</span>{o.id}</div>
          <div><span>Payment</span>{o.payMethod === 'cod' ? 'Cash on delivery' : o.payMethod.toUpperCase()} · {o.payStatus === 'paid' ? 'Paid' : o.payStatus === 'cod' ? 'Pay on delivery' : 'Awaiting payment'}</div>
          <div><span>Arrives</span>{day(o.etaFrom)} – {day(o.etaTo)}</div>
          <div><span>Courier</span>{o.courier}{o.trackingNo && ` · ${o.trackingNo}`}</div>
          <div><span>Deliver to</span>{addr.address}{addr.city && `, ${addr.city}`} {addr.zip}, {o.country}</div>
        </div>
        <div className="tear" />
        {o.lines.map(l => <div className="sum-row" key={l.id}><span>{l.qty} × {l.name}</span><span>{f(Number(l.full) * l.qty)}</span></div>)}
        {Number(o.saved) > 0 && <div className="sum-row"><span>Offers</span><span>−{f(o.saved)}</span></div>}
        <div className="sum-row"><span>Delivery</span><span>{Number(o.shipping) ? f(o.shipping) : 'Free'}</span></div>
        {Number(o.creditUsed) > 0 && <div className="sum-row"><span>Store credit</span><span>−{f(o.creditUsed)}</span></div>}
        <div className="sum-row total"><span>Total</span><span>{f(o.total)}</span></div>
        {Number(o.saved) > 0 && <div className="saved"><span>You saved</span><b>{f(o.saved)}</b></div>}
        {Number(o.rewardEarned) > 0 && <p className="earn">You earn <b>{f(o.rewardEarned)}</b> in store credit when this arrives.</p>}
        <div className="tear" />
        <h3>Tracking</h3>
        <Timeline status={o.status} events={o.events as { at: string; step: number; note: string }[]} rider={o.status >= 5 && o.riderPhone ? { name: o.riderName, phone: o.riderPhone } : null} />
        <p className="muted" style={{ fontSize: '.85rem' }}>A copy was emailed to {o.email}. Keep this page; it updates as {o.courier} moves your order ({STEPS[o.status]}).</p>
      </div>
    </div>
  );
}

export default function OrderPage({ params }: PageProps<'/order/[id]'>) {
  return <div className="wrap view"><Suspense fallback={<div style={{ minHeight: '70vh' }} />}><Receipt params={params} /></Suspense></div>;
}
