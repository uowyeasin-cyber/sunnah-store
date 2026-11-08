import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { bulkProducts } from '../productActions';
import { TickAll } from '../orders/Bulk';

const TABS: { id: string; label: string; where: Prisma.ProductWhereInput }[] = [
  { id: 'all', label: 'All', where: { archived: false } },
  { id: 'live', label: 'Live', where: { archived: false, active: true } },
  { id: 'hidden', label: 'Hidden', where: { archived: false, active: false } },
  { id: 'archived', label: 'Archived', where: { archived: true } },
];

export default async function Products({ searchParams }: PageProps<'/admin/products'>) {
  if (!(await adminOrNull('products'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const tab = TABS.find(t => t.id === sp.tab) || TABS[0], q = (sp.q || '').trim();
  const search: Prisma.ProductWhereInput = q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sub: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {};
  const [list, counts] = await Promise.all([
    db.product.findMany({ where: { AND: [tab.where, search] }, orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: { category: true, offer: true } }),
    Promise.all(TABS.map(t => db.product.count({ where: t.where }))),
  ]);
  return <>
    <div className="page-head"><div><h2>Products</h2><p>Live products show on the shop. Hidden ones are kept but not shown. Archived ones leave this list and can be restored. Delete removes for good; past orders stay correct.</p></div><Link className="btn" href="/admin/products/new">+ Add product</Link></div>
    <p className="muted sm" style={{ margin: 0 }}>All prices here are in US dollars (USD). Customers see them in their own money (BDT, MYR), converted with your rates.</p>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    <nav className="pills">{TABS.map((t, i) => <Link key={t.id} href={`/admin/products?tab=${t.id}`} className={t.id === tab.id ? 'on' : ''}>{t.label} <span>{counts[i]}</span></Link>)}</nav>
    <form action="/admin/products"><input type="hidden" name="tab" value={tab.id} /><input name="q" defaultValue={q} placeholder="Search…" style={{ width: '100%' }} /></form>
    <form className="panel" action={bulkProducts} style={{ padding: 0, overflow: 'hidden' }}>
      <input type="hidden" name="tab" value={tab.id} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}><TickAll /> Select all</label><span className="muted sm">With the ticked ones:</span>
        {tab.id === 'archived' ? <button className="btn ghost sm" name="act" value="restore">Restore</button> : <>
          <button className="btn ghost sm" name="act" value="live" style={{ color: 'var(--ok)', borderColor: '#86efac' }}>Make live</button>
          <button className="btn ghost sm" name="act" value="hide">Hide</button>
          <button className="btn ghost sm" name="act" value="archive" style={{ color: '#c2410c', borderColor: '#fdba74' }}>Archive</button></>}
        <button className="btn danger sm" name="act" value="delete">Delete</button>
      </div>
      <div className="tbl-wrap"><table>
        <thead><tr><th style={{ width: 32 }} /><th>Product</th><th>Price (USD)</th><th>Cost (USD)</th><th>Margin</th><th>Stock BD / MY / US</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{list.map(p => {
          const st = p.stock as Record<string, number>;
          const margin = p.costCents ? Math.round(((p.priceCents - p.costCents) / p.priceCents) * 100) : null;
          const all = (st.BD ?? 0) + (st.MY ?? 0) + (st.US ?? 0);
          return <tr key={p.id}><td><input type="checkbox" name="ids" value={p.id} aria-label={`Tick ${p.name}`} /></td>
            <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{p.images[0] ? <img src={p.images[0]} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 40, height: 40, borderRadius: 8, background: '#eef2f7', display: 'inline-block', flex: 'none' }} />}
              <div><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link><div className="muted sm">{p.sub ? `${p.sub} · ` : ''}{p.category.name} {p.offer?.on && <span className="tag orange">{p.offer.label}</span>}</div></div></div></td>
            <td className="num">${(p.priceCents / 100).toFixed(2)}</td>
            <td className="num">{p.costCents ? `$${(p.costCents / 100).toFixed(2)}` : <span className="muted">not set</span>}</td>
            <td className="num">{margin === null ? '—' : <span className={`tag ${margin >= 40 ? 'green' : margin >= 20 ? 'amber' : 'red'}`}>{margin}%</span>}</td>
            <td className="num">{st.BD ?? 0} / {st.MY ?? 0} / {st.US ?? 0}{all <= 5 && <div><span className={`tag ${all ? 'amber' : 'red'}`}>{all ? 'Low' : 'Out'}</span></div>}</td>
            <td><span className={`tag ${p.archived ? '' : p.active ? 'green' : 'amber'}`}>{p.archived ? 'Archived' : p.active ? 'Live' : 'Hidden'}</span></td>
            <td><Link className="btn ghost sm" href={`/admin/products/${p.id}`}>Edit</Link></td></tr>;
        })}</tbody>
      </table>{!list.length && <p className="muted" style={{ padding: 18 }}>No products here.</p>}</div>
    </form>
  </>;
}
