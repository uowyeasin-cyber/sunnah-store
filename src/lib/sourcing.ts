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
  { id: 'aliexpressds', name: 'AliExpress Dropshipping Center', where: 'China / worldwide', domain: 'ds.aliexpress.com' },
  { id: 'dsers', name: 'DSers (AliExpress partner)', where: 'China / worldwide', domain: 'dsers.com' },
  { id: 'autods', name: 'AutoDS marketplace', where: 'Worldwide', domain: 'autods.com' },
  { id: 'chinabrands', name: 'Chinabrands', where: 'China', domain: 'chinabrands.com' },
  { id: 'hktdc', name: 'HKTDC Sourcing', where: 'Hong Kong', domain: 'sourcing.hktdc.com' },
  { id: 'leeline', name: 'Leeline Sourcing (agent)', where: 'China', domain: 'leelinesourcing.com' },
  { id: 'supplyia', name: 'Supplyia (sourcing agent)', where: 'China', domain: 'supplyia.com' },
  { id: 'wholesale2b', name: 'Wholesale2B', where: 'USA', domain: 'wholesale2b.com' },
  { id: 'doba', name: 'Doba', where: 'USA', domain: 'doba.com' },
  { id: 'modalyst', name: 'Modalyst', where: 'USA / Europe', domain: 'modalyst.co' },
  { id: 'salehoo', name: 'SaleHoo directory', where: 'Worldwide', domain: 'salehoo.com' },
  { id: 'worldwidebrands', name: 'Worldwide Brands directory', where: 'USA', domain: 'worldwidebrands.com' },
  { id: 'inventorysource', name: 'Inventory Source', where: 'USA', domain: 'inventorysource.com' },
  { id: 'kole', name: 'Kole Imports', where: 'USA', domain: 'koleimports.com' },
  { id: 'dollardays', name: 'DollarDays', where: 'USA', domain: 'dollardays.com' },
  { id: 'creoate', name: 'CREOATE', where: 'UK / Europe', domain: 'creoate.com' },
  { id: 'bdstall', name: 'BDStall', where: 'Bangladesh', domain: 'bdstall.com' },
  { id: 'bdtradeinfo', name: 'BD Trade Info', where: 'Bangladesh', domain: 'bdtradeinfo.com' },
  { id: 'exportersindia', name: 'ExportersIndia', where: 'India', domain: 'exportersindia.com' },
  { id: 'matrade', name: 'MATRADE (Malaysian exporters)', where: 'Malaysia', domain: 'matrade.gov.my' },
  { id: 'saudiexports', name: 'Saudi Exports', where: 'Saudi Arabia', domain: 'saudiexports.sa' },
  { id: 'tradewheel', name: 'TradeWheel', where: 'Worldwide', domain: 'tradewheel.com' },
  { id: 'go4worldbusiness', name: 'go4WorldBusiness', where: 'Worldwide', domain: 'go4worldbusiness.com' },
  { id: 'thomasnet', name: 'Thomasnet (US manufacturers)', where: 'USA', domain: 'thomasnet.com' },
  { id: 'kompass', name: 'Kompass', where: 'Worldwide', domain: 'kompass.com' },
  { id: 'ecplaza', name: 'ECPlaza', where: 'South Korea', domain: 'ecplaza.net' },
  { id: 'ecvv', name: 'ECVV', where: 'China', domain: 'ecvv.com' },
  { id: 'eworldtrade', name: 'eWorldTrade', where: 'Worldwide', domain: 'eworldtrade.com' },
  { id: 'lightinthebox', name: 'LightInTheBox', where: 'China', domain: 'lightinthebox.com' },
  { id: 'tomtop', name: 'Tomtop', where: 'China', domain: 'tomtop.com' },
  { id: 'dropshipzone', name: 'Dropshipzone', where: 'Australia', domain: 'dropshipzone.com.au' },
  { id: 'avasam', name: 'Avasam', where: 'UK', domain: 'avasam.com' },
  { id: 'appscenic', name: 'AppScenic', where: 'UK / USA / EU', domain: 'appscenic.com' },
  { id: 'trendsi', name: 'Trendsi (fashion)', where: 'USA', domain: 'trendsi.com' },
  { id: 'brandsgateway', name: 'BrandsGateway (designer fashion)', where: 'Europe', domain: 'brandsgateway.com' },
  { id: 'griffati', name: 'Griffati (Italian fashion)', where: 'Italy', domain: 'griffati.com' },
  { id: 'gelato', name: 'Gelato (print on demand)', where: 'Worldwide', domain: 'gelato.com' },
  { id: 'cjpod', name: 'Gooten (print on demand)', where: 'USA', domain: 'gooten.com' },
  { id: 'pakbiz', name: 'Pakistan exporters (TDAP)', where: 'Pakistan', domain: 'tdap.gov.pk' },
  { id: 'epb', name: 'Bangladesh EPB exporters', where: 'Bangladesh', domain: 'epb.gov.bd' },
];

