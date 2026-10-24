import Link from 'next/link';
import { getAds, getCategories, getProducts, getSettings } from '@/lib/catalog';
import StoreProvider from '@/components/StoreProvider';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Motion from '@/components/Motion';
import AdPopup from '@/components/AdPopup';
import { AdCta, adHref, adLive, AdVisual } from '@/components/Ads';

export default async function StoreLayout({ children }: LayoutProps<'/'>) {
  const [s, products, ads, cats] = await Promise.all([getSettings(), getProducts(), getAds(), getCategories()]);
  const live = ads.filter(a => adLive(a));
  const ticker = live.filter(a => a.place === 'ticker').map(a => ({ id: a.id, title: a.title, href: adHref(a.link) }));
  const pop = live.find(a => a.place === 'popup');
  return (
    <StoreProvider products={products} rates={s.rates}>
      {s.store.announce && <div className="announce">{s.store.announce}</div>}
      <Header name={s.store.name} nav={s.nav} ticker={ticker} />
      <main>{children}</main>
      <footer><div className="wrap">
        <div className="foot-top">
          <div className="foot-brand"><div className="logo"><span>{s.store.name}</span></div><p>{s.store.tagline}</p></div>
          <div className="foot-cols">
            <div><div className="label">Shop</div>{cats.map(c => <Link key={c.id} href={`/c/${c.slug}`}>{c.name}</Link>)}</div>
            <div><div className="label">Help</div><Link href="/track">Track order</Link><Link href="/track">Returns</Link><Link href="/track">Store credit</Link></div>
          </div>
        </div>
        <div className="foot-bottom"><div className="paylogos">{['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay', 'PayPal', 'bKash', 'Nagad', "Touch 'n Go", 'Cash on delivery'].map(x => <span key={x}>{x}</span>)}</div><p>© {s.store.name}</p></div>
      </div></footer>
      <Drawer />
      {pop && <AdPopup id={pop.id} delay={s.popupDelay} style={pop.style}>
        <div className="pop-art"><div className="ad-float"><AdVisual ad={pop} products={products} brand={s.store.name} /></div></div>
        <div className="pop-copy">{pop.kicker && <div className="kicker">{pop.kicker}</div>}<h2>{pop.title}</h2>{pop.text && <p>{pop.text}</p>}
          <AdCta ad={pop} className={`btn ${pop.style === 'light' ? '' : 'brass'}`} /><button className="link-arrow" data-close style={{ border: 0, background: 'none' }}>No thanks</button></div>
      </AdPopup>}
      <Motion />
    </StoreProvider>
  );
}
