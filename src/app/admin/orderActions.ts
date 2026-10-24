'use server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { addCredit } from '@/lib/credit';
import { advance, sendToCourier } from '@/lib/fulfil';
import { DELIVERED } from '@/lib/tracking';
import type { Currency } from '@/lib/money';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const D = (n: number) => new Prisma.Decimal(n.toFixed(2));

export async function saveOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const status = Math.min(DELIVERED, Math.max(0, Number(fd.get('status')) || 0));
  const date = (k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);
  await advance(o.id, status, {
    manual: true, courier: str(fd, 'courier'), trackingNo: str(fd, 'trackingNo'), riderName: str(fd, 'riderName'), riderPhone: str(fd, 'riderPhone'),
    payStatus: str(fd, 'payStatus') || o.payStatus, etaFrom: date('etaFrom') ?? o.etaFrom, etaTo: date('etaTo') ?? o.etaTo,
  });
}

export async function bookCourier(fd: FormData) {
  await requireAdmin();
  await sendToCourier(str(fd, 'id')).catch(() => {}); // the reason is logged on the order
}

export async function refundOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const amount = Math.min(Number(o.total) + Number(o.creditUsed), Math.max(0, Number(fd.get('amount')) || 0));
  if (!o.customerId || !amount) return;
  await db.$transaction(async tx => {
    await addCredit(tx, o.customerId!, amount, o.currency, `Refund for order ${o.no}${str(fd, 'reason') ? ` · ${str(fd, 'reason')}` : ''}`, o.no);
    await tx.order.update({ where: { id: o.id }, data: { payStatus: 'refunded' } });
  });
}

// Edit the customer, address, items, prices and delivery charge; totals are worked out again.
export async function editOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') }, include: { lines: true } });
  const { getSettings } = await import('@/lib/catalog');
  const { convert } = await import('@/lib/money');
  const cur = o.currency as Currency, { rates } = await getSettings();
  const n = (k: string) => Math.max(0, Number(fd.get(k)) || 0);
  await db.$transaction(async tx => {
    for (const l of o.lines) {
      const qty = Math.floor(n(`qty-${l.id}`));
      if (!qty) await tx.orderLine.delete({ where: { id: l.id } });
      else await tx.orderLine.update({ where: { id: l.id }, data: { qty, unit: D(n(`unit-${l.id}`)) } });
    }
    const add = str(fd, 'addProduct'), addQty = Math.floor(n('addQty'));
    if (add && addQty) {
      const p = await tx.product.findUniqueOrThrow({ where: { id: add } });
      const price = convert(p.priceCents, cur, rates);
      await tx.orderLine.create({ data: { orderId: o.id, productId: p.id, name: `${p.name}${p.kind === 'pen' ? ' · ' + p.sub : ''}`, qty: addQty, unit: D(price), full: D(price), cost: D(convert(p.costCents, cur, rates)) } });
    }
    const lines = await tx.orderLine.findMany({ where: { orderId: o.id } });
    const subtotal = lines.reduce((a, l) => a + Number(l.unit) * l.qty, 0), shipping = n('shipping');
    const total = Math.max(0, subtotal + shipping - Number(o.creditUsed));
    const events = [...(o.events as object[]), { at: new Date().toISOString(), step: -1, note: 'Order details edited in admin' }];
    await tx.order.update({ where: { id: o.id }, data: {
      name: str(fd, 'name') || o.name, email: str(fd, 'email') || o.email, phone: str(fd, 'phone') || o.phone, country: str(fd, 'country') || o.country,
      address: { address: str(fd, 'address'), city: str(fd, 'city'), zip: str(fd, 'zip') }, subtotal: D(subtotal), shipping: D(shipping), total: D(total), events,
    } });
  });
}

export async function deleteOrder(fd: FormData) {
  await requireAdmin();
  if (fd.get('sure') !== 'yes') throw new Error('Tick the box to confirm');
  await db.order.delete({ where: { id: str(fd, 'id') } });
  const { redirect } = await import('next/navigation');
  redirect('/admin/orders');
}

