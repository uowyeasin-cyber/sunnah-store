import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAds, getLiveReviews, getProduct, getProducts, getSettings } from '@/lib/catalog';
import Art from '@/components/Art';
import BuyBox from '@/components/BuyBox';
import ProductCard, { Heart, OfferBadge } from '@/components/ProductCard';
import Reviews from '@/components/Reviews';
import ReviewForm from '@/components/ReviewForm';
import { AdSlot } from '@/components/Ads';

export async function generateStaticParams() {
  return (await getProducts()).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/p/[slug]'>) {
  const p = await getProduct((await params).slug);
  return p ? { title: `${p.name}, ${p.sub}`, description: p.details || p.sub } : {};
}

export default async function ProductPage({ params }: PageProps<'/p/[slug]'>) {
  const { slug } = await params;
  const [p, all, ads, s] = await Promise.all([getProduct(slug), getProducts(), getAds(), getSettings()]);
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
      {sugg.length > 0 && <section><div className="sec-head"><div><div className="kicker">Complete the kit</div><h2>Goes well with</h2></div></div><div className="grid">{sugg.map(x => <ProductCard key={x.id} p={x} brand={s.store.name} />)}</div></section>}
      <Reviews reviews={reviews}><ReviewForm productId={p.id} /></Reviews>
    </div>
  );
}
