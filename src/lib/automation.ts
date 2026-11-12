import 'server-only';
import { db } from './db';
import { sendMail } from './mail';
import { getSettings } from './catalog';
import { alertEmails } from './roles';
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
  return alertEmails(s);
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
  await dropshipNow(orderId).catch(e => console.error('dropship failed', orderId, e));
  const mode = await modeOf('courier');
  if (mode === 'off') return;
  if (mode === 'approve') return queueBooking(orderId);
  const { sendToCourierSafe } = await import('./fulfil');
  await sendToCourierSafe(orderId);
}

export const onOrderReadySafe = (orderId: string) => onOrderReady(orderId).catch(e => console.error('order automation failed', orderId, e));

// Dropship lines: supplier orders are made at once, then placed (automatic) or put in Today's decisions (ask me first).
export async function dropshipNow(orderId: string) {
  const mode = await modeOf('dropship');
  if (mode === 'off') return;
  const { makeDropOrders, placeDropOrder } = await import('./dropship');
  for (const id of await makeDropOrders(orderId)) {
    if (mode === 'auto') await placeDropOrder(id).catch(() => {}); // the reason is saved on the purchase order
    else await queueDrop(id);
  }
}
export const dropshipNowSafe = (orderId: string) => dropshipNow(orderId).catch(e => console.error('dropship failed', orderId, e));

async function queueDrop(poId: string) {
  if (await db.automationTask.findFirst({ where: { job: 'dropship', ref: poId, status: 'pending' } })) return false;
  const po = await db.purchaseOrder.findUnique({ where: { id: poId }, include: { lines: true, supplier: true } });
  if (!po || po.status !== 'draft') return false;
  await db.automationTask.create({ data: { job: 'dropship', ref: poId, label: `Order from ${po.supplier.name} for customer order ${po.saleNo}: ${po.lines.map(l => `${l.qty} × ${l.name}`).join(', ')}`.slice(0, 300) } });
  return true;
}

