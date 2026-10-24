import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import { COUNTRIES } from '@/lib/shipping';
import { bookerFor, loadKeys } from '@/lib/couriers';
import { bookCourier, deleteOrder, editOrder, refundOrder, saveOrder } from '../../orderActions';

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export default async function OrderAdmin({ params }: PageProps<'/admin/orders/[id]'>) {
  if (!(await adminOrNull())) return null;
  const { id } = await params;
  const [o, products] = await Promise.all([db.order.findUnique({ where: { id }, include: { lines: true, customer: true } }), db.product.findMany({ orderBy: { sort: 'asc' }, select: { id: true, name: true, sub: true, kind: true } })]);
  if (!o) return <p>Order not found.</p>;
  await loadKeys();
  const booker = bookerFor({ warehouse: o.warehouse, courier: o.courier, cod: o.payStatus === 'cod' });
  const f = (n: unknown) => formatAmount(Number(n), o.currency as Currency);
  const addr = o.address as Record<string, string>;
  const fld = (name: string, label: string, value: string, type = 'text') => <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} step={type === 'number' ? 'any' : undefined} defaultValue={value} /></div>;
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
    {(() => { const notes = (o.events as { at: string; step: number; note: string }[]).filter(e => e.step === -1); return notes.length > 0 && <div className="panel"><div className="kicker">Notes</div>{notes.map((e, i) => <p key={i} style={{ fontSize: '.88rem' }} className={/failed/.test(e.note) ? 'err' : 'muted'}>{new Date(e.at).toLocaleString('en-GB')}: {e.note}</p>)}</div>; })()}
    {o.labelUrl && <a className="btn ghost" href={o.labelUrl} target="_blank" rel="noreferrer">Print shipping label</a>}
    <form action={saveOrder} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="id" value={o.id} />
      <div className="kicker">Delivery (manual override)</div>
      <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={o.status}>{STEPS.map((s, k) => <option key={s} value={k}>{s}</option>)}</select></div>
      <div className="field"><label htmlFor="payStatus">Payment status</label><select id="payStatus" name="payStatus" defaultValue={o.payStatus}>{['pending', 'paid', 'cod', 'failed', 'refunded', 'cancelled'].map(p => <option key={p}>{p}</option>)}</select></div>
      <div className="two">{fld('courier', 'Courier', o.courier)}{fld('trackingNo', 'Tracking number', o.trackingNo)}</div>
      <div className="two">{fld('riderName', 'Rider name', o.riderName)}{fld('riderPhone', 'Rider phone', o.riderPhone, 'tel')}</div>
      <div className="two">{fld('etaFrom', 'Arrives from', iso(o.etaFrom), 'date')}{fld('etaTo', 'Arrives by', iso(o.etaTo), 'date')}</div>
      <button className="btn">Save order</button>
    </form>
    {!o.trackingNo && (o.payStatus === 'paid' || o.payStatus === 'cod') && <form action={bookCourier} className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <input type="hidden" name="id" value={o.id} /><span className="muted" style={{ fontSize: '.9rem' }}>{booker ? `Not booked yet. ${booker.name} can book it now.` : `Book with ${o.courier} in their app, then add the tracking number above. Tracking then updates on its own. To book from here, connect the courier in Connections.`}</span>
      {booker && <button className="btn sm">Book with {booker.name}</button>}
    </form>}
    <form action={editOrder} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="id" value={o.id} />
      <div className="kicker">Edit customer and items</div>
      <div className="two">{fld('name', 'Name', o.name)}{fld('phone', 'Phone', o.phone, 'tel')}</div>
      <div className="two">{fld('email', 'Email', o.email, 'email')}<div className="field"><label htmlFor="country">Country</label><select id="country" name="country" defaultValue={o.country}>{[...new Set([o.country, ...COUNTRIES])].map(c => <option key={c}>{c}</option>)}</select></div></div>
      {fld('address', 'Address', addr.address || '')}
      <div className="two">{fld('city', 'City', addr.city || '')}{fld('zip', 'Postcode', addr.zip || '')}</div>
      <table><thead><tr><th>Item</th><th className="num">Qty (0 removes)</th><th className="num">Price each ({o.currency})</th></tr></thead>
        <tbody>{o.lines.map(l => <tr key={l.id}><td>{l.name}</td><td><input name={`qty-${l.id}`} type="number" min="0" defaultValue={l.qty} aria-label={`Quantity of ${l.name}`} /></td><td><input name={`unit-${l.id}`} type="number" step="0.01" min="0" defaultValue={Number(l.unit)} aria-label={`Price of ${l.name}`} /></td></tr>)}
          <tr><td><select name="addProduct" aria-label="Add a product" defaultValue=""><option value="">+ Add a product…</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}{p.kind === 'pen' ? ' · ' + p.sub : ''}</option>)}</select></td><td><input name="addQty" type="number" min="0" defaultValue={1} aria-label="Quantity to add" /></td><td className="muted">store price</td></tr></tbody></table>
      <div className="two">{fld('shipping', `Delivery charge (${o.currency})`, String(Number(o.shipping)), 'number')}<div /></div>
      <button className="btn">Save changes</button>
    </form>
    {o.customerId && <form action={refundOrder} className="panel" style={{ display: 'grid', gap: 14 }}>
      <input type="hidden" name="id" value={o.id} />
      <div className="kicker">Refund as store credit</div>
      <p className="muted" style={{ fontSize: '.85rem' }}>Customer credit now: {formatAmount(Number(o.customer!.credit), o.customer!.currency as Currency)}. The amount is in {o.currency} and converts to the customer&apos;s credit currency.</p>
      <div className="two">{fld('amount', `Amount (${o.currency})`, String(Number(o.total) + Number(o.creditUsed)), 'number')}{fld('reason', 'Reason (optional)', '')}</div>
      <button className="btn ghost">Refund to credit</button>
    </form>}
    <form action={deleteOrder} className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <input type="hidden" name="id" value={o.id} />
      <label style={{ fontSize: '.9rem' }}><input type="checkbox" name="sure" value="yes" required /> Delete this order for good (test or fake orders). To keep a record, set Payment status to “cancelled” instead.</label>
      <button className="btn ghost" style={{ color: '#c0503f' }}>Delete order</button>
    </form>
  </>;
}
