import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { tips, todos } from '@/lib/decisions';
import { getAutomation } from '@/lib/automation';
import { JOBS } from '@/lib/automationJobs';
import { getCowork } from '@/lib/cowork';
import { getBot } from '@/lib/assistant';
import { aiReady } from '@/lib/ai';
import Tips from '../dashboard/Tips';
import { fullAccess, toggleJob, toggleSetting } from '../automationActions';
import { decideItem } from '../decideActions';
import { db } from '@/lib/db';
import { lowStock } from '@/lib/decisions';
import { formatAmount, type Currency } from '@/lib/money';

type Item = { kind: string; id: string; title: string; sub: string; buttons: [string, string, string][]; href?: string; hrefLabel?: string };
const YES = 'orange', NO = 'ghost', BAD = 'ghost danger';
const money = (n: unknown, c: string) => formatAmount(Number(n), c as Currency);

// The actual things waiting, each with its own buttons, so most decisions take one tap here.
async function decisionItems(): Promise<Record<string, Item[]>> {
  const [pay, ship, returns, reviews, tasks, jobs, chats, low] = await Promise.all([
    db.order.findMany({ where: { payStatus: 'pending', payRef: { not: '' } }, orderBy: { createdAt: 'asc' }, take: 8 }),
    db.order.findMany({ where: { status: { lte: 1 }, payStatus: { in: ['paid', 'cod'] }, trackingNo: '' }, orderBy: { createdAt: 'asc' }, take: 8 }),
    db.returnRequest.findMany({ where: { status: 'pending' }, include: { order: true }, take: 8 }),
    db.review.findMany({ where: { status: 'pending' }, include: { product: { select: { name: true } } }, take: 8 }),
    db.automationTask.findMany({ where: { status: 'pending' }, take: 8 }),
    db.aiJob.findMany({ where: { status: 'proposed' }, orderBy: { createdAt: 'desc' }, take: 8 }),
    db.chatThread.findMany({ where: { closed: false, needsHuman: true }, include: { messages: { orderBy: { at: 'desc' }, take: 1 } }, orderBy: { lastAt: 'desc' }, take: 8 }),
    lowStock().catch(() => []),
  ]);
  return {
    confirm: pay.map(o => ({ kind: 'pay', id: o.id, title: `${o.no} · ${o.name} · ${money(o.total, o.currency)}`, sub: `${o.payMethod} · transaction ID ${o.payRef}`, buttons: [['yes', '✓ Paid', YES], ['no', '✕ Reject', BAD]], href: `/admin/orders/${o.id}` })),
    ship: ship.map(o => ({ kind: 'ship', id: o.id, title: `${o.no} · ${o.name}, ${o.country} · ${money(o.total, o.currency)}`, sub: `${o.payStatus === 'cod' ? 'Cash on delivery' : 'Paid'} · ${o.courier || 'courier not chosen'}`, buttons: [['yes', '🚚 Book courier', YES], ['no', '✕ Cancel order', BAD]], href: `/admin/orders/${o.id}` })),
    returns: returns.map(r => ({ kind: 'return', id: r.id, title: `${r.order.no} · ${r.order.name} · ${r.reason}`, sub: `${r.note || 'No note'} · refund ${money(Number(r.order.total) + Number(r.order.creditUsed), r.order.currency)} as store credit`, buttons: [['yes', '✓ Approve', YES], ['no', '✕ Reject', BAD]] })),
    reviews: reviews.map(r => ({ kind: 'review', id: r.id, title: `${'★'.repeat(r.stars)} ${r.name} on ${r.product.name}`, sub: r.text.slice(0, 140), buttons: [['yes', '✓ Publish', YES], ['no', 'Hide', NO], ['delete', 'Delete', BAD]] })),
    tasks: tasks.map(t => ({ kind: 'task', id: t.id, title: t.label, sub: `Automation · ${t.job}`, buttons: [['yes', '✓ Approve', YES], ['no', '✕ Reject', BAD]] })),
    aijobs: jobs.map(j => ({ kind: 'aijob', id: j.id, title: j.prompt.slice(0, 120), sub: j.result.slice(0, 160), buttons: [['yes', '✓ Approve plan', YES], ['no', '✕ Reject', BAD]], href: `/admin/ai?job=${j.id}`, hrefLabel: 'See plan' })),
    chats: chats.map(c => ({ kind: 'chat', id: c.id, title: c.name || c.email || 'Visitor ' + c.id.slice(-4), sub: c.messages[0]?.text.slice(0, 140) || '', buttons: [['yes', 'Let AI answer', NO], ['no', 'Close', BAD]], href: `/admin/chats?id=${c.id}`, hrefLabel: 'Reply' })),
    stock: low.slice(0, 8).map(p => ({ kind: 'stock', id: p.id, title: `${p.name}${p.sub ? ' · ' + p.sub : ''}`, sub: `${p.all} left`, buttons: [['hide', 'Hide product', NO]], href: `/admin/products/${p.id}`, hrefLabel: 'Restock' })),
  };
}

