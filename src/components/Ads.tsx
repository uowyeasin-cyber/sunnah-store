import Link from 'next/link';
import type { Ad } from '@prisma/client';
import type { CardProduct } from '@/lib/catalog';
import Art from './Art';
import AdClick from './AdClick';

// getAds() already drops ads that are off or outside their dates.
export const adLive = (a: Ad) => a.on;

export function adHref(link: string) {
  if (!link) return null;
  if (/^https?:/.test(link)) return link;
  return link.startsWith('cat:') ? `/c/${link.slice(4)}` : `/p/${link}`;
}

export function AdVisual({ ad, products, brand }: { ad: Ad; products: CardProduct[]; brand: string }) {
  if (ad.video) return <video src={ad.video} autoPlay muted loop playsInline />;
  if (ad.image) return <img src={ad.image} alt="" />;
  const p = ad.link.startsWith('cat:') ? products.find(x => x.category.slug === ad.link.slice(4)) : products.find(x => x.slug === ad.link);
  return p ? <Art p={p} brand={brand} /> : <span className="ad-mono">{brand.slice(0, 2)}</span>;
}

export function AdCta({ ad, className }: { ad: Ad; className: string }) {
  const href = adHref(ad.link);
  if (!ad.cta || !href) return null;
  const inner = <>{ad.cta} <span aria-hidden="true">→</span></>;
  return /^https?:/.test(href)
    ? <AdClick id={ad.id}><a className={className} href={href} target="_blank" rel="noopener">{inner}</a></AdClick>
    : <AdClick id={ad.id}><Link className={className} href={href}>{inner}</Link></AdClick>;
}

export function AdBanner({ ad, products, brand }: { ad: Ad; products: CardProduct[]; brand: string }) {
  return (
    <aside className={`ad ad-${ad.style}`} aria-label="Advertisement">
      <div className="ad-art"><div className="ad-float"><AdVisual ad={ad} products={products} brand={brand} /></div></div>
      <div className="ad-copy">
        {ad.kicker && <div className="kicker">{ad.kicker}</div>}
        <h2>{ad.title}</h2>
        {ad.text && <p>{ad.text}</p>}
        <AdCta ad={ad} className={`btn ${ad.style === 'light' ? '' : 'brass'}`} />
      </div>
      <span className="ad-shine" aria-hidden="true" />
    </aside>
  );
}

export function AdSlot({ ads, place, products, brand, wrap = true }: { ads: Ad[]; place: string; products: CardProduct[]; brand: string; wrap?: boolean }) {
  const list = ads.filter(a => a.place === place && adLive(a));
  return <>{list.map(a => <div key={a.id} className={`${wrap ? 'wrap ' : ''}ad-slot`}><AdBanner ad={a} products={products} brand={brand} /></div>)}</>;
}
