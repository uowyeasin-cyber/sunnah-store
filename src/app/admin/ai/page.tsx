import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { connectedProviders } from '@/lib/ai';
import { getCowork, type Act } from '@/lib/cowork';
import { jobAction, newJob, saveCowork } from '../aiActions';

const EXAMPLES = [
  'Make a 15% Eid coupon for one week, 100 uses',
  'Put 10% off for 48 hours on the products that sold least this month',
  'Write better descriptions for my 3 best sellers',
  'Hide products with no stock and tell me what to restock',
  'What should I do this week to get more orders?',
];
const STATUS: Record<string, [string, string]> = { thinking: ['Thinking…', 'blue'], proposed: ['Waiting for you', 'orange'], done: ['Done', 'green'], rejected: ['Rejected', ''], failed: ['Failed', 'red'] };
const actText = (a: Act) => {
  const x = a as Record<string, unknown>;
  switch (a.type) {
    case 'create_coupon': return `Create coupon ${x.code}: ${x.pct ? x.pct + '%' : '$' + x.usd} off${x.days ? `, ${x.days} days` : ''}${x.uses ? `, ${x.uses} uses` : ''}`;
    case 'set_offer': return `Offer ${x.pct}% off on ${(x.slugs as string[] || []).join(', ')}${x.hours ? ` for ${x.hours} hours` : ''}`;
    case 'stop_offer': return `Stop offers on ${(x.slugs as string[] || []).join(', ')}`;
    case 'update_product': return `Edit ${x.slug}: ${Object.keys(x).filter(k => !['type', 'slug', 'why'].includes(k)).map(k => k === 'price_usd' ? `price $${x[k]}` : k).join(', ')}`;
    case 'hide_product': return `Hide ${x.slug}`;
    case 'show_product': return `Make ${x.slug} live`;
    case 'note': return `Note: ${x.text}`;
    default: return a.type;
  }
};

export default async function Cowork({ searchParams }: PageProps<'/admin/ai'>) {
  if (!(await adminOrNull('ai'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const [ai, cfg, jobs, job] = await Promise.all([
    connectedProviders(), getCowork(),
    db.aiJob.findMany({ where: { kind: { in: ['cowork', 'auto'] } }, orderBy: { createdAt: 'desc' }, take: 15 }),
    sp.job ? db.aiJob.findUnique({ where: { id: sp.job } }) : null,
  ]);
  const waiting = jobs.filter(j => j.status === 'proposed').length;
  return <>
    <div className="page-head"><div><h2>AI co-worker</h2><p>Tell it a job in your own words, in any language. It reads your products, sales, offers and stock, makes a plan, and does it. It can make coupons and offers, edit product text and prices, and hide or show products. It never sells below cost.</p></div></div>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    {!ai.length && <p className="ord-note">No AI connected yet. Connect a free one in <Link href="/admin/aitools#connect">AI tools & chatbot</Link> (2 minutes, no card).</p>}
    <div className="stats">
      <div className="stat"><small>AI</small><b className={ai.length ? 'ok' : 'warn'}>{ai[0]?.name || 'Not connected'}</b></div>
      <div className="stat"><small>Permission</small><b className={cfg.mode === 'auto' ? 'ok' : ''}>{cfg.mode === 'auto' ? 'Automatic' : 'Ask me first'}</b></div>
      <div className="stat"><small>Waiting for you</small><b className={waiting ? 'warn' : ''}>{waiting}</b></div>
    </div>
    <div className="grid2">
      <form className="panel" action={newJob}>
        <h3>Give the AI a job</h3>
        <div className="field"><textarea name="prompt" rows={4} required placeholder={EXAMPLES[0]} /></div>
        <div><button className="btn orange" disabled={!ai.length}>Start the job</button></div>
        <p className="muted sm" style={{ margin: 0 }}>Examples: {EXAMPLES.join(' · ')}</p>
      </form>
      <form className="panel" action={saveCowork}>
        <h3>Permission</h3>
        <label className="row2" style={{ gap: 8 }}><input type="radio" name="mode" value="auto" defaultChecked={cfg.mode === 'auto'} /> <span><b>Automatic</b>: the AI does the job by itself and shows what it did.</span></label>
        <label className="row2" style={{ gap: 8 }}><input type="radio" name="mode" value="ask" defaultChecked={cfg.mode === 'ask'} /> <span><b>Ask me first</b>: the AI shows its plan and waits for Approve.</span></label>
        <div><button className="btn">Save</button></div>
        <p className="muted sm" style={{ margin: 0 }}>Every change is saved in <Link href="/admin/activity">Activity history</Link>.</p>
      </form>
    </div>
    {job && <section className="panel">
      <div className="row2" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{job.prompt.slice(0, 120)}</h3><span className={`tag ${STATUS[job.status]?.[1]}`}>{STATUS[job.status]?.[0]}</span></div>
      <p style={{ whiteSpace: 'pre-wrap' }}>{job.result}</p>
      {job.status === 'proposed' && <>
        <h4>The plan</h4>
        <ul>{((job.actions as Act[]) || []).map((a, i) => <li key={i}>{actText(a)}{a.why ? <span className="muted sm"> · {String(a.why)}</span> : null}</li>)}</ul>
        <form action={jobAction} className="row2" style={{ gap: 8 }}><input type="hidden" name="id" value={job.id} />
          <button className="btn" name="what" value="approve">Approve and do it</button><button className="btn ghost" name="what" value="reject">Reject</button></form>
      </>}
      <p className="muted sm">{job.provider} · {job.createdAt.toISOString().slice(0, 16).replace('T', ' ')} · {job.by}</p>
    </section>}
    <section className="panel">
      <h3>Previous jobs</h3>
      {!jobs.length ? <p className="muted">No jobs yet.</p> : <table><thead><tr><th>Job</th><th>Status</th><th>When</th></tr></thead><tbody>
        {jobs.map(j => <tr key={j.id}><td><Link href={`/admin/ai?job=${j.id}`}>{j.prompt.slice(0, 90)}</Link>{j.kind === 'auto' && <span className="tag blue" style={{ marginLeft: 6 }}>automation</span>}</td><td><span className={`tag ${STATUS[j.status]?.[1]}`}>{STATUS[j.status]?.[0]}</span></td><td className="muted sm">{j.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</td></tr>)}
      </tbody></table>}
    </section>
  </>;
}
