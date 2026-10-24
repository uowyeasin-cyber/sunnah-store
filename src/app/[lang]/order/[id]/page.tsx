import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/catalog';
import { formatAmount, type Currency } from '@/lib/money';
import { barcodeSvg, qrSvg } from '@/lib/codes';
import Timeline from '@/components/Timeline';
import { getDict } from '@/lib/catalog';
import { isLang, makeT, type Lang } from '@/lib/i18n';


export const instant = false;
export const metadata = { title: 'Your receipt', robots: { index: false } };

async function Receipt({ params }: { params: Promise<{ id: string; lang: string }> }) {
  const { id, lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  const [o, s, dict] = await Promise.all([db.order.findUnique({ where: { id }, include: { lines: true } }), getSettings(lang), getDict(lang)]);
  const t = makeT(dict);
  if (!o) notFound();
  const cur = o.currency as Currency;
  const f = (n: unknown) => formatAmount(Number(n), cur);
  const url = `${process.env.SITE_URL || ''}/order/${o.id}`;
  const [qr, bar] = await Promise.all([qrSvg(url || o.no), Promise.resolve(barcodeSvg(o.no))]);
  const day = (d: Date | null) => d?.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const addr = o.address as Record<string, string>;
  return (
    <div className="receipt">
      <div className="top"><div><div className="kicker">{s.store.name} · {t('Receipt')}</div><h2>{t('Thank you, {x}.', { x: o.name.split(' ')[0] })}</h2></div><div className="num" style={{ textAlign: 'right' }}>{o.no}<br /><small>{o.createdAt.toLocaleString('en-US')}</small></div></div>
      <div className="body">
        <div className="codes"><div className="qr" dangerouslySetInnerHTML={{ __html: qr }} /><div className="bar" dangerouslySetInnerHTML={{ __html: bar }} /></div>
        <div className="kv">
          <div><span>{t('Order number')}</span>{o.no}</div><div><span>{t('Order ID')}</span>{o.id}</div>
          <div><span>{t('Payment')}</span>{o.payMethod === 'cod' ? t('Cash on delivery') : o.payMethod.toUpperCase()} · {t(o.payStatus === 'paid' ? 'Paid' : o.payStatus === 'cod' ? 'Pay on delivery' : 'Awaiting payment')}</div>
          <div><span>{t('Arrives')}</span>{day(o.etaFrom)} – {day(o.etaTo)}</div>
          <div><span>{t('Courier')}</span>{o.courier}{o.trackingNo && ` · ${o.trackingNo}`}</div>
          <div><span>{t('Deliver to')}</span>{addr.address}{addr.city && `, ${addr.city}`} {addr.zip}, {o.country}</div>
        </div>
        {o.payMethod !== 'cod' && (o.payStatus === 'pending' || o.payStatus === 'failed') && <div className="paynow"><p>{t(o.payStatus === 'failed' ? 'The payment did not go through.' : 'This order is waiting for payment.')}</p><a className="btn brass" href={`/api/pay/start?o=${o.id}`}>{t('Pay {x} now', { x: f(o.total) })}</a></div>}
        <div className="tear" />
        {o.lines.map(l => <div className="sum-row" key={l.id}><span>{l.qty} × {l.name}</span><span>{f(Number(l.full) * l.qty)}</span></div>)}
        {Number(o.saved) > 0 && <div className="sum-row"><span>{t('Offers')}</span><span>−{f(o.saved)}</span></div>}
        <div className="sum-row"><span>{t('Delivery')}</span><span>{Number(o.shipping) ? f(o.shipping) : t('Free')}</span></div>
        {Number(o.creditUsed) > 0 && <div className="sum-row"><span>{t('Store credit')}</span><span>−{f(o.creditUsed)}</span></div>}
        <div className="sum-row total"><span>{t('Total')}</span><span>{f(o.total)}</span></div>
        {Number(o.saved) > 0 && <div className="saved"><span>{t('You saved')}</span><b>{f(o.saved)}</b></div>}
        {Number(o.rewardEarned) > 0 && <p className="earn">{t('You earn {x} in store credit when this arrives.', { x: f(o.rewardEarned) })}</p>}
        <div className="tear" />
        <h3>{t('Tracking')}</h3>
        <Timeline status={o.status} events={o.events as { at: string; step: number; note: string }[]} rider={o.status >= 5 && o.riderPhone ? { name: o.riderName, phone: o.riderPhone } : null} t={t} />
        <p className="muted" style={{ fontSize: '.85rem' }}>{t('A copy was emailed to {x}. Keep this page; it updates as the courier moves your order.', { x: o.email })}</p>
      </div>
    </div>
  );
}

export default function OrderPage({ params }: PageProps<'/[lang]/order/[id]'>) {
  return <div className="wrap view"><Suspense fallback={<div style={{ minHeight: '70vh' }} />}><Receipt params={params} /></Suspense></div>;
}
