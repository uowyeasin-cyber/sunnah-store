import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getAutomation } from '@/lib/automation';
import { createPO, emailPO, movePO, saveSupplier } from '../supplierActions';

const WH = ['BD', 'MY', 'US'] as const;
const CUR = ['BDT', 'MYR', 'USD', 'CNY', 'INR', 'PKR', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'];
const money = (n: number, c: string) => `${c} ${n.toFixed(2)}`;

// Suppliers, purchase orders and stock per warehouse, with what is already on the way.
export default async function Suppliers({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await adminOrNull('suppliers'))) return null;
  const sp = await searchParams;
  const [suppliers, orders, products, auto] = await Promise.all([
    db.supplier.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    db.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { lines: true, supplier: true } }),
    db.product.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { name: 'asc' }], select: { id: true, name: true, sub: true, stock: true, costCents: true } }),
    getAutomation(),
  ]);
  const edit = suppliers.find(s => s.id === sp.edit);
  const incoming: Record<string, number> = {};
  for (const o of orders) if (o.status === 'ordered') for (const l of o.lines) incoming[`${l.productId}:${o.warehouse}`] = (incoming[`${l.productId}:${o.warehouse}`] || 0) + l.qty;
  const low = auto.lowStockAt;
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Suppliers &amp; stock</h2></div>
    <p className="muted" style={{ fontSize: '.88rem' }}>Keep your makers and wholesalers here, write purchase orders, and receive them into a warehouse. Nothing is sent to a supplier unless you press Email to supplier. Receiving adds the units to stock once.</p>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Stock by warehouse</h3>
      <div className="tbl-wrap"><table><thead><tr><th>Product</th>{WH.map(w => <th key={w} className="num">{w}</th>)}</tr></thead><tbody>
        {products.map(p => { const st = (p.stock || {}) as Record<string, number>; return <tr key={p.id}><td>{p.name}{p.sub && <span className="muted"> · {p.sub}</span>}</td>
          {WH.map(w => { const n = Number(st[w] || 0), inc = incoming[`${p.id}:${w}`]; return <td key={w} className="num"><span style={{ color: n <= low ? '#b3261e' : undefined, fontWeight: n <= low ? 600 : undefined }}>{n}</span>{inc ? <div className="muted" style={{ fontSize: '.75rem' }}>+{inc} on the way</div> : null}</td>; })}</tr>; })}
      </tbody></table></div>
      <p className="muted" style={{ fontSize: '.78rem', marginBottom: 0 }}>Red is at or under the low-stock level ({low}), set in Automation.</p>
    </div>

    <form action={createPO} className="panel" id="new-po"><h3 style={{ marginTop: 0 }}>New purchase order</h3>
      {suppliers.length ? <>
        <div className="two"><div className="field"><label htmlFor="supplierId">Supplier</label><select id="supplierId" name="supplierId" required>{suppliers.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>)}</select></div>
          <div className="field"><label htmlFor="warehouse">Deliver to warehouse</label><select id="warehouse" name="warehouse">{WH.map(w => <option key={w}>{w}</option>)}</select></div></div>
        <div className="tbl-wrap"><table><thead><tr><th>Product</th><th>Quantity</th><th>Unit cost (supplier currency)</th></tr></thead><tbody>
          {Array.from({ length: 8 }, (_, i) => <tr key={i}><td><select name={`product-${i}`} aria-label={`Product ${i + 1}`} defaultValue=""><option value="">—</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}{p.sub ? ` · ${p.sub}` : ''}</option>)}</select></td>
            <td><input name={`qty-${i}`} type="number" min="0" step="1" aria-label={`Quantity ${i + 1}`} style={{ width: 90 }} /></td><td><input name={`cost-${i}`} type="number" min="0" step="0.01" aria-label={`Unit cost ${i + 1}`} style={{ width: 120 }} /></td></tr>)}
        </tbody></table></div>
        <div className="two"><div className="field"><label htmlFor="shipping">Shipping / freight</label><input id="shipping" name="shipping" type="number" min="0" step="0.01" /></div>
          <div className="field"><label htmlFor="note">Note</label><input id="note" name="note" maxLength={500} placeholder="e.g. engraving, packaging" /></div></div>
        <button className="btn">Save as draft</button>
      </> : <p className="muted">Add a supplier below first.</p>}
    </form>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Purchase orders</h3>
      <div className="tbl-wrap"><table><thead><tr><th>Order</th><th>Items</th><th>Status</th><th className="num">Total</th><th /></tr></thead><tbody>
        {orders.map(o => { const total = o.lines.reduce((a, l) => a + Number(l.unitCost) * l.qty, 0) + Number(o.shipping); return <tr key={o.id} style={sp.po === o.id ? { background: 'var(--cloth)' } : undefined}>
          <td><b>{o.no}</b><div className="muted" style={{ fontSize: '.78rem' }}>{o.supplier.name} → {o.warehouse}<br />{o.createdAt.toISOString().slice(0, 10)}{o.supplier.leadDays && o.orderedAt ? ` · expected ~${new Date(o.orderedAt.getTime() + o.supplier.leadDays * 864e5).toISOString().slice(0, 10)}` : ''}</div></td>
          <td style={{ fontSize: '.85rem' }}>{o.lines.map(l => <div key={l.id}>{l.qty} × {l.name}</div>)}{o.note && <div className="muted">{o.note}</div>}</td>
          <td><span className={`status ${o.status === 'received' ? 'live' : 'hidden'}`}>{o.status}</span>{o.receivedAt && <div className="muted" style={{ fontSize: '.75rem' }}>{o.receivedAt.toISOString().slice(0, 10)}</div>}</td>
          <td className="num" style={{ whiteSpace: 'nowrap' }}>{money(total, o.currency)}</td>
          <td>{(o.status === 'draft' || o.status === 'ordered') && <div style={{ display: 'grid', gap: 6 }}>
            {o.supplier.email && <form action={emailPO}><input type="hidden" name="id" value={o.id} /><button className="btn ghost sm">Email to supplier</button></form>}
            <form action={movePO} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><input type="hidden" name="id" value={o.id} />
              {o.status === 'draft' && <button className="btn ghost sm" name="to" value="ordered">Mark ordered</button>}
              <button className="btn sm" name="to" value="received">Received into {o.warehouse}</button>
              <button className="btn ghost sm" name="to" value="cancelled">Cancel</button></form></div>}</td>
        </tr>; })}
        {!orders.length && <tr><td colSpan={5} className="muted">No purchase orders yet.</td></tr>}
      </tbody></table></div>
    </div>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Suppliers</h3>
      <div className="tbl-wrap"><table><tbody>
        {suppliers.map(s => <tr key={s.id}><td><b>{s.name}</b>{!s.active && <span className="muted"> (inactive)</span>}<div className="muted" style={{ fontSize: '.78rem' }}>{[s.contact, s.email, s.phone, s.country, `${s.currency}`, `${s.leadDays} days`].filter(Boolean).join(' · ')}</div>{s.notes && <div style={{ fontSize: '.82rem' }}>{s.notes}</div>}</td>
          <td><Link className="btn ghost sm" href={`/admin/suppliers?edit=${s.id}#supplier-form`}>Edit</Link></td></tr>)}
        {!suppliers.length && <tr><td className="muted">No suppliers yet.</td></tr>}
      </tbody></table></div>
    </div>

    <form action={saveSupplier} className="panel" id="supplier-form" key={edit?.id || 'new'}><h3 style={{ marginTop: 0 }}>{edit ? `Edit ${edit.name}` : 'Add a supplier'}</h3>
      {edit && <input type="hidden" name="id" value={edit.id} />}
      <div className="two"><div className="field"><label htmlFor="name">Name</label><input id="name" name="name" required defaultValue={edit?.name} /></div>
        <div className="field"><label htmlFor="contact">Contact person</label><input id="contact" name="contact" defaultValue={edit?.contact} /></div></div>
      <div className="two"><div className="field"><label htmlFor="em">Email</label><input id="em" name="email" type="email" defaultValue={edit?.email} /></div>
        <div className="field"><label htmlFor="ph">Phone / WhatsApp</label><input id="ph" name="phone" defaultValue={edit?.phone} /></div></div>
      <div className="two"><div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue={edit?.country} /></div>
        <div className="field"><label htmlFor="currency">Currency you pay in</label><select id="currency" name="currency" defaultValue={edit?.currency || 'USD'}>{CUR.map(c => <option key={c}>{c}</option>)}</select></div></div>
      <div className="two"><div className="field"><label htmlFor="leadDays">Days from order to delivery</label><input id="leadDays" name="leadDays" type="number" min="0" max="365" defaultValue={edit?.leadDays ?? 14} /></div>
        <div className="field"><label htmlFor="active">Status</label><select id="active" name="active" defaultValue={edit?.active === false ? 'off' : 'on'}><option value="on">Active</option><option value="off">Inactive</option></select></div></div>
      <div className="field"><label htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={edit?.notes} /></div>
      <button className="btn">{edit ? 'Save supplier' : 'Add supplier'}</button>
    </form>
  </>;
}
