import Link from 'next/link';
import { getAds, getBestSellers, getCategories, getDict, getLiveReviews, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import Hero, { type HeroSlide } from '@/components/Hero';
import LaunchFilm from '@/components/LaunchFilm';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import Rail from '@/components/Rail';
import ProductCard from '@/components/ProductCard';
import Art from '@/components/Art';
import Reviews from '@/components/Reviews';
import AdSeen from '@/components/AdSeen';
import { adLive, AdSlot } from '@/components/Ads';
import Trust from '@/components/Trust';
import RecentlyViewed from '@/components/RecentlyViewed';
import PickedForYou from '@/components/PickedForYou';
import NewsletterForm from '@/components/NewsletterForm';

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [s, products, cats, ads, reviews, dict, best] = await Promise.all([getSettings(lang), getProducts(lang), getCategories(lang), getAds(lang), getLiveReviews(), getDict(lang), getBestSellers()]);
  const sellers = best.map(id => products.find(p => p.id === id)).filter(p => !!p);
  const t = makeT(dict);
  // A newly uploaded wide film replaces the built-in phone version too, unless a tall one was uploaded as well.
  const df = DEFAULT_SETTINGS.film, ownWide = s.film.wide !== df.wide;
  const filmTall = ownWide && s.film.tall === df.tall ? '' : s.film.tall, filmPoster = ownWide && s.film.poster === df.poster ? '' : s.film.poster;
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
      {s.film.on && (s.film.wide || s.film.tall) && <LaunchFilm wide={s.film.wide} tall={filmTall} poster={filmPoster} cta={t(s.film.cta)} labels={{ replay: t('Replay'), pause: t('Pause'), play: t('Play'), skip: t('Skip'), sound: t('Sound on'), mute: t('Mute') }} />}
      {slides.length > 0 && <Hero slides={slides} secs={s.slideSecs} />}
      <AdSlot ads={ads} place="home-top" products={products} brand={brand} />
      {first?.kind === 'pen' && <div className="wrap"><div className="specs">
        <div><span>{t('Closed')}</span><b>152<small>mm</small></b></div><div><span>{t('Across')}</span><b>16<small>mm</small></b></div>
        <div><span>{t('Takes a stick')}</span><b>6–12<small>mm</small></b></div><div><span>{t('Perfume oil')}</span><b>2<small>ml</small></b></div>
      </div></div>}
      <Trust s={s} t={t} />
      <section className="wrap" id="cats">
        <div className="sec-head"><div><div className="kicker">{t('The house')}</div><h2>{t('Shop by')} <em>{t('collection')}</em></h2></div><p className="muted" style={{ maxWidth: '26em' }}>{t('{n} pieces across {c} collections, each made to be carried every day.', { n: products.length, c: tiles.length })}</p></div>
        <div className="cats">{tiles.map(({ c, items }) => (
          <Link key={c.id} className="cat-tile" href={`/c/${c.slug}`}><div className="ca"><Art p={items[0]} brand={brand} /></div>
            <div className="ct"><div className="label">{t(items.length === 1 ? '{n} piece' : '{n} pieces', { n: items.length })}</div><h3>{c.name}</h3><span className="go">{t('Explore')} <span aria-hidden="true">→</span></span></div></Link>))}
        </div>
      </section>
      <AdSlot ads={ads} place="home-mid" products={products} brand={brand} />
      {sellers.length >= 2 && <Rail kicker={t('Most loved')} title={t('Best')} italic={t('sellers')}>{sellers.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</Rail>}
      <section className="wrap" id="allgrid">
        <div className="sec-head"><div><div className="kicker">{t('New creations')}</div><h2>{t('The')} <em>{t('collection')}</em></h2></div><Link className="link-arrow" href="/shop">{t('Shop all {n}', { n: products.length })} <span aria-hidden="true">→</span></Link></div>
        {/* Full rows only: 8 fills four columns on desktop and two on phones, the rest live in the shop. */}
        <div className="grid">{products.slice(0, products.length > 8 ? 8 : products.length).map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</div>
        {products.length > 8 && <div className="more-row"><Link className="btn ghost" href="/shop">{t('View all {n} products', { n: products.length })}</Link></div>}
      </section>
      <RecentlyViewed brand={brand} />
      <PickedForYou brand={brand} />
      <div className="wrap"><Reviews reviews={reviews} t={t} /></div>
      <section className="wrap"><div className="news-band"><div><div className="kicker">{t('News and offers')}</div><h2>{t('Hear about new')} <em>{t('pieces first')}</em></h2><p className="muted">{t('A few emails a year. Unsubscribe with one tap.')}</p></div><NewsletterForm /></div></section>
      <AdSeen ids={homeAds} />
    </div>
  );
}
