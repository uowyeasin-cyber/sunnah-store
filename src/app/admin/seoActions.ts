'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { cleanId, rawSeo, saveSeo } from '@/lib/seo';
import { aiProductSeo, aiSiteSeo } from '@/lib/seoAi';
import { ask, parseJson } from '@/lib/ai';
import { newCode, PLATFORMS } from '@/lib/social';
import { getSettings } from '@/lib/catalog';

const str = (fd: FormData, k: string) => String(fd.get(k) || '').trim();
const back = (m: string, hash = ''): never => { updateTag('catalog'); redirect('/admin/seo?note=' + encodeURIComponent(m) + hash); };

export async function saveSiteSeo(fd: FormData) {
  await requireAdmin('seo', 'saveSiteSeo');
  const s = await rawSeo();
  s.title = str(fd, 'title').slice(0, 70); s.description = str(fd, 'description').slice(0, 170);
  s.keywords = str(fd, 'keywords').slice(0, 300); s.ogImage = /^https:\/\//.test(str(fd, 'ogImage')) ? str(fd, 'ogImage').slice(0, 500) : '';
  await saveSeo(s);
  back('Site SEO saved.', '#site');
}
export async function saveVerify(fd: FormData) {
  await requireAdmin('seo', 'saveVerify');
  const s = await rawSeo();
  for (const k of Object.keys(s.verify) as (keyof typeof s.verify)[]) {
    // People often paste the whole <meta> tag: keep only the content="…" part.
    const raw = str(fd, k), m = raw.match(/content=["']([^"']+)["']/);
    s.verify[k] = cleanId(m ? m[1] : raw);
  }
  await saveSeo(s);
  back('Verification codes saved. Now press Verify in each search engine.', '#verify');
}
export async function savePixels(fd: FormData) {
  await requireAdmin('seo', 'savePixels');
  const s = await rawSeo();
  for (const k of Object.keys(s.pixels) as (keyof typeof s.pixels)[]) s.pixels[k] = cleanId(str(fd, k));
  await saveSeo(s);
  back('Pixels saved. They load on every shop page and report each purchase.', '#pixels');
}
export async function saveProductSeo(fd: FormData) {
  const slug = str(fd, 'slug');
  await requireAdmin('seo', 'saveProductSeo', slug);
  const s = await rawSeo();
  const title = str(fd, 'title').slice(0, 70), description = str(fd, 'description').slice(0, 170);
  if (title || description) s.products[slug] = { title, description }; else delete s.products[slug];
  await saveSeo(s);
  back('Saved.', '#products');
}
export async function aiSite() {
  await requireAdmin('seo', 'aiSiteSeo');
  try { await aiSiteSeo(); } catch (e) { back('The AI could not answer: ' + (e as Error).message.slice(0, 160), '#site'); }
  back('The AI wrote your site title, description and keywords. Read them and change anything you like.', '#site');
}
export async function aiProducts(fd: FormData) {
  const all = str(fd, 'which') === 'all';
  await requireAdmin('seo', 'aiProductSeo', all ? 'all' : 'missing');
  let n = 0;
  try { n = await aiProductSeo(all); } catch (e) { back('The AI could not answer: ' + (e as Error).message.slice(0, 160), '#products'); }
  back(n ? `The AI wrote SEO for ${n} product${n === 1 ? '' : 's'}.` : 'Every product already has SEO.', '#products');
}

// The AI writes a post or ad for one platform and saves it as a tracked campaign (paused until you post it).
export async function aiAd(fd: FormData) {
  const platform = PLATFORMS[str(fd, 'platform')] ? str(fd, 'platform') : 'facebook', kind = str(fd, 'kind') === 'ad' ? 'ad' : 'post';
  const slug = str(fd, 'product'), goal = str(fd, 'goal').slice(0, 300);
  await requireAdmin('seo', 'aiAd', `${platform} ${kind} ${slug}`);
  const [p, s] = await Promise.all([slug ? db.product.findUnique({ where: { slug }, include: { offer: true } }) : null, getSettings()]);
  let out: { name?: string; text?: string } | null = null;
  try {
    const r = await ask(`You write high-converting ${PLATFORMS[platform].name} ${kind === 'ad' ? 'ad copy' : 'posts'} for ${s.store.name} (${s.store.tagline}). Native to the platform, short, a clear call to action, fitting hashtags. Never invent prices or offers not given. Answer ONLY JSON {"name":"short internal name","text":"the post text"}.`,
      [{ role: 'user', content: `Product: ${p ? `${p.name} ${p.sub}, $${p.priceCents / 100}${p.offer?.on ? `, offer: ${p.offer.label}` : ''}. ${p.details.slice(0, 400)}` : 'the whole shop'}\nGoal: ${goal || 'more orders'}` }], { maxTokens: 700, json: true });
    out = parseJson(r.text) || { text: r.text };
  } catch (e) { back('The AI could not answer: ' + (e as Error).message.slice(0, 160), '#ads'); }
  const c = await db.campaign.create({ data: { code: await newCode(), name: (out?.name || `${PLATFORMS[platform].name} ${kind}`).slice(0, 120), platform, kind, target: p ? `/p/${p.slug}` : '/', message: String(out?.text || '').slice(0, 2000), image: p?.images[0] || '', status: 'paused' } });
  redirect(`/admin/social?open=${c.id}&note=${encodeURIComponent('The AI wrote it. Check the text, then post it or copy the tracked link.')}#c-${c.id}`);
}
