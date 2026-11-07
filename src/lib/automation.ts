import 'server-only';
import { db } from './db';
import { sendMail } from './mail';
import { getSettings } from './catalog';
import { roleOf } from './roles';
import { DELIVERED } from './tracking';
import { JOBS, defaultAutomation, type Automation, type JobId, type Mode } from './automationJobs';

// Automation Control Center. State lives in the "automation" setting, read fresh (never cached).
// The master switch and emergency stop sit above every job; each job is off, approve-first or automatic.
// A job that fails three runs in a row pauses itself and emails the owners.
export const AUTOMATION = 'automation';
const FAIL_LIMIT = 3;
const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';

export async function getAutomation(): Promise<Automation> {
  const row = await db.setting.findUnique({ where: { key: AUTOMATION } });
  const d = defaultAutomation(), v = (row?.value || {}) as Partial<Automation>;
  return { ...d, ...v, jobs: Object.fromEntries(JOBS.map(j => [j.id, { ...d.jobs[j.id], ...(v.jobs?.[j.id] || {}) }])) as Automation['jobs'] };
}
export async function saveAutomation(a: Automation) {
  await db.setting.upsert({ where: { key: AUTOMATION }, update: { value: a }, create: { key: AUTOMATION, value: a } });
}

// What a job may do right now: 'off' when the master switch, the emergency stop or a pause holds it.
export async function modeOf(job: JobId): Promise<Mode> {
  const a = await getAutomation();
  if (!a.master || a.stopped || a.jobs[job].paused) return 'off';
  return a.jobs[job].mode;
}

async function ownerEmails() {
  const s = await getSettings();
  return s.admins.filter(e => e && roleOf(e, s.roles) === 'owner');
}
async function tellOwners(subject: string, text: string) {
  for (const to of await ownerEmails()) await sendMail(to, subject, text).catch(e => console.error('owner mail failed', e));
}

type Result = { status: 'ok' | 'failed' | 'skipped'; summary: string };

// Runs one job, records the run and handles the failure limit.
export async function runJob(job: JobId, trigger: 'schedule' | 'manual' | 'event' = 'schedule'): Promise<Result> {
  const started = Date.now();
  const mode = await modeOf(job);
  // A manual "Run now" works even while the job is off, but never past the master switch or emergency stop.
  const a = await getAutomation();
  const blocked = !a.master || a.stopped;
  let r: Result;
  if (blocked || (mode === 'off' && trigger !== 'manual')) r = { status: 'skipped', summary: blocked ? (a.stopped ? 'Emergency stop is on' : 'Master switch is off') : a.jobs[job].paused ? 'Paused after repeated failures' : 'Job is off' };
  else {
    try { r = await WORK[job](trigger === 'manual' && mode === 'off' ? a.jobs[job].mode : mode); }
    catch (e) { r = { status: 'failed', summary: (e as Error).message.slice(0, 300) }; }
  }
  await db.automationRun.create({ data: { job, trigger, status: r.status, summary: r.summary, ms: Date.now() - started } });
  if (r.status === 'failed') {
    const last = await db.automationRun.findMany({ where: { job, status: { not: 'skipped' } }, orderBy: { at: 'desc' }, take: FAIL_LIMIT });
    if (last.length === FAIL_LIMIT && last.every(x => x.status === 'failed')) {
      const fresh = await getAutomation();
      fresh.jobs[job].paused = true;
      await saveAutomation(fresh);
      await tellOwners(`Automation paused: ${JOBS.find(j => j.id === job)!.name}`, `It failed ${FAIL_LIMIT} times in a row. Last error: ${r.summary}\n\nTurn it back on in ${site()}/admin/automation`);
    }
  } else if (r.status === 'ok' && a.jobs[job].paused && trigger === 'manual') {
    const fresh = await getAutomation(); fresh.jobs[job].paused = false; await saveAutomation(fresh);
  }
  return r;
}

// The daily schedule: every job in turn.
export async function runAll() {
  const out: Record<string, Result> = {};
  for (const j of JOBS) out[j.id] = await runJob(j.id);
  return out;
}

// Called when an order is placed or paid: book the courier now, queue it for approval, or leave it.
export async function onOrderReady(orderId: string) {
  const mode = await modeOf('courier');
  if (mode === 'off') return;
  if (mode === 'approve') return queueBooking(orderId);
  const { sendToCourierSafe } = await import('./fulfil');
  await sendToCourierSafe(orderId);
}

export const onOrderReadySafe = (orderId: string) => onOrderReady(orderId).catch(e => console.error('order automation failed', orderId, e));

async function queueBooking(orderId: string) {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (!o || o.trackingNo || (o.payStatus !== 'paid' && o.payStatus !== 'cod')) return false;
  if (await db.automationTask.findFirst({ where: { job: 'courier', ref: orderId, status: 'pending' } })) return false;
  await db.automationTask.create({ data: { job: 'courier', ref: orderId, label: `Book ${o.courier || 'courier'} for order ${o.no} · ${o.name}, ${o.country}${o.payStatus === 'cod' ? ' · cash on delivery' : ''}` } });
  return true;
}

