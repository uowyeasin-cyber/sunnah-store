'use client';
import { useState } from 'react';

// Product page media: the video first (when there is one), then each photo. Thumbnails switch the big view.
export default function Gallery({ images, video, poster, alt, children }: { images: string[]; video: string; poster: string; alt: string; children: React.ReactNode }) {
  const items = [...(video ? [{ kind: 'video', src: video }] : []), ...images.map(src => ({ kind: 'image', src }))];
  const [i, setI] = useState(0);
  if (!items.length) return <>{children}</>;
  const cur = items[Math.min(i, items.length - 1)];
  return <>
    {cur.kind === 'video'
      ? <video key={cur.src} src={cur.src} poster={poster || undefined} autoPlay muted loop playsInline />
      : <img key={cur.src} src={cur.src} alt={alt} className="fade-in" />}
    {items.length > 1 && <div className="thumbs" role="tablist" aria-label="Photos">
      {items.map((m, k) => <button key={m.src} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={m.kind === 'video' ? 'Video' : `Photo ${k + (video ? 0 : 1)}`}>
        {m.kind === 'video' ? <><img src={poster || images[0] || ''} alt="" /><span className="play">▶</span></> : <img src={m.src} alt="" loading="lazy" />}
      </button>)}
    </div>}
  </>;
}