// Every country, with its flag, for the Buy from / Sell in pickers.
const ISO2 = 'AF AL DZ AD AO AR AM AU AT AZ BH BD BY BE BJ BT BO BA BW BR BN BG BF BI KH CM CA CL CN CO CR HR CU CY CZ DK DJ DO EC EG SV EE ET FJ FI FR GA GM GE DE GH GR GT GN HT HN HK HU IS IN ID IR IQ IE IL IT CI JM JP JO KZ KE KW KG LA LV LB LY LT LU MO MG MW MY MV ML MT MR MU MX MD MC MN ME MA MZ MM NA NP NL NZ NI NE NG MK NO OM PK PS PA PG PY PE PH PL PT QA RO RU RW SA SN RS SG SK SI SO ZA KR ES LK SD SE CH SY TW TJ TZ TH TG TT TN TR TM UG UA AE GB US UY UZ VE VN YE ZM ZW'.split(' ');
const names = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
const ALIAS: Record<string, string> = { Turkey: 'Türkiye', 'Hong Kong SAR China': 'Hong Kong', 'Macao SAR China': 'Macau', 'Myanmar (Burma)': 'Myanmar', 'Côte d’Ivoire': 'Ivory Coast', 'Palestinian Territories': 'Palestine' };
export const COUNTRIES = ISO2.map(code => { const n = names?.of(code) || code; return { code, name: ALIAS[n] || n }; }).sort((a, b) => a.name.localeCompare(b.name));
const flagOf = (code: string) => String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
export const flag = (country: string) => { const c = COUNTRIES.find(x => x.name === country); return c ? flagOf(c.code) : '🌐'; };

export const TOP_COUNTRIES = ['China', 'India', 'Vietnam', 'Bangladesh', 'Türkiye', 'Pakistan', 'Indonesia', 'Thailand', 'Malaysia', 'South Korea', 'Japan', 'Taiwan', 'Germany', 'Italy', 'United States', 'Mexico', 'United Arab Emirates', 'Poland'];

export function searchUrl(p: Platform, q: string) {
  const e = encodeURIComponent(q);
  return p.q ? p.q.replace('{q}', e) : `https://www.google.com/search?q=${e}+site%3A${p.domain}`;
}

export type Idea = { name: string; cat: string; cost: number; price: number; why: string; platforms: string[]; from: string };
export type Run = { id: string; q: string; at: string; max: number; items: Idea[]; note: string; web?: boolean; shops?: Shop[] };
// How imported dropship products are priced. cost = supplier price + (optional) cheapest shipping to `ship`.
// ai: the AI rewrites the description on import. live: imports go straight into the shop. reprice: when CJ's cost changes, the price follows the rule.
export type PriceRule = { mode: 'x' | 'pct' | 'add'; value: number; ship: string; round: boolean; ai: boolean; live: boolean; reprice: boolean };
export const PRICE_MODES: [PriceRule['mode'], string][] = [['x', '× times the cost'], ['pct', '% profit on the cost'], ['add', '+ fixed $ profit']];
export const defaultRule = (): PriceRule => ({ mode: 'x', value: 2.5, ship: 'US', round: true, ai: false, live: false, reprice: true });
export function applyRule(cost: number, r: PriceRule) {
  const v = Math.max(0, Number(r.value) || 0);
  let p = r.mode === 'pct' ? cost * (1 + v / 100) : r.mode === 'add' ? cost + v : cost * Math.max(1, v);
  // Round up to the next .99 (e.g. 7.20 → 7.99) so prices look like shop prices.
  if (r.round) p = Math.ceil(p + 0.01) - 0.01;
  return Math.round(p * 100) / 100;
}
export type Sourcing = { off: string[]; buyFrom: string[]; sellIn: string[]; favs: Idea[]; runs: Run[]; trend: { at: string; items: Idea[]; web?: boolean } | null; imported: number; price: PriceRule;
  // AI automation: what the weekly sourcing job may do by itself.
  auto: { trend: boolean; suppliers: boolean; shops: boolean; importCj: boolean; lastRun: string; log: string[] } };
