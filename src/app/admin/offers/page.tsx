import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { couponText, getWelcome } from '@/lib/coupons';
import { allowFlashSale, couponAction, createCoupon, createOffer, saveWelcome, stopOffer } from '../offerActions';

// Templates fill the new-offer form through the address, so picking one needs no script.
const TEMPLATES: Record<string, { name: string; why: string; kind: string; buy?: number; get?: number; pct?: number; usd?: number; hours?: string; applies?: string; style?: string }> = {
  b2g1: { name: 'Buy 2 Get 1 free', why: 'Customers buy more. Best on items with a good margin.', kind: 'bxgy', buy: 2, get: 1 },
  b3g1: { name: 'Buy 3 Get 1 free', why: 'Safer than 2+1: you give 25% instead of 33%.', kind: 'bxgy', buy: 3, get: 1 },
  all10: { name: '10% off everything', why: 'Simple store-wide sale. Low risk.', kind: 'pct', pct: 10 },
  flash20: { name: 'Flash sale: 20% off for 24 hours', why: 'Shows a countdown. Creates urgency.', kind: 'pct', pct: 20, hours: '24h', style: 'timer' },
  cat15: { name: '15% off one category', why: 'Push a category that is slow this month.', kind: 'pct', pct: 15, applies: 'cat' },
  usd2: { name: '$2 off each item', why: 'Easy to understand on cheap items.', kind: 'usd', usd: 2 },
};
const COUPONS = [
  { code: 'SAVE10', kind: 'pct', value: 10, min: 30, days: 30, uses: 200, why: '10% off orders over $30. Good for social media posts. Valid 30 days, up to 200 uses.' },
  { code: 'FLAT5', kind: 'amount', value: 5, min: 40, days: 14, uses: 100, why: '$5 off orders over $40. Raises the order size. Valid 14 days, up to 100 uses.' },
  { code: 'VIP15', kind: 'pct', value: 15, min: 50, days: 60, uses: 50, why: '15% off over $50. Send to your best customers. Valid 60 days, up to 50 uses.' },
  { code: 'COMEBACK', kind: 'pct', value: 12, min: 0, days: 7, uses: 100, why: '12% off for one week. Win back quiet customers. Valid 7 days, up to 100 uses.' },
];
const STYLES = [['pill', 'Pill'], ['ribbon', 'Ribbon'], ['stamp', 'Stamp'], ['glow', 'Glow'], ['timer', 'Countdown']];
const HOURS = [['none', 'No end'], ['24h', '24 hours'], ['3d', '3 days'], ['1w', '1 week'], ['2w', '2 weeks']];

