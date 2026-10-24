import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, isCurrency, type Currency } from '@/lib/money';
import { PERIODS, report, type Period } from '@/lib/reports';
import { STEPS } from '@/lib/tracking';
import PrintButton from './PrintButton';
import Section from './Section';

type Q = { p?: string; d?: string; cur?: string; tz?: string };
const TZ = [['6', 'Bangladesh time'], ['8', 'Malaysia time'], ['0', 'UTC'], ['-5', 'US Eastern']];
const NAMES: Record<Period, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function Reports({ searchParams }: PageProps<'/admin/reports'>) {
  if (!(await adminOrNull())) return null;
  const q = (await searchParams) as Q;
  const p: Period = PERIODS.includes(q.p as Period) ? (q.p as Period) : 'month';
  const cur: Currency = isCurrency(q.cur) ? q.cur : 'USD';
  const tz = TZ.some(([v]) => v === q.tz) ? Number(q.tz) : 6;
  const anchor = q.d && !isNaN(Date.parse(q.d)) ? new Date(q.d + 'T12:00:00Z') : new Date();
  const r = await report(p, anchor, cur, tz);
  const m = (n: number) => formatAmount(Math.round(n * 100) / 100, cur);
  const href = (x: Partial<Q>) => `/admin/reports?${new URLSearchParams({ p, d: iso(anchor), cur, tz: String(tz), ...x } as Record<string, string>)}`;
  const shift = (dir: number) => { const d = new Date(r.start.getTime() + tz * 3600e3 + 12 * 3600e3); if (p === 'day') d.setUTCDate(d.getUTCDate() + dir); else if (p === 'week') d.setUTCDate(d.getUTCDate() + 7 * dir); else if (p === 'month') d.setUTCMonth(d.getUTCMonth() + dir); else d.setUTCFullYear(d.getUTCFullYear() + dir); return iso(d); };
  const Delta = ({ k, money = true, bad = false }: { k: keyof typeof r.now; money?: boolean; bad?: boolean }) => {
    const g = r.growth(k);
    return <div className="muted" style={{ fontSize: '.78rem' }}>
      {g === null ? '—' : <span className={(g >= 0) !== bad ? 'up' : 'down'}>{g >= 0 ? '▲' : '▼'} {Math.abs(g).toFixed(1)}%</span>} vs {money ? m(r.before[k]) : r.before[k]} before
    </div>;
  };
  const max = Math.max(1, ...r.bars.map(b => b.revenue));
  const margin = r.now.revenue ? (r.now.net / r.now.revenue) * 100 : 0;
  const qs = { p, d: iso(anchor), cur, tz: String(tz) };
  const csv = (part: string) => `/api/admin/report?${new URLSearchParams({ ...qs, s: part })}`;
  const best = [...r.bars].sort((a, b) => b.revenue - a.revenue)[0];
  const views = r.views.reduce((a, x) => a + x.views, 0);
  const stockAll = r.stock.reduce((a, x) => a + x.all, 0), soldOut = r.stock.filter(x => x.all === 0).length;

  return <>
    <div className="rep-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
      <div><div className="kicker">Admin · {NAMES[p]} report</div><h2 style={{ fontSize: '2rem' }}>{r.title}</h2></div>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="btn ghost" href={`/api/admin/report?${new URLSearchParams({ p, d: iso(anchor), cur, tz: String(tz) })}`}>Download CSV (all)</a>
        <PrintButton />
      </div>
    </div>

    <form className="panel no-print rep-filters" action="/admin/reports">
      <div className="rtabs">{PERIODS.map(x => <Link key={x} href={href({ p: x })} className={x === p ? 'on' : ''}>{NAMES[x]}</Link>)}</div>
      <input type="hidden" name="p" value={p} />
      <Link className="btn ghost" href={href({ d: shift(-1) })} aria-label="Previous">‹</Link>
      <input type="date" name="d" defaultValue={iso(anchor)} aria-label="Date" />
      <Link className="btn ghost" href={href({ d: shift(1) })} aria-label="Next">›</Link>
      <select name="cur" defaultValue={cur} aria-label="Currency"><option>USD</option><option>MYR</option><option>BDT</option></select>
      <select name="tz" defaultValue={String(tz)} aria-label="Time zone">{TZ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button className="btn">Show</button>
      <Link href="/admin/reports" className="muted" style={{ fontSize: '.85rem' }}>Today</Link>
    </form>

    <Overview r={r} />

    <div className="rsecs">
    <Section id="summary" title="Summary" headline={`${m(r.now.revenue)} · ${r.now.orders} orders`} csv={csv('summary')}>
      <div className="kpis">
        <div className="panel"><div className="label">Sales</div><b>{m(r.now.revenue)}</b><Delta k="revenue" /></div>
        <div className="panel"><div className="label">Net profit</div><b className={r.now.net < 0 ? 'down' : ''}>{m(r.now.net)}</b><Delta k="net" /></div>
        <div className="panel"><div className="label">Orders</div><b>{r.now.orders}</b><Delta k="orders" money={false} /></div>
        <div className="panel"><div className="label">Items sold</div><b>{r.now.items}</b><Delta k="items" money={false} /></div>
        <div className="panel"><div className="label">Average order</div><b>{m(r.now.orders ? r.now.revenue / r.now.orders : 0)}</b><div className="muted" style={{ fontSize: '.78rem' }}>Margin {margin.toFixed(1)}%</div></div>
        <div className="panel"><div className="label">New customers</div><b>{r.newCustomers}</b><div className="muted" style={{ fontSize: '.78rem' }}>{r.status.pending} awaiting payment</div></div>
      </div>
    </Section>

    <Section id="chart" title={`Sales by ${p === 'day' ? 'hour' : p === 'year' ? 'month' : 'day'}`} headline={`Best: ${best ? best.label : '—'}`} csv={csv('chart')}>
      <div className="bars" role="img" aria-label="Sales chart">
        {r.bars.map(b => <div key={b.label} className="rbar" title={`${b.label}: ${m(b.revenue)} sales, ${m(b.net)} profit, ${b.orders} orders`}>
          <span style={{ height: `${(b.revenue / max) * 100}%` }} /><small>{b.label.replace(/ \d{4}$/, '')}</small>
        </div>)}
      </div>
    </Section>

    <Section id="pl" title={r.now.net >= 0 ? 'Profit and loss' : 'Profit and loss (loss)'} headline={`${m(r.now.net)} net`} csv={csv('pl')}>
      <table className="pl"><tbody>
        <tr><td>Sales (paid by customers)</td><td className="num">{m(r.now.revenue)}</td></tr>
        <tr><td className="muted">· of which delivery charges</td><td className="num muted">{m(r.now.shipping)}</td></tr>
        <tr><td>− Cost of products sold</td><td className="num">{m(r.now.cogs)}</td></tr>
        <tr className="sum"><td>Gross profit</td><td className="num">{m(r.now.gross)}</td></tr>
        <tr><td>− Store credit given as rewards</td><td className="num">{m(r.now.rewards)}</td></tr>
        <tr><td>− Refunds</td><td className="num">{m(r.now.refunds)}</td></tr>
        <tr><td>− Expenses (<Link href="/admin/expenses">add or edit</Link>)</td><td className="num">{m(r.now.expenses)}</td></tr>
        <tr className="sum"><td>{r.now.net >= 0 ? 'Net profit' : 'Net loss'}</td><td className={`num ${r.now.net < 0 ? 'down' : 'up'}`}>{m(r.now.net)}</td></tr>
      </tbody></table>
      {!!r.expenses.length && <table className="pl"><tbody>{r.expenses.map(e => <tr key={e.k}><td>Expense · {e.k}</td><td className="num">{m(e.v)}</td></tr>)}</tbody></table>}
      {r.noCost && <p className="muted" style={{ fontSize: '.82rem' }}>Some products sold have no cost price, so profit looks higher than it is. Add “Cost to you” on each product.</p>}
    </Section>

    <Section id="status" title="Order status" headline={`${r.status.delivered} of ${r.status.placed} delivered`} csv={csv('status')}>
      <table className="pl"><tbody>
        <tr><td>Placed</td><td className="num">{r.status.placed}</td></tr>
        <tr><td>Delivered</td><td className="num">{r.status.delivered}</td></tr>
        <tr><td>On the way</td><td className="num">{r.status.onTheWay}</td></tr>
        <tr><td>Not sent yet</td><td className="num">{r.status.notSent}</td></tr>
        <tr><td>Awaiting payment</td><td className="num">{r.status.pending}</td></tr>
        <tr><td>Payment failed</td><td className="num">{r.status.failed}</td></tr>
      </tbody></table>
    </Section>

    <Section id="trend" title={`Last 12 ${p === 'day' ? 'days' : p + 's'}`} headline={`${m(r.trend.reduce((a, t) => a + t.revenue, 0))} sales`} csv={csv('trend')}>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Period</th><th className="num">Orders</th><th className="num">Sales</th><th className="num">Costs</th><th className="num">Expenses</th><th className="num">Profit</th></tr></thead>
        <tbody>{r.trend.map(t => <tr key={t.label}><td>{t.label}</td><td className="num">{t.orders}</td><td className="num">{m(t.revenue)}</td><td className="num">{m(t.cogs + t.rewards + t.refunds)}</td><td className="num">{m(t.expenses)}</td><td className={`num ${t.net < 0 ? 'down' : ''}`}>{m(t.net)}</td></tr>)}</tbody>
      </table></div>
    </Section>

    <Section id="products" title="Products sold" headline={r.products[0] ? `Top: ${r.products[0].name}` : 'No sales'} csv={csv('products')}>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Product</th><th className="num">Sold</th><th className="num">Sales</th><th className="num">Cost</th><th className="num">Profit</th></tr></thead>
        <tbody>{r.products.map(x => <tr key={x.name}><td>{x.name}</td><td className="num">{x.qty}</td><td className="num">{m(x.revenue)}</td><td className="num">{m(x.cost)}</td><td className="num">{m(x.profit)}</td></tr>)}</tbody>
      </table></div>{!r.products.length && <p className="muted">No sales in this period.</p>}
    </Section>

    {([['sources', 'Sources', r.sources], ['countries', 'Countries', r.countries], ['methods', 'Payment methods', r.methods], ['couriers', 'Couriers', r.couriers]] as const).map(([id, t, rows]) =>
      <Section key={id} id={id} title={t} headline={rows[0] ? `${rows[0].k} · ${pct(rows[0].orders, r.now.orders)}` : '—'} csv={csv(id)}>
        <table className="pl"><tbody>{rows.map(x => <tr key={x.k}><td>{x.k} <span className="muted">· {x.orders} orders · {pct(x.orders, r.now.orders)}</span></td><td className="num">{m(x.revenue)}</td></tr>)}</tbody></table>
        {!rows.length && <p className="muted">—</p>}
      </Section>)}

    <Section id="reviews" title="Reviews" headline={r.reviews.all ? `${r.reviews.avg.toFixed(1)} ★ · ${r.reviews.all} new` : 'No new reviews'} csv={csv('reviews')}>
      <table className="pl"><tbody>
        <tr><td>New reviews</td><td className="num">{r.reviews.all}</td></tr>
        <tr><td>Average stars</td><td className="num">{r.reviews.all ? r.reviews.avg.toFixed(1) + ' ★' : '—'}</td></tr>
        <tr><td className="up">Good (4–5 ★)</td><td className="num">{r.reviews.good} · {pct(r.reviews.good, r.reviews.all)}</td></tr>
        <tr><td>Okay (3 ★)</td><td className="num">{r.reviews.mid} · {pct(r.reviews.mid, r.reviews.all)}</td></tr>
        <tr><td className="down">Bad (1–2 ★)</td><td className="num">{r.reviews.bad} · {pct(r.reviews.bad, r.reviews.all)}</td></tr>
        <tr><td>Waiting for approval (<a href="/admin/reviews">open</a>)</td><td className="num">{r.reviews.waiting}</td></tr>
      </tbody></table>
    </Section>

    <Section id="customers" title="Customers and views" headline={`${r.newCustomers} new · ${views} views`} csv={csv('customers')}>
      <table className="pl"><tbody>
        <tr><td>New customers</td><td className="num">{r.newCustomers}</td></tr>
        <tr><td>Orders per customer</td><td className="num">{r.newCustomers ? (r.now.orders / r.newCustomers).toFixed(2) : '—'}</td></tr>
        <tr><td>Product page views</td><td className="num">{views}</td></tr>
        <tr><td>Items sold per 100 views</td><td className="num">{views ? ((r.now.items / views) * 100).toFixed(1) : '—'}</td></tr>
      </tbody></table>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Product</th><th className="num">Views</th><th className="num">Sold</th><th className="num">Sold per 100 views</th><th className="num">Good reviews</th><th className="num">Bad reviews</th></tr></thead>
        <tbody>{r.views.map(x => <tr key={x.name}><td>{x.name}</td><td className="num">{x.views}</td><td className="num">{x.sold}</td><td className="num">{x.rate === null ? '—' : x.rate.toFixed(1)}</td><td className="num up">{x.good}</td><td className={`num ${x.bad ? 'down' : ''}`}>{x.bad}</td></tr>)}</tbody>
      </table></div>
    </Section>

    <Section id="stock" title="Stock now" headline={`${stockAll} items · ${soldOut} sold out`} csv={csv('stock')}>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Product</th><th className="num">Bangladesh</th><th className="num">Malaysia</th><th className="num">USA</th><th className="num">Total</th><th className="num">Value at cost</th><th className="num">Value at price</th></tr></thead>
        <tbody>{r.stock.map(x => <tr key={x.name}><td>{x.name}{!x.active && <span className="muted"> · hidden</span>}</td>
          {(['BD', 'MY', 'US'] as const).map(w => <td key={w} className={`num ${x[w] === 0 ? 'down' : x[w] < 5 ? 'warn' : ''}`}>{x[w]}</td>)}
          <td className="num"><b>{x.all}</b></td><td className="num">{m(x.value)}</td><td className="num">{m(x.retail)}</td></tr>)}</tbody>
      </table></div><p className="muted" style={{ fontSize: '.82rem' }}>Red: sold out. Amber: fewer than 5 left.</p>
    </Section>

    {!!r.ads.length && <Section id="ads" title="Advertisements (all time)" headline={`${r.ads.reduce((a, x) => a + x.clicks, 0)} clicks`} csv={csv('ads')}>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Ad</th><th className="num">Views</th><th className="num">Clicks</th><th className="num">Click rate</th></tr></thead>
        <tbody>{r.ads.map((a, i) => <tr key={i}><td>{a.title}<span className="muted"> · {a.place}{a.on ? '' : ' · off'}</span></td><td className="num">{a.views}</td><td className="num">{a.clicks}</td><td className="num">{pct(a.clicks, a.views)}</td></tr>)}</tbody>
      </table></div>
    </Section>}

    <Section id="orders" title="All orders" headline={`${r.orders.length} orders`} csv={csv('orders')}>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status</th><th className="num">Total</th></tr></thead>
        <tbody>{r.orders.map(o => <tr key={o.no}><td><b>{o.no}</b><div className="muted" style={{ fontSize: '.78rem' }}>{new Date(+o.at + tz * 3600e3).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })}</div></td><td>{o.name}<div className="muted" style={{ fontSize: '.78rem' }}>{o.country} · from {o.source}</div></td>
          <td>{o.pay.replace(/^m-/, '').toUpperCase()} · {o.payStatus}</td><td>{STEPS[o.status]}</td><td className="num">{formatAmount(o.total, o.currency as Currency)}</td></tr>)}</tbody>
      </table></div>{!r.orders.length && <p className="muted">No orders in this period.</p>}
    </Section>
    </div>
  </>;
}

