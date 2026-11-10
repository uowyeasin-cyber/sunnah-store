import 'server-only';
import { db } from './db';
import { applyRule, getSourcing } from './sourcing';

// Imports shared by the Sourcing page and the weekly AI sourcing job.

export async function draft(name: string, cost: number, price: number, details: string, categoryId: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'product';
  let slug = base, n = 1;
  while (await db.product.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${++n}`;
  // Imported as hidden drafts: the owner adds photos and stock, then makes them live.
  return db.product.create({ data: { slug, name, details, priceCents: Math.round(price * 100), costCents: Math.round(cost * 100), kind: 'gift', active: false, categoryId, sort: 999 } });
}

// Dropship tab: a CJ product becomes a product linked to CJ (first in-stock variant), with CJ photos, cost and stock,
// priced by the rule (or the owner's own price). When a customer pays, Automation → Dropship orders sends the order to CJ.
export async function importOneCj(pid: string, categoryId: string, own: number, s: Awaited<ReturnType<typeof getSourcing>>) {
  const { product, cheapestShipping } = await import('@/lib/cj');
  const d = await product(pid);
  const v = d.variants.find(x => x.stock > 0) || d.variants[0];
  if (!v) throw new Error('This CJ product has no variants to sell');
  const rule = s.price, base = v.price || d.price;
  // Shipping is part of the cost, so the profit is real: CJ's cheapest line to the chosen country.
  const ship = rule.ship ? (await cheapestShipping(rule.ship, [{ vid: v.vid, quantity: 1 }]).catch(() => null))?.logisticPrice || 0 : 0;
  const cost = Math.round((base + ship) * 100) / 100;
  const price = own > 0 ? Math.round(own * 100) / 100 : applyRule(cost, rule);
  let supplier = await db.supplier.findFirst({ where: { api: 'cj' } });
  if (!supplier) supplier = await db.supplier.create({ data: { name: 'CJ Dropshipping', api: 'cj', website: 'https://cjdropshipping.com', country: 'China', currency: 'USD', leadDays: 12, source: 'CJ API', notes: 'Dropship supplier. Orders are placed through the API and paid from the CJ balance.' } });
  let text = { name: d.name.slice(0, 120), sub: v.name !== d.name ? v.name.slice(0, 80) : '', details: d.description };
  if (rule.ai) {
    const { aiWriteProduct } = await import('@/app/admin/aiWriteActions');
    const r = await aiWriteProduct({ ...text, instruction: 'Rewrite this supplier listing for our shop: a short, clear product name without supplier words or keyword lists, a short line, and an honest premium description with 3 to 5 key points.', lang: 'English', keep: false }).catch(() => null);
    if (r && !('error' in r)) text = r;
  }
  const p = await draft(text.name, cost, price, text.details, categoryId);
  const n = Math.max(0, Math.min(999, v.stock));
  const images = [...new Set([v.image, ...d.images].filter(u => /^https:\/\//.test(u)))].slice(0, 10);
  await db.product.update({ where: { id: p.id }, data: { images, sub: text.sub, active: rule.live && images.length > 0, dropship: true, supplierId: supplier.id, supplierSku: v.vid, supplierUrl: `cj:${d.pid}`, supplierCost: Math.round(base * 100), stock: { BD: n, MY: n, US: n } } });
  s.imported++;
  return p.id;
}