// Which automatic switch takes each kind of decision off your hands.
const AUTO_FOR: Record<string, string> = { ship: 'courier', reviews: 'reviews', stock: 'lowStock', tasks: 'courier' };

function Switch({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className="sw-wrap">{children}<button className={`sw ${on ? 'on' : ''}`} name="on" value={on ? 'no' : 'yes'} aria-label={on ? 'Turn off' : 'Turn on'}><i /></button></span>;
}

export default async function Decisions() {
  if (!(await adminOrNull('decisions'))) return null;
  const [list, ideas, a, cw, bot, ai, items] = await Promise.all([todos(), tips(), getAutomation(), getCowork(), getBot(), aiReady(), decisionItems()]);
  const live = a.master && !a.stopped;
  return <>
    <div className="page-head"><div><h2>Today&apos;s decisions</h2><p>Everything that needs you, in one place. Switch a job on and the AI and automation do it by themselves. Switch it off and it waits here for your decision.</p></div></div>

    <form action={fullAccess} className={`panel access ${a.full ? 'on' : ''}`}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <b style={{ fontSize: '1.1rem' }}>{a.full ? '✅ Full access ON: orders, courier, delivery, reviews, offers, SEO and chat run by themselves' : '🔑 Full access OFF: jobs below wait for your decision'}</b>
        <div className="muted sm">{a.full ? 'Nothing waits for you except payments you must check in your own bank or wallet. Every action is saved in Activity history.' : 'One switch turns everything to automatic. Or switch single jobs below.'}{!ai && ' Connect a free AI in AI tools so the AI jobs can work.'}</div>
      </div>
      <Switch on={a.full}><b className="sm">{a.full ? 'On' : 'Off'}</b></Switch>
    </form>

    {list.length ? <div className="panel"><h3>Waiting for you ({list.reduce((x, t) => x + t.n, 0)})</h3>
      {list.map(t => {
        const jid = AUTO_FOR[t.id], j = JOBS.find(x => x.id === jid), rows = items[t.id] || [];
        return <div key={t.id} className="dec-group">
          <div className="dec-head"><span className="tag orange">{t.n}</span><div className="grow"><b>{t.title}</b><p className="muted sm" style={{ margin: 0 }}>{t.text}</p></div>
            {j && <form action={toggleJob}><input type="hidden" name="job" value={j.id} /><Switch on={live && a.jobs[j.id].mode === 'auto'}><span className="muted sm">Auto</span></Switch></form>}
            <Link className="link sm" href={t.href}>Open all →</Link></div>
          {rows.map(r => <form key={r.id} action={decideItem} className="dec-row"><input type="hidden" name="kind" value={r.kind} /><input type="hidden" name="id" value={r.id} />
            <div className="grow"><b className="sm">{r.title}</b><div className="muted sm">{r.sub}</div></div>
            {r.buttons.map(([to, label, cls]) => <button key={to} className={`btn sm ${cls}`} name="to" value={to}>{label}</button>)}
            {r.href && <Link className="btn sm ghost" href={r.href}>{r.hrefLabel || 'Open'}</Link>}
          </form>)}
        </div>;
      })}</div>
      : <div className="ok-box"><span className="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg></span><div><h3>All done for today</h3><p>Nothing needs you. Orders, reminders and replies keep running automatically.</p></div></div>}


    <div className="grid2">
      <div className="panel"><h3>What runs by itself</h3>
        <div className="rows">
          {JOBS.map(j => <form key={j.id} action={toggleJob} className="sw-row"><input type="hidden" name="job" value={j.id} />
            <div className="grow"><b>{j.name}</b><p className="muted sm" style={{ margin: 0 }}>{j.does}</p></div>
            <Switch on={live && a.jobs[j.id].mode === 'auto'}>{a.jobs[j.id].mode === 'approve' && <span className="tag">asks you</span>}</Switch></form>)}
          <form action={toggleSetting} className="sw-row"><input type="hidden" name="what" value="chatbot" /><div className="grow"><b>AI chatbot answers customers</b><p className="muted sm" style={{ margin: 0 }}>Order tracking, products, delivery, returns, 24/7. Customers can still press Contact the seller.</p></div><Switch on={bot.on}>{null}</Switch></form>
          <form action={toggleSetting} className="sw-row"><input type="hidden" name="what" value="cowork" /><div className="grow"><b>AI co-worker acts without asking</b><p className="muted sm" style={{ margin: 0 }}>Off: it shows its plan and waits for your Approve.</p></div><Switch on={cw.mode === 'auto'}>{null}</Switch></form>
        </div>
        {!live && <p className="err sm">{a.stopped ? 'Emergency stop is on in Automation: nothing runs.' : 'The master switch is off in Automation: nothing runs.'}</p>}
        <p className="muted sm">More settings, the run log and the emergency stop are in <Link className="link" href="/admin/automation">Automation</Link>.</p>
      </div>
      <Tips list={ideas} />
    </div>
  </>;
}
