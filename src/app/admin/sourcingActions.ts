'use server';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { applyRule, findIdeas, findSuppliers, getSourcing, PLATFORMS, saveFound, savePlatformSuppliers, saveSourcing, trendIdeas, type Idea } from '@/lib/sourcing';
import { getSettings } from '@/lib/catalog';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const go = (tab: string, extra = ''): never => redirect(`/admin/sourcing?tab=${tab}${extra}`);
const note = (m: string) => '&note=' + encodeURIComponent(m);

export async function searchSourcing(fd: FormData) {
  await requireAdmin('sourcing', 'search', str(fd, 'q'));
  const q = str(fd, 'q').slice(0, 120), max = Math.max(0, Number(str(fd, 'max')) || 0);
  if (!q) go('search');
  const s = await getSourcing();
  const sellIn = Object.keys((await getSettings()).regions || {});
  const id = Date.now().toString(36);
  let items: Idea[] = [], msg = '';
  try { items = await findIdeas(q, max, s, sellIn); } catch (e) { msg = e instanceof Error ? e.message : 'AI search failed'; }
  s.runs.unshift({ id, q, at: new Date().toISOString(), max, items, note: msg });
  await saveSourcing(s);
  go('search', `&run=${id}`);
}

export async function savePlatforms(fd: FormData) {
  await requireAdmin('sourcing', 'platforms');
  const s = await getSourcing();
  const on = new Set(fd.getAll('on').map(String));
  s.off = PLATFORMS.filter(p => !on.has(p.id)).map(p => p.id);
  await saveSourcing(s);
  go('platforms', note(`${on.size} of ${PLATFORMS.length} platforms are searched.`));
}

export async function setBuyFrom(fd: FormData) {
  await requireAdmin('sourcing', 'buy-from');
  const s = await getSourcing(), c = str(fd, 'country'), what = str(fd, 'what');
  if (what === 'clear') s.buyFrom = [];
  else if (c && what === 'add' && !s.buyFrom.includes(c)) s.buyFrom.push(c);
  else if (what === 'remove') s.buyFrom = s.buyFrom.filter(x => x !== c);
  await saveSourcing(s);
  go('search');
}

const ideaFrom = (fd: FormData): Idea => JSON.parse(str(fd, 'idea') || '{}');

export async function favIdea(fd: FormData) {
  await requireAdmin('sourcing', 'favourite');
  const s = await getSourcing(), i = ideaFrom(fd), back = str(fd, 'back') || 'search';
  const has = s.favs.some(f => f.name === i.name);
  s.favs = has ? s.favs.filter(f => f.name !== i.name) : [i, ...s.favs];
  await saveSourcing(s);
  const run = str(fd, 'run');
  redirect(`/admin/sourcing?tab=${back}${run ? `&run=${run}` : ''}${note(has ? 'Removed from favourites.' : 'Saved to favourites.')}`);
}

async function draft(name: string, cost: number, price: number, details: string, categoryId: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'product';
  let slug = base, n = 1;
  while (await db.product.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${++n}`;
  // Imported as hidden drafts: the owner adds photos and stock, then makes them live.
  return db.product.create({ data: { slug, name, details, priceCents: Math.round(price * 100), costCents: Math.round(cost * 100), kind: 'gift', active: false, categoryId, sort: 999 } });
}

async function categoryId(fd: FormData) {
  const id = str(fd, 'category');
  if (id) return id;
  const c = await db.category.findFirst({ orderBy: { sort: 'asc' } });
  if (!c) throw new Error('Add a category first in Categories.');
  return c.id;
}

export async function importIdea(fd: FormData) {
  const i = ideaFrom(fd);
  await requireAdmin('sourcing', 'import', i.name);
  const price = Number(str(fd, 'price')) || i.price || i.cost * 2.5;
  const p = await draft(i.name, i.cost, price, [i.why, i.from && `Usually made in ${i.from}.`, `Supplier cost estimate $${i.cost} (check the live price before buying).`].filter(Boolean).join(' '), await categoryId(fd));
  const s = await getSourcing(); s.imported++; await saveSourcing(s);
  await savePlatformSuppliers(i).catch(e => console.error('platform suppliers', e));
  try { revalidateTag('catalog', 'max'); } catch {}
  redirect(`/admin/products/${p.id}`);
}

export async function bulkImport(fd: FormData) {
  await requireAdmin('sourcing', 'bulk-import');
  const links = str(fd, 'links').split(/\s+/).filter(l => /^https?:\/\//i.test(l)).slice(0, 30);
  const markup = Math.max(1, Number(str(fd, 'markup')) || 2.5), cat = await categoryId(fd);
  let made = 0;
  for (const l of links) {
    let name = 'Imported product';
    try {
      const u = new URL(l);
      const words = decodeURIComponent(u.pathname).split('/').filter(Boolean).sort((a, b) => b.length - a.length)[0] || u.hostname;
      name = words.replace(/\.(html?|php)$/i, '').replace(/[-_+]+/g, ' ').replace(/\b\d{5,}\b/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || u.hostname;
      name = name.charAt(0).toUpperCase() + name.slice(1);
    } catch {}
    await draft(name, 0, 0, `Supplier link: ${l} (markup ${markup}x once you add the cost).`, cat);
    try {
      const u = new URL(l), host = u.hostname.replace(/^www\./, ''), p = PLATFORMS.find(x => host.endsWith(x.domain));
      await saveFound({ name: p?.name || host, country: p?.where || '', address: '', website: `${u.protocol}//${u.hostname}`, email: '', phone: '', contact: '', links: [l], source: 'Global sourcing (link)' });
    } catch (e) { console.error('link supplier', e); }
    made++;
  }
  const s = await getSourcing(); s.imported += made; await saveSourcing(s);
  try { revalidateTag('catalog', 'max'); } catch {}
  go('bulk', note(made ? `${made} hidden drafts added to Products. Open each one to add the name, cost, price and photos, then make it live.` : 'No links found. Paste one link per line.'));
}

