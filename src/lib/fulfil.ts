import 'server-only';
import { db } from './db';
import { sendMail } from './mail';
import { payReward } from './credit';
import { bookSteadfast, isSteadfast, loadKeys, steadfastReady, track } from './couriers';
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
export async function sendToCourier(id: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id } });
  if (o.trackingNo || (o.payStatus !== 'paid' && o.payStatus !== 'cod')) return;
  await loadKeys();
  if (o.country === 'Bangladesh' && isSteadfast(o.courier) && steadfastReady()) {
    await advance(id, Math.max(o.status, 1), {}, true);
    const r = await bookSteadfast({ no: o.no, name: o.name, phone: o.phone, address: o.address, codDue: o.payStatus === 'cod' ? Number(o.total) : 0 });
    await advance(id, Math.max(o.status, 2), { trackingNo: r.trackingNo, payRef: o.payRef || r.ref }, true);
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
