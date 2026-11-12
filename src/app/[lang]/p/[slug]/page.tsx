import { alternates, langPath, ldJson, siteUrl } from '@/lib/seoUrls';
import { getSeo } from '@/lib/seo';
import Link from 'next/link';
import Share from '@/components/Share';
import { notFound } from 'next/navigation';
import { getAds, getBoughtTogether, getDict, getLiveReviews, getProduct, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';
import { unitCents } from '@/lib/money';

import Art from '@/components/Art';
import Gallery from '@/components/Gallery';
import BuyBox from '@/components/BuyBox';
import ProductCard, { Heart, OfferBadge } from '@/components/ProductCard';
import Reviews from '@/components/Reviews';
import ReviewForm from '@/components/ReviewForm';
import { AdSlot } from '@/components/Ads';
import NetAds from '@/components/NetAds';
import ProductSeen from '@/components/ProductSeen';
import Delivery from '@/components/Delivery';
import Faq from '@/components/Faq';
import RecentlyViewed from '@/components/RecentlyViewed';
import { deliveryRows } from '@/lib/deliveryRows';
import { RETURN_DAYS } from '@/lib/returns';

// New products and categories added in admin render on first visit, then stay cached.
export const instant = false;

export async function generateStaticParams() {
  return (await getProducts()).map(p => ({ slug: p.slug }));
}

// Share preview picture: the studio JPEG for built-in media (WebP is not read everywhere), else the first photo.
const ogImage = (p: { images: string[]; video: string }) => {
  const u = p.video.startsWith('/media/') ? p.video.replace(/loop\.mp4$/, 'poster.jpg') : p.images[0] || '';
  return u.startsWith('/') ? siteUrl() + u : u;
};

export async function generateMetadata({ params }: PageProps<'/[lang]/p/[slug]'>) {
  const { slug, lang } = await params;
  const [p, seo] = await Promise.all([getProduct(slug, isLang(lang) ? lang : 'en'), getSeo()]);
  const own = seo.products[slug];
  if (!p) return {};
  const L: Lang = isLang(lang) ? lang : 'en', img = ogImage(p);
  return { title: own?.title || `${p.name}, ${p.sub}`, description: own?.description || `${p.details || p.sub}`.replace(/\s+/g, ' ').slice(0, 160),
    alternates: alternates(L, `/p/${slug}`),
    openGraph: { url: siteUrl() + langPath(L, `/p/${slug}`), ...(img ? { images: [{ url: img, alt: `${p.name}, ${p.sub}` }] } : {}) },
    twitter: img ? { card: 'summary_large_image', images: [img] } : undefined };
}

export default async function ProductPage({ params }: PageProps<'/[lang]/p/[slug]'>) {
  const { slug, lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [p, all, ads, s, dict] = await Promise.all([getProduct(slug, lang), getProducts(lang), getAds(lang), getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  if (!p) notFound();
  const [reviews, together] = await Promise.all([getLiveReviews(p.id), getBoughtTogether(p.id)]);
  const finishes = p.kind === 'pen' ? all.filter(x => x.kind === 'pen' && x.category.slug === p.category.slug) : [];
  // Suggestions: refills follow a pen, a pen follows refills.
  const bought = together.map(id => all.find(x => x.id === id)).filter(x => !!x);
  const sugg = bought.length ? bought : all.filter(x => x.slug !== p.slug && (p.kind === 'pen' ? x.kind !== 'pen' : x.kind === 'pen' || x.category.slug === p.category.slug)).slice(0, 3);
  // Product facts for search engines, from the real price, stock and live reviews only.
  const site = siteUrl(), url = site + langPath(lang, `/p/${p.slug}`);
  const inStock = Object.values(p.stock || {}).some(n => Number(n) > 0);
  const ld = { '@context': 'https://schema.org', '@graph': [{
    '@type': 'Product', '@id': `${url}#product`, url, name: `${p.name}, ${p.sub}`, description: p.details || p.sub, sku: p.slug, inLanguage: lang,
    image: p.images.map(u => (u.startsWith('/') ? site + u : u)), brand: { '@type': 'Brand', name: s.store.name }, category: p.category.name,
    offers: { '@type': 'Offer', url, priceCurrency: 'USD', price: (unitCents(p.priceCents, p.offer?.pct || 0) / 100).toFixed(2),
      itemCondition: 'https://schema.org/NewCondition', availability: `https://schema.org/${s.preorder?.on ? 'PreOrder' : inStock ? 'InStock' : 'OutOfStock'}`,
      seller: { '@id': `${site}/#org` },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: RETURN_DAYS, returnMethod: 'https://schema.org/ReturnByMail' } },
    ...(reviews.length ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: (reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1), reviewCount: reviews.length, bestRating: 5, worstRating: 1 },
      review: reviews.slice(0, 5).map(r => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name || 'Customer' }, datePublished: new Date(r.createdAt).toISOString().slice(0, 10),
        reviewBody: r.text.slice(0, 500), reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5, worstRating: 1 } })),
    } : {}),
  }, {
    '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: s.store.name, item: site + langPath(lang, '/') },
      { '@type': 'ListItem', position: 2, name: p.category.name, item: site + langPath(lang, `/c/${p.category.slug}`) },
      { '@type': 'ListItem', position: 3, name: p.name, item: url },
    ] }] };
  return (
    <div className="wrap view">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      <ProductSeen id={p.id} slug={p.slug} />
      <div className="pdp">
        <div className="pdp-media"><Heart slug={p.slug} /><Gallery stageClass={`stage ${p.offer?.style.startsWith('glow') ? 'glow' : ''}`} badge={<OfferBadge p={p} />} images={p.images} video={p.video} poster={p.video.startsWith('/media/') ? p.video.replace(/loop\.mp4$/, 'poster.jpg') : ''} alt={`${p.name}, ${p.sub}`}><Art p={p} open brand={s.store.name} /></Gallery></div>
        <div className="buy">
          <div><div className="kicker"><Link href={`/c/${p.category.slug}`} style={{ textDecoration: 'none' }}>{p.category.name}</Link></div><h1 style={{ marginTop: 8 }}>{p.name}</h1><p className="muted" style={{ marginTop: 6 }}>{p.sub}</p></div>
          <BuyBox p={p} finishes={finishes} soldOut={!s.preorder?.on && !inStock} />
          <p className={`avail ${s.preorder?.on ? 'pre' : inStock ? 'in' : 'out'}`}><i aria-hidden="true" />{s.preorder?.on ? t('Available to pre-order') : inStock ? t('In stock, ready to ship') : t('Sold out for now')}</p>
          <Share title={`${p.name}${p.sub ? ' · ' + p.sub : ''} | ${s.store.name}`} />
          {p.details && <p className="muted">{p.details}</p>}
          <Delivery rows={deliveryRows(s).map(r => ({ label: r.label, days: r.days }))} pre={s.preorder?.on ? s.preorder.ships : ''} />
        </div>
      </div>
      <AdSlot ads={ads.filter(a => a.link !== p.slug)} place="product" products={all} brand={s.store.name} wrap={false} />
      <NetAds place="product" wrap={false} />
      {sugg.length > 0 && <section><div className="sec-head"><div><div className="kicker">{t('Complete the kit')}</div><h2>{t(bought.length ? 'Frequently bought together' : 'Goes well with')}</h2></div></div><div className="grid" data-n={Math.min(sugg.length, 8)}>{sugg.map(x => <ProductCard key={x.id} p={x} brand={s.store.name} />)}</div></section>}
      <Reviews reviews={reviews} t={t}><ReviewForm productId={p.id} /></Reviews>
      <Faq title={t('Questions')} items={[
        { q: t('When will it arrive?'), a: <>{s.preorder?.on ? t(s.preorder.ships) : t('It ships from the warehouse nearest to you. The courier and cost for your address are shown at checkout.')} <Link href="/help#shipping">{t('Shipping details')}</Link></> },
        { q: t('How can I pay?'), a: <>{t('Every payment method available for your country is listed at checkout, including cash on delivery where the courier offers it.')} <Link href="/help#payment">{t('Payment options')}</Link></> },
        { q: t('Can I return it?'), a: <>{t('Yes, within {n} days of delivery, from your order page.', { n: RETURN_DAYS })} <Link href="/help#returns">{t('Returns')}</Link></> },
      ]} />
      <RecentlyViewed skip={p.slug} brand={s.store.name} />
    </div>
  );
}
