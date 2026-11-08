'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CardProduct } from '@/lib/catalog';
import Price from './Price';
import { flyToBag } from './ProductCard';
import { useStore } from './StoreProvider';

const STICKS: [string, number, number][] = [['Daily', 8, 95], ['Thin', 6, 80], ['Thick', 12, 110], ['Long', 10, 140], ['Shop stick', 15, 180]];
const POCKETS: [string, number][] = [['Shirt chest', 120], ['Thobe chest', 140], ['Jacket inner', 160]];

export default function BuyBox({ p, finishes, soldOut = false }: { p: CardProduct; finishes: CardProduct[]; soldOut?: boolean }) {
  const { add, toast, open, t, pre } = useStore();
  const router = useRouter();
  const [st, setSt] = useState(0), [pk, setPk] = useState(0);
  const [, th, len] = STICKS[st], depth = POCKETS[pk][1], shows = 152 - depth;
  const o = p.offer;
  const [qty, setQty] = useState(1);
  // A slim buy bar slides up on phones once the main buttons scroll out of view.
  const addRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState(false);
  useEffect(() => {
    const el = addRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el); return () => io.disconnect();
  }, []);
  const addNow = (el: Element | null) => { flyToBag(el); add(p.slug, qty); toast(t('{x} added to your bag', { x: p.name })); open('bag'); };
  return <>
    <div className="big-price"><Price cents={p.priceCents} pct={o?.pct} /></div>
    {o && <div className="offer-box">{o.label}. {t('Applied at checkout automatically.')}</div>}
    {finishes.length > 1 && <div><div className="label">{t('Finish')} · {p.sub}</div><div className="swatches">{finishes.map(x => <Link key={x.slug} className={`sw ${x.slug === p.slug ? 'on' : ''}`} href={`/p/${x.slug}`} style={{ background: x.swatch || 'var(--cloth)' }} aria-label={x.sub} />)}</div></div>}
    {p.kind === 'pen' && <div className="fit"><div><div className="label">{t('Fit check')}</div><div className="serif" style={{ fontSize: '1.35rem', marginTop: 4 }}>{t('Will your stick fit?')}</div></div>
      <div className="filters">{STICKS.map(([n, w, l], i) => <button key={n} className={`chip ${i === st ? 'on' : ''}`} onClick={() => setSt(i)}>{t(n)}<small>{w} × {l} mm</small></button>)}</div>
      <div className="filters">{POCKETS.map(([n, d], i) => <button key={n} className={`chip ${i === pk ? 'on' : ''}`} onClick={() => setPk(i)}>{t(n)}<small>{t('{n} mm deep', { n: d })}</small></button>)}</div>
      <p className="verdict">{th > 12 ? <><b className="no">{t('Shave to 12 mm.')}</b> {t('The collar grips 6–12 mm.')}</> : <><b>{t('Grips.')}</b> {t('{n} mm sits in the 6–12 mm collar.', { n: th })}</>}{' '}
        {len > 116 ? t('Trim {n} mm so the cap closes.', { n: len - 116 }) : t('Closes with {n} mm to spare.', { n: 116 - len })}{' '}
        {shows > 0 ? t('{n} mm shows above the pocket, clip on the edge.', { n: shows }) : t('Fully inside the pocket, {n} mm below the edge.', { n: -shows })}</p></div>}
    {pre && <div className="pre-note"><span className="pre-tag">{t('Pre-order')}</span><span>{t(pre)}. {t('Reserve yours now, we ship in order of booking.')}</span></div>}
    {!soldOut && <div className="qty-pick"><div className="label">{t('Quantity')}</div><div className="qty"><button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label={t('One less')}>−</button><span aria-live="polite">{qty}</span><button onClick={() => setQty(q => Math.min(20, q + 1))} aria-label={t('One more')}>+</button></div></div>}
    {soldOut ? <div className="add"><button className="btn" disabled>{t('Sold out')}</button><p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>{t('Back soon. Join our news at the bottom of the page to hear first.')}</p></div> : <div className="add" ref={addRef}>
      <button className="btn" onClick={e => addNow(e.currentTarget)}>{t('Add to bag')}</button>
      <button className="btn ghost" onClick={() => { add(p.slug, qty); router.push('/checkout'); }}>{t(pre ? 'Pre-order now' : 'Buy now')}</button>
    </div>}
    {!soldOut && <div className={`buybar ${bar ? 'show' : ''}`} aria-hidden={!bar}>
      <div className="bb-name"><b>{p.name}</b><span><Price cents={p.priceCents} pct={o?.pct} /></span></div>
      <button className="btn sm" tabIndex={bar ? 0 : -1} onClick={() => addNow(document.querySelector('.pdp .stage'))}>{t(pre ? 'Pre-order' : 'Add to bag')}</button>
    </div>}
  </>;
}
