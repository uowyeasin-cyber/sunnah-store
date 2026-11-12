import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { formatAmount, isCurrency } from '@/lib/money';
import { shareCfg } from '@/lib/promo';
import { saveShare } from '../promoActions';

const row = { display: 'flex', gap: 6, alignItems: 'center' } as const;
const LIVE = { referrer: { not: '' }, payStatus: { notIn: ['failed', 'refunded', 'cancelled'] } };

// Share & earn: referral credit for sharers, a discount for the friend, and share-to-unlock.
export default async function SharePage({ searchParams }: PageProps<'/admin/share'>) {
  if (!(await adminOrNull('share'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const [s, byCur, top, recent] = await Promise.all([
    getSettings(),
    db.order.groupBy({ by: ['currency', 'status'], where: LIVE, _sum: { refReward: true, total: true }, _count: true }),
    db.order.groupBy({ by: ['referrer'], where: LIVE, _count: true, orderBy: { _count: { referrer: 'desc' } }, take: 8 }),
    db.order.findMany({ where: { referrer: { not: '' } }, orderBy: { createdAt: 'desc' }, take: 12, select: { id: true, no: true, email: true, currency: true, total: true, refReward: true, status: true, payStatus: true, referrer: true, coupon: true } }),
  ]);
  const people = await db.customer.findMany({ where: { id: { in: [...new Set([...top.map(t => t.referrer), ...recent.map(r => r.referrer)])] } }, select: { id: true, email: true, name: true } });
  const who = (id: string) => { const p = people.find(x => x.id === id); return p ? p.name || p.email || id : id; };
  const sh = shareCfg(s.share);
  const money = (rows: { currency: string; v: number }[]) => rows.filter(r => r.v).map(r => isCurrency(r.currency) ? formatAmount(r.v, r.currency) : `${r.v} ${r.currency}`).join(' · ') || '0';
  const sum = (f: (r: (typeof byCur)[number]) => boolean, k: 'refReward' | 'total') => money(Object.entries(byCur.filter(f).reduce((a, r) => ({ ...a, [r.currency]: (a[r.currency] || 0) + Number(r._sum[k] || 0) }), {} as Record<string, number>)).map(([currency, v]) => ({ currency, v })));
  const orders = byCur.reduce((a, r) => a + r._count, 0);
  return <>
    <div className="page-head"><div><h2>Share &amp; earn</h2><p>Shoppers share your products. When a friend buys through their link, the sharer gets store credit once the order is delivered. You can also give the friend a discount, and let anyone unlock a discount just by sharing. Each part has its own switch.</p></div></div>
    {sp.saved && <p className="ord-note">Saved.</p>}
    <div className="stats">
      <div className="stat"><small>Share &amp; earn</small><b className={sh.on ? 'ok' : 'warn'}>{sh.on ? 'On' : 'Off'}</b><span>{sh.on ? `${sh.rewardPct}% credit to the sharer` : 'Turn it on below'}</span></div>
      <div className="stat"><small>Share to unlock</small><b className={sh.unlock ? 'ok' : 'warn'}>{sh.unlock ? `${sh.unlockPct}% off` : 'Off'}</b></div>
      <div className="stat"><small>Orders from shared links</small><b>{orders}</b><span>Sales: {sum(() => true, 'total')}</span></div>
      <div className="stat"><small>Credit paid / waiting for delivery</small><b>{sum(r => r.status === 6, 'refReward')}</b><span>Waiting: {sum(r => r.status !== 6, 'refReward')}</span></div>
    </div>
    <form className="panel" action={saveShare} style={{ display: 'grid', gap: 12 }}>
      <h3>Settings</h3>
      <label className="sm" style={row}><input type="checkbox" name="on" defaultChecked={sh.on} /> <b>Share &amp; earn on</b>: signed-in shoppers get their own link on every product page and in their account</label>
      <div className="two"><div className="field"><label>Credit for the sharer (% of what the friend pays for items)</label><input type="number" name="rewardPct" min="0" max="30" step="0.5" defaultValue={sh.rewardPct} /></div>
        <div className="field"><label>Most credit per order, in US dollars (0 = no limit)</label><input type="number" name="maxReward" min="0" step="0.5" defaultValue={sh.maxReward} /></div></div>
      <div className="field"><label>Discount for the friend who opens a shared link (%, 0 = none)</label><input type="number" name="friendPct" min="0" max="50" defaultValue={sh.friendPct} />
        <small className="muted">Only when no coupon code is used. Credit is paid when the order is delivered, never for the sharer&apos;s own orders, and not for refunded or cancelled ones.</small></div>
      <div className="field"><label>Line shown above the share buttons (empty = automatic)</label><input name="text" defaultValue={sh.text} placeholder="Share and earn: get 5% back when a friend buys with your link." /></div>
      <hr />
      <label className="sm" style={row}><input type="checkbox" name="unlock" defaultChecked={sh.unlock} /> <b>Share to unlock</b>: a shopper who taps any share button on a product gets a discount at checkout</label>
      <div className="field"><label>Share-to-unlock discount (%)</label><input type="number" name="unlockPct" min="0" max="50" defaultValue={sh.unlockPct} />
        <small className="muted">The store cannot see whether a post was really sent, so treat this like a small public code. Keep it low (5% or less).</small></div>
      <div><button className="btn orange">Save</button></div>
    </form>
    <div className="grid2">
      <div className="panel"><h3>Top sharers</h3>{top.length ? <table><tbody>{top.map(t => <tr key={t.referrer}><td>{who(t.referrer)}</td><td className="num">{t._count} orders</td></tr>)}</tbody></table> : <p className="muted">Nobody has sold through a link yet.</p>}</div>
      <div className="panel"><h3>Latest orders from shared links</h3>{recent.length ? <table><tbody>{recent.map(o => <tr key={o.id}><td><Link href={`/admin/orders/${o.id}`}>{o.no}</Link><div className="muted sm">{o.email} · shared by {who(o.referrer)}</div></td><td className="num">{isCurrency(o.currency) ? formatAmount(Number(o.refReward), o.currency) : o.refReward.toString()}<div className="muted sm">{o.status === 6 ? 'Paid' : ['failed', 'refunded', 'cancelled'].includes(o.payStatus) ? 'Not paid' : 'After delivery'}</div></td></tr>)}</tbody></table> : <p className="muted">None yet.</p>}</div>
    </div>
    <div className="panel"><p className="muted sm" style={{ margin: 0 }}>Give or take back credit by hand in <Link href="/admin/loyalty">Loyalty points</Link>. Want to pay a top sharer in cash (bKash, bank)? Send it yourself and take the same amount of credit back there.</p></div>
  </>;
}
