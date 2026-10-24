import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { deleteExpense, saveExpense } from '../actions';

const CATS = ['Buying stock', 'Packaging', 'Courier and shipping', 'Advertising', 'Rent', 'Salaries', 'Website and apps', 'Payment fees', 'Bank charges', 'Tax', 'Other'];

export default async function Expenses() {
  if (!(await adminOrNull())) return null;
  const list = await db.expense.findMany({ orderBy: { date: 'desc' }, take: 300 });
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Expenses</h2></div>
    <form className="panel" action={saveExpense}>
      <h3>Add an expense</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>Money spent running the store. Reports take it off sales to show profit or loss. Product costs go on each product (“Cost to you”), not here.</p>
      <div className="two"><div className="field"><label htmlFor="date">Date</label><input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
        <div className="field"><label htmlFor="category">Type</label><select id="category" name="category">{CATS.map(c => <option key={c}>{c}</option>)}</select></div></div>
      <div className="two"><div className="field"><label htmlFor="amount">Amount</label><input id="amount" name="amount" type="number" step="0.01" min="0.01" required /></div>
        <div className="field"><label htmlFor="currency">Currency</label><select id="currency" name="currency"><option>BDT</option><option>MYR</option><option>USD</option></select></div></div>
      <div className="field"><label htmlFor="note">Note</label><input id="note" name="note" placeholder="e.g. Facebook ads, October" /></div>
      <button className="btn">Add expense</button>
    </form>
    <div className="panel"><div className="tbl-wrap"><table>
      <thead><tr><th>Date</th><th>Type</th><th>Note</th><th className="num">Amount</th><th /></tr></thead>
      <tbody>{list.map(e => <tr key={e.id}><td>{e.date.toISOString().slice(0, 10)}</td><td>{e.category}</td><td>{e.note}</td><td className="num">{formatAmount(Number(e.amount), e.currency as Currency)}</td>
        <td><form action={deleteExpense}><input type="hidden" name="id" value={e.id} /><button className="btn ghost" style={{ padding: '4px 10px' }}>Delete</button></form></td></tr>)}</tbody>
    </table></div>{!list.length && <p className="muted">No expenses yet.</p>}</div>
  </>;
}
