import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';

export default async function Products() {
  if (!(await adminOrNull())) return null;
  const list = await db.product.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: { category: true, offer: true } });
  return <>
    <div className="row2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}><div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Products & offers</h2></div><Link className="btn" href="/admin/products/new">Add a product</Link></div>
    <div className="panel"><div className="tbl-wrap"><table>
      <thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Offer</th><th>Stock US / MY / BD</th><th>Shown</th></tr></thead>
      <tbody>{list.map(p => { const st = p.stock as Record<string, number>; return (
        <tr key={p.id}><td><Link href={`/admin/products/${p.id}`}><b>{p.name}</b></Link><div className="muted" style={{ fontSize: '.78rem' }}>{p.sub}</div></td>
          <td>{p.category.name}</td><td className="num">${(p.priceCents / 100).toFixed(2)}</td>
          <td>{p.offer?.on ? `${p.offer.label}${p.offer.pct ? ` (${p.offer.pct}%)` : ''}` : '—'}</td>
          <td className="num">{st.US ?? 0} / {st.MY ?? 0} / {st.BD ?? 0}</td><td>{p.active ? 'Yes' : 'Hidden'}</td></tr>); })}</tbody>
    </table></div></div>
  </>;
}
