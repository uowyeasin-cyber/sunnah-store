import CookieNote from '@/components/CookieNote';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAds, getCategories, getDict, getProducts, getSettings } from '@/lib/catalog';
import { isLang, LANGS, makeT, type Lang } from '@/lib/i18n';
import Html from '@/components/Html';
import StoreProvider from '@/components/StoreProvider';
import Header from '@/components/Header';
import NewsletterForm from '@/components/NewsletterForm';
import ChatWidget from '@/components/ChatWidget';
import Drawer from '@/components/Drawer';
import Motion from '@/components/Motion';
import AdPopup from '@/components/AdPopup';
import { AdCta, adHref, adLive, AdVisual } from '@/components/Ads';
import Pixels from '@/components/Pixels';
import NetAds, { NetHead } from '@/components/NetAds';
import { getEarn } from '@/lib/earn';
import Share from '@/components/Share';
import { getSeo } from '@/lib/seo';
import { ldJson, OG_LOCALE, siteUrl } from '@/lib/seoUrls';
import '../globals.css';
import '@/components/badges.css';

// Every shop page lives under /en, /bn, /ar or /hi. The proxy maps plain URLs to the visitor's language.
export const generateStaticParams = () => Object.keys(LANGS).map(lang => ({ lang }));

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  const [{ store }, seo] = await Promise.all([getSettings(isLang(lang) ? lang : 'en'), getSeo()]);
  const v = seo.verify, other: Record<string, string> = {};
  if (v.bing) other['msvalidate.01'] = v.bing;
  if (v.pinterest) other['p:domain_verify'] = v.pinterest;
  if (v.facebook) other['facebook-domain-verification'] = v.facebook;
  const L: Lang = isLang(lang) ? lang : 'en';
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seo.title || (store.tagline ? `${store.name} · ${store.tagline}` : store.name), template: `%s · ${store.name}` }, description: seo.description || store.tagline,
    keywords: seo.keywords ? seo.keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
    openGraph: { siteName: store.name, type: 'website', locale: OG_LOCALE[L], ...(seo.ogImage ? { images: [seo.ogImage] } : {}) },
    twitter: { card: 'summary_large_image', ...(seo.ogImage ? { images: [seo.ogImage] } : {}) },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    verification: { google: v.google || undefined, yandex: v.yandex || undefined, other },
  };
}

export default async function StoreLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang: l } = await params;
  if (!isLang(l)) notFound();
  const lang: Lang = l;
  const [s, products, ads, cats, dict, seo, earn] = await Promise.all([getSettings(lang), getProducts(lang), getAds(lang), getCategories(lang), getDict(lang), getSeo(), getEarn()]);
  const t = makeT(dict);
  const live = ads.filter(a => adLive(a));
  const ticker = live.filter(a => a.place === 'ticker').map(a => ({ id: a.id, title: a.title, href: adHref(a.link) }));
  const pop = live.find(a => a.place === 'popup');
  return (
    <Html lang={lang}>
      <StoreProvider products={products} rates={s.rates} lang={lang} dict={dict} pre={s.preorder?.on ? s.preorder.ships || 'Pre-order' : ''}>
        <a className="skip" href="#main">{t('Skip to content')}</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson({ '@context': 'https://schema.org', '@graph': [
          { '@type': 'Organization', '@id': `${siteUrl()}/#org`, name: s.store.name, url: siteUrl(), ...(seo.ogImage ? { logo: seo.ogImage } : {}) },
          { '@type': 'WebSite', '@id': `${siteUrl()}/#site`, name: s.store.name, url: siteUrl(), inLanguage: lang, publisher: { '@id': `${siteUrl()}/#org` },
            potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl()}/shop?q={search_term_string}` }, 'query-input': 'required name=search_term_string' } },
        ] }) }} />
        {s.store.announce && <div className="announce">{s.store.announce}</div>}
        <Header name={s.store.name} nav={s.nav} ticker={ticker} />
        <main id="main">{children}</main>
        <NetAds place="footer" />
        <footer><div className="wrap">
          <div className="foot-top">
            <div className="foot-brand"><div className="logo"><span>{s.store.name}</span></div><p>{s.store.tagline}</p><div className="label" style={{ marginTop: 18 }}>{t('News and offers')}</div><NewsletterForm /><Share title={`${s.store.name}: ${s.store.tagline}`} path="/" label={t('Share the shop')} /></div>
            <div className="foot-cols">
              <div><div className="label">{t('Shop')}</div>{cats.map(c => <Link key={c.id} href={`/c/${c.slug}`}>{c.name}</Link>)}</div>
              <div><div className="label">{t('Help')}</div><Link href="/track">{t('Track order')}</Link><Link href="/help#shipping">{t('Shipping')}</Link><Link href="/help#returns">{t('Returns')}</Link><Link href="/account">{t('Store credit')}</Link><Link href="/help">{t('Help')}</Link></div>
              <div><div className="label">{t('About')}</div><Link href="/privacy">{t('Privacy')}</Link><Link href="/terms">{t('Terms of sale')}</Link><Link href="/help#contact">{t('Contact')}</Link>{earn.advertise.on && <Link href="/advertise">{t('Advertise with us')}</Link>}</div>
            </div>
          </div>
          <div className="foot-bottom"><div className="paylogos">{['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay', 'PayPal', 'bKash', 'Nagad', "Touch 'n Go", t('Cash on delivery')].map(x => <span key={x}>{x}</span>)}</div><p>© {s.store.name}</p></div>
        </div></footer>
        <Drawer />
        <CookieNote ads={earn.net.on} />
        <ChatWidget />
        <Pixels p={seo.pixels} />
        <NetHead />
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
