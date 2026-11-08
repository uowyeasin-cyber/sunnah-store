import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { rawSeo } from '@/lib/seo';
import { aiReady } from '@/lib/ai';
import { key, loadKeys } from '@/lib/keys';
import { PLATFORMS } from '@/lib/social';
import { formatAmount, type Currency } from '@/lib/money';
import { aiAd, aiProducts, aiSite, savePixels, saveProductSeo, saveSiteSeo, saveVerify } from '../seoActions';

const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';
const LOST = ['failed', 'cancelled', 'refunded'];
const PIXELS: [string, string, string, string][] = [
  ['meta', 'Meta (Facebook & Instagram) Pixel ID', '123456789012345', 'https://business.facebook.com/events_manager2'],
  ['ga4', 'Google Analytics 4 measurement ID', 'G-XXXXXXXXXX', 'https://analytics.google.com/'],
  ['gads', 'Google Ads conversion ID', 'AW-123456789', 'https://ads.google.com/aw/conversions'],
  ['gadsLabel', 'Google Ads purchase conversion label', 'AbC-D_efG-h12_34-567', 'https://ads.google.com/aw/conversions'],
  ['tiktok', 'TikTok Pixel ID', 'C1A2B3C4D5E6F7G8H9', 'https://ads.tiktok.com/i18n/events_manager'],
  ['snap', 'Snapchat Pixel ID', 'a1b2c3d4-…', 'https://ads.snapchat.com/'],
  ['pinterest', 'Pinterest Tag ID', '2612345678901', 'https://ads.pinterest.com/'],
];
const VERIFY: [string, string, string][] = [
  ['google', 'Google Search Console', 'https://search.google.com/search-console'],
  ['bing', 'Bing Webmaster Tools', 'https://www.bing.com/webmasters'],
  ['yandex', 'Yandex Webmaster', 'https://webmaster.yandex.com/'],
  ['pinterest', 'Pinterest (claim website)', 'https://www.pinterest.com/settings/claim'],
  ['facebook', 'Facebook domain verification', 'https://business.facebook.com/settings/owned-domains'],
];

