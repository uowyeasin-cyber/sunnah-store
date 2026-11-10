import 'server-only';
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { sendMail } from './mail';
import { getSettings } from './catalog';

// Dropshipping, the way Shopify stores do it with AutoDS, DSers or CJ:
// customer pays → one purchase order per supplier, shipped straight to the customer → placed with the supplier
// (CJ API, or an email to the supplier) → the supplier's tracking number goes on the customer's order.
// Every supplier order says: no invoice, no prices, no supplier logo (blind dropshipping). The customer only ever sees your receipt.

export const BLIND = 'Blind dropshipping: please do NOT put any invoice, price list, receipt or supplier logo in the parcel. Ship in plain packaging.';
const D = (n: number) => new Prisma.Decimal(n.toFixed(2));
const ISO: Record<string, string> = {
  Bangladesh: 'BD', Malaysia: 'MY', 'United States': 'US', 'United Kingdom': 'GB', Canada: 'CA', Australia: 'AU', 'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', Qatar: 'QA', Kuwait: 'KW', Oman: 'OM', Bahrain: 'BH',
  India: 'IN', Pakistan: 'PK', Indonesia: 'ID', Singapore: 'SG', Brunei: 'BN', Turkey: 'TR', Germany: 'DE', France: 'FR', Netherlands: 'NL', Italy: 'IT', Spain: 'ES', Sweden: 'SE', Ireland: 'IE', 'South Africa': 'ZA', Nigeria: 'NG', Egypt: 'EG',
};
const poNo = () => { const n = new Date(); return `DS-${String(n.getFullYear()).slice(2)}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}-${randomInt(1000, 9999)}`; };

// Makes the supplier orders for a paid (or cash-on-delivery) customer order. Safe to call twice: one set per order.
export async function makeDropOrders(orderId: string) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!o || (o.payStatus !== 'paid' && o.payStatus !== 'cod') || o.payMethod.startsWith('ch:')) return [];
  if (await db.purchaseOrder.count({ where: { saleId: o.id } })) return [];
  const products = await db.product.findMany({ where: { id: { in: o.lines.flatMap(l => (l.productId ? [l.productId] : [])) }, dropship: true, supplierId: { not: '' } } });
  if (!products.length) return [];
  const bySupplier = new Map<string, { productId: string; name: string; qty: number; unitCost: Prisma.Decimal; sku: string }[]>();
  for (const l of o.lines) {
    const p = products.find(x => x.id === l.productId);
    if (!p) continue;
    const list = bySupplier.get(p.supplierId) || [];
    list.push({ productId: p.id, name: l.name, qty: l.qty, unitCost: D(p.costCents / 100), sku: p.supplierSku });
    bySupplier.set(p.supplierId, list);
  }
  const a = o.address as { address?: string; city?: string; zip?: string; state?: string };
  const shipTo = { name: o.name, phone: o.phone, email: o.email, country: ISO[o.country] || '', countryName: o.country, state: a.state || '', city: a.city || '', address: a.address || '', zip: a.zip || '' };
  const made: string[] = [];
  for (const [supplierId, lines] of bySupplier) {
    const s = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!s) continue;
    const po = await db.purchaseOrder.create({ data: { no: poNo(), supplierId, warehouse: 'DROP', currency: 'USD', saleId: o.id, saleNo: o.no, shipTo, note: BLIND, lines: { create: lines } } });
    made.push(po.id);
  }
  return made;
}

// Sends one dropship purchase order to its supplier: through the CJ API (paid from your CJ balance), or by email.
export async function placeDropOrder(poId: string) {
  const po = await db.purchaseOrder.findUniqueOrThrow({ where: { id: poId }, include: { lines: true, supplier: true } });
  if (po.status !== 'draft' || !po.saleId) return po;
  // Claim it first so two runs at once cannot order twice.
  const c = await db.purchaseOrder.updateMany({ where: { id: po.id, status: 'draft' }, data: { status: 'ordered', orderedAt: new Date(), error: '' } });
  if (!c.count) return po;
  const to = po.shipTo as { name: string; phone: string; email: string; country: string; countryName: string; state: string; city: string; address: string; zip: string };
  try {
    if (po.supplier.api === 'cj') {
      if (!to.country) throw new Error(`No country code for ${to.countryName}; this order needs to be placed by hand`);
      const missing = po.lines.filter(l => !l.sku);
      if (missing.length) throw new Error(`Add the CJ variant ID on: ${missing.map(l => l.name).join(', ')}`);
      const { placeOrder } = await import('./cj');
      const r = await placeOrder(po.no, to, po.lines.map(l => ({ vid: l.sku, quantity: l.qty })), BLIND);
      await db.purchaseOrder.update({ where: { id: po.id }, data: { supplierRef: r.ref, carrier: r.carrier, shipping: D(r.cost || 0) } });
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(po.supplier.email)) throw new Error(`Add an email for ${po.supplier.name}, or set it up as CJ Dropshipping`);
      const s = await getSettings();
      const text = `Dropship order ${po.no} from ${s.store.name}\n\n${po.lines.map(l => `${l.qty} × ${l.name}${l.sku ? ` (your code ${l.sku})` : ''}`).join('\n')}\n\nShip straight to our customer:\n${[to.name, to.address, to.city, to.state, to.zip, to.countryName, to.phone].filter(Boolean).join('\n')}\n\n${BLIND}\n\nPlease reply with the price, and the tracking number once it ships. Reference: ${po.no}`;
      await sendMail(po.supplier.email, `Dropship order ${po.no}`, text);
    }
    await note(po.saleId, `Sent to supplier ${po.supplier.name} (${po.no})`);
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'draft', orderedAt: null, error: msg } });
    await note(po.saleId, `Supplier order ${po.no} failed: ${msg}`);
    throw e;
  }
  return db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
}

