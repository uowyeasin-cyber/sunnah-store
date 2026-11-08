import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import { bulkOrders } from '../orderActions';
import { BulkBar, TickAll } from './Bulk';
import { fakeRisk, RISKY } from '@/lib/risk';

// Tabs follow what the admin has to do next with each order.
const TABS: { id: string; label: string; where: Prisma.OrderWhereInput }[] = [
  { id: 'all', label: 'All', where: {} },
  // Filtered again below by the risk score; only orders not yet with a courier.
  { id: 'fake', label: 'Possible fake', where: { status: { lte: 1 }, payStatus: { notIn: ['refunded', 'failed'] } } },
  { id: 'confirming', label: 'Confirming', where: { payStatus: 'pending', payRef: { not: '' } } },
  { id: 'unpaid', label: 'Unpaid', where: { payStatus: 'pending', payRef: '' } },
  { id: 'preparing', label: 'Preparing to ship', where: { status: { lte: 1 }, payStatus: { in: ['paid', 'cod'] } } },
  { id: 'delivering', label: 'Delivering', where: { status: { gte: 2, lte: STEPS.length - 2 }, payStatus: { notIn: ['refunded', 'failed'] } } },
  { id: 'delivered', label: 'Delivered', where: { status: STEPS.length - 1, payStatus: { notIn: ['refunded', 'failed'] } } },
  { id: 'cancelled', label: 'Cancelled', where: { payStatus: { in: ['refunded', 'failed'] } } },
];
const SORTS: Record<string, Prisma.OrderOrderByWithRelationInput> = { new: { createdAt: 'desc' }, old: { createdAt: 'asc' }, high: { total: 'desc' }, low: { total: 'asc' } };
const PAY: Record<string, string> = { pending: 'Unpaid', paid: 'Paid', cod: 'Cash on delivery', failed: 'Failed', refunded: 'Refunded' };

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await adminOrNull('orders'))) return null;
  const sp = await searchParams;
  const tab = TABS.find(t => t.id === sp.tab) || TABS[0], q = (sp.q || '').trim(), sort = SORTS[sp.sort || ''] ? sp.sort! : 'new';
  const search: Prisma.OrderWhereInput = q ? { OR: ['no', 'name', 'email', 'phone', 'trackingNo'].map(k => ({ [k]: { contains: q, mode: 'insensitive' } })) } : {};
  const [found, counts, open] = await Promise.all([
    db.order.findMany({ where: { AND: [tab.where, search] }, orderBy: SORTS[sort], take: 300, include: { lines: { select: { name: true, qty: true } } } }),
    Promise.all(TABS.map(t => db.order.count({ where: t.where }))),
    db.order.findMany({ where: TABS[1].where, take: 300, orderBy: { createdAt: 'desc' }, select: { id: true, phone: true, payStatus: true, payMethod: true, name: true, email: true, address: true, total: true, currency: true, customerId: true } }),
  ]);
  // Risk needs past cancelled orders per phone and the usual order size per currency.
  const phones = [...new Set([...found, ...open].map(o => o.phone))];
  const [bad, avgs, firsts] = await Promise.all([
    db.order.groupBy({ by: ['phone'], where: { phone: { in: phones }, payStatus: { in: ['failed', 'refunded'] } }, _count: true }),
    db.order.groupBy({ by: ['currency'], _avg: { total: true } }),
    db.order.groupBy({ by: ['phone'], where: { phone: { in: phones } }, _count: true }),
  ]);
  const risk = (o: (typeof open)[number]) => fakeRisk({ ...o, total: Number(o.total), avg: Number(avgs.find(a => a.currency === o.currency)?._avg.total || 0), failedBefore: bad.find(b => b.phone === o.phone)?._count || 0, firstOrder: (firsts.find(f => f.phone === o.phone)?._count || 0) <= 1 });
  const fakeIds = new Set(open.filter(o => risk(o).score >= RISKY).map(o => o.id));
  counts[1] = fakeIds.size;
  const list = tab.id === 'fake' ? found.filter(o => fakeIds.has(o.id)) : found;
  const link = (o: Record<string, string>) => '/admin/orders?' + new URLSearchParams({ tab: tab.id, ...(q ? { q } : {}), sort, ...o });
  return <>
    <div className="page-head"><div><h2>Orders</h2><p>Customers see every status change on their tracking page right away. Every order gets a fake-order risk score; risky ones wait for you under Possible fake.</p></div>
      <Link className="btn" href="/admin/orders/new">+ Bulk create order</Link></div>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    <nav className="ord-tabs" aria-label="Order status">{TABS.map((t, i) =>
      <Link key={t.id} href={link({ tab: t.id })} className={`${t.id === tab.id ? 'on' : ''}${t.id === 'fake' ? ' bad' : ''}`}>{t.label}<span>{counts[i]}</span></Link>)}</nav>
    <form className="ord-find" action="/admin/orders">
      <input type="hidden" name="tab" value={tab.id} />
      <input name="q" defaultValue={q} placeholder="Search by name, order number, phone, email or tracking number" aria-label="Search orders" />
      <select name="sort" defaultValue={sort} aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="high">Highest amount</option><option value="low">Lowest amount</option></select>
      <button className="btn">Search</button>
    </form>
    <form id="ord-form" className="panel" action={bulkOrders}>
      <input type="hidden" name="tab" value={tab.id} /><input type="hidden" name="q" value={q} />
      <BulkBar steps={STEPS} />
      {list.length ? <div className="tbl-wrap"><table className="ord-tbl">
        <thead><tr><th style={{ width: 32 }}><TickAll /></th><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Fake risk</th><th>Courier</th><th>Status</th></tr></thead>
        <tbody>{list.map(o => <tr key={o.id}>
          <td><input type="checkbox" name="ids" value={o.id} aria-label={`Select ${o.no}`} /></td>
          <td><Link href={`/admin/orders/${o.id}`}><b>{o.no}</b></Link><div className="muted sm">{o.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>{o.preorder && <span className="pre-tag">Pre-order</span>}</td>
          <td>{o.name}<div className="muted sm">{o.phone} · {o.country}</div></td>
          <td className="sm">{o.lines.map(l => `${l.qty} × ${l.name}`).join(', ')}</td>
          <td className="num">{formatAmount(Number(o.total), o.currency as Currency)}</td>
          <td><span className={`pay-${o.payStatus}`}>{PAY[o.payStatus] || o.payStatus}</span><div className="muted sm">{o.payMethod.toUpperCase()}{o.payRef ? ` · ${o.payRef}` : ''}</div></td>
          <td>{(() => { const r = risk(o); return <span className={`tag ${r.score >= RISKY ? 'red' : r.score >= 30 ? 'amber' : 'green'}`} title={r.why.join(', ') || 'No warning signs'}>{r.score}%</span>; })()}</td>
          <td>{o.courier}<div className="muted sm">{o.trackingNo || o.warehouse}</div></td>
          <td><span className={`status ${o.status === STEPS.length - 1 ? 'live' : 'hidden'}`}>{STEPS[o.status]}</span></td>
        </tr>)}</tbody>
      </table></div> : <div className="ord-empty">
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true"><circle cx="60" cy="62" r="46" fill="var(--cloth)" /><rect x="36" y="30" width="48" height="64" rx="5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" /><rect x="48" y="30" width="24" height="6" rx="2" fill="var(--ink)" /><rect x="44" y="46" width="10" height="10" rx="2" fill="var(--accent)" /><path d="M58 51h18M44 66h32M44 76h26" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" /></svg>
        <h3>{q ? 'No orders match your search' : 'No orders yet'}</h3>
        <p className="muted">{q ? 'Try a different name, phone or order number.' : 'Orders from the website show up here. Took orders on phone or WhatsApp? Add them all at once.'}</p>
        {!q && <Link className="btn ghost" href="/admin/orders/new">+ Bulk create order</Link>}
      </div>}
    </form>
  </>;
}