// Ticked orders on the Orders page: mark paid, move to a step, or send to the courier.
export async function bulkOrders(fd: FormData) {
  await requireAdmin();
  const ids = fd.getAll('ids').map(String).filter(Boolean).slice(0, 300), act = str(fd, 'act');
  let done = 0;
  for (const id of ids) {
    if (act === 'paid') { await db.order.update({ where: { id }, data: { payStatus: 'paid' } }); done++; }
    else if (act.startsWith('step-')) { await advance(id, Math.min(DELIVERED, Math.max(0, Number(act.slice(5)) || 0)), { manual: true }); done++; }
    else if (act === 'book') { if (await sendToCourier(id).then(() => true, () => false)) done++; }
  }
  const { redirect } = await import('next/navigation');
  redirect(`/admin/orders?${new URLSearchParams({ tab: str(fd, 'tab') || 'all', q: str(fd, 'q'), note: `${done} of ${ids.length} orders updated.` })}`);
}

// Bulk Create Order: rows typed into the form, plus lines pasted from a sheet (tab or | between columns):
// Name | Phone | Country | Address | City | Products | Payment | Email | Note. Products: "slug x2, other-slug".
export async function bulkCreate(fd: FormData) {
  await requireAdmin();
  const { createAdminOrder } = await import('@/lib/orders');
  const { COUNTRIES } = await import('@/lib/shipping');
  const products = await db.product.findMany({ where: { active: true } });
  const country = (c: string) => { const v = c.trim().toLowerCase(); const alias: Record<string, string> = { bd: 'Bangladesh', my: 'Malaysia', us: 'United States', usa: 'United States', uk: 'United Kingdom', uae: 'United Arab Emirates', ksa: 'Saudi Arabia' }; return alias[v] || COUNTRIES.find(x => x.toLowerCase() === v) || 'Bangladesh'; };
  const product = (s: string) => { const v = s.trim().toLowerCase(); return products.find(p => p.slug === v) || products.find(p => `${p.name} ${p.sub}`.toLowerCase().includes(v)); };
  const parseLines = (s: string) => s.split(/[,;+]/).flatMap(part => { const m = part.trim().match(/^(.*?)(?:\s*[x×*]\s*(\d+))?$/i); const p = m && m[1] ? product(m[1]) : null; return p ? [{ slug: p.slug, qty: Number(m![2]) || 1 }] : []; });
  const rows: { at: string; input: import('@/lib/orders').AdminOrderInput }[] = [];
  for (let i = 0; i < 40; i++) {
    if (!str(fd, `name-${i}`) && !str(fd, `phone-${i}`)) continue;
    const slug = str(fd, `product-${i}`), slug2 = str(fd, `product2-${i}`);
    rows.push({ at: `Row ${i + 1}`, input: { name: str(fd, `name-${i}`), phone: str(fd, `phone-${i}`), email: str(fd, `email-${i}`), country: country(str(fd, `country-${i}`)), address: str(fd, `address-${i}`), city: str(fd, `city-${i}`),
      lines: [...(slug ? [{ slug, qty: Number(fd.get(`qty-${i}`)) || 1 }] : []), ...(slug2 ? [{ slug: slug2, qty: Number(fd.get(`qty2-${i}`)) || 1 }] : [])], paid: str(fd, `pay-${i}`) === 'paid', note: str(fd, `note-${i}`) } });
  }
  str(fd, 'paste').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((l, i) => {
    const c = (l.includes('\t') ? l.split('\t') : l.split('|')).map(x => x.trim());
    if (/^name$/i.test(c[0])) return; // header row
    rows.push({ at: `Pasted line ${i + 1}`, input: { name: c[0] || '', phone: c[1] || '', country: country(c[2] || ''), address: c[3] || '', city: c[4] || '', lines: parseLines(c[5] || ''), paid: /paid|prepaid|bkash|nagad|bank/i.test(c[6] || ''), email: c[7] || '', note: c[8] || '' } });
  });
  const made: string[] = [], failed: string[] = [];
  for (const r of rows.slice(0, 200)) {
    const res = await createAdminOrder(r.input).catch(e => ({ error: (e as Error).message }));
    if ('error' in res) failed.push(`${r.at} (${r.input.name || 'no name'}): ${res.error}`); else made.push(res.no);
  }
  const { redirect } = await import('next/navigation');
  if (failed.length) redirect(`/admin/orders/new?${new URLSearchParams({ made: String(made.length), failed: failed.join('\n').slice(0, 1500) })}`);
  redirect(`/admin/orders?${new URLSearchParams({ note: `${made.length} orders created.` })}`);
}
