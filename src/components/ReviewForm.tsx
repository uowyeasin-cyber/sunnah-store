'use client';
import { useState } from 'react';
import { submitReview } from '@/app/actions';
import { useStore } from './StoreProvider';

export default function ReviewForm({ productId }: { productId: string }) {
  const { t } = useStore();
  const [stars, setStars] = useState(5);
  const [done, setDone] = useState('');
  if (done) return <p className="write">{done}</p>;
  return (
    <form className="write" action={async fd => { fd.set('stars', String(stars)); fd.set('productId', productId); const r = await submitReview(fd); setDone(r.message); }}>
      <div className="serif" style={{ fontSize: '1.2rem' }}>{t('Write a review')}</div>
      <div className="filters">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={`chip ${n === stars ? 'on' : ''}`} onClick={() => setStars(n)}>{n} ★</button>)}</div>
      <div className="two"><div className="field"><label htmlFor="rn">{t('Name')}</label><input id="rn" name="name" required maxLength={60} /></div><div className="field"><label htmlFor="rp">{t('City, country')}</label><input id="rp" name="place" maxLength={60} /></div></div>
      <div className="field"><label htmlFor="rt">{t('Your review')}</label><textarea id="rt" name="text" rows={3} required maxLength={1200} /></div>
      <div className="field"><label htmlFor="rf">{t('Photos or video (up to 4)')}</label><input id="rf" name="media" type="file" accept="image/*,video/*" multiple /></div>
      <div><button className="btn">{t('Post review')}</button></div>
    </form>
  );
}