// Approving a task does the work; rejecting only closes it.
export async function decideTask(id: string, approve: boolean, by: string) {
  const claimed = await db.automationTask.updateMany({ where: { id, status: 'pending' }, data: { status: approve ? 'done' : 'rejected', decidedBy: by, decidedAt: new Date() } });
  if (!claimed.count || !approve) return;
  const t = await db.automationTask.findUniqueOrThrow({ where: { id } });
  try {
    if (t.job === 'courier') {
      const { sendToCourier } = await import('./fulfil');
      await sendToCourier(t.ref);
      const o = await db.order.findUnique({ where: { id: t.ref } });
      await db.automationTask.update({ where: { id }, data: { result: o?.trackingNo ? `Booked, tracking ${o.trackingNo}` : 'No booking made: courier not connected or order not ready' } });
    }
  } catch (e) {
    await db.automationTask.update({ where: { id }, data: { status: 'failed', result: (e as Error).message.slice(0, 300) } });
  }
}

const WORK: Record<JobId, (mode: Mode) => Promise<Result>> = {
  // Paid or cash-on-delivery orders still without a tracking number: book them (or queue them). Each order is tried at most 3 times.
  async courier(mode) {
    const open = await db.order.findMany({ where: { trackingNo: '', status: { lt: DELIVERED }, payStatus: { in: ['paid', 'cod'] } }, take: 100, orderBy: { createdAt: 'asc' } });
    const { sendToCourier } = await import('./fulfil');
    let booked = 0, queued = 0, failed = 0, gaveUp = 0;
    for (const o of open) {
      const tries = (o.events as { step: number; note: string }[]).filter(e => e.step === -1 && /booking failed/.test(e.note)).length;
      if (tries >= 3) { gaveUp++; continue; }
      if (mode === 'approve') { if (await queueBooking(o.id)) queued++; continue; }
      try { await sendToCourier(o.id); if ((await db.order.findUnique({ where: { id: o.id } }))?.trackingNo) booked++; }
      catch { failed++; }
    }
    if (open.length && failed && !booked && failed + gaveUp === open.length) return { status: 'failed', summary: `${failed} bookings failed. See the notes on each order.` };
    return { status: 'ok', summary: `${open.length} orders waiting · ${booked} booked · ${queued} sent for approval · ${failed} failed · ${gaveUp} left for you after 3 tries` };
  },
  // Pulls courier status for open orders and moves them forward.
  async tracking() {
    const { syncTracking } = await import('./fulfil');
    const r = await syncTracking();
    return { status: 'ok', summary: `${r.checked} orders checked · ${r.moved} moved forward` };
  },
  // Emails the owners a list of products at or under the low-stock level in any warehouse.
  async lowStock() {
    const a = await getAutomation(), level = a.lowStockAt;
    const list = await db.product.findMany({ where: { active: true }, select: { name: true, sub: true, stock: true } });
    const low = list.flatMap(p => Object.entries((p.stock || {}) as Record<string, number>).filter(([, n]) => Number(n) <= level).map(([w, n]) => `${p.name}${p.sub ? ` · ${p.sub}` : ''}: ${n} left in ${w}`));
    if (!low.length) return { status: 'ok', summary: `Nothing at or under ${level}` };
    await tellOwners(`Low stock: ${low.length} items`, `${low.join('\n')}\n\nUpdate stock in ${site()}/admin/products`);
    return { status: 'ok', summary: `${low.length} low: emailed owners` };
  },
  async abandonedBag() {
    const { remindBags } = await import('./newsletter');
    const r = await remindBags();
    return { status: 'ok', summary: `${r.checked} bags checked · ${r.sent} reminders sent` };
  },
  // A short morning email: yesterday's orders and money, and what needs a hand.
  async dailySummary() {
    const end = new Date(); end.setUTCHours(0, 0, 0, 0);
    const start = new Date(end.getTime() - 86400000);
    const orders = await db.order.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { total: true, currency: true, payStatus: true } });
    const byCur: Record<string, number> = {};
    for (const o of orders) if (o.payStatus !== 'failed') byCur[o.currency] = (byCur[o.currency] || 0) + Number(o.total);
    const [unbooked, returns, tasks] = await Promise.all([
      db.order.count({ where: { trackingNo: '', status: { lt: DELIVERED }, payStatus: { in: ['paid', 'cod'] } } }),
      db.returnRequest.count({ where: { status: 'pending' } }),
      db.automationTask.count({ where: { status: 'pending' } }),
    ]);
    const money = Object.entries(byCur).map(([c, n]) => `${c} ${n.toFixed(2)}`).join(', ') || 'none';
    const text = `Yesterday (UTC): ${orders.length} orders, sales ${money}.\n\nNeeds a hand:\n· ${unbooked} paid or cash-on-delivery orders without a courier\n· ${returns} return requests\n· ${tasks} automation tasks waiting for approval\n\n${site()}/admin/automation`;
    await tellOwners(`Daily summary: ${orders.length} orders`, text);
    return { status: 'ok', summary: `${orders.length} orders yesterday · emailed owners` };
  },
};
