import Link from 'next/link';
import { Suspense } from 'react';
import { db } from '@/lib/db';
import { currentCustomer } from '@/lib/auth';
import { formatAmount, type Currency } from '@/lib/money';
import { STEPS } from '@/lib/tracking';
import { getDict, getSettings } from '@/lib/catalog';
import { shareCfg } from '@/lib/promo';
import ShareEarn from '@/components/ShareEarn';
import { isLang, makeT, type Lang } from '@/lib/i18n';
import Reorder from '@/components/Reorder';
import ProfileForm from '@/components/ProfileForm';
import OpenAccount from '@/components/OpenAccount';

export const metadata = { title: 'Your account', robots: { index: false } };

async function Body({ lang }: { lang: Lang }) {
  const [c, dict] = await Promise.all([currentCustomer(), getDict(lang)]);
  const t = makeT(dict);
  if (!c) return <section className="panel"><h2>{t('Your account')}</h2><p className="muted">{t('Sign in with your email to see your orders, store credit and saved address.')}</p><OpenAccount label={t('Sign in')} /></section>;
  const [orders, ledger, returns] = await Promise.all([
    db.order.findMany({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' }, take: 50, include: { lines: { include: { product: { select: { slug: true } } } } } }),
    db.creditEntry.findMany({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    db.returnRequest.findMany({ where: { order: { customerId: c.id } }, orderBy: { createdAt: 'desc' }, take: 20, include: { order: { select: { no: true, id: true } } } }),
  ]);
  const cur = c.currency as Currency;
  const a = (c.address || {}) as Record<string, string>;
  const day = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return <>
    <section className="panel"><div className="kicker">{t('Your account')}</div><h2 style={{ margin: 0 }}>{c.name || c.email}</h2><p className="muted" style={{ margin: 0 }}>{c.email}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        <div><div className="kicker">{t('Orders')}</div><h3 style={{ margin: '4px 0 0' }}>{orders.length}</h3></div>
        <div><div className="kicker">{t('Store credit')}</div><h3 style={{ margin: '4px 0 0' }}>{formatAmount(Number(c.credit), cur)}</h3></div>
      </div>
    </section>
    <section className="panel"><div className="kicker">{t('Your orders')}</div>
      {orders.length ? orders.map(o => <div key={o.id} style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="sum-row"><Link href={`/order/${o.id}`}>{o.no}</Link><span>{t(STEPS[o.status])}</span><span>{formatAmount(Number(o.total), o.currency as Currency)}</span></div>
        <small className="muted">{day(o.createdAt)} · {o.lines.map(l => `${l.qty}× ${l.name}`).join(', ')}</small>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className="btn ghost sm" href={`/order/${o.id}`}>{t('Receipt and tracking')}</Link>
          <Reorder lines={o.lines.flatMap(l => (l.product ? [{ slug: l.product.slug, qty: l.qty }] : []))} /></div>
      </div>) : <p className="muted">{t('No orders yet.')} <Link href="/shop">{t('Start shopping')}</Link></p>}
    </section>
    {returns.length > 0 && <section className="panel"><div className="kicker">{t('Returns')}</div>
      {returns.map(r => <div className="sum-row" key={r.id}><Link href={`/order/${r.order.id}`}>{r.order.no}</Link><span>{t(r.reason)}</span><span>{t(r.status === 'pending' ? 'Waiting' : r.status === 'approved' ? 'Approved' : 'Declined')}</span></div>)}
    </section>}
    <section className="panel"><div className="kicker">{t('Store credit')}</div><h3 style={{ margin: 0 }}>{formatAmount(Number(c.credit), cur)}</h3>
      {ledger.length ? ledger.map(e => <div className="sum-row" key={e.id}><span>{t(e.note)}<br /><small className="muted">{day(e.createdAt)}</small></span><span>{Number(e.amount) > 0 ? '+' : '−'}{formatAmount(Math.abs(Number(e.amount)), cur)}</span></div>) : <p className="muted">{t('Credit from rewards and refunds shows here.')}</p>}
    </section>
    {shareCfg((await getSettings()).share).on && <section className="panel"><div className="kicker">{t('Share and earn')}</div>
      {await (async () => { const r = await db.order.groupBy({ by: ['status'], where: { referrer: c.id, payStatus: { notIn: ['failed', 'refunded', 'cancelled'] } }, _count: true, _sum: { refReward: true } });
        const done = r.filter(x => x.status === 6), wait = r.filter(x => x.status !== 6);
        const n = (rows: typeof r) => rows.reduce((a, x) => a + x._count, 0);
        return <p className="muted" style={{ margin: 0 }}>{t('Friends who bought with your link: {n}', { n: n(r) })}{n(wait) > 0 && <> · {t('{n} waiting for delivery', { n: n(wait) })}</>}{n(done) > 0 && <> · {t('{n} paid as store credit', { n: n(done) })}</>}</p>; })()}
      <ShareEarn title={t('Have a look at this shop')} path="/" />
    </section>}
    <section className="panel"><div className="kicker">{t('Saved address')}</div><p className="muted" style={{ margin: 0, fontSize: '.88rem' }}>{t('Checkout fills this in for you.')}</p>
      <ProfileForm p={{ name: c.name, country: c.country, address: a.address || '', city: a.city || '', zip: a.zip || '', state: a.state || '' }} />
    </section>
  </>;
}

export default async function Account({ params }: PageProps<'/[lang]/account'>) {
  const { lang: l } = await params;
  const lang: Lang = isLang(l) ? l : 'en';
  return <div className="wrap view" style={{ display: 'grid', gap: 24, maxWidth: 720, margin: '48px auto' }}><Suspense fallback={<div style={{ minHeight: '60vh' }} />}><Body lang={lang} /></Suspense></div>;
}
