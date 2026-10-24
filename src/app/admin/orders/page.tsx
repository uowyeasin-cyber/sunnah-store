import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';

export default async function Orders() {
  if (!(await adminOrNull())) return null;
  const list = await db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Orders</h2></div>
    <div className="panel"><div className="tbl-wrap"><table>
      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Courier</th><th>Status</th></tr></thead>
      <tbody>{list.map(o => <tr key={o.id}>
        <td><Link href={`/admin/orders/${o.id}`}><b>{o.no}</b></Link><div className="muted" style={{ fontSize: '.78rem' }}>{o.createdAt.toLocaleString('en-US')}</div></td>
        <td>{o.name}<div className="muted" style={{ fontSize: '.78rem' }}>{o.email} · {o.country}</div></td>
        <td className="num">{formatAmount(Number(o.total), o.currency as Currency)}</td>
        <td>{o.payMethod.toUpperCase()} · {o.payStatus}</td><td>{o.courier}<div className="muted" style={{ fontSize: '.78rem' }}>{o.warehouse}</div></td>
        <td><span className={`status ${o.status === STEPS.length - 1 ? 'live' : 'hidden'}`}>{STEPS[o.status]}</span></td>
      </tr>)}</tbody>
    </table></div>{!list.length && <p className="muted">No orders yet.</p>}</div>
  </>;
}
