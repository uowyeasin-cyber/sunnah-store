'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { currentSale, type SalePlace } from '@/lib/promo';
import { useStore } from './StoreProvider';
import Share from './Share';
import AdPopup from './AdPopup';

// Sale campaigns (like 11.11): bar, home banner, product strip and pop-up, each with a live countdown.
// Everything here runs by the visitor's clock, so a campaign appears and ends on time even on cached pages.

function useSale(place: SalePlace) {
  const { sales, now } = useStore();
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(i); }, []);
  const at = tick || now;
  if (!at) return null;
  const c = currentSale(sales, at);
  return c && c.ev.places.includes(place) ? { ...c, left: Math.max(0, c.until - at) } : null;
}

function Clock({ left, big }: { left: number; big?: boolean }) {
  const { t } = useStore();
  const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  if (!big) return <span className="sale-clock num">{d > 0 && `${d}${t('d')} `}{p(h)}:{p(m)}:{p(sec)}</span>;
  return <div className="sale-cd num" role="timer">{[[d, t('Days')], [h, t('Hours')], [m, t('Minutes')], [sec, t('Seconds')]].map(([n, l]) => <div key={l as string}><b>{p(n as number)}</b><small>{l}</small></div>)}</div>;
}

const isUrl = (l: string) => /^https?:/.test(l);
function Cta({ text, link, className }: { text: string; link: string; className: string }) {
  if (!text || !link) return null;
  return isUrl(link) ? <a className={className} href={link} target="_blank" rel="noopener">{text} <span aria-hidden="true">→</span></a> : <Link className={className} href={link}>{text} <span aria-hidden="true">→</span></Link>;
}

// Picks a colour and name for a "join us" link from its address.
const NETS: [RegExp, string, string][] = [[/wa\.me|whatsapp/i, 'whatsapp', 'WhatsApp'], [/m\.me|messenger/i, 'messenger', 'Messenger'], [/t\.me|telegram/i, 'telegram', 'Telegram'],
  [/instagram/i, 'instagram', 'Instagram'], [/facebook|fb\.com/i, 'facebook', 'Facebook'], [/youtube|youtu\.be/i, 'youtube', 'YouTube'], [/tiktok/i, 'tiktok', 'TikTok'], [/imo/i, 'imo', 'imo']];
export function JoinButtons({ links }: { links: { label: string; url: string }[] }) {
  const { t } = useStore();
  const list = links.filter(l => isUrl(l.url));
  if (!list.length) return null;
  return <div className="sale-join">{list.map((l, i) => { const n = NETS.find(([re]) => re.test(l.url)); return <a key={i} className={`join-btn ${n?.[1] || 'web'}`} href={l.url} target="_blank" rel="noopener">{t(l.label) || n?.[2] || l.url}</a>; })}</div>;
}

function Body({ place, big }: { place: SalePlace; big?: boolean }) {
  const { t } = useStore();
  const c = useSale(place);
  if (!c) return null;
  const { ev, phase, left } = c;
  return <>
    {ev.image && <div className="sale-img"><img src={ev.image} alt="" /></div>}
    <div className="sale-copy">
      {ev.kicker && <div className="kicker">{t(ev.kicker)}</div>}
      <h2>{t(ev.title)}</h2>
      {ev.text && <p>{t(ev.text)}</p>}
      <div className="sale-when">{t(phase === 'soon' ? 'Starts in' : 'Ends in')}</div>
      <Clock left={left} big={big} />
      {phase === 'live' && ev.code && <p className="sale-code">{t('Use code')} <b>{ev.code}</b></p>}
      <div className="sale-act"><Cta text={t(ev.cta)} link={ev.link} className="btn brass" /></div>
      <JoinButtons links={ev.join} />
      {ev.share && <Share title={t(ev.shareText || ev.title)} path={ev.link && !isUrl(ev.link) ? ev.link : '/'} label={t('Share with friends')} />}
    </div>
  </>;
}

export function SaleBar() {
  const { t } = useStore();
  const c = useSale('bar');
  if (!c) return null;
  return <div className={`sale-bar look-${c.ev.look}`}><div className="wrap">
    <b>{t(c.ev.kicker || c.ev.name)}</b><span className="sale-bar-t">{t(c.ev.title)}</span>
    <span>{t(c.phase === 'soon' ? 'Starts in' : 'Ends in')} <Clock left={c.left} /></span>
    <Cta text={t(c.ev.cta)} link={c.ev.link} className="sale-bar-cta" />
  </div></div>;
}

export function SaleBanner({ place }: { place: 'home' | 'product' }) {
  const c = useSale(place);
  if (!c) return null;
  return <section className={`${place === 'home' ? 'wrap ' : ''}sale-slot`}><div className={`sale-banner look-${c.ev.look} ${place === 'product' ? 'strip' : ''}`}><Body place={place} big={place === 'home'} /></div></section>;
}

export function SalePopup() {
  const c = useSale('popup');
  if (!c) return null;
  return <AdPopup id={`sale-${c.ev.id}`} delay={4} style={c.ev.look === 'red' ? 'dark' : c.ev.look === 'gold' ? 'gold' : 'dark'} views={false}><div className={`sale-pop look-${c.ev.look}`}><Body place="popup" /></div></AdPopup>;
}
