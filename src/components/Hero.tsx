'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';

export type HeroSlide = {
  id: string; eyebrow: string; title: string; italic: string; text: string; buttons: { label: string; href: string }[]; dark: boolean;
  full: boolean; art: React.ReactNode; motion: string; fit: string;
  video?: string; videoTall?: string; poster?: string; // a video slide plays to the end before moving on
  audio?: string; file?: string; fileName?: string; // a sound plays with controls; any other file opens from a button
};

// The showcase: the opening film plus every photo and video the owner uploads, one after another.
// Each slide moves the way the owner picked (fade, slide, zoom, pan, rise). Swipe, arrows, or let it run.
export default function Hero({ slides, secs, height }: { slides: HeroSlide[]; secs: number; height?: number }) {
  const { t } = useStore();
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(-1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [tall, setTall] = useState(false);
  const box = useRef<HTMLElement>(null);
  const vids = useRef<Record<number, HTMLVideoElement | null>>({});
  const n = slides.length;
  const go = (k: number) => { const to = ((k % n) + n) % n; if (to === i) return; setPrev(i); setI(to); };

  useEffect(() => { const m = matchMedia('(max-aspect-ratio: 1/1)'); const f = () => setTall(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  // Photos move on after `secs`; a video moves on when it ends.
  useEffect(() => {
    box.current?.querySelectorAll<HTMLAudioElement>('.slide:not(.on) audio').forEach(a => a.pause());
    Object.entries(vids.current).forEach(([k, v]) => { if (!v) return; if (Number(k) === i) { v.currentTime = 0; v.play().catch(() => {}); } else v.pause(); });
    if (n < 2 || paused || slides[i]?.video || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tm = setTimeout(() => go(i + 1), secs * 1000);
    return () => clearTimeout(tm);
  }, [i, n, secs, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe on phones.
  const x0 = useRef<number | null>(null);
  const down = (e: React.PointerEvent) => { x0.current = e.clientX; };
  const up = (e: React.PointerEvent) => { if (x0.current === null) return; const dx = e.clientX - x0.current; x0.current = null; if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1)); };
  const cur = slides[i];

  return (
    <section ref={box} className={`lux-hero showcase ${height ? `sized ${height < 60 ? 'short' : ''}` : ''}`} aria-roledescription="carousel" aria-label={t('Showcase')} style={{ ['--dur' as string]: `${secs}s`, ...(height ? { height: `max(300px, ${height}svh)`, minHeight: 0 } : {}) }}
      onPointerDown={down} onPointerUp={up} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, k) => (
        <div key={s.id} className={`slide m-${s.motion || 'fade'} ${k === i ? 'on' : k === prev ? 'out' : ''} ${s.dark ? 'dark' : ''} ${s.full ? 'full' : ''} fit-${s.fit} ${s.title || s.text ? '' : 'bare'}`} aria-hidden={k !== i}>
          <div className="s-art"><div className="kb">
            {s.video ? <video ref={el => { vids.current[k] = el; }} src={tall && s.videoTall ? s.videoTall : s.video} poster={s.poster || undefined} muted={muted} playsInline preload={k === 0 ? 'auto' : 'metadata'} autoPlay={k === 0} onEnded={() => go(i + 1)} /> : s.art}
          </div></div>
          {(s.title || s.text || s.buttons.length > 0 || s.audio || s.file) && <div className="wrap s-copy">
            {s.eyebrow && <div className="kicker">{s.eyebrow}</div>}
            {s.title && <h1 className="split"><span className="ln"><span>{s.title}</span></span>{s.italic && <span className="ln"><span><em>{s.italic}</em></span></span>}</h1>}
            {s.text && <p className="lead">{s.text}</p>}
            {s.audio && <audio className="s-audio" src={s.audio} controls preload="none" />}
            {(s.buttons.length > 0 || s.file) && <div className="cta">
              {s.buttons.map((b, j) => /^https?:/.test(b.href)
                ? <a key={j} className={`btn ${j ? 'ghost' : s.dark || s.full ? 'brass' : ''}`} href={b.href} target="_blank" rel="noopener">{b.label}</a>
                : <Link key={j} className={`btn ${j ? 'ghost' : s.dark || s.full ? 'brass' : ''}`} href={b.href}>{b.label}</Link>)}
              {s.file && <a className="btn ghost" href={s.file} target="_blank" rel="noopener" download>{s.fileName || t('Open file')}</a>}
            </div>}
          </div>}
        </div>
      ))}
      {n > 1 && <>
        <button type="button" className="sc-arrow prev" onClick={() => go(i - 1)} aria-label={t('Previous')}>‹</button>
        <button type="button" className="sc-arrow next" onClick={() => go(i + 1)} aria-label={t('Next')}>›</button>
      </>}
      <div className="wrap s-ctrl">
        {n > 1 && <div className="sc-bars">{slides.map((s, k) => <button key={s.id} type="button" className={`s-dot ${k === i ? 'on' : ''} ${k < i ? 'done' : ''}`} onClick={() => go(k)} aria-label={`${k + 1} / ${n}`}><i key={k === i ? `${i}-${paused}` : undefined} style={k === i && s.video ? { animation: 'none', transform: 'none' } : undefined} /></button>)}</div>}
        <span className="sc-count">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
        {cur?.video && <button type="button" className="sc-sound" onClick={() => setMuted(m => !m)} aria-label={muted ? t('Sound on') : t('Mute')}>{muted ? '🔇' : '🔊'}</button>}
      </div>
    </section>
  );
}
