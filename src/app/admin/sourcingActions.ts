'use server';
import { redirect } from 'next/navigation';
import { revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { applyRule, COUNTRIES, findIdeas, findLocalShops, findSuppliers, getSourcing, PLATFORMS, saveFound, savePlatformSuppliers, saveShop, saveSourcing, TOP_COUNTRIES, trendIdeas, type Idea } from '@/lib/sourcing';
import { getSettings } from '@/lib/catalog';
import { draft, importOneCj } from '@/lib/sourcingImport';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const go = (tab: string, extra = ''): never => redirect(`/admin/sourcing?tab=${tab}${extra}`);
const note = (m: string) => '&note=' + encodeURIComponent(m);

export async function searchSourcing(fd: FormData) {
  await requireAdmin('sourcing', 'search', str(fd, 'q'));
  const q = str(fd, 'q').slice(0, 120), max = Math.max(0, Number(str(fd, 'max')) || 0);
  if (!q) go('search');
  const s = await getSourcing();
  const sellIn = s.sellIn.length ? s.sellIn : Object.keys((await getSettings()).regions || {});
  const id = Date.now().toString(36);
  let items: Idea[] = [], msg = '', web = false;
  try { ({ items, web } = await findIdeas(q, max, s, sellIn)); } catch (e) { msg = e instanceof Error ? e.message : 'AI search failed'; }
  s.runs.unshift({ id, q, at: new Date().toISOString(), max, items, note: msg, web });
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

// Buy from (supplier countries) and Sell in (customer countries): add, remove, clear, or pick all the suggested ones.
export async function setBuyFrom(fd: FormData) {
  await requireAdmin('sourcing', 'countries');
  const s = await getSourcing(), what = str(fd, 'what'), list = str(fd, 'list') === 'sellIn' ? 'sellIn' : 'buyFrom';
  const typed = str(fd, 'country').toLowerCase(), c = COUNTRIES.find(x => x.name.toLowerCase() === typed)?.name || (TOP_COUNTRIES.find(x => x.toLowerCase() === typed) ?? '');
  let v = s[list];
  if (what === 'clear') v = [];
  else if (what === 'all') v = [...new Set([...v, ...TOP_COUNTRIES])];
  else if (what === 'remove') v = v.filter(x => x.toLowerCase() !== typed);
  else if (c && !v.includes(c)) v = [...v, c];
  s[list] = v.slice(0, 60);
  await saveSourcing(s);
  const run = str(fd, 'run');
  go('search', `${run ? `&run=${run}` : ''}${typed && !c && what === 'add' ? note(`“${str(fd, 'country')}” is not a country name I know. Pick one from the list.`) : ''}`);
}

// Wholesalers and market shops without a website for a product: AI with Google Search, saved to Suppliers with a Google Maps link.
export async function findShops(fd: FormData) {
  const name = str(fd, 'name').slice(0, 120), run = str(fd, 'run');
  await requireAdmin('sourcing', 'find-shops', name);
  const s = await getSourcing();
  let msg = '', n = 0;
  try {
    const r = await findLocalShops(name, s);
    for (const sh of r.shops) { await saveShop(sh, name); n++; }
    const at = s.runs.find(x => x.id === run);
    if (at) at.shops = r.shops; else s.runs.unshift({ id: Date.now().toString(36), q: name, at: new Date().toISOString(), max: 0, items: [], note: '', web: r.web, shops: r.shops });
    await saveSourcing(s);
    msg = n ? `${n} shops for “${name}” saved in Suppliers with their Google Maps link${r.web ? '' : '. Connect Gemini for live Google results'}. Call before you order.` : 'No shops found that the AI was sure of. Try a simpler product name or pick a country.';
  } catch (e) { msg = e instanceof Error ? e.message : 'AI failed'; }
  go('search', `&run=${run || s.runs[0]?.id || ''}${note(msg)}`);
}

// What the weekly AI sourcing job may do by itself.
export async function saveAutoSourcing(fd: FormData) {
  await requireAdmin('sourcing', 'auto');
  const s = await getSourcing();
  s.auto = { ...s.auto, trend: fd.get('trend') === 'on', suppliers: fd.get('suppliers') === 'on', shops: fd.get('shops') === 'on', importCj: fd.get('importCj') === 'on' };
  await saveSourcing(s);
  go('search', note('Saved. The AI sourcing job runs once a week (Automation → AI sourcing).'));
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
  try { const r = await trendIdeas(s); s.trend = { at: new Date().toISOString(), ...r }; } catch (e) { go('search', note(e instanceof Error ? e.message : 'AI failed')); }
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


// One product (its own Import button), or every ticked one (Import ticked). At most 10 at a time.
export async function importCj(fd: FormData) {
  const one = str(fd, 'one');
  const pids = one ? [one] : fd.getAll('pids').map(String).filter(Boolean).slice(0, 10);
  await requireAdmin('sourcing', 'importCj', pids.join(','));
  if (!pids.length) go('cj', `&cq=${encodeURIComponent(str(fd, 'cq'))}${note('Tick at least one product first.')}`);
  const s = await getSourcing(), cat = await categoryId(fd);
  const done: string[] = [], failed: string[] = [];
  for (const pid of pids) await importOneCj(pid, cat, Number(str(fd, `price-${pid}`)) || 0, s).then(id => done.push(id), e => failed.push((e as Error).message.slice(0, 80)));
  await saveSourcing(s);
  try { revalidateTag('catalog', 'max'); } catch {}
  if (one && done.length) redirect(`/admin/products/${done[0]}?saved=1`);
  go('cj', `&cq=${encodeURIComponent(str(fd, 'cq'))}&cpage=${encodeURIComponent(str(fd, 'cpage') || '1')}${note(`${done.length} imported${s.price.live ? ' and live in the shop' : ' as hidden drafts'}${failed.length ? ` · ${failed.length} failed: ${failed[0]}` : ''}. See Products.`)}`);
}

// The pricing rule for CJ imports: × times, % profit or + fixed $, with or without shipping, rounded to .99.
export async function savePriceRule(fd: FormData) {
  await requireAdmin('sourcing', 'priceRule');
  const s = await getSourcing();
  const mode = (['x', 'pct', 'add'] as const).find(m => m === str(fd, 'mode')) || 'x';
  s.price = { mode, value: Math.min(100000, Math.max(0, Number(str(fd, 'value')) || 0)), ship: /^[A-Z]{2}$/.test(str(fd, 'ship')) ? str(fd, 'ship') : '', round: fd.get('round') === 'on', ai: fd.get('ai') === 'on', live: fd.get('live') === 'on', reprice: fd.get('reprice') === 'on' };
  await saveSourcing(s);
  go('cj', `${str(fd, 'cq') ? `&cq=${encodeURIComponent(str(fd, 'cq'))}` : ''}${note('Price rule saved. New imports use it.')}`);
}

// AliExpress: "Link AliExpress" opens AliExpress's own allow page; it comes back to /api/channels/callback.
export async function linkAe() {
  await requireAdmin('sourcing', 'linkAliExpress');
  const { aeReady, authUrl } = await import('@/lib/aliexpress');
  if (!(await aeReady())) go('ae', note('Add the AliExpress app key and secret in Connections → Suppliers first.'));
  redirect(authUrl(`${process.env.SITE_URL || 'https://sunnahstore.vercel.app'}/api/channels/callback`));
}

// AliExpress product links (or IDs) → products in the store, linked to AliExpress and priced by the same rule as CJ.
export async function importAe(fd: FormData) {
  const { productId, product } = await import('@/lib/aliexpress');
  const ids = [...new Set(str(fd, 'links').split(/\s+/).map(productId).filter(Boolean))].slice(0, 10);
  await requireAdmin('sourcing', 'importAliExpress', ids.join(','));
  if (!ids.length) go('ae', note('Paste at least one AliExpress product link.'));
  const s = await getSourcing(), cat = await categoryId(fd), rule = s.price, own = Number(str(fd, 'price')) || 0;
  let supplier = await db.supplier.findFirst({ where: { api: 'aliexpress' } });
  if (!supplier) supplier = await db.supplier.create({ data: { name: 'AliExpress', api: 'aliexpress', website: 'https://www.aliexpress.com', country: 'China', currency: 'USD', leadDays: 15, source: 'AliExpress API', notes: 'Dropship supplier. Orders are placed through the AliExpress Dropshipping API.' } });
  const done: string[] = [], failed: string[] = [];
  for (const id of ids) {
    try {
      const d = await product(id, rule.ship || 'US');
      const v = d.variants.filter(x => x.stock > 0).sort((a, b) => a.price - b.price)[0] || d.variants[0];
      if (!v || !v.price) throw new Error('no variant with a price');
      const cost = Math.round(v.price * 100) / 100, price = own > 0 ? Math.round(own * 100) / 100 : applyRule(cost, rule);
      let text = { name: d.name.slice(0, 120), sub: v.name.slice(0, 80), details: d.description };
      if (rule.ai) {
        const { aiWriteProduct } = await import('./aiWriteActions');
        const r = await aiWriteProduct({ ...text, instruction: 'Rewrite this supplier listing for our shop: a short, clear product name without supplier words or keyword lists, a short line, and an honest premium description with 3 to 5 key points.', lang: 'English', keep: false }).catch(() => null);
        if (r && !('error' in r)) text = r;
      }
      const p = await draft(text.name, cost, price, text.details, cat);
      const images = [...new Set([v.image, ...d.images].filter(u => /^https:\/\//.test(u)))].slice(0, 10), n = Math.max(0, Math.min(999, v.stock));
      await db.product.update({ where: { id: p.id }, data: { images, sub: text.sub, active: rule.live && images.length > 0, dropship: true, supplierId: supplier.id, supplierSku: `${d.id}|${v.sku}`, supplierUrl: `ae:${d.id}`, supplierCost: Math.round(v.price * 100), stock: { BD: n, MY: n, US: n } } });
      s.imported++; done.push(p.id);
    } catch (e) { failed.push(`${id}: ${(e as Error).message.slice(0, 80)}`); }
  }
  await saveSourcing(s);
  try { revalidateTag('catalog', 'max'); } catch {}
  if (ids.length === 1 && done.length) redirect(`/admin/products/${done[0]}?saved=1`);
  go('ae', note(`${done.length} imported${rule.live ? ' and live in the shop' : ' as hidden drafts'}${failed.length ? ` · ${failed.length} failed: ${failed[0]}` : ''}. See Products.`));
}
