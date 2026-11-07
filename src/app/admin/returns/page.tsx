import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { decideReturn } from '../orderActions';

export default async function Returns() {
  if (!(await adminOrNull('returns'))) return null;
  const list = await db.returnRequest.findMany({ orderBy: [{ status: 'desc' }, { createdAt: 'desc' }], take: 200, include: { order: { include: { lines: true } } } });
  const open = list.filter(r => r.status === 'pending').length;
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Returns</h2></div>
    <p className="muted" style={{ fontSize: '.88rem' }}>Customers ask for a return from their receipt page within 14 days of delivery. Approving adds the refund to their store credit and emails them; nothing is sent back to a card or wallet automatically. {open} waiting.</p>
    <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>Order</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>
      {list.map(r => { const o = r.order, cur = o.currency as Currency, max = Number(o.total) + Number(o.creditUsed); return <tr key={r.id}>
        <td><Link href={`/admin/orders/${o.id}`}>{o.no}</Link><div className="muted" style={{ fontSize: '.78rem' }}>{o.name} · {o.email}<br />{o.lines.map(l => `${l.qty}× ${l.name}`).join(', ')}<br />Paid {formatAmount(max, cur)} · {r.createdAt.toLocaleDateString('en-US')}</div></td>
        <td style={{ minWidth: 200 }}><b>{r.reason}</b>{r.note && <div style={{ fontSize: '.85rem' }}>{r.note}</div>}</td>
        <td><span className={`status ${r.status === 'approved' ? 'live' : 'hidden'}`}>{r.status}</span>{Number(r.refund) > 0 && <div className="muted" style={{ fontSize: '.78rem' }}>{formatAmount(Number(r.refund), cur)} credit</div>}{r.adminNote && <div className="muted" style={{ fontSize: '.78rem' }}>{r.adminNote}</div>}</td>
        <td>{r.status === 'pending' && <form action={decideReturn} style={{ display: 'grid', gap: 6, minWidth: 220 }}><input type="hidden" name="id" value={r.id} />
          <div className="field"><label>Refund as store credit ({cur})</label><input name="amount" type="number" step="0.01" min="0" max={max} defaultValue={max.toFixed(2)} /></div>
          <div className="field"><label>Note to customer</label><input name="adminNote" maxLength={200} /></div>
          <label style={{ fontSize: '.8rem' }}><input type="checkbox" name="restock" /> Item came back: put it back in stock</label>
          <div style={{ display: 'flex', gap: 6 }}><button className="btn sm" name="to" value="approved">Approve</button><button className="btn ghost sm" name="to" value="declined">Decline</button></div>
        </form>}</td>
      </tr>; })}
      {!list.length && <tr><td colSpan={4} className="muted">No return requests yet.</td></tr>}
    </tbody></table></div></div>
  </>;
}
