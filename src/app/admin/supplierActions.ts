'use server';
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { returnStock } from '@/lib/stock';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const D = (n: number) => new Prisma.Decimal(n.toFixed(2));
const CUR = ['BDT', 'MYR', 'USD', 'CNY', 'INR', 'PKR', 'SAR', 'AED', 'TRY', 'EUR', 'GBP'];
const WH = ['BD', 'MY', 'US'];
const done = () => revalidatePath('/admin/suppliers');

export async function saveSupplier(fd: FormData) {
  const id = str(fd, 'id');
  await requireAdmin('suppliers', id ? 'editSupplier' : 'addSupplier', str(fd, 'name'));
  const data = { name: str(fd, 'name').slice(0, 120), contact: str(fd, 'contact').slice(0, 120), email: str(fd, 'email').slice(0, 160), phone: str(fd, 'phone').slice(0, 40), country: str(fd, 'country').slice(0, 60),
    currency: CUR.includes(str(fd, 'currency')) ? str(fd, 'currency') : 'USD', leadDays: Math.min(365, Math.max(0, Math.floor(Number(fd.get('leadDays')) || 0))), notes: str(fd, 'notes').slice(0, 1000), active: fd.get('active') !== 'off',
    api: str(fd, 'api') === 'cj' ? 'cj' : '', website: str(fd, 'website').slice(0, 300), address: str(fd, 'address').slice(0, 300), links: str(fd, 'links').split(/\s+/).filter(l => /^https?:\/\//i.test(l)).slice(0, 40) };
  if (!data.name) throw new Error('Enter a name');
  if (id) await db.supplier.update({ where: { id }, data }); else await db.supplier.create({ data });
  done();
}

// New purchase order as a draft: nothing is sent to the supplier and stock does not change until it is received.
export async function createPO(fd: FormData) {
  await requireAdmin('suppliers', 'createPurchaseOrder');
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: str(fd, 'supplierId') } });
  const lines: { productId: string; name: string; qty: number; unitCost: Prisma.Decimal }[] = [];
  for (let i = 0; i < 8; i++) {
    const pid = str(fd, `product-${i}`), qty = Math.floor(Number(fd.get(`qty-${i}`)) || 0);
    if (!pid || qty <= 0) continue;
    const p = await db.product.findUnique({ where: { id: pid } });
    if (p) lines.push({ productId: p.id, name: `${p.name}${p.sub ? ' · ' + p.sub : ''}`, qty: Math.min(qty, 100000), unitCost: D(Math.max(0, Number(fd.get(`cost-${i}`)) || 0)) });
  }
  if (!lines.length) throw new Error('Add at least one product and quantity');
  const now = new Date();
  const no = `PO-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${randomInt(1000, 9999)}`;
  const po = await db.purchaseOrder.create({ data: { no, supplierId: supplier.id, warehouse: WH.includes(str(fd, 'warehouse')) ? str(fd, 'warehouse') : 'BD', currency: supplier.currency, shipping: D(Math.max(0, Number(fd.get('shipping')) || 0)), note: str(fd, 'note').slice(0, 500), lines: { create: lines } } });
  redirect(`/admin/suppliers?po=${po.id}`);
}

// draft → ordered (you placed it with the supplier yourself) → received (units go into stock, once) or cancelled.
export async function movePO(fd: FormData) {
  const to = str(fd, 'to');
  if (!['ordered', 'received', 'cancelled'].includes(to)) throw new Error('Unknown step');
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: str(fd, 'id') }, include: { lines: true } });
  await requireAdmin('suppliers', `purchaseOrder ${to}`, po.no);
  const from = to === 'ordered' ? ['draft'] : ['draft', 'ordered', 'shipped'];
  await db.$transaction(async tx => {
    const c = await tx.purchaseOrder.updateMany({ where: { id: po.id, status: { in: from } }, data: { status: to, ...(to === 'ordered' ? { orderedAt: new Date() } : to === 'received' ? { receivedAt: new Date() } : {}) } });
    // A dropship order went to the customer, not to a warehouse: no stock to add.
    if (c.count && to === 'received' && po.warehouse !== 'DROP') await returnStock(tx, po.warehouse, po.lines.map(l => ({ productId: l.productId, qty: l.qty })));
  });
  done();
}

// Emails the purchase order to the supplier. Only when you press the button; nothing is sent by itself.
export async function emailPO(fd: FormData) {
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: str(fd, 'id') }, include: { lines: true, supplier: true } });
  await requireAdmin('suppliers', 'emailPurchaseOrder', `${po.no} to ${po.supplier.email}`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(po.supplier.email)) throw new Error('Add the supplier email first');
  const { getSettings } = await import('@/lib/catalog');
  const { sendMail } = await import('@/lib/mail');
  const s = await getSettings(), to = s.warehouses[po.warehouse as 'BD' | 'MY' | 'US'];
  const total = po.lines.reduce((a, l) => a + Number(l.unitCost) * l.qty, 0) + Number(po.shipping);
  const text = `Purchase order ${po.no} from ${s.store.name}\n\n${po.lines.map(l => `${l.qty} × ${l.name} @ ${po.currency} ${Number(l.unitCost).toFixed(2)}`).join('\n')}\nShipping: ${po.currency} ${Number(po.shipping).toFixed(2)}\nTotal: ${po.currency} ${total.toFixed(2)}\n\nDeliver to:\n${[to?.name, to?.street, to?.city, to?.state, to?.zip, po.warehouse, to?.phone].filter(Boolean).join('\n')}${po.note ? `\n\nNote: ${po.note}` : ''}\n\nPlease reply to confirm price and delivery date.`;
  await sendMail(po.supplier.email, `Purchase order ${po.no}`, text);
  if (po.status === 'draft') await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'ordered', orderedAt: new Date() } });
  done();
}

// Dropship: send this purchase order to its supplier now (CJ API, or email). The reason is saved on it if it fails.
export async function placePO(fd: FormData) {
  const id = str(fd, 'id');
  await requireAdmin('suppliers', 'placeDropOrder', id);
  const { placeDropOrder } = await import('@/lib/dropship');
  await db.purchaseOrder.updateMany({ where: { id, status: 'draft' }, data: { error: '' } });
  await placeDropOrder(id).catch(() => {});
  await db.automationTask.updateMany({ where: { job: 'dropship', ref: id, status: 'pending' }, data: { status: 'done', result: 'Sent from Suppliers' } });
  done();
}

// Dropship: the supplier's tracking number, typed in by hand (email suppliers). It goes on the customer order.
export async function trackPO(fd: FormData) {
  const id = str(fd, 'id'), no = str(fd, 'trackingNo').slice(0, 80);
  await requireAdmin('suppliers', 'dropTracking', `${id} ${no}`);
  if (!no) throw new Error('Enter the tracking number');
  const { setDropTracking } = await import('@/lib/dropship');
  await setDropTracking(id, no, str(fd, 'carrier').slice(0, 60));
  done();
}
