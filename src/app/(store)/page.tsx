import Link from 'next/link';
import { getAds, getCategories, getLiveReviews, getProducts, getSettings } from '@/lib/catalog';
import Hero, { type HeroSlide } from '@/components/Hero';
import Rail from '@/components/Rail';
import ProductCard from '@/components/ProductCard';
import Art from '@/components/Art';
import Reviews from '@/components/Reviews';
import AdSeen from '@/components/AdSeen';
import { adLive, AdSlot } from '@/components/Ads';

export default async function Home() {
  const [s, products, cats, ads, reviews] = await Promise.all([getSettings(), getProducts(), getCategories(), getAds(), getLiveReviews()]);
  const brand = s.store.name;
  const slides: HeroSlide[] = s.slides.map(sl => {
    const p = products.find(x => x.slug === sl.product);
    const art = sl.video ? <video src={sl.video} autoPlay muted loop playsInline /> : sl.image ? <img src={sl.image} alt="" /> : p ? <Art p={p} open brand={brand} /> : null;
    return { id: sl.id, eyebrow: sl.eyebrow, title: sl.title, italic: sl.italic, text: sl.text, cta: sl.cta, href: p ? `/p/${p.slug}` : '/shop', dark: sl.look === 'dark', full: !!(sl.video || sl.image), art };
  });
  const first = products.find(x => x.slug === s.slides[0]?.product);
  const tiles = cats.map(c => ({ c, items: products.filter(p => p.category.slug === c.slug) })).filter(t => t.items.length);
  const homeAds = ads.filter(a => adLive(a) && ['home-top', 'home-mid'].includes(a.place)).map(a => a.id);
  return (
    <div className="view">
      {slides.length > 0 && <Hero slides={slides} secs={s.slideSecs} />}
      <AdSlot ads={ads} place="home-top" products={products} brand={brand} />
      {first?.kind === 'pen' && <div className="wrap"><div className="specs">
        <div><span>Closed</span><b>152<small>mm</small></b></div><div><span>Across</span><b>16<small>mm</small></b></div>
        <div><span>Takes a stick</span><b>6–12<small>mm</small></b></div><div><span>Perfume oil</span><b>2<small>ml</small></b></div>
      </div></div>}
      <section className="wrap" id="cats">
        <div className="sec-head"><div><div className="kicker">The house</div><h2>Shop by <em>collection</em></h2></div><p className="muted" style={{ maxWidth: '26em' }}>{products.length} pieces across {tiles.length} collections, each made to be carried every day.</p></div>
        <div className="cats">{tiles.map(({ c, items }) => (
          <Link key={c.id} className="cat-tile" href={`/c/${c.slug}`}><div className="ca"><Art p={items[0]} brand={brand} /></div>
            <div className="ct"><div className="label">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</div><h3>{c.name}</h3><span className="go">Explore <span aria-hidden="true">→</span></span></div></Link>))}
        </div>
      </section>
      <AdSlot ads={ads} place="home-mid" products={products} brand={brand} />
      <Rail kicker="New creations" title="The" italic="collection">{products.slice(0, 8).map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</Rail>
      <section className="wrap" id="allgrid">
        <div className="sec-head"><div><div className="kicker">{products.length} pieces</div><h2>All <em>products</em></h2></div></div>
        <div className="grid">{products.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</div>
      </section>
      <div className="wrap"><Reviews reviews={reviews} /></div>
      <AdSeen ids={homeAds} />
    </div>
  );
}
