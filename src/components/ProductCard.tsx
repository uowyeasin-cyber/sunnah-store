'use client';
import Link from 'next/link';
import type { CardProduct } from '@/lib/catalog';
import Art from './Art';
import Price from './Price';
import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';

export function OfferBadge({ p }: { p: CardProduct }) {
  const o = p.offer;
  if (!o || o.style === 'glow') return null;
  if (o.style === 'timer') {
    return <div className="offer timer"><span>{o.label}</span><DaysLeft endsAt={o.endsAt} /></div>;
  }
  return <div className={`offer ${o.style}`}>{o.label}</div>;
}

function DaysLeft({ endsAt }: { endsAt: string | null }) {
  const { t } = useStore();
  const [days, setDays] = useState(0);
  useEffect(() => { if (endsAt) setDays(Math.max(0, Math.ceil((Date.parse(endsAt) - Date.now()) / 864e5))); }, [endsAt]);
  return days ? <span className="num">{t('ends in {n}d', { n: days })}</span> : null;
}

export function Heart({ slug }: { slug: string }) {
  const { wish, toggleWish, toast, t } = useStore();
  const on = wish.includes(slug);
  return (
    <button className={`heart ${on ? 'on' : ''}`} aria-label={t(on ? 'Remove from wishlist' : 'Save to wishlist')} aria-pressed={on}
      onClick={() => { toggleWish(slug); if (!on) toast(t('Saved to your wishlist')); }}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
    </button>
  );
}

export function flyToBag(from: Element | null) {
  const src = from?.closest('.card, .pdp')?.querySelector('.art svg, .art img, .stage svg, .stage img');
  const bag = document.getElementById('bagBtn');
  if (!src || !bag || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = src.getBoundingClientRect(), b = bag.getBoundingClientRect();
  const c = document.createElement('div');
  c.className = 'fly'; c.appendChild(src.cloneNode(true));
  Object.assign(c.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  document.body.appendChild(c);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * 0.6}px,${dy * 0.6 - 80}px) scale(.45)`, opacity: 0.9, offset: 0.6 }, { transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = () => c.remove();
}

export default function ProductCard({ p, brand }: { p: CardProduct; brand?: string }) {
  const { add, toast, t, pre } = useStore();
  return (
    <article className="card">
      <div className="frame">
        <Heart slug={p.slug} />
        <Link className={`art ${p.offer?.style === 'glow' ? 'glow' : ''}`} href={`/p/${p.slug}`} aria-label={`${p.name}, ${p.sub}`}>
          <OfferBadge p={p} /><Art p={p} brand={brand} />{p.images[1] && <img className="alt" src={p.images[1]} alt="" loading="lazy" />}{pre && <span className="pre-pill">{t('Pre-order')}</span>}
        </Link>
        <button className="quick" onClick={e => { flyToBag(e.currentTarget); add(p.slug); toast(t('{x} added to your bag', { x: p.name })); }}>{t(pre ? 'Pre-order' : 'Add to bag')}</button>
      </div>
      <Link className="row" href={`/p/${p.slug}`}>
        <div><h3>{p.name}</h3><div className="sub">{p.sub}</div></div>
        <div className="price"><Price cents={p.priceCents} pct={p.offer?.pct} /></div>
      </Link>
    </article>
  );
}