const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(0)}%` : '—');

// Everything at a glance, as percentages.
function Overview({ r }: { r: Awaited<ReturnType<typeof report>> }) {
  const share = (a: number, b: number) => (b ? (a / b) * 100 : null);
  const g = (k: 'revenue' | 'net' | 'orders' | 'items') => r.growth(k);
  const views = r.views.reduce((a, x) => a + x.views, 0);
  const top = (rows: { k: string; orders: number }[]) => rows[0] ? { v: share(rows[0].orders, r.now.orders), note: rows[0].k } : { v: null, note: '' };
  const tiles: { label: string; v: number | null; note?: string; tone?: 'good' | 'bad'; growth?: boolean }[] = [
    { label: 'Sales growth', v: g('revenue'), growth: true },
    { label: 'Profit growth', v: g('net'), growth: true },
    { label: 'Order growth', v: g('orders'), growth: true },
    { label: 'Net margin', v: share(r.now.net, r.now.revenue), tone: r.now.net < 0 ? 'bad' : 'good' },
    { label: 'Gross margin', v: share(r.now.gross, r.now.revenue) },
    { label: 'Product cost', v: share(r.now.cogs, r.now.revenue), note: 'of sales' },
    { label: 'Expenses', v: share(r.now.expenses, r.now.revenue), note: 'of sales' },
    { label: 'Refunds', v: share(r.now.refunds, r.now.revenue), note: 'of sales', tone: 'bad' },
    { label: 'Delivered', v: share(r.status.delivered, r.status.placed), tone: 'good' },
    { label: 'On the way', v: share(r.status.onTheWay, r.status.placed) },
    { label: 'Not sent yet', v: share(r.status.notSent, r.status.placed) },
    { label: 'Awaiting payment', v: share(r.status.pending, r.status.placed) },
    { label: 'Payment failed', v: share(r.status.failed, r.status.placed), tone: 'bad' },
    { label: 'Good reviews', v: share(r.reviews.good, r.reviews.all), tone: 'good' },
    { label: 'Bad reviews', v: share(r.reviews.bad, r.reviews.all), tone: 'bad' },
    { label: 'Views to sales', v: share(r.views.filter(x => x.views).reduce((a, x) => a + Math.min(x.sold, x.views), 0), views), note: 'views that led to a sale' },
    { label: 'Top source', ...top(r.sources) },
    { label: 'Top country', ...top(r.countries) },
    { label: 'Top payment', ...top(r.methods) },
    { label: 'Sold out', v: share(r.stock.filter(x => x.all === 0).length, r.stock.length), note: 'of products', tone: 'bad' },
    { label: 'Ad click rate', v: share(r.ads.reduce((a, x) => a + x.clicks, 0), r.ads.reduce((a, x) => a + x.views, 0)) },
  ];
  return <div className="ovw-wrap"><div className="kicker" style={{ marginBottom: 10 }}>Overview</div><div className="ovw">
    {tiles.map(t => {
      const tone = t.growth && t.v !== null ? (t.v >= 0 ? 'good' : 'bad') : t.tone || '';
      return <div key={t.label} className={`ptile ${tone}`}>
        <div className="label">{t.label}</div>
        <b className={t.growth && t.v !== null ? (t.v >= 0 ? 'up' : 'down') : ''}>{t.v === null ? '—' : `${t.growth && t.v >= 0 ? '+' : ''}${t.v.toFixed(Math.abs(t.v) < 10 ? 1 : 0)}%`}</b>
        <div className="meter"><span style={{ width: `${t.v === null ? 0 : Math.min(100, Math.abs(t.v))}%` }} /></div>
        {(t.note || t.growth) && <small>{t.growth ? 'vs period before' : t.note}</small>}
      </div>;
    })}
  </div></div>;
}
