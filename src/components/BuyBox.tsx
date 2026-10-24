'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CardProduct } from '@/lib/catalog';
import Price from './Price';
import { flyToBag } from './ProductCard';
import { useStore } from './StoreProvider';

const STICKS: [string, number, number][] = [['Daily', 8, 95], ['Thin', 6, 80], ['Thick', 12, 110], ['Long', 10, 140], ['Shop stick', 15, 180]];
const POCKETS: [string, number][] = [['Shirt chest', 120], ['Thobe chest', 140], ['Jacket inner', 160]];

export default function BuyBox({ p, finishes }: { p: CardProduct; finishes: CardProduct[] }) {
  const { add, toast, open } = useStore();
  const router = useRouter();
  const [st, setSt] = useState(0), [pk, setPk] = useState(0);
  const [, th, len] = STICKS[st], depth = POCKETS[pk][1], shows = 152 - depth;
  const o = p.offer;
  return <>
    <div className="big-price"><Price cents={p.priceCents} pct={o?.pct} /></div>
    {o && <div className="offer-box">{o.label}. Applied at checkout automatically.</div>}
    {finishes.length > 1 && <div><div className="label">Finish · {p.sub}</div><div className="swatches">{finishes.map(x => <Link key={x.slug} className={`sw ${x.slug === p.slug ? 'on' : ''}`} href={`/p/${x.slug}`} style={{ background: x.swatch || 'var(--cloth)' }} aria-label={x.sub} />)}</div></div>}
    {p.kind === 'pen' && <div className="fit"><div><div className="label">Fit check</div><div className="serif" style={{ fontSize: '1.35rem', marginTop: 4 }}>Will your stick fit?</div></div>
      <div className="filters">{STICKS.map(([n, t, l], i) => <button key={n} className={`chip ${i === st ? 'on' : ''}`} onClick={() => setSt(i)}>{n}<small>{t} × {l} mm</small></button>)}</div>
      <div className="filters">{POCKETS.map(([n, d], i) => <button key={n} className={`chip ${i === pk ? 'on' : ''}`} onClick={() => setPk(i)}>{n}<small>{d} mm deep</small></button>)}</div>
      <p className="verdict">{th > 12 ? <><b className="no">Shave to 12 mm.</b> The collar grips 6–12 mm.</> : <><b>Grips.</b> {th} mm sits in the 6–12 mm collar.</>}{' '}
        {len > 116 ? `Trim ${len - 116} mm so the cap closes.` : `Closes with ${116 - len} mm to spare.`}{' '}
        {shows > 0 ? `${shows} mm shows above the pocket, clip on the edge.` : `Fully inside the pocket, ${-shows} mm below the edge.`}</p></div>}
    <div className="add">
      <button className="btn" onClick={e => { flyToBag(e.currentTarget); add(p.slug); toast(`${p.name} added to your bag`); open('bag'); }}>Add to bag</button>
      <button className="btn ghost" onClick={() => { add(p.slug); router.push('/checkout'); }}>Buy now</button>
    </div>
  </>;
}
