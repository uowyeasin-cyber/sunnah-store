import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { COUNTRIES } from '@/lib/shipping';
import { bulkCreate } from '../../orderActions';

const ROWS = 8;

// Bulk Create Order: type several phone/WhatsApp orders in rows, or paste them from a sheet.
export default async function NewOrders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await adminOrNull())) return null;
  const sp = await searchParams, rows = Math.min(40, Math.max(ROWS, Number(sp.rows) || ROWS));
  const products = await db.product.findMany({ where: { active: true }, orderBy: { sort: 'asc' } });
  const opts = <>{products.map(p => <option key={p.id} value={p.slug}>{p.name} · {p.sub}</option>)}</>;
  return <>
    <div><div className="kicker"><Link href="/admin/orders">Orders</Link></div><h2 style={{ fontSize: '2rem' }}>Bulk create order</h2></div>
    {sp.failed && <div className="ord-note bad"><b>{sp.made || 0} created. These were not:</b><pre>{sp.failed}</pre></div>}
    <form className="panel" action={bulkCreate} style={{ gap: 18 }}>
      <p className="muted" style={{ fontSize: '.88rem' }}>For orders you took on the phone, WhatsApp or Facebook. Fill one row per order; empty rows are skipped. Prices and delivery charge are worked out like the website. Cash on delivery unless you pick Paid.</p>
      <div className="tbl-wrap"><table className="ord-new">
        <thead><tr><th>#</th><th>Name *</th><th>Phone *</th><th>Country</th><th>Address *</th><th>City</th><th>Product *</th><th>Qty</th><th>2nd product</th><th>Qty</th><th>Payment</th><th>Email</th><th>Note</th></tr></thead>
        <tbody>{Array.from({ length: rows }, (_, i) => <tr key={i}>
          <td className="muted">{i + 1}</td>
          <td><input name={`name-${i}`} /></td><td><input name={`phone-${i}`} inputMode="tel" /></td>
          <td><select name={`country-${i}`} defaultValue="Bangladesh">{COUNTRIES.filter(c => c !== 'Other').map(c => <option key={c}>{c}</option>)}</select></td>
          <td><input name={`address-${i}`} style={{ minWidth: 200 }} /></td><td><input name={`city-${i}`} /></td>
          <td><select name={`product-${i}`} defaultValue=""><option value="">Choose…</option>{opts}</select></td><td><input name={`qty-${i}`} type="number" min="1" max="99" defaultValue="1" style={{ width: 60 }} /></td>
          <td><select name={`product2-${i}`} defaultValue=""><option value="">None</option>{opts}</select></td><td><input name={`qty2-${i}`} type="number" min="1" max="99" defaultValue="1" style={{ width: 60 }} /></td>
          <td><select name={`pay-${i}`} defaultValue="cod"><option value="cod">Cash on delivery</option><option value="paid">Paid already</option></select></td>
          <td><input name={`email-${i}`} type="email" /></td><td><input name={`note-${i}`} /></td>
        </tr>)}</tbody>
      </table></div>
      {rows < 40 && <Link className="btn ghost sm" style={{ alignSelf: 'start' }} href={`/admin/orders/new?rows=${rows + 8}`}>+ 8 more rows</Link>}
      <details>
        <summary style={{ cursor: 'pointer' }}><b>Or paste many orders from Excel / Google Sheets</b></summary>
        <p className="muted" style={{ fontSize: '.85rem', margin: '10px 0' }}>One order per line. Columns in this order, separated by Tab (copy from a sheet) or <code>|</code>:<br />
          <code>Name | Phone | Country | Address | City | Products | Payment | Email | Note</code><br />
          Products: product code or name, with <code>x2</code> for quantity, several separated by commas. Payment: <code>cod</code> or <code>paid</code>.<br />
          Example: <code>Rahim Uddin | 01712345678 | BD | House 12, Road 5, Dhanmondi | Dhaka | pocket-pen-brass x1, peelu-sticks x2 | cod</code></p>
        <p className="muted" style={{ fontSize: '.8rem' }}>Product codes: {products.map(p => p.slug).join(', ')}</p>
        <textarea name="paste" rows={6} style={{ width: '100%', fontFamily: 'monospace', fontSize: '.85rem' }} />
      </details>
      <div><button className="btn">Create orders</button></div>
    </form>
  </>;
}
