import { db } from '@/lib/db';
import { ask, parseJson } from '@/lib/ai';

// Global sourcing: supplier platforms worldwide, AI product search, trending ideas, favourites and history.
// Everything lives in one Setting row ("sourcing"), so no new tables are needed.

export type Platform = { id: string; name: string; where: string; domain: string; q?: string };
// q: the platform's own search URL with {q}; without it the button opens a Google search of that site.
export const PLATFORMS: Platform[] = [
  { id: 'alibaba', name: 'Alibaba.com', where: 'China', domain: 'alibaba.com', q: 'https://www.alibaba.com/trade/search?SearchText={q}' },
  { id: 'aliexpress', name: 'AliExpress', where: 'China', domain: 'aliexpress.com', q: 'https://www.aliexpress.com/wholesale?SearchText={q}' },
  { id: '1688', name: '1688.com', where: 'China', domain: '1688.com', q: 'https://s.1688.com/selloffer/offer_search.htm?keywords={q}' },
  { id: 'dhgate', name: 'DHgate', where: 'China', domain: 'dhgate.com', q: 'https://www.dhgate.com/wholesale/search.do?searchkey={q}' },
  { id: 'mic', name: 'Made-in-China', where: 'China', domain: 'made-in-china.com' },
  { id: 'globalsources', name: 'Global Sources', where: 'China / Hong Kong', domain: 'globalsources.com' },
  { id: 'yiwugo', name: 'Yiwugo (Yiwu market)', where: 'China', domain: 'yiwugo.com' },
  { id: 'cj', name: 'CJ Dropshipping', where: 'China / worldwide', domain: 'cjdropshipping.com' },
  { id: 'temu', name: 'Temu', where: 'China', domain: 'temu.com', q: 'https://www.temu.com/search_result.html?search_key={q}' },
  { id: 'banggood', name: 'Banggood', where: 'China', domain: 'banggood.com', q: 'https://www.banggood.com/search/{q}.html' },
  { id: 'taobao', name: 'Taobao', where: 'China', domain: 'taobao.com', q: 'https://s.taobao.com/search?q={q}' },
  { id: 'superbuy', name: 'Superbuy (Taobao/1688 agent)', where: 'China', domain: 'superbuy.com' },
  { id: 'indiamart', name: 'IndiaMART', where: 'India', domain: 'indiamart.com', q: 'https://dir.indiamart.com/search.mp?ss={q}' },
  { id: 'tradeindia', name: 'TradeIndia', where: 'India', domain: 'tradeindia.com' },
  { id: 'udaan', name: 'Udaan', where: 'India', domain: 'udaan.com' },
  { id: 'meesho', name: 'Meesho Supplier', where: 'India', domain: 'meesho.com' },
  { id: 'daraz', name: 'Daraz', where: 'Bangladesh / Pakistan', domain: 'daraz.com.bd', q: 'https://www.daraz.com.bd/catalog/?q={q}' },
  { id: 'chawkbazar', name: 'Bangladesh wholesale (Chawkbazar)', where: 'Bangladesh', domain: 'chawkbazar.com' },
  { id: 'mokam', name: 'Mokam (ShopUp B2B)', where: 'Bangladesh', domain: 'mokam.com.bd' },
  { id: 'shopee', name: 'Shopee', where: 'Malaysia / SE Asia', domain: 'shopee.com.my', q: 'https://shopee.com.my/search?keyword={q}' },
  { id: 'lazada', name: 'Lazada', where: 'Malaysia / SE Asia', domain: 'lazada.com.my', q: 'https://www.lazada.com.my/catalog/?q={q}' },
  { id: 'vietnam', name: 'Vietnam suppliers (Tradeway, VietnamExport)', where: 'Vietnam', domain: 'vietnamexport.com' },
  { id: 'thai', name: 'Thai Trade (DITP)', where: 'Thailand', domain: 'thaitrade.com' },
  { id: 'indotrading', name: 'Indotrading', where: 'Indonesia', domain: 'indotrading.com' },
  { id: 'ec21', name: 'EC21 (Korea)', where: 'South Korea', domain: 'ec21.com' },
  { id: 'tradekorea', name: 'tradeKorea', where: 'South Korea', domain: 'tradekorea.com' },
  { id: 'netsea', name: 'NETSEA (Japan wholesale)', where: 'Japan', domain: 'netsea.jp' },
  { id: 'superdelivery', name: 'SUPER DELIVERY (Japan)', where: 'Japan', domain: 'superdelivery.com' },
  { id: 'taiwantrade', name: 'Taiwantrade', where: 'Taiwan', domain: 'taiwantrade.com' },
  { id: 'turkish', name: 'Turkish Exporter', where: 'Türkiye', domain: 'turkishexporter.com.tr' },
  { id: 'trendyol', name: 'Trendyol', where: 'Türkiye', domain: 'trendyol.com' },
  { id: 'tradeling', name: 'Tradeling', where: 'UAE / Saudi Arabia', domain: 'tradeling.com' },
  { id: 'dragonmart', name: 'Dragon Mart (UAE wholesale)', where: 'UAE', domain: 'dragonmart.ae' },
  { id: 'noon', name: 'noon', where: 'UAE / Saudi Arabia', domain: 'noon.com' },
  { id: 'tradekey', name: 'TradeKey', where: 'Pakistan / worldwide', domain: 'tradekey.com' },
  { id: 'faire', name: 'Faire', where: 'USA / Europe', domain: 'faire.com' },
  { id: 'amazonbiz', name: 'Amazon Business', where: 'USA', domain: 'business.amazon.com' },
  { id: 'wholesalecentral', name: 'Wholesale Central', where: 'USA', domain: 'wholesalecentral.com' },
  { id: 'tundra', name: 'Tundra', where: 'USA', domain: 'tundra.com' },
  { id: 'syncee', name: 'Syncee', where: 'USA / Europe', domain: 'syncee.com' },
  { id: 'spocket', name: 'Spocket', where: 'USA / Europe', domain: 'spocket.co' },
  { id: 'zendrop', name: 'Zendrop', where: 'USA', domain: 'zendrop.com' },
  { id: 'etsy', name: 'Etsy (handmade makers)', where: 'Worldwide', domain: 'etsy.com', q: 'https://www.etsy.com/search?q={q}' },
  { id: 'ankorstore', name: 'Ankorstore', where: 'Europe', domain: 'ankorstore.com' },
  { id: 'europages', name: 'Europages', where: 'Europe', domain: 'europages.co.uk' },
  { id: 'wlw', name: 'wer liefert was', where: 'Germany', domain: 'wlw.de' },
  { id: 'bigbuy', name: 'BigBuy', where: 'Spain / Europe', domain: 'bigbuy.eu' },
  { id: 'vidaxl', name: 'vidaXL', where: 'Netherlands / Europe', domain: 'vidaxl.com' },
  { id: 'wholesaledeals', name: 'Wholesale Deals UK', where: 'UK', domain: 'wholesaledeals.co.uk' },
  { id: 'mercadolibre', name: 'Mercado Libre', where: 'Latin America', domain: 'mercadolibre.com' },
  { id: 'jumia', name: 'Jumia / Kilimall', where: 'Africa', domain: 'jumia.com' },
  { id: 'printful', name: 'Printful (print on demand)', where: 'Worldwide', domain: 'printful.com' },
  { id: 'printify', name: 'Printify (print on demand)', where: 'Worldwide', domain: 'printify.com' },
];