export const defaultAuto = (): Sourcing['auto'] => ({ trend: true, suppliers: true, shops: true, importCj: false, lastRun: '', log: [] });

export async function getSourcing(): Promise<Sourcing> {
  const r = await db.setting.findUnique({ where: { key: 'sourcing' } });
  const v = (r?.value as Partial<Sourcing>) || {};
  return { off: v.off || [], buyFrom: v.buyFrom || [], sellIn: v.sellIn || [], favs: v.favs || [], runs: v.runs || [], trend: v.trend || null, imported: v.imported || 0, price: { ...defaultRule(), ...(v.price || {}) }, auto: { ...defaultAuto(), ...(v.auto || {}) } };
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
export async function findIdeas(q: string, max: number, s: Sourcing, sellIn: string[]): Promise<{ items: Idea[]; web: boolean }> {
  const live = PLATFORMS.filter(p => !s.off.includes(p.id));
  const sys = `You are a sourcing buyer for a small online store selling worldwide (${sellIn.join(', ') || 'USA, Malaysia, Bangladesh'}). Suggest real, specific products that are easy to ship.
Answer only JSON: {"items":[{"name":"...","cat":"category","cost_usd":0,"price_usd":0,"why":"one short line: why it sells","from":"where it is usually made, e.g. Yiwu, China","platforms":["platform ids"]}]}
Give 12 items. cost_usd is a typical wholesale unit cost, price_usd a good retail price. Platform ids to choose from: ${live.map(p => `${p.id} (${p.where})`).join(', ')}.`;
  const user = `Products for: ${q}${max ? `. Max unit cost $${max}` : ''}${s.buyFrom.length ? `. Buy only from: ${s.buyFrom.join(', ')}` : ''}.`;
  const out = await ask(sys + WEB, [{ role: 'user', content: user }], { maxTokens: 3000, json: true, web: true });
  const ids = new Set(live.map(p => p.id));
  const items = (parseJson<{ items: Record<string, unknown>[] }>(out.text)?.items || []).map(x => clean(x, ids)).filter(x => x.name);
  return { items: max ? items.filter(x => !x.cost || x.cost <= max) : items, web: !!out.web };
}

// The world's best sellers right now, ranked: #1 sells the most. With Gemini it reads this week's best-seller lists first.
export async function trendIdeas(s: Sourcing): Promise<{ items: Idea[]; web: boolean }> {
  const ids = new Set(PLATFORMS.filter(p => !s.off.includes(p.id)).map(p => p.id));
  const out = await ask(`You track e-commerce sales worldwide (Amazon, TikTok Shop, Temu, AliExpress, Shopee best-seller lists and Google Trends). Answer only JSON: {"items":[{"name":"...","cat":"...","cost_usd":0,"price_usd":0,"why":"why it sells now, one line","from":"main sourcing hub, e.g. Yiwu, China","platforms":["ids"]}]}. Platform ids: ${[...ids].join(', ')}.${WEB}`,
    [{ role: 'user', content: `List the 30 products selling the most online worldwide right now, ranked: the first sells the most. Varied across categories, each easy to source and ship.${s.sellIn.length ? ` We sell in: ${s.sellIn.join(', ')}.` : ''}` }], { maxTokens: 4000, json: true, web: true });
  return { items: (parseJson<{ items: Record<string, unknown>[] }>(out.text)?.items || []).map(x => clean(x, ids)).filter(x => x.name).slice(0, 30), web: !!out.web };
}
const WEB = '\nIf you can search the web, use this week\'s real best-seller lists and supplier pages. Reply with the JSON only.';

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
    [{ role: 'user', content: `Product: ${product}.${s.buyFrom.length ? ` Countries: ${s.buyFrom.join(', ')}.` : ''} Give up to 8 suppliers.${WEB}` }], { maxTokens: 2500, json: true, web: true });
  const list = parseJson<{ suppliers: Record<string, string>[] }>(out.text)?.suppliers || [];
  const url = (u: string) => /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(u || '') ? u : '';
  return list.filter(x => x.name).slice(0, 8).map(x => ({
    name: String(x.name), country: String(x.country || ''), address: [x.address, x.city].filter(Boolean).join(', '), website: url(x.website), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email || '') ? x.email : '',
    phone: String(x.phone || '').replace(/[^\d+()\- ]/g, '').slice(0, 30), contact: String(x.contact || ''), links: [url(x.product_link)].filter(Boolean),
    source: 'Global sourcing (AI)', notes: `Found by AI for “${product}”. Check the details on their website before you order.`,
  }));
}

