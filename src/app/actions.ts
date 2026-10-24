'use server';
import { sendLoginCode, signOut, verifyLoginCode } from '@/lib/auth';

export async function requestCode(email: string) { return sendLoginCode(email); }
export async function confirmCode(email: string, code: string, name = '', phone = '') { return verifyLoginCode(email, code, name.trim().slice(0, 80), phone.replace(/[^+0-9 ()-]/g, '').slice(0, 24)); }
export async function logout() { await signOut(); }

export async function submitReview(fd: FormData) {
  const { db } = await import('@/lib/db');
  const { getSettings } = await import('@/lib/catalog');
  const { keepUpload, isVideoUrl } = await import('@/lib/upload');
  const { currentCustomer } = await import('@/lib/auth');
  const { updateTag } = await import('next/cache');
  const s = await getSettings();
  const productId = String(fd.get('productId') || '');
  const text = String(fd.get('text') || '').trim().slice(0, 1200);
  const name = String(fd.get('name') || '').trim().slice(0, 60);
  const stars = Math.min(5, Math.max(1, Number(fd.get('stars')) || 5));
  if (!text || !name || !(await db.product.findUnique({ where: { id: productId } }))) return { message: 'Please add your name and a few words.' };
  let media: string[] = [];
  try { media = (await Promise.all(fd.getAll('media').slice(0, 4).map(f => keepUpload(f, 'reviews')))).filter(u => u && (s.allowVideoReviews || !isVideoUrl(u))); } catch (e) { return { message: (e as Error).message }; }
  const me = await currentCustomer();
  const verified = !!me && (await db.orderLine.count({ where: { productId, order: { customerId: me.id } } })) > 0;
  await db.review.create({ data: { productId, name, place: String(fd.get('place') || '').slice(0, 60), stars, text, media, verified, status: s.holdReviews ? 'pending' : 'live' } });
  if (!s.holdReviews) updateTag('catalog');
  return { message: s.holdReviews ? 'Thank you. Your review shows after a quick check.' : 'Thank you. Your review is live.' };
}

export async function checkoutQuote(input: { lines: { slug: string; qty: number }[]; country: string; useCredit: boolean }) {
  const { quote } = await import('@/lib/orders');
  const { currentCustomer } = await import('@/lib/auth');
  const { readyMethods, soonMethods } = await import('@/lib/pay');
  const me = await currentCustomer();
  const q0 = await quote(input);
  const credit = me && me.currency === q0.cur ? Number(me.credit) : 0;
  const q = await quote(input, credit, input.useCredit);
  return {
    cur: q.cur, subtotal: q.subtotal, saved: q.saved, shipping: q.shipping, credit: q.credit, total: q.total, reward: q.reward, available: credit,
    courier: q.ship.courier, days: q.ship.days, pay: await readyMethods(input.country), soon: await soonMethods(input.country),
    me: me ? { email: me.email, name: me.name, phone: me.phone, country: me.country, address: me.address } : null,
  };
}

export async function checkout(input: import('@/lib/orders').CheckoutInput) {
  const { placeOrder } = await import('@/lib/orders');
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  return placeOrder(input, decodeURIComponent(jar.get('pm-src')?.value || 'Direct').slice(0, 40), (jar.get('pm-cmp')?.value || '').slice(0, 12));
}

export async function findOrder(fd: FormData) {
  const no = String(fd.get('no') ?? '').trim().toUpperCase();
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const { db } = await import('@/lib/db');
  const o = no && email ? await db.order.findUnique({ where: { no }, select: { id: true, email: true } }) : null;
  if (!o || o.email.toLowerCase() !== email) return { error: 'No order matches that number and email.' };
  const { redirect } = await import('next/navigation');
  redirect(`/order/${o.id}`);
}

// Status of orders remembered on the customer's device. Order ids are long and random, so knowing one is the key.
export async function deviceOrders(ids: string[]) {
  const { db } = await import('@/lib/db');
  const list = await db.order.findMany({ where: { id: { in: ids.filter(x => typeof x === 'string').slice(0, 30) } }, orderBy: { createdAt: 'desc' }, include: { lines: { select: { name: true, qty: true } } } });
  return list.map(o => ({ id: o.id, no: o.no, at: o.createdAt.toISOString(), status: o.status, total: Number(o.total), currency: o.currency, items: o.lines.map(l => `${l.qty}× ${l.name}`).join(', ').slice(0, 60) }));
}
