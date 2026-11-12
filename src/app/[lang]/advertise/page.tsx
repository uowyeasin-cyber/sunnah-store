import { notFound } from 'next/navigation';
import { getDict, getSettings } from '@/lib/catalog';
import { getEarn } from '@/lib/earn';
import { isLang, makeT, type Lang } from '@/lib/i18n';

export const metadata = { title: 'Advertise with us' };

// Public page that sells ad space on the shop to other businesses. Prices and contacts come from Admin → Earn money.
export default async function Advertise({ params }: PageProps<'/[lang]/advertise'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [e, s, dict] = await Promise.all([getEarn(), getSettings(lang), getDict(lang)]);
  const a = e.advertise;
  if (!a.on) notFound();
  const t = makeT(dict);
  const prices = a.prices.split('\n').map(r => r.split('|').map(x => x.trim())).filter(r => r[0]);
  const msg = encodeURIComponent(`${t('Hello, I want to advertise on')} ${s.store.name}.`);
  const wa = a.whatsapp.replace(/[^\d]/g, '');
  return (
    <div className="wrap view" style={{ maxWidth: 760 }}>
      <div className="kicker">{s.store.name}</div>
      <h1 style={{ fontSize: '2.2rem' }}>{t(a.title)}</h1>
      <p className="muted" style={{ marginTop: 12 }}>{t(a.text)}</p>
      {prices.length > 0 && <div className="adv-prices">{prices.map((r, i) => <div key={i}><span>{t(r[0])}</span><b>{r[1] || ''}</b></div>)}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {wa && <a className="btn brass" href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noopener">WhatsApp</a>}
        {a.email && <a className="btn ghost" href={`mailto:${a.email}?subject=${msg}`}>{t('Email us')}</a>}
      </div>
    </div>
  );
}
