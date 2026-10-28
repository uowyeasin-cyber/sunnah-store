'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// Launch film at the very top of the home page: plays muted on its own, wide on desktop, tall on phones.
export default function LaunchFilm({ wide, tall, poster, cta, labels }: { wide: string; tall: string; poster: string; cta: string; labels: { replay: string; pause: string; play: string; skip: string; sound: string; mute: string } }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState('');
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const m = matchMedia('(max-aspect-ratio: 1/1)');
    const pick = () => setSrc(m.matches && tall ? tall : wide || tall);
    pick(); m.addEventListener('change', pick);
    return () => m.removeEventListener('change', pick);
  }, [wide, tall]);
  const v = () => ref.current;
  const toggle = () => { const x = v(); if (!x) return; if (x.paused) { x.play(); setPlaying(true); } else { x.pause(); setPlaying(false); } };
  const replay = () => { const x = v(); if (!x) return; x.currentTime = 0; x.play(); setPlaying(true); setEnded(false); };
  const sound = () => { const x = v(); if (!x) return; x.muted = !x.muted; setMuted(x.muted); if (x.paused) { x.play(); } };
  const skip = () => document.querySelector('.lux-hero, .hero')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <section className={`film${tall ? '' : ' wide-only'}`} aria-label="Launch film">
      {src && <video ref={ref} key={src} src={src} poster={poster || undefined} autoPlay muted={muted} playsInline preload="auto"
        onPlay={() => { setPlaying(true); setEnded(false); }} onPause={() => setPlaying(false)} onEnded={() => { setEnded(true); setPlaying(false); }} />}
      <div className="film-bar">
        <button type="button" onClick={ended ? replay : toggle} aria-label={ended ? labels.replay : playing ? labels.pause : labels.play}>
          {ended ? '↻' : playing ? '❚❚' : '▶'}</button>
        {!ended && <button type="button" onClick={replay} aria-label={labels.replay}>↻</button>}
        <button type="button" onClick={sound} aria-label={muted ? labels.sound : labels.mute}>{muted ? '🔇' : '🔊'} <span className="film-lbl">{muted ? labels.sound : labels.mute}</span></button>
        <span style={{ flex: 1 }} />
        <Link className="film-cta" href="/shop">{cta}</Link>
        <button type="button" className="film-skip" onClick={skip}>{labels.skip} ↓</button>
      </div>
    </section>
  );
}