export const TOP_COUNTRIES = ['China', 'India', 'Vietnam', 'Bangladesh', 'Türkiye', 'Pakistan', 'Indonesia', 'Thailand', 'Malaysia', 'South Korea', 'Japan', 'Taiwan', 'Germany', 'Italy', 'United States', 'Mexico', 'United Arab Emirates', 'Poland'];

export function searchUrl(p: Platform, q: string) {
  const e = encodeURIComponent(q);
  return p.q ? p.q.replace('{q}', e) : `https://www.google.com/search?q=${e}+site%3A${p.domain}`;
}

export type Idea = { name: string; cat: string; cost: number; price: number; why: string; platforms: string[]; from: string };
export type Run = { id: string; q: string; at: string; max: number; items: Idea[]; note: string };
// How imported dropship products are priced. cost = supplier price + (optional) cheapest shipping to `ship`.
export type PriceRule = { mode: 'x' | 'pct' | 'add'; value: number; ship: string; round: boolean };
export const PRICE_MODES: [PriceRule['mode'], string][] = [['x', '× times the cost'], ['pct', '% profit on the cost'], ['add', '+ fixed $ profit']];
export const defaultRule = (): PriceRule => ({ mode: 'x', value: 2.5, ship: 'US', round: true });
export function applyRule(cost: number, r: PriceRule) {
  const v = Math.max(0, Number(r.value) || 0);
  let p = r.mode === 'pct' ? cost * (1 + v / 100) : r.mode === 'add' ? cost + v : cost * Math.max(1, v);
  // Round up to the next .99 (e.g. 7.20 → 7.99) so prices look like shop prices.
  if (r.round) p = Math.ceil(p + 0.01) - 0.01;
  return Math.round(p * 100) / 100;
}
export type Sourcing = { off: string[]; buyFrom: string[]; favs: Idea[]; runs: Run[]; trend: { at: string; items: Idea[] } | null; imported: number; price: PriceRule };

