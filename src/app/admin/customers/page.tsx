import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { formatAmount, isCurrency } from '@/lib/money';

const TABS: { id: string; label: string; where: Prisma.CustomerWhereInput }[] = [
  { id: 'all', label: 'All customers', where: {} },
  { id: 'none', label: 'No order yet', where: { orders: { none: {} } } },
  { id: 'buyers', label: 'Received an order', where: { orders: { some: { status: 6 } } } },
  { id: 'credit', label: 'Holding credit', where: { credit: { gt: 0 } } },
];
const filled = (c: { name: string; phone: string | null; country: string; address: unknown }) => {
  const a = (c.address || {}) as Record<string, string>;
  const parts = [c.name, c.phone, c.country, a.line1 || a.street || a.address, a.city];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
};

export default async function Customers({ searchParams }: PageProps<'/admin/customers'>) {
  if (!(await adminOrNull('customers'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const tab = TABS.find(t => t.id === sp.tab) || TABS[0], q = (sp.q || '').trim();
  const search: Prisma.CustomerWhereInput = q ? { OR: (['name', 'email', 'phone'] as const).map(k => ({ [k]: { contains: q, mode: 'insensitive' } })) } : {};
  const [s, list, counts] = await Promise.all([
    getSettings(),
    db.customer.findMany({ where: { AND: [tab.where, search] }, orderBy: { createdAt: 'desc' }, take: 200, include: { orders: { select: { total: true, currency: true, payStatus: true } } } }),
    Promise.all(TABS.map(t => db.customer.count({ where: t.where }))),
  ]);
  const admins = new Set(s.admins.filter(Boolean).map(a => a.toLowerCase()));
  const usd = (v: number, cur: string) => isCurrency(cur) ? v / s.rates[cur] : v;
  return <>
    <div className="page-head"><div><h2>Customers</h2><p>Shoppers who signed in or ordered, with their orders, spending and store credit. Search to find one fast.</p></div></div>
    <div className="panel">
      <nav className="pills">{TABS.map((t, i) => <Link key={t.id} href={`/admin/customers?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={t.id === tab.id ? 'on' : ''}>{t.label} <span>{counts[i]}</span></Link>)}</nav>
      <form action="/admin/customers" style={{ display: 'flex', gap: 8 }}><input type="hidden" name="tab" value={tab.id} /><input name="q" defaultValue={q} placeholder="Search by name, email or phone" style={{ flex: 1 }} /><button className="btn ghost">Search</button></form>
    </div>
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}><div className="tbl-wrap"><table>
      <thead><tr><th>Customer</th><th>Type</th><th>Orders</th><th>Spent (USD)</th><th>Profile</th><th>Credit</th><th>Joined</th></tr></thead>
      <tbody>{list.map(c => { const paid = c.orders.filter(o => ['paid', 'cod'].includes(o.payStatus)); const spent = paid.reduce((a, o) => a + usd(Number(o.total), o.currency), 0); const p = filled(c); return <tr key={c.id}>
        <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="av" style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2f7', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{(c.name || c.email || '?').slice(0, 1).toUpperCase()}</span>
          <div><b>{c.name || (c.email || '').split('@')[0]}</b><div className="muted sm">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div></div></div></td>
        <td><span className="tag">Customer</span>{c.email && admins.has(c.email) && <> <span className="tag orange">ADMIN</span></>}</td>
        <td className="num"><Link className="link" href={`/admin/orders?q=${encodeURIComponent(c.email || c.phone || '')}`}>{c.orders.length}</Link></td>
        <td className="num">${spent.toFixed(2)}</td>
        <td style={{ minWidth: 120 }}><div className="sm" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{p === 100 ? 'Complete' : 'Partial'}</span><b>{p}%</b></div><div className="bar"><i style={{ width: `${p}%`, background: p === 100 ? undefined : '#f59e0b' }} /></div></td>
        <td className="num">{Number(c.credit) ? (isCurrency(c.currency) ? formatAmount(Number(c.credit), c.currency) : c.credit.toString()) : '0'}</td>
        <td className="sm muted">{c.createdAt.toISOString().slice(0, 10)}</td>
      </tr>; })}</tbody></table>
      {!list.length && <p className="muted" style={{ padding: 22 }}>No customers here yet.</p>}</div></div>
  </>;
}