export async function refreshTrend() {
  await requireAdmin('sourcing', 'trend');
  const s = await getSourcing();
  try { s.trend = { at: new Date().toISOString(), items: await trendIdeas(s) }; } catch (e) { go('search', note(e instanceof Error ? e.message : 'AI failed')); }
  await saveSourcing(s);
  go('search');
}

export async function clearHistory() {
  await requireAdmin('sourcing', 'clear-history');
  const s = await getSourcing(); s.runs = []; await saveSourcing(s);
  go('history');
}

export async function aiSuppliers(fd: FormData) {
  const name = str(fd, 'name').slice(0, 120), back = str(fd, 'back') || 'search', run = str(fd, 'run');
  await requireAdmin('sourcing', 'find-suppliers', name);
  const s = await getSourcing();
  let n = 0, msg = '';
  try { for (const f of await findSuppliers(name, s)) { await saveFound(f); n++; } } catch (e) { msg = e instanceof Error ? e.message : 'AI failed'; }
  redirect(`/admin/sourcing?tab=${back}${run ? `&run=${run}` : ''}${note(msg || (n ? `${n} suppliers for “${name}” saved in Suppliers with website, address, phone and email where found. Check them before you order.` : 'The AI found no suppliers it was sure of. Try a more specific product name.'))}`);
}

// Dropship tab: one CJ product becomes a hidden draft, linked to CJ (first in-stock variant), with CJ photos, cost and stock.
// When a customer pays for it, Automation → Dropship orders sends the order to CJ.
export async function importCj(fd: FormData) {
  const pid = str(fd, 'pid');
  await requireAdmin('sourcing', 'importCj', pid);
  const { product } = await import('@/lib/cj');
  const d = await product(pid);
  const v = d.variants.find(x => x.stock > 0) || d.variants[0];
  if (!v) throw new Error('This CJ product has no variants to sell');
  const cost = v.price || d.price;
  const s = await getSourcing(), rule = s.price;
  // Shipping is part of the cost, so the profit is real: CJ's cheapest line to the chosen country.
  let ship = 0;
  if (rule.ship) { const { cheapestShipping } = await import('@/lib/cj'); ship = (await cheapestShipping(rule.ship, [{ vid: v.vid, quantity: 1 }]).catch(() => null))?.logisticPrice || 0; }
  const own = Number(str(fd, 'price'));
  const price = own > 0 ? Math.round(own * 100) / 100 : applyRule(cost + ship, rule);
  let supplier = await db.supplier.findFirst({ where: { api: 'cj' } });
  if (!supplier) supplier = await db.supplier.create({ data: { name: 'CJ Dropshipping', api: 'cj', website: 'https://cjdropshipping.com', country: 'China', currency: 'USD', leadDays: 12, source: 'CJ API', notes: 'Dropship supplier. Orders are placed through the API and paid from the CJ balance.' } });
  const p = await draft(d.name.slice(0, 120), Math.round((cost + ship) * 100) / 100, price, d.description, await categoryId(fd));
  const n = Math.max(0, Math.min(999, v.stock));
  const images = [...new Set([v.image, ...d.images].filter(u => /^https:\/\//.test(u)))].slice(0, 10);
  await db.product.update({ where: { id: p.id }, data: { images, sub: v.name !== d.name ? v.name.slice(0, 80) : '', dropship: true, supplierId: supplier.id, supplierSku: v.vid, supplierUrl: `cj:${d.pid}`, stock: { BD: n, MY: n, US: n } } });
  s.imported++; await saveSourcing(s);
  redirect(`/admin/products/${p.id}?saved=1`);
}

// The pricing rule for CJ imports: × times, % profit or + fixed $, with or without shipping, rounded to .99.
export async function savePriceRule(fd: FormData) {
  await requireAdmin('sourcing', 'priceRule');
  const s = await getSourcing();
  const mode = (['x', 'pct', 'add'] as const).find(m => m === str(fd, 'mode')) || 'x';
  s.price = { mode, value: Math.min(100000, Math.max(0, Number(str(fd, 'value')) || 0)), ship: /^[A-Z]{2}$/.test(str(fd, 'ship')) ? str(fd, 'ship') : '', round: fd.get('round') === 'on' };
  await saveSourcing(s);
  go('cj', `${str(fd, 'cq') ? `&cq=${encodeURIComponent(str(fd, 'cq'))}` : ''}${note('Price rule saved. New imports use it.')}`);
}