export default async function Offers({ searchParams }: PageProps<'/admin/offers'>) {
  if (!(await adminOrNull('offers'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const now = new Date();
  const [offers, coupons, products, cats, welcome, gifts] = await Promise.all([
    db.offer.findMany({ where: { product: { archived: false } }, include: { product: { select: { name: true, sub: true, active: true } } }, orderBy: { label: 'asc' } }),
    db.coupon.findMany({ where: { note: { not: 'Welcome gift' } }, orderBy: { createdAt: 'desc' } }),
    db.product.findMany({ where: { archived: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, sub: true } }),
    db.category.findMany({ orderBy: { sort: 'asc' } }),
    getWelcome(),
    db.coupon.groupBy({ by: ['used'], where: { note: 'Welcome gift' }, _count: true }),
  ]);
  const live = offers.filter(o => o.on && (!o.endsAt || o.endsAt > now) && o.product.active);
  const t = TEMPLATES[sp.t || ''] || TEMPLATES.b2g1;
  const giftsSent = gifts.reduce((a, g) => a + g._count, 0), giftsUsed = gifts.filter(g => g.used > 0).reduce((a, g) => a + g._count, 0);
  const activeCoupons = coupons.filter(c => c.on && (!c.endsAt || c.endsAt > now) && (!c.maxUses || c.used < c.maxUses));
  return <>
    <div className="page-head"><div><h2>Offers & coupons</h2><p>Pick a template or allow a suggestion. Badge text is written for you, and offers never stack (one per product), so you never lose money by accident.</p></div></div>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    <div className="stats">
      <div className="stat"><small>Offers live now</small><b>{live.length}</b></div>
      <div className="stat"><small>Suggestions waiting</small><b className={live.length ? '' : 'warn'}>{live.length ? 0 : 1}</b></div>
      <div className="stat"><small>Coupons active</small><b>{activeCoupons.length}</b></div>
      <div className="stat"><small>Welcome gifts used</small><b>{giftsUsed} <span style={{ display: 'inline', fontSize: '.9rem' }}>/ {giftsSent}</span></b></div>
    </div>

    {!live.length && <div className="panel"><h3>Suggested offers from your sales and stock</h3>
      <div className="rows"><div><div className="grow"><b>Weekend sale</b> <span className="tag orange">FLASH SALE · 10% OFF</span> <span className="tag">2 days</span><p>You have no offer running. A 10% sale for 48 hours with a countdown brings visitors back.</p></div>
        <form action={allowFlashSale}><button className="btn sm">Allow</button></form></div></div></div>}

    <form className="panel" action={createOffer}>
      <h3>New offer</h3>
      <div className="kicker">Start from a template</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>{Object.entries(TEMPLATES).map(([k, x]) =>
        <Link key={k} href={`/admin/offers?t=${k}`} className="card" style={{ padding: '12px 14px', textDecoration: 'none', borderColor: x === t ? 'var(--accent)' : undefined, background: x === t ? '#fff7ed' : undefined }}><b className="sm" style={{ fontSize: '.9rem' }}>{x.name}</b><div className="muted sm">{x.why}</div></Link>)}</div>
      <div className="grid2" key={sp.t || 'b2g1'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label>Kind of offer</label><select name="kind" defaultValue={t.kind}><option value="bxgy">Buy X get Y free</option><option value="pct">% off</option><option value="usd">$ off each item</option></select></div>
          <div className="two"><div className="field"><label>Customer buys (X)</label><input name="buy" type="number" min="1" defaultValue={t.buy ?? 2} /></div><div className="field"><label>Gets free (Y)</label><input name="get" type="number" min="1" defaultValue={t.get ?? 1} /></div></div>
          <div className="two"><div className="field"><label>% off</label><input name="pct" type="number" min="1" max="90" defaultValue={t.pct ?? 10} /></div><div className="field"><label>$ off each item</label><input name="usd" type="number" min="0.5" step="0.5" defaultValue={t.usd ?? 2} /></div></div>
          <p className="muted sm" style={{ margin: 0 }}>Only the fields for the kind you picked are used.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label>Applies to</label><select name="applies" defaultValue={t.applies || 'all'}><option value="all">All products</option><option value="cat">One category</option><option value="product">One product</option></select></div>
          <div className="field"><label>Category or product (for &quot;one&quot;)</label><select name="target"><optgroup label="Categories">{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup><optgroup label="Products">{products.map(p => <option key={p.id} value={p.id}>{p.name}{p.sub ? ` · ${p.sub}` : ''}</option>)}</optgroup></select></div>
          <div className="two"><div className="field"><label>How long</label><select name="hours" defaultValue={t.hours || 'none'}>{HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="field"><label>Badge look</label><select name="style" defaultValue={t.style || 'pill'}>{STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
        </div>
      </div>
      <div className="field"><label>Badge customers see (empty = written automatically from the offer)</label><input name="label" placeholder={t.kind === 'bxgy' ? `Buy ${t.buy} Get ${t.get} FREE` : t.kind === 'usd' ? `$${t.usd} OFF` : `${t.pct}% OFF`} /></div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="on" defaultChecked /> Live on the store</label><button className="btn orange">Create offer</button></div>
    </form>

    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 22px 6px', alignItems: 'center' }}><h3>Offers on products ({offers.length})</h3>{offers.length > 0 && <form action={stopOffer}><input type="hidden" name="id" value="all" /><button className="btn danger sm">Stop all</button></form>}</div>
      {offers.length ? <div className="tbl-wrap"><table><thead><tr><th>Product</th><th>Badge</th><th>Deal</th><th>Ends</th><th>Status</th><th /></tr></thead><tbody>{offers.map(o => { const on = o.on && (!o.endsAt || o.endsAt > now); return <tr key={o.id}>
        <td><b>{o.product.name}</b><div className="muted sm">{o.product.sub}</div></td><td><span className="tag orange">{o.label}</span></td>
        <td className="sm">{o.buy ? `Buy ${o.buy} get ${o.get} free` : o.pct ? `${o.pct}% off` : 'Label only'}</td>
        <td className="sm">{o.endsAt ? o.endsAt.toISOString().slice(0, 16).replace('T', ' ') : 'No end'}</td>
        <td><span className={`tag ${on ? 'green' : ''}`}>{on ? 'Live' : o.on ? 'Ended' : 'Off'}</span></td>
        <td><form action={stopOffer}><input type="hidden" name="id" value={o.productId} /><button className="btn ghost sm">Stop</button></form></td></tr>; })}</tbody></table></div> : <p className="muted" style={{ padding: '0 22px 18px' }}>No offers yet.</p>}
    </div>

    <div className="panel"><h3>Coupons</h3><p className="muted" style={{ margin: 0 }}>Make a coupon in one click. The code, end date and use limit are filled in for you. Customers type the code at checkout.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>{COUPONS.map(c => <form key={c.code} action={createCoupon} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries({ code: c.code, kind: c.kind, value: c.value, min: c.min, days: c.days, uses: c.uses }).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <span className="tag" style={{ background: 'var(--solid)', color: '#fff', alignSelf: 'flex-start' }}>{c.code}</span><span className="muted sm" style={{ flex: 1 }}>{c.why}</span><button className="btn ghost sm" disabled={coupons.some(x => x.code === c.code)}>{coupons.some(x => x.code === c.code) ? 'Created' : 'Create'}</button></form>)}</div>
      <details className="card" style={{ padding: 14, borderStyle: 'dashed' }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>+ Make my own coupon</summary>
        <form action={createCoupon} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 12, alignItems: 'end' }}>
          <div className="field"><label>Code</label><input name="code" required placeholder="EID20" /></div>
          <div className="field"><label>Kind</label><select name="kind"><option value="pct">% off</option><option value="amount">$ off</option></select></div>
          <div className="field"><label>Value</label><input name="value" type="number" step="0.5" min="0.5" required defaultValue={10} /></div>
          <div className="field"><label>Minimum order ($)</label><input name="min" type="number" min="0" defaultValue={0} /></div>
          <div className="field"><label>Valid days (0 = no end)</label><input name="days" type="number" min="0" defaultValue={30} /></div>
          <div className="field"><label>Use limit (0 = no limit)</label><input name="uses" type="number" min="0" defaultValue={100} /></div>
          <div className="field"><label>Note (only you see it)</label><input name="note" /></div>
          <div><button className="btn">Create coupon</button></div>
        </form></details>
      {coupons.length > 0 && <div className="tbl-wrap"><table><thead><tr><th>Code</th><th>Deal</th><th>Used</th><th>Ends</th><th>Status</th><th /></tr></thead><tbody>{coupons.map(c => { const ok = activeCoupons.includes(c); return <tr key={c.id}>
        <td><b>{c.code}</b>{c.note && <div className="muted sm">{c.note}</div>}</td><td className="sm">{couponText(c)}</td><td className="num">{c.used}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
        <td className="sm">{c.endsAt ? c.endsAt.toISOString().slice(0, 10) : 'No end'}</td><td><span className={`tag ${ok ? 'green' : ''}`}>{ok ? 'Active' : c.on ? 'Ended' : 'Off'}</span></td>
        <td style={{ display: 'flex', gap: 6 }}><form action={couponAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="what" value="toggle" /><button className="btn ghost sm">{c.on ? 'Pause' : 'Resume'}</button></form>
          <form action={couponAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="what" value="delete" /><button className="btn danger sm">Delete</button></form></td></tr>; })}</tbody></table></div>}
    </div>

    <form className="panel" action={saveWelcome}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><h3>Welcome gift for new customers</h3><button className="btn ghost sm" name="recommended" value="1">Use recommended</button></div>
      <p className="muted" style={{ margin: 0 }}>Every new customer who signs in for the first time gets a friendly email with a personal one-time code, for their email only. Recommended: 10% off orders over $20, valid 14 days. The minimum order protects your profit on very small orders.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <div className="field"><label>Discount %</label><input name="pct" type="number" min="1" max="50" defaultValue={welcome.pct} /></div>
        <div className="field"><label>Minimum order (USD)</label><input name="minUsd" type="number" min="0" defaultValue={welcome.minUsd} /></div>
        <div className="field"><label>Valid for (days)</label><input name="days" type="number" min="1" max="90" defaultValue={welcome.days} /></div>
      </div>
      <div className="field"><label>Extra line in the message (optional)</label><input name="line" defaultValue={welcome.line} placeholder="Free delivery on your first order in Dhaka" /></div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="on" defaultChecked={welcome.on} /> Send welcome gift automatically</label><button className="btn">Save</button></div>
    </form>
  </>;
}
