'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type HeroSlide = { id: string; eyebrow: string; title: string; italic: string; text: string; cta: string; href: string; dark: boolean; full: boolean; art: React.ReactNode };

export default function Hero({ slides, secs }: { slides: HeroSlide[]; secs: number }) {
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const box = useRef<HTMLElement>(null);
  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (slides.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setI(x => (x + 1) % slides.length), secs * 1000);
    return () => clearTimeout(t);
  }, [i, slides.length, secs]);
  // Parallax on scroll and pointer.
  useEffect(() => {
    const el = box.current; if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sc = () => { if (scrollY < innerHeight * 1.2) el.style.setProperty('--sy', String(scrollY)); };
    const mv = (e: PointerEvent) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); };
    addEventListener('scroll', sc, { passive: true }); el.addEventListener('pointermove', mv);
    return () => { removeEventListener('scroll', sc); el.removeEventListener('pointermove', mv); };
  }, []);
  return (
    <section ref={box} className={`lux-hero ${ready ? '' : 'pre'}`} aria-roledescription="carousel" aria-label="Featured" style={{ ['--dur' as string]: `${secs}s` }}>
      {slides.map((s, k) => (
        <div key={s.id} className={`slide ${k === i && ready ? 'on' : ''} ${s.dark ? 'dark' : ''} ${s.full ? 'full' : ''}`} aria-hidden={k !== i}>
          <div className="s-art"><div className="kb">{s.art}</div></div>
          <div className="wrap s-copy">
            <div className="kicker">{s.eyebrow}</div>
            <h1 className="split"><span className="ln"><span>{s.title}</span></span>{s.italic && <span className="ln"><span><em>{s.italic}</em></span></span>}</h1>
            {s.text && <p className="lead">{s.text}</p>}
            <div className="cta">{s.cta && <Link className={`btn ${s.dark ? 'brass' : ''}`} href={s.href}>{s.cta}</Link>}{k === 0 && <a className="link-arrow" href="#cats">Explore the collections <span aria-hidden="true">→</span></a>}</div>
          </div>
        </div>
      ))}
      {slides.length > 1 && <div className="wrap s-ctrl">{slides.map((s, k) => <button key={s.id} className={`s-dot ${k === i ? 'on' : ''}`} onClick={() => setI(k)} aria-label={`Show ${s.eyebrow || 'slide ' + (k + 1)}`}><i key={k === i ? i : undefined} /><span>{String(k + 1).padStart(2, '0')}</span></button>)}</div>}
    </section>
  );
}
