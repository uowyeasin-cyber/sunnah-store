'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { useStore } from './StoreProvider';

const KEY = 'pm-cookie-ok';
const sub = (cb: () => void) => { addEventListener('pm-cookie', cb); return () => removeEventListener('pm-cookie', cb); };
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };

// A one-time note about the shop's own cookies. Nothing to accept or refuse: there are no ad trackers.
// With ad networks on (Admin → Earn money) the note says ad partners may set cookies too.
export default function CookieNote({ ads = false }: { ads?: boolean }) {
  const { t } = useStore();
  const ok = useSyncExternalStore(sub, seen, () => true);
  if (ok) return null;
  return <div className="cookie-note" role="region" aria-label={t('Cookies')}>
    <p>{ads ? t('We use cookies for your bag and sign-in. Our ad partners may also use cookies to show ads.') : t('We use only the cookies the shop needs, like your bag and sign-in. No ad trackers.')} <Link href="/privacy">{t('Privacy')}</Link></p>
    <button className="btn sm" onClick={() => { try { localStorage.setItem(KEY, '1'); } catch {} dispatchEvent(new Event('pm-cookie')); }}>{t('OK')}</button>
  </div>;
}