async function queueBooking(orderId: string) {
  const { onlyDropship } = await import('./fulfil');
  if (await onlyDropship(orderId)) return false;
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
    if (t.job === 'dropship') {
      const { placeDropOrder } = await import('./dropship');
      const po = await placeDropOrder(t.ref);
      await db.automationTask.update({ where: { id }, data: { result: po.supplierRef ? `Placed with the supplier, ref ${po.supplierRef}` : `Sent to the supplier (${po.no})` } });
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
  // Supplier orders for paid dropship products, placing them, tracking numbers back, CJ cost and stock.
  async dropship(mode) {
    const since = new Date(Date.now() - 14 * 864e5);
    const paid = await db.order.findMany({ where: { createdAt: { gte: since }, payStatus: { in: ['paid', 'cod'] }, status: { lt: DELIVERED } }, select: { id: true }, take: 300 });
    const { makeDropOrders, syncDrop, syncDropStock } = await import('./dropship');
    let made = 0, queued = 0;
    for (const o of paid) for (const id of await makeDropOrders(o.id)) { made++; if (mode === 'approve' && await queueDrop(id)) queued++; }
    if (mode === 'approve') for (const d of await db.purchaseOrder.findMany({ where: { status: 'draft', saleId: { not: '' }, error: '' }, select: { id: true }, take: 50 })) if (await queueDrop(d.id)) queued++;
    const r = await syncDrop(mode === 'auto');
    const st = await syncDropStock().catch(() => ({ checked: 0, changed: 0 }));
    return { status: (r.failed && !r.placed ? 'failed' : 'ok') as Result['status'], summary: `${made} supplier orders made · ${r.placed} placed · ${queued} waiting for your OK · ${r.failed} failed · ${r.tracked} got tracking · ${st.changed}/${st.checked} CJ products updated` };
  },
  // Linked marketplace shops: stock and prices out, new orders in.
  async channels() {
    const { syncChannels } = await import('./channelSync');
    const r = await syncChannels();
    if (!r.linked) return { status: 'skipped' as const, summary: 'No marketplace shop linked yet' };
    return { status: (r.errors.length && !r.added && !r.synced ? 'failed' : 'ok') as Result['status'], summary: `${r.linked} shops · ${r.synced} listings updated · ${r.added} new orders${r.errors.length ? ` · ${r.errors.length} problems: ${r.errors[0]}` : ''}` };
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
  async releaseUnpaid() {
    const { returnStock } = await import('./stock');
    const old = await db.order.findMany({ where: { stockHeld: true, payStatus: { in: ['pending', 'failed'] }, NOT: [{ payMethod: { startsWith: 'm-' } }, { payMethod: 'cod' }], createdAt: { lt: new Date(Date.now() - 48 * 3600e3) } }, include: { lines: true }, take: 100 });
    let freed = 0;
    for (const o of old) {
      const ok = await db.$transaction(async tx => {
        const c = await tx.order.updateMany({ where: { id: o.id, stockHeld: true, payStatus: { in: ['pending', 'failed'] } }, data: { stockHeld: false, payStatus: 'cancelled', events: [...(o.events as object[]), { at: new Date().toISOString(), step: -1, note: 'Cancelled by automation: not paid within 48 hours, stock released' }] } });
        if (c.count) await returnStock(tx, o.warehouse, o.lines.flatMap(l => (l.productId ? [{ productId: l.productId, qty: l.qty }] : [])));
        return c.count > 0;
      });
      if (ok) freed++;
    }
    return { status: 'ok', summary: `${old.length} unpaid orders found · ${freed} cancelled and restocked` };
  },
  async abandonedBag() {
    const { remindBags } = await import('./newsletter');
    const r = await remindBags();
    return { status: 'ok', summary: `${r.checked} bags checked · ${r.sent} reminders sent` };
  },
  async aiDaily(mode) {
    const { planJob } = await import('./cowork');
    const id = await planJob('Daily check: look at sales, stock, offers and coupons. Make at most 3 small, safe improvements that bring more orders (for example a short flash sale on products that sold nothing in 30 days, hide live products with 0 stock, or a coupon). If nothing is needed, do nothing and say why.', 'automation', 'auto', mode === 'auto' ? 'auto' : 'ask');
    const j = await db.aiJob.findUnique({ where: { id } });
    if (j?.status === 'failed') return { status: 'failed', summary: j.result.slice(0, 200) };
    return { status: 'ok', summary: j?.status === 'proposed' ? 'Plan waiting for your Approve in AI co-worker' : (j?.result || '').slice(0, 200) };
  },
  async reviews() {
    const list = await db.review.findMany({ where: { status: 'pending' }, take: 40, orderBy: { createdAt: 'asc' } });
    if (!list.length) return { status: 'ok', summary: 'No reviews waiting' };
    const [{ ask, parseJson }] = await Promise.all([import('./ai')]);
    const r = await ask('You moderate shop reviews. Publish genuine reviews (good or bad, honest criticism stays). Hide spam, ads, links, abuse, gibberish or off-topic text. Answer ONLY JSON {"publish":["id"],"hide":["id"]}.', [{ role: 'user', content: JSON.stringify(list.map(x => ({ id: x.id, stars: x.stars, text: x.text.slice(0, 500) }))) }], { maxTokens: 800, json: true });
    const j = parseJson<{ publish?: string[]; hide?: string[] }>(r.text) || {};
    const ids = new Set(list.map(x => x.id));
    const pub = (j.publish || []).filter(i => ids.has(i)), hide = (j.hide || []).filter(i => ids.has(i) && !pub.includes(i));
    if (pub.length) await db.review.updateMany({ where: { id: { in: pub } }, data: { status: 'live' } });
    if (hide.length) await db.review.updateMany({ where: { id: { in: hide } }, data: { status: 'hidden' } });
    if (pub.length) { try { const { revalidateTag } = await import('next/cache'); revalidateTag('catalog', 'max'); } catch {} }
    return { status: 'ok', summary: `${list.length} reviews read · ${pub.length} published · ${hide.length} hidden` };
  },
  async aiSeo() {
    const { aiProductSeo } = await import('./seoAi');
    const n = await aiProductSeo(false, 15);
    return { status: 'ok', summary: n ? `SEO written for ${n} products` : 'Every product already has SEO' };
  },
  async aiSourcing() {
    const { aiReady } = await import('./ai');
    if (!(await aiReady())) return { status: 'skipped', summary: 'No AI connected' };
    const src = await import('./sourcing');
    const s = await src.getSourcing();
    if (s.auto.lastRun && Date.now() - new Date(s.auto.lastRun).getTime() < 6.5 * 864e5) return { status: 'skipped', summary: 'Runs once a week' };
    const log: string[] = [];
    const step = async (label: string, f: () => Promise<string>) => { try { log.push(`${label}: ${await f()}`); } catch (e) { log.push(`${label}: failed (${(e as Error).message.slice(0, 120)})`); } };
    if (s.auto.trend || !s.trend) await step('Best sellers', async () => { const r = await src.trendIdeas(s); if (r.items.length) s.trend = { at: new Date().toISOString(), ...r }; return `${r.items.length} products ranked${r.web ? ' from Google' : ''}`; });
    const top = (s.trend?.items || []).slice(0, 5);
    if (s.auto.suppliers) await step('Suppliers with websites', async () => { let n = 0; for (const i of top) for (const f of await src.findSuppliers(i.name, s).catch(() => [])) { await src.saveFound(f); n++; } return `${n} saved for ${top.map(i => i.name).join(', ') || 'nothing'}`; });
    if (s.auto.shops) await step('Shops without a website', async () => { let n = 0; for (const i of top.slice(0, 3)) for (const sh of (await src.findLocalShops(i.name, s).catch(() => ({ shops: [] }))).shops) { await src.saveShop(sh, i.name); n++; } return `${n} saved with Google Maps links`; });
    if (s.auto.importCj) await step('CJ drafts', async () => {
      const { cjReady, search } = await import('./cj');
      if (!(await cjReady())) return 'CJ not connected';
      const { importOneCj } = await import('./sourcingImport');
      const cat = (await db.category.findFirst({ orderBy: { sort: 'asc' } }))?.id;
      if (!cat) return 'no collection to put them in';
      let n = 0;
      for (const i of top) {
        const hit = (await search(i.name, 1).catch(() => []))[0];
        if (!hit || (await db.product.count({ where: { supplierUrl: `cj:${hit.pid}` } }))) continue;
        await importOneCj(hit.pid, cat, 0, { ...s, price: { ...s.price, live: false } }).then(() => n++, () => {});
      }
      return `${n} hidden drafts added to Products`;
    });
    s.auto = { ...s.auto, lastRun: new Date().toISOString(), log };
    await src.saveSourcing(s);
    return { status: 'ok', summary: log.join(' · ').slice(0, 300) };
  },
  async aiWeekly() {
    if (new Date().getUTCDay() !== 1) return { status: 'skipped', summary: 'Runs on Mondays' };
    const [{ ask }, { snapshot }] = await Promise.all([import('./ai'), import('./cowork')]);
    const r = await ask('You are a sharp e-commerce advisor. Write a short weekly report for the shop owner: what went well, what did not, and the 5 best next steps. Plain text.', [{ role: 'user', content: await snapshot() }], { maxTokens: 1200 });
    await tellOwners('Weekly AI business report', `${r.text}

${site()}/admin/dashboard`);
    return { status: 'ok', summary: 'Report emailed to the owners' };
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
