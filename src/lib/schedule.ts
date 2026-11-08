import 'server-only';
import { after } from 'next/server';
import { db } from './db';
import { sendMail } from './mail';
import { getSettings } from './catalog';
import { roleOf } from './roles';

// Reminders and jobs set for a time. They run from the daily cron, from /api/cron/due (any outside
// cron, e.g. every 5 minutes), and quietly while people use the shop, so a 1 PM job runs close to 1 PM.
const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';

async function owners() {
  const s = await getSettings();
  return s.admins.filter(e => e && roleOf(e, s.roles) === 'owner');
}

async function runOne(t: { id: string; kind: string; title: string; note: string; data: unknown; by: string }) {
  const d = (t.data || {}) as Record<string, unknown>;
  if (t.kind === 'reminder') {
    for (const to of await owners()) await sendMail(to, `Reminder: ${t.title}`, `${t.title}\n${t.note}\n\n${site()}/admin/dashboard`).catch(e => console.error('reminder mail failed', e));
    return { status: 'due', result: 'Reminder emailed to the owners' };
  }
  if (t.kind === 'book_courier') {
    const o = await db.order.findFirst({ where: { no: String(d.order || '').toUpperCase() } });
    if (!o) return { status: 'failed', result: `No order ${d.order}` };
    const { sendToCourier } = await import('./fulfil');
    await sendToCourier(o.id);
    const after = await db.order.findUnique({ where: { id: o.id } });
    return after?.trackingNo ? { status: 'done', result: `Booked, tracking ${after.trackingNo}` } : { status: 'failed', result: 'Not booked: courier not connected or order not ready' };
  }
  if (t.kind === 'ai_job') {
    const { planJob } = await import('./cowork');
    const id = await planJob(String(d.prompt || t.title), t.by || 'schedule', 'auto');
    const j = await db.aiJob.findUnique({ where: { id } });
    return { status: j?.status === 'failed' ? 'failed' : 'done', result: `AI co-worker: ${j?.status === 'proposed' ? 'plan waiting for your Approve' : j?.status}. ${(j?.result || '').slice(0, 300)}` };
  }
  const { runActions } = await import('./cowork');
  const out = await runActions([{ type: t.kind, ...d }]);
  return { status: out.some(x => /^(Skipped|Failed)/.test(x)) ? 'failed' : 'done', result: out.join(' ') };
}

export async function runDue() {
  const due = await db.scheduled.findMany({ where: { status: 'pending', at: { lte: new Date() } }, orderBy: { at: 'asc' }, take: 20 });
  let n = 0;
  for (const t of due) {
    // Claim it first so two servers never run the same job.
    const c = await db.scheduled.updateMany({ where: { id: t.id, status: 'pending' }, data: { status: 'running' } });
    if (!c.count) continue;
    let r: { status: string; result: string };
    try { r = await runOne(t); } catch (e) { r = { status: 'failed', result: (e as Error).message.slice(0, 300) }; }
    await db.scheduled.update({ where: { id: t.id }, data: { status: r.status, result: r.result.slice(0, 1000) } });
    n++;
  }
  return n;
}

let last = 0;
// Cheap to call often: checks at most once a minute per server.
export function runDueSoon() {
  if (Date.now() - last < 60e3) return;
  last = Date.now();
  // after(): runs once the response is sent, and the server waits for it to finish.
  after(() => runDue().then(() => undefined).catch(e => console.error('scheduled run failed', e)));
}