export async function getSourcing(): Promise<Sourcing> {
  const r = await db.setting.findUnique({ where: { key: 'sourcing' } });
  const v = (r?.value as Partial<Sourcing>) || {};
  return { off: v.off || [], buyFrom: v.buyFrom || [], favs: v.favs || [], runs: v.runs || [], trend: v.trend || null, imported: v.imported || 0, price: { ...defaultRule(), ...(v.price || {}) } };
}
export async function saveSourcing(s: Sourcing) {
  const value = { ...s, runs: s.runs.slice(0, 20), favs: s.favs.slice(0, 60) } as object;
  await db.setting.upsert({ where: { key: 'sourcing' }, create: { key: 'sourcing', value }, update: { value } });
}

const clean = (x: Record<string, unknown>, live: Set<string>): Idea => ({
  name: String(x.name || '').slice(0, 90), cat: String(x.cat || x.category || '').slice(0, 40),
  cost: Math.max(0, Math.round(Number(x.cost_usd ?? x.cost ?? 0) * 100) / 100), price: Math.max(0, Math.round(Number(x.price_usd ?? x.price ?? 0) * 100) / 100),
  why: String(x.why || '').slice(0, 200), from: String(x.from || x.source || '').slice(0, 80),
  platforms: (Array.isArray(x.platforms) ? x.platforms : []).map(String).filter(id => live.has(id)).slice(0, 4),
});

// The AI suggests concrete products with a typical supplier cost and a selling price.
// Prices are estimates; the platform buttons open real searches so the owner checks the live price.
export async function findIdeas(q: string, max: number, s: Sourcing, sellIn: string[]): Promise<Idea[]> {
  const live = PLATFORMS.filter(p => !s.off.includes(p.id));
  const sys = `You are a sourcing buyer for a small online store selling worldwide (${sellIn.join(', ') || 'USA, Malaysia, Bangladesh'}). Suggest real, specific products that are easy to ship.
Answer only JSON: {"items":[{"name":"...","cat":"category","cost_usd":0,"price_usd":0,"why":"one short line: why it sells","from":"where it is usually made, e.g. Yiwu, China","platforms":["platform ids"]}]}
Give 12 items. cost_usd is a typical wholesale unit cost, price_usd a good retail price. Platform ids to choose from: ${live.map(p => `${p.id} (${p.where})`).join(', ')}.`;
  const user = `Products for: ${q}${max ? `. Max unit cost $${max}` : ''}${s.buyFrom.length ? `. Buy only from: ${s.buyFrom.join(', ')}` : ''}.`;
  const out = await ask(sys, [{ role: 'user', content: user }], { maxTokens: 2500, json: true });
  const ids = new Set(live.map(p => p.id));
  const items = (parseJson<{ items: Record<string, unknown>[] }>(out.text)?.items || []).map(x => clean(x, ids)).filter(x => x.name);
  return max ? items.filter(x => !x.cost || x.cost <= max) : items;
}

export async function trendIdeas(s: Sourcing): Promise<Idea[]> {
  const ids = new Set(PLATFORMS.filter(p => !s.off.includes(p.id)).map(p => p.id));
  const out = await ask(`You track e-commerce trends worldwide. Answer only JSON: {"items":[{"name":"...","cat":"...","cost_usd":0,"price_usd":0,"why":"...","from":"main sourcing hub","platforms":["ids"]}]}. Platform ids: ${[...ids].join(', ')}.`,
    [{ role: 'user', content: 'List the 20 product types selling best online worldwide right now, varied across categories, each easy to source and ship.' }], { maxTokens: 3000, json: true });
  return (parseJson<{ items: Record<string, unknown>[] }>(out.text)?.items || []).map(x => clean(x, ids)).filter(x => x.name).slice(0, 20);
}

