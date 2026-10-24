'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Shows the pop-up ad once per visit, after the delay set in admin.
export default function AdPopup({ id, delay, style, children }: { id: string; delay: number; style: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    let seen = false; try { seen = sessionStorage.getItem('pm-popup') === id; } catch {}
    if (seen || path.startsWith('/checkout') || path.startsWith('/admin')) return;
    const t = setTimeout(() => { setOpen(true); try { sessionStorage.setItem('pm-popup', id); } catch {} navigator.sendBeacon?.('/api/ads/view', JSON.stringify({ ids: [id] })); }, delay * 1000);
    return () => clearTimeout(t);
  }, [id, delay, path]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  return (
    <div className={`ad-pop ${open ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).closest('a, [data-close]')) setOpen(false); }}>
      <div className={`pop-card ad-${style}`} role="dialog" aria-modal="true" aria-hidden={!open}>
        <button className="icon-btn pop-x" data-close aria-label="Close">✕</button>
        {children}
      </div>
    </div>
  );
}
