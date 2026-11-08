import 'server-only';
import { db } from './db';
import { ask, parseJson } from './ai';
import { getSettings } from './catalog';
import { rawSeo, saveSeo } from './seo';

// AI-written SEO, used by Admin → SEO & ads and by the automation job.
export async function aiSiteSeo() {
  const [s, seo, products] = await Promise.all([getSettings(), rawSeo(), db.product.findMany({ where: { active: true, archived: false }, select: { name: true, sub: true }, take: 30 })]);
  const r = await ask('You are an SEO expert for online shops. Answer ONLY JSON {"title":"max 60 chars","description":"max 155 chars, with a call to action","keywords":"10-15 comma separated buyer keywords"}.',
    [{ role: 'user', content: `Shop: ${s.store.name}. Tagline: ${s.store.tagline}. Sells worldwide (Bangladesh, Malaysia, USA). Products: ${products.map(p => `${p.name} ${p.sub}`).join('; ')}` }], { maxTokens: 500, json: true });
  const j = parseJson<{ title?: string; description?: string; keywords?: string }>(r.text);
  if (!j?.title) throw new Error('The AI answer had no title.');
  seo.title = j.title.slice(0, 70); seo.description = String(j.description || '').slice(0, 170); seo.keywords = String(j.keywords || '').slice(0, 300);
  await saveSeo(seo);
}

// Writes a search title and description for products (only those without one, unless all).
export async function aiProductSeo(all = false, limit = 25) {
  const seo = await rawSeo();
  const list = (await db.product.findMany({ where: { active: true, archived: false }, select: { slug: true, name: true, sub: true, details: true, priceCents: true }, orderBy: { sort: 'asc' } }))
    .filter(p => all || !seo.products[p.slug]?.title).slice(0, limit);
  if (!list.length) return 0;
  const store = (await getSettings()).store.name;
  const r = await ask(`You are an SEO expert. For each product write a Google title (max 60 chars, include the product type and "${store}" if it fits) and a meta description (max 155 chars, benefit + call to action). Answer ONLY JSON {"items":[{"slug":"...","title":"...","description":"..."}]}.`,
    [{ role: 'user', content: JSON.stringify(list.map(p => ({ slug: p.slug, name: `${p.name} ${p.sub}`, price_usd: p.priceCents / 100, about: p.details.slice(0, 300) }))) }], { maxTokens: 3000, json: true });
  const items = parseJson<{ items?: { slug: string; title: string; description: string }[] }>(r.text)?.items || [];
  let n = 0;
  for (const it of items) if (it?.slug && list.some(p => p.slug === it.slug) && it.title) { seo.products[it.slug] = { title: String(it.title).slice(0, 70), description: String(it.description || '').slice(0, 170) }; n++; }
  await saveSeo(seo);
  return n;
}
