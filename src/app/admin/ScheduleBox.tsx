import Link from 'next/link';
import { db } from '@/lib/db';
import { aiSchedule, schedule, scheduledAction } from './automationActions';
import { LocalTime, TzField } from './LocalTime';

const KINDS: [string, string][] = [
  ['reminder', 'Reminder (just remind me)'], ['hide_product', 'Hide a product'], ['show_product', 'Make a product live'],
  ['set_offer', 'Start an offer'], ['stop_offer', 'Stop an offer'], ['book_courier', 'Book courier for an order'], ['ai_job', 'Give the AI co-worker a job'],
];

// "Upcoming reminders and tasks": on the Dashboard and in Automation.
export default async function ScheduleBox({ full = false }: { full?: boolean }) {
  const [list, products, history] = await Promise.all([
    db.scheduled.findMany({ where: { status: { in: ['pending', 'due', 'running'] } }, orderBy: { at: 'asc' }, take: 30 }),
    db.product.findMany({ where: { archived: false }, select: { slug: true, name: true, sub: true }, orderBy: { sort: 'asc' } }),
    full ? db.scheduled.findMany({ where: { status: { in: ['done', 'failed', 'cancelled'] } }, orderBy: { at: 'desc' }, take: 15 }) : Promise.resolve([]),
  ]);
  const next = list.find(x => x.status === 'pending');
  return <section className="panel sched" id="schedule">
    <details open>
      <summary className="row2" style={{ gap: 12 }}>
        <span style={{ fontSize: 26 }}>⏰</span>
        <div style={{ flex: 1 }}><b style={{ fontSize: '1.05rem' }}>Upcoming reminders and tasks ({list.length})</b>
          <div className="muted sm">{next ? <>Next: <b>{next.title}</b> · <LocalTime iso={next.at.toISOString()} /></> : 'Nothing scheduled. Add a reminder or set a job to run at a time.'}</div></div>
        <span className="link sm">Show / hide</span>
      </summary>
      <div className="sched-list">
        {list.map(x => <div key={x.id} className={`sched-row ${x.status}`}>
          <form action={scheduledAction}><input type="hidden" name="id" value={x.id} /><button className="tick" name="what" value="done" title="Tick off" aria-label={`Tick off ${x.title}`} /></form>
          <div style={{ flex: 1 }}><b>{x.title}</b>{x.status === 'due' && <span className="tag orange" style={{ marginLeft: 6 }}>now</span>}
            <div className="muted sm"><LocalTime iso={x.at.toISOString()} /> · {x.note}{x.result ? ` · ${x.result}` : ''}</div></div>
          <form action={scheduledAction}><input type="hidden" name="id" value={x.id} /><button className="link sm" name="what" value="cancel" style={{ border: 0, background: 'none' }}>Cancel</button></form>
        </div>)}
      </div>
      <form action={aiSchedule} className="row2 sched-ai" style={{ gap: 8, marginTop: 12 }}>
        <TzField /><span aria-hidden>✨</span>
        <input name="text" required placeholder="Tell the AI: remind me tomorrow 5 pm to call the supplier · hide the Gold pen on Friday 9 am · 20% off everything Eid morning for 2 days" style={{ flex: 1 }} />
        <button className="btn orange sm">Set it</button>
      </form>
      <details className="sched-add">
        <summary className="link">+ Add a reminder or a timed job</summary>
        <form action={schedule} className="grid2" style={{ alignItems: 'end', marginTop: 10 }}>
          <TzField />
          <div className="field"><label>What</label><select name="kind">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>When (your time)</label><input type="datetime-local" name="at" required /></div>
          <div className="field"><label>Title (for an AI job: what it should do)</label><input name="title" placeholder="Call the supplier / Eid sale starts" /></div>
          <div className="field"><label>Product (for hide, live, offer)</label><select name="product"><option value="">All products (offers only)</option>{products.map(p => <option key={p.slug} value={p.slug}>{p.name} {p.sub}</option>)}</select></div>
          <div className="field"><label>Offer % and hours (for offers)</label><div className="row2" style={{ gap: 6 }}><input name="pct" type="number" min="1" max="60" defaultValue={10} /><input name="hours" type="number" min="0" placeholder="48" /></div></div>
          <div className="field"><label>Order number (for courier)</label><input name="order" placeholder="PM-261108-12345" /></div>
          <div className="field" style={{ gridColumn: '1/-1' }}><label>Note</label><input name="note" /></div>
          <div><button className="btn orange">Save</button></div>
        </form>
        <p className="muted sm">Jobs run by themselves at their time (even when you are away) and a reminder is emailed to you. {!full && <Link href="/admin/reminders">All reminders →</Link>}</p>
      </details>
      {!full && <p className="sm" style={{ margin: '8px 0 0' }}><Link className="link" href="/admin/reminders">Open Reminders & schedule →</Link></p>}
      {full && history.length > 0 && <><h4>Done</h4><div className="rows">{history.map(x => <div key={x.id} className="row2" style={{ gap: 8 }}><span className={`tag ${x.status === 'done' ? 'green' : x.status === 'failed' ? 'red' : ''}`}>{x.status}</span><span>{x.title}</span><span className="muted sm"><LocalTime iso={x.at.toISOString()} />{x.result ? ` · ${x.result}` : ''}</span></div>)}</div></>}
    </details>
  </section>;
}
