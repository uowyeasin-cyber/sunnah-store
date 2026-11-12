import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { getAds, getDict, getProducts, getSettings } from '@/lib/catalog';
import { getEarn } from '@/lib/earn';
import { isLang, makeT, type Lang } from '@/lib/i18n';
import { AdBanner } from '@/components/Ads';
import NetAds from '@/components/NetAds';
import ShortWait from '@/components/ShortWait';

export const instant = false;
export const metadata = { title: 'Opening link', robots: { index: false, follow: false } };

// Short link wait page: ads, a countdown, then the button to the real link (which counts the click).
async function Wait({ params }: { params: Promise<{ code: string; lang: string }> }) {
  const { code, lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [link, e, dict] = await Promise.all([db.shortLink.findUnique({ where: { code } }).catch(() => null), getEarn(), getDict(lang)]);
  const t = makeT(dict);
  if (!link || !link.on) notFound();
  const wait = !e.links.on ? 0 : link.wait >= 0 ? link.wait : e.links.wait;
  let house = null;
  if (e.links.on && e.links.houseAd) {
    const [ads, products, s] = await Promise.all([getAds(lang), getProducts(lang), getSettings(lang)]);
    const pick = ads.filter(a => a.place !== 'popup' && a.place !== 'ticker');
    const ad = pick[[...code].reduce((n, c) => n + c.charCodeAt(0), 0) % (pick.length || 1)];
    if (ad) house = <AdBanner ad={ad} products={products} brand={s.store.name} />;
  }
  return (
    <div className="sl-page">
      {link.title && <h2>{link.title}</h2>}
      {e.links.on && <NetAds place="shortlink" wrap={false} />}
      <ShortWait code={code} wait={wait} t={{ note: t(e.links.note), wait: t('Please wait {n} seconds', { n: '{n}' }), go: t('Continue to link') }} />
      {house}
      {e.links.on && <NetAds place="footer" wrap={false} />}
    </div>
  );
}

export default function ShortPage({ params }: PageProps<'/[lang]/s/[code]'>) {
  return <div className="view"><Suspense fallback={<div style={{ minHeight: '60vh' }} />}><Wait params={params} /></Suspense></div>;
}