export const IDEAS: Record<string, string[]> = {
  'Islamic & gifts': ['Miswak sticks', 'Attar perfume oil', 'Prayer mat', 'Tasbih beads', 'Quran stand', 'Eid gift box'],
  Gadgets: ['Smart watch', 'Wireless earbuds', 'Mini portable fan', 'Power bank 20000mAh', 'Car phone holder'],
  'Home & kitchen': ['Silicone kitchen utensils set', 'Portable blender', 'Storage organizer boxes', 'Vegetable chopper'],
  'Fashion & beauty': ['Modest fashion hijab', "Men's leather wallet", 'Skincare serum', 'Hair straightener brush'],
};

// ── Suppliers found while sourcing are saved to Suppliers by themselves ──
export type FoundSupplier = { name: string; country: string; address: string; website: string; email: string; phone: string; contact: string; links: string[]; source: string; notes?: string };

const site = (u: string) => { try { return new URL(/^https?:/.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// Adds the supplier, or merges new details and links into one already saved with the same website or name.
export async function saveFound(f: FoundSupplier) {
  const host = site(f.website);
  const all = await db.supplier.findMany({ select: { id: true, name: true, website: true, links: true, email: true, phone: true, address: true, country: true, contact: true } });
  const same = all.find(x => (host && site(x.website) === host) || x.name.trim().toLowerCase() === f.name.trim().toLowerCase());
  const links = [...new Set([...(same?.links || []), ...f.links.filter(l => /^https?:\/\//.test(l))])].slice(0, 40);
  if (same) {
    await db.supplier.update({ where: { id: same.id }, data: { links, website: same.website || f.website, email: same.email || f.email, phone: same.phone || f.phone, address: same.address || f.address, country: same.country || f.country, contact: same.contact || f.contact } });
    return same.id;
  }
  const r = await db.supplier.create({ data: { name: f.name.slice(0, 120), country: f.country.slice(0, 60), address: f.address.slice(0, 300), website: f.website.slice(0, 300), email: f.email.slice(0, 160), phone: f.phone.slice(0, 40), contact: f.contact.slice(0, 120), links, source: f.source, notes: (f.notes || '').slice(0, 1000) } });
  return r.id;
}

// The platform a product idea points to becomes a supplier entry with a link to that product search.
export async function savePlatformSuppliers(i: Idea) {
  for (const id of i.platforms.slice(0, 3)) {
    const p = PLATFORMS.find(x => x.id === id); if (!p) continue;
    await saveFound({ name: p.name, country: p.where, address: '', website: 'https://' + p.domain, email: '', phone: '', contact: '', links: [searchUrl(p, i.name)], source: 'Global sourcing (platform)' });
  }
}

// AI looks for real manufacturers and wholesalers of a product. Contact details must be checked before use.
export async function findSuppliers(product: string, s: Sourcing): Promise<FoundSupplier[]> {
  const out = await ask(`You are a sourcing agent. List real, well-known manufacturers, wholesalers or trading companies for the product. Only include companies you are confident exist. Use "" for any detail you are not sure of; never invent phone numbers or emails.
Answer only JSON: {"suppliers":[{"name":"","country":"","city":"","address":"","website":"https://...","email":"","phone":"","contact":"","product_link":"https://..."}]}`,
    [{ role: 'user', content: `Product: ${product}.${s.buyFrom.length ? ` Countries: ${s.buyFrom.join(', ')}.` : ''} Give up to 8 suppliers.` }], { maxTokens: 2500, json: true });
  const list = parseJson<{ suppliers: Record<string, string>[] }>(out.text)?.suppliers || [];
  const url = (u: string) => /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(u || '') ? u : '';
  return list.filter(x => x.name).slice(0, 8).map(x => ({
    name: String(x.name), country: String(x.country || ''), address: [x.address, x.city].filter(Boolean).join(', '), website: url(x.website), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email || '') ? x.email : '',
    phone: String(x.phone || '').replace(/[^\d+()\- ]/g, '').slice(0, 30), contact: String(x.contact || ''), links: [url(x.product_link)].filter(Boolean),
    source: 'Global sourcing (AI)', notes: `Found by AI for “${product}”. Check the details on their website before you order.`,
  }));
}
