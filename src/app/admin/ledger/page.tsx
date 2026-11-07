import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { totals } from '@/lib/ledger';
import { formatAmount, type Currency } from '@/lib/money';
import { addEntry, backfill, deleteEntry } from '../ledgerActions';
import { monthRange } from './month';

const DIR: Record<string, string> = { in: 'Money in', out: 'Money out', credit: 'Store credit' };
const KIND: Record<string, string> = { gateway: 'Online payment', manual: 'Marked paid', cod: 'Cash on delivery', reversal: 'Reversed', refund: 'Refund', other: 'Added by hand' };

// Money ledger: every payment, reversal and refund, with month totals per currency and the month's expenses.
export default async function Ledger({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await adminOrNull('ledger'))) return null;
  const { m, from, to } = monthRange((await searchParams).m);
  const prev = new Date(from); prev.setUTCMonth(prev.getUTCMonth() - 1);
  const [list, sums, paid, booked] = await Promise.all([
    db.ledgerEntry.findMany({ where: { at: { gte: from, lt: to } }, orderBy: { at: 'desc' }, take: 500 }),
    totals(from, to),
    db.order.findMany({ where: { payStatus: { in: ['paid', 'refunded'] }, total: { gt: 0 } }, select: { id: true } }),
    db.ledgerEntry.findMany({ where: { dir: 'in', orderId: { not: null } }, select: { orderId: true }, distinct: ['orderId'] }),
  ]);
  const have = new Set(booked.map(b => b.orderId)), missing = paid.filter(o => !have.has(o.id)).length;
  const f = (n: number, c: string) => formatAmount(n, c as Currency);
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Money ledger</h2></div>
    <p className="muted" style={{ fontSize: '.88rem' }}>Every payment that comes in, every reversal, and every refund given as store credit, written down automatically when it happens. Expenses come from the Expenses page. Amounts stay in their own currency.</p>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <Link className="btn ghost sm" href={`/admin/ledger?m=${prev.toISOString().slice(0, 7)}`}>← Earlier</Link>
      <form style={{ display: 'flex', gap: 6 }}><input type="month" name="m" defaultValue={m} aria-label="Month" /><button className="btn ghost sm">Show</button></form>
      <a className="btn ghost sm" href={`/admin/ledger/export?m=${m}`}>Download CSV</a>
    </div>

    <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>{m}</th><th className="num">Money in</th><th className="num">Money out</th><th className="num">Expenses</th><th className="num">Net cash</th><th className="num">Store credit given</th></tr></thead><tbody>
      {Object.entries(sums).map(([c, s]) => <tr key={c}><td>{c}</td><td className="num">{f(s.in, c)}</td><td className="num">{f(s.out, c)}</td><td className="num">{f(s.expenses, c)}</td><td className="num"><b>{f(s.in - s.out - s.expenses, c)}</b></td><td className="num">{f(s.credit, c)}</td></tr>)}
      {!Object.keys(sums).length && <tr><td colSpan={6} className="muted">Nothing this month.</td></tr>}
    </tbody></table></div></div>

    {missing > 0 && <form action={backfill} className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <span>{missing} paid orders from before the ledger have no entry yet.</span><button className="btn sm">Add them to the ledger</button></form>}

    <form action={addEntry} className="panel"><h3 style={{ marginTop: 0 }}>Add money by hand</h3>
      <p className="muted" style={{ fontSize: '.85rem' }}>For money that did not come through an order, such as a courier paying out cash-on-delivery, or a refund sent to a bank. Spending on the business goes in Expenses.</p>
      <div className="two"><div className="field"><label htmlFor="dir">Direction</label><select id="dir" name="dir"><option value="in">Money in</option><option value="out">Money out</option></select></div>
        <div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" /></div></div>
      <div className="two"><div className="field"><label htmlFor="amount">Amount</label><input id="amount" name="amount" type="number" step="0.01" min="0.01" required /></div>
        <div className="field"><label htmlFor="currency">Currency</label><select id="currency" name="currency"><option>BDT</option><option>MYR</option><option>USD</option></select></div></div>
      <div className="two"><div className="field"><label htmlFor="method">Method</label><input id="method" name="method" placeholder="e.g. Steadfast payout, bKash, bank" /></div>
        <div className="field"><label htmlFor="ref">Reference</label><input id="ref" name="ref" placeholder="Transaction ID" /></div></div>
      <div className="field"><label htmlFor="note">Note</label><input id="note" name="note" maxLength={300} /></div>
      <button className="btn">Add to ledger</button>
    </form>

    <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>Date</th><th>What</th><th>Order</th><th className="num">Amount</th><th /></tr></thead><tbody>
      {list.map(e => <tr key={e.id}>
        <td style={{ whiteSpace: 'nowrap' }}>{e.at.toISOString().slice(0, 10)}</td>
        <td><span className={`status ${e.dir === 'in' ? 'live' : 'hidden'}`}>{DIR[e.dir] || e.dir}</span> {KIND[e.kind] || e.kind}{e.method && ` · ${e.method.replace(/^m-/, '')}`}<div className="muted" style={{ fontSize: '.78rem' }}>{[e.note, e.ref && `Ref ${e.ref}`, e.by].filter(Boolean).join(' · ')}</div></td>
        <td>{e.orderId ? <Link href={`/admin/orders/${e.orderId}`}>{e.orderNo}</Link> : '—'}</td>
        <td className="num" style={{ whiteSpace: 'nowrap' }}>{e.dir === 'in' ? '+' : '−'}{f(Number(e.amount), e.currency)}</td>
        <td>{e.kind === 'other' && <form action={deleteEntry}><input type="hidden" name="id" value={e.id} /><button className="btn ghost sm">Delete</button></form>}</td>
      </tr>)}
      {!list.length && <tr><td colSpan={5} className="muted">No money movements this month.</td></tr>}
    </tbody></table></div></div>
  </>;
}
