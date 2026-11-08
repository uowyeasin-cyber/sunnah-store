import Link from 'next/link';
import { getAds, getBestSellers, getCategories, getDict, getLiveReviews, getProducts, getSettings } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';

import Hero, { type HeroSlide } from '@/components/Hero';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import Rail from '@/components/Rail';
import ProductCard from '@/components/ProductCard';
import Art from '@/components/Art';
import Reviews from '@/components/Reviews';
import AdSeen from '@/components/AdSeen';
import { adLive, AdSlot } from '@/components/Ads';
import Trust from '@/components/Trust';
import ForYou from '@/components/ForYou';
import ProductChips from '@/components/ProductChips';
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
  const withPhoto = products.filter(x => x.image);
  const slides: HeroSlide[] = s.slides.map((sl, n) => {
    const p = products.find(x => x.slug === sl.product) || (sl.image || sl.video ? undefined : withPhoto.length ? withPhoto[n % withPhoto.length] : products[n % Math.max(1, products.length)]);
    const art = sl.image ? <img src={sl.image} alt={sl.title || brand} /> : p ? <Art p={p} open brand={brand} /> : null;
    return { id: sl.id, eyebrow: sl.eyebrow, title: sl.title, italic: sl.italic, text: sl.text, cta: sl.cta, href: p ? `/p/${p.slug}` : '/shop', dark: sl.look === 'dark', full: !!(sl.video || sl.image), art, motion: sl.motion || 'fade', video: sl.video || undefined };
  });
  // The opening film is the first slide of the showcase.
  if (s.film.on && (s.film.wide || s.film.tall)) slides.unshift({ id: 'film', eyebrow: '', title: '', italic: '', text: '', cta: t(s.film.cta), href: '/shop', dark: true, full: true, art: null, motion: 'fade', video: s.film.wide || s.film.tall, videoTall: filmTall || undefined, poster: filmPoster || undefined });
  const tiles = cats.map(c => ({ c, items: products.filter(p => p.category.slug === c.slug) })).filter(t => t.items.length);
  const homeAds = ads.filter(a => adLive(a) && ['home-top', 'home-mid'].includes(a.place)).map(a => a.id);
  return (
    <div className="view">
      {slides.length > 0 && <Hero slides={slides} secs={s.slideSecs} />}
      {tiles.length > 0 && <section className="wrap cat-icons-sec" id="cats" aria-label={t('Collections')}>
        <div className={`cat-icons cs-${s.catStyle}`}><div className="ci-track" style={{ ['--n' as string]: tiles.length }}>
          {(s.catStyle === 'marquee' && tiles.length > 2 ? [...tiles, ...tiles] : tiles).map(({ c, items }, k) => (
            <Link key={c.id + '-' + k} className="ci" href={`/c/${c.slug}`} style={{ ['--k' as string]: k % tiles.length }} aria-hidden={k >= tiles.length || undefined} tabIndex={k >= tiles.length ? -1 : undefined}>
              <span className="ci-ic">{c.image ? <img src={c.image} alt="" /> : <Art p={items[0]} brand={brand} />}</span>
              <b>{c.name}</b><small>{t(items.length === 1 ? '{n} piece' : '{n} pieces', { n: items.length })}</small>
            </Link>))}
        </div></div>
      </section>}
      <AdSlot ads={ads} place="home-top" products={products} brand={brand} />
      <section className="wrap" id="allgrid">
        <div className="sec-head"><div><div className="kicker">{t('The collection')}</div><h2>{t('Our')} <em>{t('products')}</em></h2></div><Link className="link-arrow" href="/shop">{t('Shop all {n}', { n: products.length })} <span aria-hidden="true">→</span></Link></div>
        <ProductChips target="allgrid" cats={tiles.map(({ c, items }) => ({ slug: c.slug, name: c.name, n: items.length }))} />
        <div className="grid" data-n={Math.min(products.length, 8)}>{products.slice(0, 12).map(p => <div key={p.id} data-cat={p.category.slug} className="g-cell"><ProductCard p={p} brand={brand} /></div>)}</div>
        {products.length > 12 && <div className="more-row"><Link className="btn ghost" href="/shop">{t('View all {n} products', { n: products.length })}</Link></div>}
      </section>
      <ForYou brand={brand} />
      <Trust s={s} t={t} />
      <AdSlot ads={ads} place="home-mid" products={products} brand={brand} />
      {sellers.length >= 2 && <Rail kicker={t('Most loved')} title={t('Best')} italic={t('sellers')}>{sellers.map(p => <ProductCard key={p.id} p={p} brand={brand} />)}</Rail>}
      <div className="wrap"><Reviews reviews={reviews} t={t} /></div>
      <section className="wrap"><div className="news-band"><div><div className="kicker">{t('News and offers')}</div><h2>{t('Hear about new')} <em>{t('pieces first')}</em></h2><p className="muted">{t('A few emails a year. Unsubscribe with one tap.')}</p></div><NewsletterForm /></div></section>
      <AdSeen ids={homeAds} />
    </div>
  );
}