// Admin-only note on the customer order (step -1 is never shown to the customer).
async function note(orderId: string, text: string) {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (o) await db.order.update({ where: { id: orderId }, data: { events: [...(o.events as object[]), { at: new Date().toISOString(), step: -1, note: text.slice(0, 400) }] } });
}

// Puts a supplier's tracking number on the customer order. Later steps come from the normal tracking job (Ship24).
export async function setDropTracking(poId: string, trackingNo: string, carrier: string) {
  const po = await db.purchaseOrder.update({ where: { id: poId }, data: { trackingNo, carrier, status: 'shipped' } });
  const o = await db.order.findUnique({ where: { id: po.saleId } });
  if (!o || o.trackingNo) return;
  const { advance } = await import('./fulfil');
  await advance(o.id, Math.max(o.status, 4), { trackingNo, courier: carrier || o.courier });
}

// Called on a schedule: places drafts (when automatic) and pulls tracking numbers from CJ.
export async function syncDrop(auto: boolean) {
  const { cjReady, orderStatus } = await import('./cj');
  let placed = 0, failed = 0, tracked = 0;
  if (auto) {
    const drafts = await db.purchaseOrder.findMany({ where: { status: 'draft', saleId: { not: '' }, error: '' }, take: 50 });
    for (const d of drafts) await placeDropOrder(d.id).then(() => placed++, () => failed++);
  }
  if (await cjReady()) {
    const open = await db.purchaseOrder.findMany({ where: { status: 'ordered', saleId: { not: '' }, supplierRef: { not: '' }, supplier: { api: 'cj' } }, take: 100 });
    for (const p of open) {
      const s = await orderStatus(p.supplierRef).catch(() => null);
      if (s?.trackingNo) { await setDropTracking(p.id, s.trackingNo, s.carrier); tracked++; }
    }
  }
  return { placed, failed, tracked };
}

// Keeps CJ products' cost and stock current. Stock is copied to every warehouse so checkout never oversells.
export async function syncDropStock() {
  const { cjReady, product } = await import('./cj');
  if (!(await cjReady())) return { checked: 0, changed: 0 };
  const list = await db.product.findMany({ where: { dropship: true, archived: false, supplierSku: { not: '' }, supplierUrl: { startsWith: 'cj:' } }, take: 60 });
  const { getSourcing, applyRule } = await import('./sourcing');
  const rule = (await getSourcing()).price;
  let changed = 0;
  for (const p of list) {
    const pid = p.supplierUrl.slice(3);
    const d = await product(pid).catch(() => null);
    const v = d?.variants.find(x => x.vid === p.supplierSku);
    if (!v) continue;
    const n = Math.max(0, Math.min(999, v.stock));
    const stock = { BD: n, MY: n, US: n };
    const base = Math.round(v.price * 100);
    // Cost moves by CJ's change only, so shipping added at import stays in it. Older imports without a base price start from now.
    const cost = p.supplierCost && base ? Math.max(0, p.costCents + base - p.supplierCost) : p.costCents;
    const price = rule.reprice && base && p.supplierCost && base !== p.supplierCost ? Math.round(applyRule(cost / 100, rule) * 100) : p.priceCents;
    if (cost !== p.costCents || price !== p.priceCents || base !== p.supplierCost || JSON.stringify(p.stock) !== JSON.stringify(stock)) {
      await db.product.update({ where: { id: p.id }, data: { costCents: cost, priceCents: price, supplierCost: base || p.supplierCost, stock } });
      changed++;
    }
  }
  return { checked: list.length, changed };
}
