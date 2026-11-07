'use server';
import { db } from '@/lib/db';
import { currentCustomer } from '@/lib/auth';
import { DELIVERED } from '@/lib/tracking';
import { sendMail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';
import { RETURN_DAYS, RETURN_REASONS } from '@/lib/returns';

const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max);

// Signed-in customer edits the name, phone and address that checkout fills in.
export async function saveProfile(fd: FormData) {
  const me = await currentCustomer();
  if (!me) return { error: 'Sign in first.' };
  await db.customer.update({ where: { id: me.id }, data: {
    name: str(fd, 'name', 80), country: str(fd, 'country', 2).toUpperCase(),
    address: { address: str(fd, 'address'), city: str(fd, 'city', 80), zip: str(fd, 'zip', 20), state: str(fd, 'state', 40) },
  } });
  revalidatePath('/[lang]/account', 'page');
  return { ok: true };
}

// Anyone holding the order link can ask for a return (the order id is long and random, like the receipt itself).
export async function requestReturn(fd: FormData) {
  const o = await db.order.findUnique({ where: { id: str(fd, 'orderId', 40) }, include: { returns: true } });
  if (!o) return { error: 'Order not found.' };
  const reason = str(fd, 'reason', 60);
  if (!RETURN_REASONS.includes(reason)) return { error: 'Choose a reason.' };
  if (o.status !== DELIVERED) return { error: 'You can ask for a return once the order is delivered.' };
  const delivered = (o.events as { at: string; step: number }[]).filter(e => e.step === DELIVERED).pop();
  if (delivered && Date.now() - Date.parse(delivered.at) > RETURN_DAYS * 864e5) return { error: `Returns are open for ${RETURN_DAYS} days after delivery.` };
  if (o.returns.some(r => r.status !== 'declined')) return { error: 'A return for this order is already open.' };
  await db.returnRequest.create({ data: { orderId: o.id, reason, note: str(fd, 'note', 1000) } });
  await sendMail(o.email, `Return request for order ${o.no}`, `We received your return request (${reason}). We will reply within 2 working days.`).catch(e => console.error('return mail failed', e));
  revalidatePath('/[lang]/order/[id]', 'page');
  return { ok: true };
}
