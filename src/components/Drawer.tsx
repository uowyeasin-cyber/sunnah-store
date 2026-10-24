'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  const chosen = lines.filter(l => !l.off);
  const total = chosen.reduce((a, l) => a + unitCents(l.p.priceCents, l.p.offer?.pct || 0) * l.qty, 0);
  return (
    <>
      <div className={`scrim ${s.drawer ? 'open' : ''}`} onClick={close} />
      <aside className={`drawer ${s.drawer ? 'open' : ''}`} aria-label="Bag and account" aria-hidden={!s.drawer}>
        <div className="head"><h2>{s.t(s.drawer === 'wish' ? 'Wishlist' : s.drawer === 'account' ? 'Account' : 'Your bag')}</h2><button className="icon-btn" onClick={close} aria-label={s.t('Close')}>✕</button></div>
        {s.drawer === 'bag' && (lines.length ? <>
          <div className="items">{lines.map(l => (
            <div className={`line-item ${l.off ? 'off' : ''}`} key={l.slug}>
              <input type="checkbox" className="pick" checked={!l.off} onChange={e => s.pick(l.slug, e.target.checked)} aria-label={s.t('Buy {x} now', { x: l.p.name })} />
              <div className="thumb"><Art p={l.p} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div>{l.p.name}</div><div className="muted" style={{ fontSize: '.82rem' }}>{l.p.sub}</div>
                <div className="qty" style={{ marginTop: 6 }}><button onClick={() => s.setQty(l.slug, l.qty - 1)} aria-label={s.t('One less')}>−</button><span>{l.qty}</span><button onClick={() => s.setQty(l.slug, l.qty + 1)} aria-label={s.t('One more')}>+</button></div></div>
              <div className="num"><Price cents={l.p.priceCents * l.qty} pct={l.p.offer?.pct} /></div>
            </div>))}
          </div>
          {lines.length > 1 && <p className="muted" style={{ fontSize: '.8rem', margin: 0 }}>{s.t('Tick the items to order now. The rest stay in your bag.')}</p>}
          <div className="sum-row total"><span>{s.t('Total')} ({chosen.reduce((a, l) => a + l.qty, 0)})</span><span>{s.price(total)}</span></div>
          {chosen.length ? <Link className="btn" href="/checkout" onClick={close}>{s.t('Checkout')}</Link> : <button className="btn" disabled>{s.t('Tick an item to check out')}</button>}
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
  const path = usePathname();
  if (email) return <div className="items"><p>{t('Signed in as {x}', { x: email })}</p><Link className="btn ghost" href="/track" onClick={() => open(null)}>{t('Your orders and credit')}</Link>
    <button className="btn ghost" onClick={async () => { await logout(); refreshMe(); router.refresh(); }}>{t('Sign out')}</button></div>;
  return (
    <form className="items" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setErr('');
      if (step === 'email') { const r = await requestCode(to); if ('error' in r && r.error) setErr(r.error); else setStep('code'); }
      else { const r = await confirmCode(to, code); if ('error' in r && r.error) setErr(r.error); else { open(null); refreshMe(); if ('admin' in r && r.admin) router.push('/admin'); } }
      setBusy(false);
    }}>
      {step === 'email' && process.env.NEXT_PUBLIC_GOOGLE_ON && <><a className="btn ghost google" href={`/api/auth/google?next=${encodeURIComponent(path)}`}><GoogleG />{t('Continue with Google')}</a><p className="or">{t('or')}</p></>}
      <p className="muted">{t('No password. We email you a six-digit code.')}</p>
      {step === 'email'
        ? <div className="field"><label htmlFor="em">{t('Email')}</label><input id="em" type="email" required autoComplete="email" value={to} onChange={e => setTo(e.target.value)} /></div>
        : <div className="field"><label htmlFor="cd">{t('Code sent to {x}', { x: to })}</label><input id="cd" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></div>}
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy}>{t(step === 'email' ? 'Send code' : 'Sign in')}</button>
    </form>
  );
}

export const GoogleG = () => <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.3 5.7c4.3-4 7-9.9 7-17.2z"/><path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>;
