import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAds, getCategories, getDict, getProducts, getSettings } from '@/lib/catalog';
import { isLang, LANGS, makeT, type Lang } from '@/lib/i18n';
import Html from '@/components/Html';
import StoreProvider from '@/components/StoreProvider';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Motion from '@/components/Motion';
import AdPopup from '@/components/AdPopup';
import { AdCta, adHref, adLive, AdVisual } from '@/components/Ads';
import '../globals.css';

// Every shop page lives under /en, /bn, /ar or /hi. The proxy maps plain URLs to the visitor's language.
export const generateStaticParams = () => Object.keys(LANGS).map(lang => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  const { store } = await getSettings(isLang(lang) ? lang : 'en');
  return { title: { default: store.name, template: `%s · ${store.name}` }, description: store.tagline };
}

export default async function StoreLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const [s, products, ads, cats, dict] = await Promise.all([getSettings(lang), getProducts(lang), getAds(lang), getCategories(lang), getDict(lang)]);
  const t = makeT(dict);
  const live = ads.filter(a => adLive(a));
  const ticker = live.filter(a => a.place === 'ticker').map(a => ({ id: a.id, title: a.title, href: adHref(a.link) }));
  const pop = live.find(a => a.place === 'popup');
  return (
    <Html lang={lang}>
      <StoreProvider products={products} rates={s.rates} lang={lang} dict={dict} pre={s.preorder?.on ? s.preorder.ships || 'Pre-order' : ''}>
        {s.store.announce && <div className="announce">{s.store.announce}</div>}
        <Header name={s.store.name} nav={s.nav} ticker={ticker} />
        <main>{children}</main>
        <footer><div className="wrap">
          <div className="foot-top">
            <div className="foot-brand"><div className="logo"><span>{s.store.name}</span></div><p>{s.store.tagline}</p></div>
            <div className="foot-cols">
              <div><div className="label">{t('Shop')}</div>{cats.map(c => <Link key={c.id} href={`/c/${c.slug}`}>{c.name}</Link>)}</div>
              <div><div className="label">{t('Help')}</div><Link href="/track">{t('Track order')}</Link><Link href="/track">{t('Returns')}</Link><Link href="/track">{t('Store credit')}</Link></div>
            </div>
          </div>
          <div className="foot-bottom"><div className="paylogos">{['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay', 'PayPal', 'bKash', 'Nagad', "Touch 'n Go", t('Cash on delivery')].map(x => <span key={x}>{x}</span>)}</div><p>© {s.store.name}</p></div>
        </div></footer>
        <Drawer />
        {pop && <AdPopup id={pop.id} delay={s.popupDelay} style={pop.style}>
          <div className="pop-art"><div className="ad-float"><AdVisual ad={pop} products={products} brand={s.store.name} /></div></div>
          <div className="pop-copy">{pop.kicker && <div className="kicker">{pop.kicker}</div>}<h2>{pop.title}</h2>{pop.text && <p>{pop.text}</p>}
            <AdCta ad={pop} className={`btn ${pop.style === 'light' ? '' : 'brass'}`} /><button className="link-arrow" data-close style={{ border: 0, background: 'none' }}>{t('No thanks')}</button></div>
        </AdPopup>}
        <Motion />
      </StoreProvider>
    </Html>
  );
}
