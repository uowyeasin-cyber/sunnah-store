import 'server-only';
import { db } from './db';
import { sendMail } from './mail';
import { payReward } from './credit';
import { bookerFor, loadKeys, track } from './couriers';
import { getSettings } from './catalog';
import { DELIVERED, STEPS } from './tracking';

type Ev = { at: string; step: number; note: string };
const site = () => process.env.SITE_URL || 'http://localhost:3000';

// Moves an order to a step, logs it, pays the reward on delivery and tells the customer.
export async function advance(id: string, step: number, data: Record<string, unknown> = {}, quiet = false) {
  const o = await db.order.findUniqueOrThrow({ where: { id } });
  const events = o.events as Ev[];
  const moved = step !== o.status;
  if (moved) events.push({ at: new Date().toISOString(), step, note: STEPS[step] });
  await db.$transaction(async tx => {
    await tx.order.update({ where: { id }, data: { ...data, status: step, events } });
    if (step === DELIVERED) await payReward(tx, o);
  });
  if (moved && !quiet && step >= 3) await sendMail(o.email, `Order ${o.no}: ${STEPS[step]}`, `${STEPS[step]}.\n\nTrack it here: ${site()}/order/${o.id}`).catch(e => console.error('status mail failed', e));
}

// Books the courier once an order is ready to ship: cash on delivery at once, online payments after they clear.
// A failed booking is logged on the order as an admin-only note (step -1) so the admin sees why, then thrown for the caller.
export async function sendToCourier(id: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id }, include: { lines: true } });
  if (o.trackingNo || (o.payStatus !== 'paid' && o.payStatus !== 'cod')) return;
  await loadKeys();
  const booker = bookerFor({ warehouse: o.warehouse, courier: o.courier, cod: o.payStatus === 'cod' });
  if (!booker) return;
  const s = await getSettings();
  const from = s.warehouses[o.warehouse as 'BD' | 'MY' | 'US'];
  try {
    if (o.warehouse !== 'BD' && !(from?.street && from.zip && from.phone)) throw new Error(`Add the ${o.warehouse} warehouse address in Admin → Connections first`);
    await advance(id, Math.max(o.status, 1), {}, true);
    const r = await booker.book({ ...o, total: Number(o.total), codDue: o.payStatus === 'cod' ? Number(o.total) : 0 }, { from, parcel: s.parcel });
    await advance(id, Math.max(o.status, 2), { trackingNo: r.trackingNo, payRef: o.payRef || r.ref, labelUrl: r.label || '', ...(r.courier ? { courier: r.courier } : {}) }, true);
  } catch (e) {
    const fresh = await db.order.findUniqueOrThrow({ where: { id } });
    await db.order.update({ where: { id }, data: { events: [...(fresh.events as Ev[]), { at: new Date().toISOString(), step: -1, note: `${booker.name} booking failed: ${(e as Error).message}`.slice(0, 400) }] } });
    throw e;
  }
}
export const sendToCourierSafe = (id: string) => sendToCourier(id).catch(e => console.error('courier booking failed', id, e));

// Called on a schedule: pulls courier status for every open order. Only ever moves forward.
export async function syncTracking() {
  const open = await db.order.findMany({ where: { status: { lt: DELIVERED }, trackingNo: { not: '' } }, take: 200 });
  let moved = 0;
  for (const o of open) {
    const t = await track(o.courier, o.trackingNo).catch(e => { console.error('track failed', o.no, e); return null; });
    if (!t || t.step <= o.status) continue;
    await advance(o.id, t.step, t.eta ? { etaTo: t.eta } : {});
    moved++;
  }
  return { checked: open.length, moved };
}
