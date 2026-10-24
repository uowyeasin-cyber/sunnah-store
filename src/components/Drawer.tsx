'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { unitCents } from '@/lib/money';
import { confirmCode, logout, requestCode } from '@/app/actions';
import Art from './Art';
import Price from './Price';
import { useStore } from './StoreProvider';

export default function Drawer() {
  const s = useStore();
  const close = () => s.open(null);
  const lines = s.bag.map(l => ({ ...l, p: s.products[l.slug] }));
  const total = lines.reduce((a, l) => a + unitCents(l.p.priceCents, l.p.offer?.pct || 0) * l.qty, 0);
  return (
    <>
      <div className={`scrim ${s.drawer ? 'open' : ''}`} onClick={close} />
      <aside className={`drawer ${s.drawer ? 'open' : ''}`} aria-label="Bag and account" aria-hidden={!s.drawer}>
        <div className="head"><h2>{s.t(s.drawer === 'wish' ? 'Wishlist' : s.drawer === 'account' ? 'Account' : 'Your bag')}</h2><button className="icon-btn" onClick={close} aria-label={s.t('Close')}>✕</button></div>
        {s.drawer === 'bag' && (lines.length ? <>
          <div className="items">{lines.map(l => (
            <div className="line-item" key={l.slug}>
              <div className="thumb"><Art p={l.p} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div>{l.p.name}</div><div className="muted" style={{ fontSize: '.82rem' }}>{l.p.sub}</div>
                <div className="qty" style={{ marginTop: 6 }}><button onClick={() => s.setQty(l.slug, l.qty - 1)} aria-label={s.t('One less')}>−</button><span>{l.qty}</span><button onClick={() => s.setQty(l.slug, l.qty + 1)} aria-label={s.t('One more')}>+</button></div></div>
              <div className="num"><Price cents={l.p.priceCents * l.qty} pct={l.p.offer?.pct} /></div>
            </div>))}
          </div>
          <div className="sum-row total"><span>{s.t('Total')}</span><span>{s.price(total)}</span></div>
          <Link className="btn" href="/checkout" onClick={close}>{s.t('Checkout')}</Link>
        </> : <div className="empty"><h2>{s.t('Your bag is empty')}</h2><p>{s.t('Add something you love.')}</p></div>)}
        {s.drawer === 'wish' && (s.wish.length ? <div className="items">{s.wish.map(slug => { const p = s.products[slug]; return (
          <div className="line-item" key={slug}><div className="thumb"><Art p={p} /></div>
            <div style={{ flex: 1 }}><Link href={`/p/${slug}`} onClick={close}>{p.name}</Link><div className="muted" style={{ fontSize: '.82rem' }}>{p.sub}</div></div>
            <button className="btn sm" onClick={() => { s.toggleWish(slug); s.add(slug); s.open('bag'); }}>{s.t('Move to bag')}</button></div>); })}</div>
          : <div className="empty"><h2>{s.t('No saved pieces')}</h2><p>{s.t('Tap the heart on any product.')}</p></div>)}
        {s.drawer === 'account' && <Account email={s.me?.email || null} />}
      </aside>
      <div className={`toast ${s.message ? 'show' : ''}`} role="status">{s.message}</div>
    </>
  );
}

function Account({ email }: { email: string | null }) {
  const router = useRouter();
  const { open, refreshMe, t } = useStore();
  const [to, setTo] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (email) return <div className="items"><p>{t('Signed in as {x}', { x: email })}</p><Link className="btn ghost" href="/track" onClick={() => open(null)}>{t('Your orders and credit')}</Link>
    <button className="btn ghost" onClick={async () => { await logout(); refreshMe(); router.refresh(); }}>{t('Sign out')}</button></div>;
  return (
    <form className="items" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setErr('');
      if (step === 'email') { const r = await requestCode(to); if ('error' in r && r.error) setErr(r.error); else setStep('code'); }
      else { const r = await confirmCode(to, code); if ('error' in r && r.error) setErr(r.error); else { open(null); refreshMe(); if (r.admin) router.push('/admin'); } }
      setBusy(false);
    }}>
      <p className="muted">{t('No password. We email you a six-digit code.')}</p>
      {step === 'email'
        ? <div className="field"><label htmlFor="em">{t('Email')}</label><input id="em" type="email" required autoComplete="email" value={to} onChange={e => setTo(e.target.value)} /></div>
        : <div className="field"><label htmlFor="cd">{t('Code sent to {x}', { x: to })}</label><input id="cd" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></div>}
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{t(step === 'email' ? 'Send code' : 'Sign in')}</button>
    </form>
  );
}
