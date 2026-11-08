import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { report } from '@/lib/reports';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import { lowStock, tips, todos } from '@/lib/decisions';
import Tips from './Tips';
import ScheduleBox from '../ScheduleBox';
import { newJob } from '../aiActions';

export default async function Dashboard() {
  if (!(await adminOrNull('dashboard'))) return null;
  const now = new Date();
  const [day, month, list, ideas, recent, low, tasks] = await Promise.all([
    report('day', now, 'USD', 6), report('month', now, 'USD', 6), todos(), tips(),
    db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, no: true, name: true, total: true, currency: true, status: true, createdAt: true } }),
    lowStock(), db.automationTask.count({ where: { status: 'pending' } }),
  ]);
  const m = (n: number) => formatAmount(Math.round(n * 100) / 100, 'USD');
  const t = month.now, margin = t.revenue ? Math.round((t.net / t.revenue) * 100) : 0, aov = t.orders ? t.revenue / t.orders : 0;
  const n = (id: string) => list.find(x => x.id === id)?.n || 0;
  return <>
    <div className="page-head"><div><h2>Dashboard</h2><p>Everything below updates by itself from orders, costs and expenses. Amounts are in USD, converted with your rates.</p></div></div>
    <ScheduleBox />
    <div className="stats">
      <div className="stat"><small>Today sales</small><b>{m(day.now.revenue)}</b><span>{day.now.orders} orders · profit {m(day.now.net)}</span></div>
      <div className="stat"><small>Sales ({month.title})</small><b>{m(t.revenue)}</b><span>{t.orders} orders</span></div>
      <div className="stat"><small>Net profit ({month.title})</small><b className={t.net >= 0 ? 'ok' : 'warn'}>{m(t.net)}</b><span>after costs, rewards, refunds, expenses</span></div>
      <div className="stat"><small>Margin / Avg order</small><b>{margin}%</b><span>AOV {m(aov)}</span></div>
    </div>
    <div className="stats">
      <Link className="stat" href="/admin/orders?tab=preparing"><small>Orders to process</small><b>{n('ship')}</b></Link>
      <Link className="stat" href="/admin/orders?tab=confirming"><small>Payments to check</small><b>{n('confirm')}</b></Link>
      <Link className="stat" href="/admin/returns"><small>Returns waiting</small><b>{n('returns')}</b></Link>
      <Link className="stat" href="/admin/automation"><small>Automation asks</small><b>{tasks}</b></Link>
      <Link className="stat" href="/admin/chats?tab=human"><small>Chats needing a human</small><b className={n('chats') ? 'warn' : ''}>{n('chats')}</b></Link>
    </div>
    <form className="panel row2" action={newJob} style={{ gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 22 }}>✨</span><b>Give the AI a job</b>
      <input name="prompt" required placeholder="e.g. Make a 15% Eid coupon for one week" style={{ flex: 1, minWidth: 220 }} />
      <button className="btn orange">Start</button><Link className="link sm" href="/admin/ai">AI co-worker →</Link>
    </form>
    <Tips list={ideas} />
    <div className="grid2">
      <div className="panel"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>Recent orders</h3><Link className="link" href="/admin/orders">All →</Link></div>
        {recent.length ? <table><tbody>{recent.map(o => <tr key={o.id}><td><Link className="link" href={`/admin/orders/${o.id}`}>{o.no}</Link><div className="muted sm">{o.name}</div></td><td className="sm">{STEPS[o.status]}</td><td className="num">{formatAmount(Number(o.total), o.currency as Currency)}</td></tr>)}</tbody></table> : <p className="muted">No orders yet.</p>}</div>
      <div className="panel"><h3>Low stock</h3>{low.length ? <table><tbody>{low.slice(0, 8).map(p => <tr key={p.id}><td><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link><div className="muted sm">{p.sub}</div></td><td className="num"><span className={`tag ${p.all ? 'amber' : 'red'}`}>{p.all ? `${p.all} left` : 'Sold out'}</span></td></tr>)}</tbody></table> : <p className="muted">All good.</p>}</div>
    </div>
  </>;
}
