import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import { bookCourier, refundOrder, saveOrder } from '../../orderActions';

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function OrderAdmin({ params }: PageProps<'/admin/orders/[id]'>) {
  if (!(await adminOrNull())) return null;
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: { lines: true, customer: true } });
  if (!o) return <p>Order not found.</p>;
  const f = (n: unknown) => formatAmount(Number(n), o.currency as Currency);
  const addr = o.address as Record<string, string>;
  const fld = (name: string, label: string, value: string, type = 'text') => <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} defaultValue={value} /></div>;
  return <>
    <div><Link href="/admin/orders" className="muted">← Orders</Link><div className="kicker">Order</div><h2 style={{ fontSize: '2rem' }}>{o.no}</h2><Link href={`/order/${o.id}`} target="_blank">Open customer receipt</Link></div>
    <div className="panel">
      <p><b>{o.name}</b> · {o.email} · {o.phone}<br />{addr.address}{addr.city && `, ${addr.city}`} {addr.zip}, {o.country}</p>
      {o.lines.map(l => <div className="sum-row" key={l.id}><span>{l.qty} × {l.name}</span><span>{f(Number(l.unit) * l.qty)}</span></div>)}
      <div className="sum-row"><span>Delivery</span><span>{f(o.shipping)}</span></div>
      {Number(o.creditUsed) > 0 && <div className="sum-row"><span>Credit used</span><span>−{f(o.creditUsed)}</span></div>}
      <div className="sum-row total"><span>Total</span><span>{f(o.total)}</span></div>
      <p className="muted" style={{ fontSize: '.85rem' }}>Reward credit on delivery: {f(o.rewardEarned)} · Payment: {o.payMethod.replace(/^m-/, '').toUpperCase()} ({o.payStatus}){o.payRef && o.payMethod.startsWith('m-') ? ` · Transaction ID: ${o.payRef}` : ''}{o.source ? ` · Came from: ${o.source}` : ''}</p>
    </div>
    <form action={saveOrder} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="id" value={o.id} />
      <div className="kicker">Delivery (manual override)</div>
      <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={o.status}>{STEPS.map((s, k) => <option key={s} value={k}>{s}</option>)}</select></div>
      <div className="field"><label htmlFor="payStatus">Payment status</label><select id="payStatus" name="payStatus" defaultValue={o.payStatus}>{['pending', 'paid', 'cod', 'failed', 'refunded'].map(p => <option key={p}>{p}</option>)}</select></div>
      <div className="two">{fld('courier', 'Courier', o.courier)}{fld('trackingNo', 'Tracking number', o.trackingNo)}</div>
      <div className="two">{fld('riderName', 'Rider name', o.riderName)}{fld('riderPhone', 'Rider phone', o.riderPhone, 'tel')}</div>
      <div className="two">{fld('etaFrom', 'Arrives from', iso(o.etaFrom), 'date')}{fld('etaTo', 'Arrives by', iso(o.etaTo), 'date')}</div>
      <button className="btn">Save order</button>
    </form>
    {!o.trackingNo && (o.payStatus === 'paid' || o.payStatus === 'cod') && <form action={bookCourier} className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <input type="hidden" name="id" value={o.id} /><span className="muted" style={{ fontSize: '.9rem' }}>{o.country === 'Bangladesh' ? 'Not booked with Steadfast yet.' : `Book with ${o.courier} on their site, then add the tracking number above. Tracking then updates on its own.`}</span>
      {o.country === 'Bangladesh' && <button className="btn sm">Send to Steadfast</button>}
    </form>}
    {o.customerId && <form action={refundOrder} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="id" value={o.id} />
      <div className="kicker">Refund as store credit</div>
      <p className="muted" style={{ fontSize: '.85rem' }}>Customer credit now: {formatAmount(Number(o.customer!.credit), o.customer!.currency as Currency)}. The amount is in {o.currency} and converts to the customer&apos;s credit currency.</p>
      <div className="two">{fld('amount', `Amount (${o.currency})`, String(Number(o.total) + Number(o.creditUsed)), 'number')}{fld('reason', 'Reason (optional)', '')}</div>
      <button className="btn ghost">Refund to credit</button>
    </form>}
  </>;
}
