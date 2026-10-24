'use client';
import { useRef } from 'react';

export default function Rail({ kicker, title, italic, children }: { kicker: string; title: string; italic: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="wrap">
      <div className="sec-head"><div><div className="kicker">{kicker}</div><h2>{title} <em>{italic}</em></h2></div>
        <div className="rail-ctrl"><button className="rail-btn" onClick={() => go(-1)} aria-label="Previous">←</button><button className="rail-btn" onClick={() => go(1)} aria-label="Next">→</button></div></div>
      <div className="rail" ref={ref}>{children}</div>
    </section>
  );
}
