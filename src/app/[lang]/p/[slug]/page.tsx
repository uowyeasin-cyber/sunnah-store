import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAds, getDict, getLiveReviews, getProduct, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import Art from '@/components/Art';
import BuyBox from '@/components/BuyBox';
import ProductCard, { Heart, OfferBadge } from '@/components/ProductCard';
import Reviews from '@/components/Reviews';
import ReviewForm from '@/components/ReviewForm';
import { AdSlot } from '@/components/Ads';

// New products and categories added in admin render on first visit, then stay cached.
export const instant = false;

export async function generateStaticParams() {
  return (await getProducts()).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/[lang]/p/[slug]'>) {
  const { slug, lang } = await params;
  const p = await getProduct(slug, isLang(lang) ? lang : 'en');
  return p ? { title: `${p.name}, ${p.sub}`, description: p.details || p.sub } : {};
}

export default async function ProductPage({ params }: PageProps<'/[lang]/p/[slug]'>) {
  const { slug, lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [p, all, ads, s, dict] = await Promise.all([getProduct(slug, lang), getProducts(lang), getAds(lang), getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  if (!p) notFound();
  const reviews = await getLiveReviews(p.id);
  const finishes = p.kind === 'pen' ? all.filter(x => x.kind === 'pen' && x.category.slug === p.category.slug) : [];
  // Suggestions: refills follow a pen, a pen follows refills.
  const sugg = all.filter(x => x.slug !== p.slug && (p.kind === 'pen' ? x.kind !== 'pen' : x.kind === 'pen' || x.category.slug === p.category.slug)).slice(0, 3);
  return (
    <div className="wrap view">
      <div className="pdp">
        <div style={{ position: 'relative' }}><Heart slug={p.slug} /><div className={`stage ${p.offer?.style === 'glow' ? 'glow' : ''}`}><OfferBadge p={p} />{p.video ? <video src={p.video} autoPlay muted loop playsInline /> : <Art p={p} open brand={s.store.name} />}</div></div>
        <div className="buy">
          <div><div className="kicker"><Link href={`/c/${p.category.slug}`} style={{ textDecoration: 'none' }}>{p.category.name}</Link></div><h1 style={{ marginTop: 8 }}>{p.name}</h1><p className="muted" style={{ marginTop: 6 }}>{p.sub}</p></div>
          <BuyBox p={p} finishes={finishes} />
          {p.details && <p className="muted">{p.details}</p>}
        </div>
      </div>
      <AdSlot ads={ads.filter(a => a.link !== p.slug)} place="product" products={all} brand={s.store.name} wrap={false} />
      {sugg.length > 0 && <section><div className="sec-head"><div><div className="kicker">{t('Complete the kit')}</div><h2>{t('Goes well with')}</h2></div></div><div className="grid">{sugg.map(x => <ProductCard key={x.id} p={x} brand={s.store.name} />)}</div></section>}
      <Reviews reviews={reviews} t={t}><ReviewForm productId={p.id} /></Reviews>
    </div>
  );
}
