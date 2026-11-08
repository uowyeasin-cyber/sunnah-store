'use client';
import { useRef, useState } from 'react';

// Product page media: the video first (when there is one), then each photo.
// Swipe the big view sideways (or use the arrows); the thumbnails sit below it so the photo stays clear.
export default function Gallery({ images, video, poster, alt, stageClass = 'stage', badge, children }: { images: string[]; video: string; poster: string; alt: string; stageClass?: string; badge?: React.ReactNode; children: React.ReactNode }) {
  const items = [...(video ? [{ kind: 'video', src: video }] : []), ...images.map(src => ({ kind: 'image', src }))];
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  if (!items.length) return <div className={stageClass}>{badge}{children}</div>;
  const go = (k: number) => {
    const n = Math.max(0, Math.min(items.length - 1, k)), el = track.current;
    setI(n);
    if (el) el.scrollTo({ left: n * el.clientWidth * (document.dir === 'rtl' ? -1 : 1), behavior: 'smooth' });
  };
  const onScroll = () => { const el = track.current; if (el && el.clientWidth) { const n = Math.round(Math.abs(el.scrollLeft) / el.clientWidth); if (n !== i) setI(n); } };
  return <>
    <div className={`${stageClass} has-track`}>
      {badge}
      <div className="g-track" ref={track} onScroll={onScroll} aria-roledescription="carousel" aria-label="Photos">
        {items.map((m, k) => <div className="g-slide" key={m.src} aria-hidden={k !== i}>
          {m.kind === 'video'
            ? <video src={m.src} poster={poster || undefined} autoPlay muted loop playsInline />
            : <img src={m.src} alt={`${alt} (${k + 1}/${items.length})`} loading={k ? 'lazy' : 'eager'} draggable={false} />}
        </div>)}
      </div>
      {items.length > 1 && <>
        <button type="button" className="g-arrow prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous photo">‹</button>
        <button type="button" className="g-arrow next" onClick={() => go(i + 1)} disabled={i === items.length - 1} aria-label="Next photo">›</button>
        <span className="g-count">{i + 1} / {items.length}</span>
      </>}
    </div>
    {items.length > 1 && <div className="g-thumbs" role="tablist" aria-label="Photos">
      {items.map((m, k) => <button key={m.src} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={m.kind === 'video' ? 'Video' : `Photo ${k + (video ? 0 : 1)}`}>
        {m.kind === 'video' ? <><img src={poster || images[0] || ''} alt="" /><span className="play">▶</span></> : <img src={m.src} alt="" loading="lazy" />}
      </button>)}
    </div>}
  </>;
}
