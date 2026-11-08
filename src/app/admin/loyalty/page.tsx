import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { formatAmount, isCurrency } from '@/lib/money';
import { giveCredit, saveLoyalty } from '../overviewActions';

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);

export default async function Loyalty({ searchParams }: PageProps<'/admin/loyalty'>) {
  if (!(await adminOrNull('loyalty'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const [s, held, given, top, recent] = await Promise.all([
    getSettings(),
    db.customer.groupBy({ by: ['currency'], where: { credit: { gt: 0 } }, _sum: { credit: true }, _count: true }),
    db.order.groupBy({ by: ['currency'], where: { createdAt: { gt: daysAgo(30) }, status: 6 }, _sum: { rewardEarned: true } }),
    db.customer.findMany({ where: { credit: { gt: 0 } }, orderBy: { credit: 'desc' }, take: 8, select: { email: true, name: true, credit: true, currency: true } }),
    db.creditEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { customer: { select: { email: true, currency: true } } } }),
  ]);
  const money = (rows: { currency: string; v: number }[]) => rows.filter(r => r.v).map(r => isCurrency(r.currency) ? formatAmount(r.v, r.currency) : `${r.v} ${r.currency}`).join(' · ') || '0';
  return <>
    <div className="page-head"><div><h2>Loyalty points</h2><p>Every delivered order gives the customer store credit back, in their own money (1 taka = 1 credit, 1 dollar = 1 credit). It is added by itself when the order is delivered and used at checkout. Customers only see their credit, never the percentage.</p></div></div>
    {(sp.note || sp.saved) && <p className="ord-note">{sp.note || 'Saved.'}</p>}
    <div className="stats">
      <div className="stat"><small>Reward per order</small><b className={s.rewardRate ? 'ok' : 'warn'}>{s.rewardRate}%</b><span>{s.rewardRate ? 'On' : 'Off'}</span></div>
      <div className="stat"><small>Credit customers hold now</small><b>{money(held.map(h => ({ currency: h.currency, v: Number(h._sum.credit) })))}</b><span>{held.reduce((a, h) => a + h._count, 0)} customers</span></div>
      <div className="stat"><small>Rewards on orders (30 days)</small><b>{money(given.map(g => ({ currency: g.currency, v: Number(g._sum.rewardEarned) })))}</b></div>
    </div>
    <div className="grid2">
      <form className="panel" action={saveLoyalty}>
        <h3>Reward rate</h3>
        <div className="field"><label>Credit back on each delivered order (% of what they paid)</label><input type="number" name="rewardRate" min="0" max="5" step="0.05" defaultValue={s.rewardRate} /></div>
        <p className="muted sm" style={{ margin: 0 }}>Recommended 0.2 to 0.5%. Set 0 to switch rewards off. Keep it below your profit margin. Cancelled or refunded orders give nothing.</p>
        <div><button className="btn">Save</button></div>
      </form>
      <form className="panel" action={giveCredit}>
        <h3>Give or take back credit by hand</h3>
        <div className="field"><label>Customer email</label><input name="email" type="email" required placeholder="name@gmail.com" /></div>
        <div className="two"><div className="field"><label>Amount (minus to take back)</label><input name="amount" type="number" step="0.01" required /></div>
          <div className="field"><label>Currency</label><select name="currency"><option>BDT</option><option>USD</option><option>MYR</option></select></div></div>
        <div className="field"><label>Note the customer sees</label><input name="note" placeholder="Sorry for the late parcel" /></div>
        <div><button className="btn">Save credit</button></div>
      </form>
    </div>
    <div className="grid2">
      <div className="panel"><h3>Most credit</h3>{top.length ? <table><tbody>{top.map(c => <tr key={c.email}><td>{c.name || c.email}<div className="muted sm">{c.email}</div></td><td className="num">{isCurrency(c.currency) ? formatAmount(Number(c.credit), c.currency) : c.credit.toString()}</td></tr>)}</tbody></table> : <p className="muted">Nobody holds credit yet.</p>}</div>
      <div className="panel"><h3>Latest credit changes</h3>{recent.length ? <table><tbody>{recent.map(e => <tr key={e.id}><td>{e.customer.email}<div className="muted sm">{e.note}{e.orderNo ? ` · ${e.orderNo}` : ''}</div></td><td className="num" style={{ color: Number(e.amount) < 0 ? 'var(--err)' : 'var(--ok)' }}>{Number(e.amount) > 0 ? '+' : ''}{e.amount.toString()} {e.customer.currency}</td></tr>)}</tbody></table> : <p className="muted">No changes yet.</p>}</div>
    </div>
  </>;
}
