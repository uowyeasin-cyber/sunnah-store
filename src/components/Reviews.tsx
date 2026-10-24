import type { Review } from '@prisma/client';
import type { T } from '@/lib/i18n';

const stars = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

export default function Reviews({ reviews, t, children }: { reviews: Review[]; t: T; children?: React.ReactNode }) {
  if (!reviews.length && !children) return null;
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0;
  return (
    <section id="reviews">
      <div className="sec-head"><div className="rev-top"><h2>{t('What carriers say')}</h2>{reviews.length > 0 && <div><span className="stars">{stars(Math.round(avg))}</span> <span className="num">{avg.toFixed(1)}</span> <span className="muted">· {t('{n} reviews', { n: reviews.length })}</span></div>}</div></div>
      <div className="reviews">{reviews.slice(0, 6).map(r => (
        <div className="rev" key={r.id}><div className="stars">{stars(r.stars)}</div><p>{r.text}</p>
          {r.media.length > 0 && <div className="media">{r.media.map(m => <div key={m}>{/\.(mp4|webm|mov)$/i.test(m) ? <><video src={m} muted /><span className="play">▶</span></> : <img src={m} alt="" />}</div>)}</div>}
          <div className="who">{r.name}{r.place && ` · ${r.place}`} {r.verified && <span className="verified">· {t('Verified buyer')}</span>}</div></div>))}
      </div>
      {children}
    </section>
  );
}
