import Link from 'next/link';
import { getAds, getCategories, getDict, getLiveReviews, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import Hero, { type HeroSlide } from '@/components/Hero';
import Rail from '@/components/Rail';
import ProductCard from '@/components/ProductCard';
import Art from '@/components/Art';
import Reviews from '@/components/Reviews';
import AdSeen from '@/components/AdSeen';
import { adLive, AdSlot } from '@/components/Ads';

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [s, products, cats, ads, reviews, dict] = await Promise.all([getSettings(lang), getProducts(lang), getCategories(lang), getAds(lang), getLiveReviews(), getDict(lang)]);
  const t = makeT(dict);
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
        <div><span>{t('Closed')}</span><b>152<small>mm</small></b></div><div><span>{t('Across')}</span><b>16<small>mm</small></b></div>
        <div><span>{t('Takes a stick')}</span><b>6–12<small>mm</small></b></div><div><span>{t('Perfume oil')}</span><b>2<small>ml</small></b></div>
      </div></div>}
      <section className="wrap" id="cats">
        <div className="sec-head"><div><div className="kicker">{t('The house')}</div><h2>{t('Shop by')} <em>{t('collection')}</em></h2></div><p className="muted" style={{ maxWidth: '26em' }}>{t('{n} pieces across {c} collections, each made to be carried every day.', { n: products.length, c: tiles.length })}</p></div>
        <div className="cats">{tiles.map(({ c, items }) => (
          <Link key={c.id} className="cat-tile" href={`/c/${c.slug}`}><div className="ca"><Art p={items[0]} brand={brand} /></div>
            <div className="ct"><div className="label">{t(items.length === 1 ? '{n} piece' : '{n} pieces', { n: items.length })}</div><h3>{c.name}</h3><span className="go">{t('Explore')} <span aria-hidden="true">→</span></span></div></Link>))}
        </div>
      </section>
      <AdSlot ads={ads} place="home-mid" products={products} brand={brand} />
      <Rail kicker={t('New creations')} title={t('The')} italic={t('collection')}>{products.slice(0, 8).map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</Rail>
      <section className="wrap" id="allgrid">
        <div className="sec-head"><div><div className="kicker">{t('{n} pieces', { n: products.length })}</div><h2>{t('All')} <em>{t('products')}</em></h2></div></div>
        <div className="grid">{products.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</div>
      </section>
      <div className="wrap"><Reviews reviews={reviews} t={t} /></div>
      <AdSeen ids={homeAds} />
    </div>
  );
}