// ── Suppliers without a website: wholesale markets and shops, found on Google Maps ──
export const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export type Market = { name: string; city: string; country: string; kind: string; good: string };
// The world's big wholesale markets and fairs. Each opens Google Maps at the shops selling the product there.
export const MARKETS: Market[] = [
  { name: 'Yiwu International Trade City (Futian Market)', city: 'Yiwu', country: 'China', kind: 'Wholesale market', good: 'small goods, gifts, toys, jewellery, home, Islamic items, packaging, perfume bottles' },
  { name: 'Canton Fair (China Import and Export Fair)', city: 'Guangzhou', country: 'China', kind: 'Trade fair', good: 'factories of every kind, twice a year' },
  { name: 'Baima Clothing Market', city: 'Guangzhou', country: 'China', kind: 'Wholesale market', good: 'clothing, fashion, modest wear' },
  { name: 'Shahe Clothing Wholesale Market', city: 'Guangzhou', country: 'China', kind: 'Wholesale market', good: 'cheap clothing in bulk' },
  { name: 'Baiyun World Leather Trading Center', city: 'Guangzhou', country: 'China', kind: 'Wholesale market', good: 'bags, wallets, leather, belts' },
  { name: 'Huaqiangbei Electronics Market', city: 'Shenzhen', country: 'China', kind: 'Wholesale market', good: 'electronics, gadgets, phone accessories, power banks' },
  { name: 'China Textile City (Keqiao)', city: 'Shaoxing', country: 'China', kind: 'Wholesale market', good: 'fabric, textiles, hijab fabric' },
  { name: 'Jinjiang shoe factories', city: 'Jinjiang', country: 'China', kind: 'Factory town', good: 'shoes, sports shoes, slippers' },
  { name: 'Hong Kong trade fairs (HKTDC)', city: 'Hong Kong', country: 'Hong Kong', kind: 'Trade fair', good: 'electronics, gifts, jewellery, watches' },
  { name: 'Dongdaemun Market', city: 'Seoul', country: 'South Korea', kind: 'Wholesale market', good: 'Korean fashion, accessories' },
  { name: 'Namdaemun Market', city: 'Seoul', country: 'South Korea', kind: 'Wholesale market', good: 'accessories, kitchenware, Korean beauty' },
  { name: 'Pratunam Market', city: 'Bangkok', country: 'Thailand', kind: 'Wholesale market', good: 'clothing, fashion' },
  { name: 'Chatuchak Weekend Market', city: 'Bangkok', country: 'Thailand', kind: 'Market', good: 'handicrafts, home decor, clothing' },
  { name: 'Tanah Abang Market', city: 'Jakarta', country: 'Indonesia', kind: 'Wholesale market', good: 'Muslim fashion, hijab, textiles' },
  { name: 'Binh Tay Market', city: 'Ho Chi Minh City', country: 'Vietnam', kind: 'Wholesale market', good: 'household goods, food, clothing' },
  { name: 'Dong Xuan Market', city: 'Hanoi', country: 'Vietnam', kind: 'Wholesale market', good: 'clothing, household goods' },
  { name: 'Divisoria Market', city: 'Manila', country: 'Philippines', kind: 'Wholesale market', good: 'cheap goods, toys, fabric' },
  { name: 'Kenanga Wholesale City', city: 'Kuala Lumpur', country: 'Malaysia', kind: 'Wholesale mall', good: 'fashion, baju kurung, hijab' },
  { name: 'Jalan Masjid India', city: 'Kuala Lumpur', country: 'Malaysia', kind: 'Market street', good: 'Islamic items, attar, prayer mats, textiles' },
  { name: 'Chawkbazar', city: 'Dhaka', country: 'Bangladesh', kind: 'Wholesale market', good: 'cosmetics, attar, plastic goods, toys, packaging, everything small' },
  { name: 'Islampur Cloth Market', city: 'Dhaka', country: 'Bangladesh', kind: 'Wholesale market', good: 'fabric, sarees, three-piece, textiles' },
  { name: 'Bangabazar and Gulistan', city: 'Dhaka', country: 'Bangladesh', kind: 'Wholesale market', good: 'clothing, export surplus garments' },
  { name: 'Nawabpur Road', city: 'Dhaka', country: 'Bangladesh', kind: 'Wholesale market', good: 'electrical, hardware, machinery parts' },
  { name: 'Baitul Mukarram Market', city: 'Dhaka', country: 'Bangladesh', kind: 'Market', good: 'Islamic items, attar, tasbih, electronics' },
  { name: 'Sadar Bazaar', city: 'Delhi', country: 'India', kind: 'Wholesale market', good: 'toys, household, stationery, gifts' },
  { name: 'Gandhi Nagar Market', city: 'Delhi', country: 'India', kind: 'Wholesale market', good: 'readymade garments' },
  { name: 'Chandni Chowk', city: 'Delhi', country: 'India', kind: 'Wholesale market', good: 'textiles, attar (Dariba), spices, jewellery' },
  { name: 'Crawford Market', city: 'Mumbai', country: 'India', kind: 'Wholesale market', good: 'imported goods, home, perfumes' },
  { name: 'Surat Textile Market', city: 'Surat', country: 'India', kind: 'Wholesale market', good: 'sarees, dress material, synthetic fabric' },
  { name: 'Kannauj attar makers', city: 'Kannauj', country: 'India', kind: 'Factory town', good: 'attar and natural perfume oils' },
  { name: 'Moradabad brass market', city: 'Moradabad', country: 'India', kind: 'Factory town', good: 'brass, metal handicrafts, home decor' },
  { name: 'Shah Alam Market', city: 'Lahore', country: 'Pakistan', kind: 'Wholesale market', good: 'cosmetics, toys, household, everything small' },
  { name: 'Bolton Market', city: 'Karachi', country: 'Pakistan', kind: 'Wholesale market', good: 'fabric, household goods' },
  { name: 'Sialkot manufacturers', city: 'Sialkot', country: 'Pakistan', kind: 'Factory town', good: 'sports goods, leather, surgical tools' },
  { name: 'Dragon Mart', city: 'Dubai', country: 'United Arab Emirates', kind: 'Wholesale mall', good: 'Chinese goods for the Gulf, home, electronics' },
  { name: 'Murshid Bazaar (Deira)', city: 'Dubai', country: 'United Arab Emirates', kind: 'Wholesale market', good: 'perfume, oud, abaya, textiles' },
  { name: 'Grand Bazaar', city: 'Istanbul', country: 'Türkiye', kind: 'Market', good: 'lamps, ceramics, carpets, jewellery' },
  { name: 'Laleli wholesale district', city: 'Istanbul', country: 'Türkiye', kind: 'Wholesale market', good: 'fashion, modest wear, textiles' },
  { name: 'Merter textile district', city: 'Istanbul', country: 'Türkiye', kind: 'Wholesale market', good: 'clothing manufacturers' },
  { name: 'Los Angeles Fashion District (Santee Alley)', city: 'Los Angeles', country: 'United States', kind: 'Wholesale market', good: 'fashion, accessories' },
  { name: 'Broadway wholesale district', city: 'New York', country: 'United States', kind: 'Wholesale market', good: 'accessories, perfume, general merchandise' },
  { name: 'Tepito Market', city: 'Mexico City', country: 'Mexico', kind: 'Market', good: 'clothing, electronics, general goods' },
  { name: 'Rua 25 de Março', city: 'São Paulo', country: 'Brazil', kind: 'Wholesale market', good: 'small goods, toys, accessories' },
  { name: 'Balogun Market', city: 'Lagos', country: 'Nigeria', kind: 'Wholesale market', good: 'fabric, clothing, shoes' },
  { name: 'Merkato', city: 'Addis Ababa', country: 'Ethiopia', kind: 'Wholesale market', good: 'everything, coffee, spices' },
  { name: 'Gikomba Market', city: 'Nairobi', country: 'Kenya', kind: 'Market', good: 'second-hand clothes, furniture' },
];
// Markets for a product: the ones whose speciality matches the words first, then the chosen countries.
export function marketsFor(q: string, countries: string[]) {
  const words = q.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const score = (m: Market) => words.filter(w => m.good.includes(w) || m.name.toLowerCase().includes(w)).length * 10 + (countries.includes(m.country) ? 5 : 0) + (/everything|small goods/.test(m.good) ? 1 : 0);
  return MARKETS.filter(m => !countries.length || countries.includes(m.country)).map(m => [m, score(m)] as const).sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

export type Shop = { name: string; market: string; address: string; city: string; country: string; phone: string; email: string; whatsapp: string; good: string; maps: string };
// AI looks up real wholesalers and factory shops, mostly ones without a website (Google Maps listings, market shops).
export async function findLocalShops(product: string, s: Sourcing): Promise<{ shops: Shop[]; web: boolean }> {
  const where = s.buyFrom.length ? s.buyFrom.join(', ') : 'the best sourcing countries for it';
  const out = await ask(`You are a sourcing agent who finds offline suppliers: wholesale shops, market stalls and small factories, mostly without a website, the kind found on Google Maps.
Only list businesses you found or are confident exist. Use "" for any detail you are not sure of; never invent phone numbers, emails or addresses.
Answer only JSON: {"shops":[{"name":"","market":"market or area","address":"street address","city":"","country":"","phone":"with country code","email":"","whatsapp":"","good_for":"what they are best for, one line"}]}${WEB}`,
    [{ role: 'user', content: `Product: ${product}. Where: ${where}. Give up to 12 wholesalers or shops.` }], { maxTokens: 3000, json: true, web: true });
  const list = parseJson<{ shops: Record<string, string>[] }>(out.text)?.shops || [];
  const tel = (v: string) => String(v || '').replace(/[^\d+()\- ]/g, '').trim().slice(0, 30);
  const shops = list.filter(x => x.name).slice(0, 12).map(x => {
    const sh = { name: String(x.name).slice(0, 120), market: String(x.market || ''), address: String(x.address || ''), city: String(x.city || ''), country: String(x.country || ''), phone: tel(x.phone), whatsapp: tel(x.whatsapp),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email || '') ? x.email : '', good: String(x.good_for || x.good || '').slice(0, 160), maps: '' };
    sh.maps = mapsSearch([sh.name, sh.market, sh.address, sh.city, sh.country].filter(Boolean).join(', '));
    return sh;
  });
  return { shops, web: !!out.web };
}
// A shop found on Google Maps becomes a supplier (with its Maps link), or adds to the one already saved.
export const saveShop = (sh: Shop, product: string) => saveFound({ name: sh.name, country: sh.country, address: [sh.address, sh.market, sh.city].filter(Boolean).join(', '), website: '', email: sh.email, phone: sh.phone || sh.whatsapp, contact: sh.whatsapp ? `WhatsApp ${sh.whatsapp}` : '', links: [sh.maps], source: 'Market shop (AI, Google Maps)', notes: `Good for: ${sh.good || product}. Found for “${product}”. No website: check on Google Maps and call before you order.` });
