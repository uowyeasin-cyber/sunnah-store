'use client';
import { useEffect, useState } from 'react';

// Countdown on the short link page. The button opens /api/s/<code>, which counts the click and redirects.
export default function ShortWait({ code, wait, t }: { code: string; wait: number; t: { note: string; wait: string; go: string } }) {
  const [left, setLeft] = useState(wait);
  useEffect(() => {
    try { if (!sessionStorage.getItem('pm-sl-' + code)) { sessionStorage.setItem('pm-sl-' + code, '1'); navigator.sendBeacon?.(`/api/s/${code}`); } } catch {}
    if (wait <= 0) return;
    const id = setInterval(() => setLeft(n => (n <= 1 ? (clearInterval(id), 0) : n - 1)), 1000);
    return () => clearInterval(id);
  }, [code, wait]);
  return (
    <div style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
      <p className="muted">{t.note}</p>
      {left > 0 && <><div className="sl-count" aria-live="polite">{left}</div><small className="muted">{t.wait.replace('{n}', String(left))}</small></>}
      <a className="btn brass" href={`/api/s/${code}`} rel="nofollow" aria-disabled={left > 0}>{t.go} <span aria-hidden="true">→</span></a>
    </div>
  );
}