export default async function SeoAds({ searchParams }: PageProps<'/admin/seo'>) {
  if (!(await adminOrNull('seo'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  await loadKeys();
  const [seo, s, ai, products, campaigns, onsite] = await Promise.all([
    rawSeo(), getSettings(), aiReady(),
    db.product.findMany({ where: { active: true, archived: false }, select: { slug: true, name: true, sub: true, images: true, details: true }, orderBy: { sort: 'asc' } }),
    db.campaign.findMany({ orderBy: { createdAt: 'desc' } }),
    db.ad.findMany({ select: { on: true, views: true, clicks: true } }),
  ]);
  const orders = await db.order.findMany({ where: { campaign: { in: campaigns.map(c => c.code) } }, select: { campaign: true, total: true, currency: true, payStatus: true } });
  const usd = (n: unknown, c: string) => Number(n) / (s.rates[c as Currency] || 1);
  const m = (n: number) => formatAmount(Math.round(n * 100) / 100, 'USD');

  // One row per platform: everything you run there, added up.
  const plat = Object.entries(PLATFORMS).map(([id, p]) => {
    const cs = campaigns.filter(c => c.platform === id), codes = new Set(cs.map(c => c.code));
    const os = orders.filter(o => codes.has(o.campaign) && !LOST.includes(o.payStatus));
    const spend = cs.reduce((a, c) => a + usd(c.spend, c.currency), 0), income = os.reduce((a, o) => a + usd(o.total, o.currency), 0);
    return { id, name: p.name, manage: p.manage, posts: cs.filter(c => c.kind === 'post').length, ads: cs.filter(c => c.kind === 'ad').length, live: cs.filter(c => c.status === 'active').length,
      views: cs.reduce((a, c) => a + c.views, 0), clicks: cs.reduce((a, c) => a + c.clicks, 0), orders: os.length, spend, income };
  }).filter(r => r.posts + r.ads > 0);
  const tot = plat.reduce((a, r) => ({ spend: a.spend + r.spend, income: a.income + r.income, orders: a.orders + r.orders, clicks: a.clicks + r.clicks }), { spend: 0, income: 0, orders: 0, clicks: 0 });

  const withSeo = products.filter(p => seo.products[p.slug]?.title).length;
  const pixels = PIXELS.filter(([k]) => k !== 'gadsLabel' && seo.pixels[k as keyof typeof seo.pixels]).length;
  const checks: [boolean, string, string][] = [
    [!!seo.title && seo.title.length <= 65, 'Site title (up to 60 letters)', '#site'],
    [seo.description.length >= 70 && seo.description.length <= 170, 'Site description (70 to 160 letters)', '#site'],
    [!!seo.ogImage || products.some(p => p.images.length), 'Share image for Facebook and WhatsApp', '#site'],
    [withSeo === products.length && products.length > 0, `Search title on every product (${withSeo}/${products.length})`, '#products'],
    [products.every(p => p.details.length >= 120), 'Every product has a description of 120+ letters', '/admin/products'],
    [products.every(p => p.images.length > 0), 'Every product has a photo', '/admin/products'],
    [!!seo.verify.google, 'Google Search Console verified', '#verify'],
    [true, 'Sitemap, robots.txt and product data (JSON-LD) are made by themselves', '#verify'],
    [!!seo.pixels.meta || !!seo.pixels.ga4, 'At least one pixel is connected', '#pixels'],
    [!!key('META_CAPI_TOKEN') || !!key('GA4_API_SECRET'), 'Server-side tracking (works even with ad blockers)', '#pixels'],
  ];
  const score = Math.round((checks.filter(c => c[0]).length / checks.length) * 100);

  return <>
    <div className="page-head"><div><h2>SEO & ads</h2><p>Be found on Google, and run and measure every post and ad from one place. The AI writes your SEO and your ads. Pixels and server-side tracking show which post, ad and platform really brings orders.</p></div></div>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    <div className="stats">
      <div className="stat"><small>SEO score</small><b className={score >= 80 ? 'ok' : 'warn'}>{score}%</b><span>{checks.filter(c => !c[0]).length} things to fix</span></div>
      <div className="stat"><small>Products with SEO</small><b>{withSeo}/{products.length}</b></div>
      <div className="stat"><small>Pixels connected</small><b className={pixels ? 'ok' : 'warn'}>{pixels}/6</b><span>{key('META_CAPI_TOKEN') ? 'Server-side on' : 'Server-side off'}</span></div>
      <div className="stat"><small>Ads & posts: income / spend</small><b>{m(tot.income)}</b><span>spend {m(tot.spend)}{tot.spend ? ` · ROAS ${(tot.income / tot.spend).toFixed(1)}x` : ''}</span></div>
    </div>

    <section className="panel">
      <h3>SEO health</h3>
      <div className="rows">{checks.map(([ok, label, href]) => <Link key={label} href={href.startsWith('#') ? `/admin/seo${href}` : href} className="row2" style={{ gap: 10 }}><span className={`tag ${ok ? 'green' : 'orange'}`}>{ok ? '✓' : 'Fix'}</span><span>{label}</span></Link>)}</div>
    </section>

    <section className="panel" id="ads">
      <div className="row2" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><h3 style={{ margin: 0 }}>All ads & posts in one place</h3><Link className="btn sm" href="/admin/social">Open every post & ad →</Link></div>
      <p className="muted sm">Every post or ad gets its own tracked link, so orders and income are counted per post, per ad and per platform, without cookies. Views, reach and spend come from Facebook, Instagram and YouTube by themselves, or you type them in.</p>
      {plat.length ? <table><thead><tr><th>Platform</th><th>Posts</th><th>Ads</th><th>Running</th><th className="num">Views</th><th className="num">Clicks</th><th className="num">Orders</th><th className="num">Spend</th><th className="num">Income</th><th className="num">ROAS</th><th /></tr></thead><tbody>
        {plat.map(r => <tr key={r.id}><td><Link href={`/admin/social?p=${r.id}`}><b>{r.name}</b></Link></td><td>{r.posts}</td><td>{r.ads}</td><td>{r.live}</td><td className="num">{r.views.toLocaleString('en-US')}</td><td className="num">{r.clicks}</td><td className="num">{r.orders}</td><td className="num">{m(r.spend)}</td><td className="num">{m(r.income)}</td>
          <td className="num">{r.spend ? <span className={`tag ${r.income / r.spend >= 2 ? 'green' : r.income / r.spend >= 1 ? 'amber' : 'red'}`}>{(r.income / r.spend).toFixed(1)}x</span> : '—'}</td><td>{r.manage && <a className="link sm" href={r.manage} target="_blank" rel="noreferrer">Manager ↗</a>}</td></tr>)}
      </tbody></table> : <p className="muted">No posts or ads yet. Let the AI write the first one below.</p>}
      <p className="muted sm">On your own shop: {onsite.filter(a => a.on).length} banners and pop-ups running, {onsite.reduce((a, x) => a + x.views, 0)} views, {onsite.reduce((a, x) => a + x.clicks, 0)} clicks. <Link href="/admin/ads">Manage shop banners →</Link></p>
      <h4>AI ad & post writer</h4>
      <form action={aiAd} className="grid2" style={{ alignItems: 'end' }}>
        <div className="field"><label>Platform</label><select name="platform">{Object.entries(PLATFORMS).filter(([k]) => !['email', 'other'].includes(k)).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}</select></div>
        <div className="field"><label>Type</label><select name="kind"><option value="post">Post (free)</option><option value="ad">Paid ad</option></select></div>
        <div className="field"><label>Product</label><select name="product"><option value="">Whole shop</option>{products.map(p => <option key={p.slug} value={p.slug}>{p.name} {p.sub}</option>)}</select></div>
        <div className="field"><label>Goal (optional)</label><input name="goal" placeholder="Eid gift, young Muslims in Malaysia" /></div>
        <div><button className="btn orange" disabled={!ai}>Write it with AI</button> {!ai && <span className="muted sm">Connect a free AI in <Link href="/admin/aitools#connect">AI tools</Link>.</span>}</div>
      </form>
    </section>

    <section className="panel" id="site">
      <h3>Website SEO</h3>
      <form action={saveSiteSeo}>
        <div className="field"><label>Title on Google (up to 60 letters) · now {seo.title.length}</label><input name="title" maxLength={70} defaultValue={seo.title} placeholder={s.store.name} /></div>
        <div className="field"><label>Description on Google (up to 155 letters) · now {seo.description.length}</label><textarea name="description" rows={2} maxLength={170} defaultValue={seo.description} placeholder={s.store.tagline} /></div>
        <div className="field"><label>Keywords (comma separated)</label><input name="keywords" defaultValue={seo.keywords} placeholder="miswak pen, sunnah gift, natural toothbrush" /></div>
        <div className="field"><label>Share image link (https, 1200×630)</label><input name="ogImage" defaultValue={seo.ogImage} placeholder="https://…" /></div>
        <div className="serp"><small>{site().replace('https://', '')}</small><b>{seo.title || s.store.name}</b><span>{seo.description || s.store.tagline}</span></div>
        <div className="row2" style={{ gap: 8 }}><button className="btn">Save</button><button className="btn ghost" formAction={aiSite} disabled={!ai}>✨ Let the AI write it</button></div>
      </form>
    </section>

    <section className="panel" id="products">
      <div className="row2" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><h3 style={{ margin: 0 }}>Product SEO</h3>
        <form action={aiProducts} className="row2" style={{ gap: 6 }}><button className="btn sm orange" name="which" value="missing" disabled={!ai}>✨ AI: fill missing</button><button className="btn sm ghost" name="which" value="all" disabled={!ai}>✨ AI: rewrite all</button></form></div>
      <table><thead><tr><th>Product</th><th>Search title & description</th><th /></tr></thead><tbody>
        {products.map(p => { const o = seo.products[p.slug]; return <tr key={p.slug}><td><b>{p.name}</b><div className="muted sm">{p.sub}</div></td>
          <td>{o?.title ? <><b className="sm">{o.title}</b><div className="muted sm">{o.description}</div></> : <span className="tag orange">Uses the product name</span>}</td>
          <td><details><summary className="link sm">Edit</summary><form action={saveProductSeo} style={{ display: 'grid', gap: 6, minWidth: 260 }}><input type="hidden" name="slug" value={p.slug} />
            <input name="title" maxLength={70} defaultValue={o?.title} placeholder="Title" /><textarea name="description" rows={2} maxLength={170} defaultValue={o?.description} placeholder="Description" /><button className="btn sm">Save</button></form></details></td></tr>; })}
      </tbody></table>
    </section>

    <section className="panel" id="verify">
      <h3>Search engines</h3>
      <p className="muted sm">Open each one, add your site <b>{site()}</b>, choose the HTML tag method, and paste the code (or the whole tag) here. Then press Verify there and submit the sitemap: <a className="link" href={`${site()}/sitemap.xml`} target="_blank" rel="noreferrer">{site()}/sitemap.xml</a></p>
      <form action={saveVerify}>
        <div className="grid2">{VERIFY.map(([k, label, url]) => <div key={k} className="field"><label>{label} · <a className="link" href={url} target="_blank" rel="noreferrer">open ↗</a></label><input name={k} defaultValue={seo.verify[k as keyof typeof seo.verify]} placeholder='<meta name="…" content="…">' /></div>)}</div>
        <button className="btn">Save codes</button>
      </form>
    </section>

    <section className="panel" id="pixels">
      <h3>Pixels & conversion tracking</h3>
      <p className="muted sm">Paste only the ID. Each pixel loads on every shop page and reports page views and each purchase with its value. With server-side tracking (Meta Conversions API and GA4, keys in <Link href="/admin/connections">Connections</Link>), every order also goes straight from the server, so ads still learn when a browser blocks the pixel. The same order number is sent both ways, so nothing is counted twice.</p>
      <form action={savePixels}>
        <div className="grid2">{PIXELS.map(([k, label, ph, url]) => <div key={k} className="field"><label>{label} · <a className="link" href={url} target="_blank" rel="noreferrer">find it ↗</a></label><input name={k} defaultValue={seo.pixels[k as keyof typeof seo.pixels]} placeholder={ph} /></div>)}</div>
        <button className="btn">Save pixels</button>
      </form>
      <p className="muted sm">Server-side: Meta {key('META_CAPI_TOKEN') ? <span className="tag green">on</span> : <span className="tag">off</span>} · Google {key('GA4_API_SECRET') ? <span className="tag green">on</span> : <span className="tag">off</span>}</p>
    </section>

    <section className="panel">
      <h3>Product feeds (Google Shopping, Facebook & Instagram Shop, TikTok)</h3>
      <p className="muted sm">Add one of these links as a scheduled feed in Google Merchant Center, Meta Commerce Manager or TikTok Catalog. Prices, stock and offers update by themselves.</p>
      <div className="rows">{['USD', 'MYR', 'BDT'].map(c => <div key={c} className="row2" style={{ gap: 8 }}><span className="tag">{c}</span><code>{site()}/api/feed?cur={c}</code></div>)}</div>
    </section>
  </>;
}
