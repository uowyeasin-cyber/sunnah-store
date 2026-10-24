'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CURRENCIES, type Currency } from '@/lib/money';
import { LANGS } from '@/lib/i18n';
import type { NavItem } from '@/lib/settings';
import { useStore } from './StoreProvider';

const href = (n: NavItem) => (n.to === 'all' ? '/shop' : n.to === 'track' ? '/track' : n.to.startsWith('cat:') ? `/c/${n.to.slice(4)}` : n.to);

export default function Header({ name, nav, ticker }: { name: string; nav: NavItem[]; ticker: { id: string; title: string; href: string | null }[] }) {
  const { bag, wish, cur, setCur, open, me, lang, t } = useStore();
  const isAdmin = !!me?.admin;
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const count = bag.reduce((a, l) => a + l.qty, 0);
  const links = nav.filter(n => n.show);

  useEffect(() => {
    const nav = document.querySelector('.nav');
    const on = () => nav?.classList.toggle('compact', scrollY > 40);
    on(); addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setMenu(false); setQ(new URLSearchParams(location.search).get('q') || ''); }, [path]);
  useEffect(() => { document.body.classList.toggle('menu-open', menu); }, [menu]);

  const langSelect = (cls: string) => <select className={cls} aria-label={t('Language')} value={lang} onChange={e => { document.cookie = `pm-lang=${e.target.value};path=/;max-age=31536000;samesite=lax`; location.assign(location.pathname.replace(/^\/(en|bn|ar|hi)(?=\/|$)/, '') + location.search || '/'); }}>
              {Object.entries(LANGS).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}
            </select>;
  const row = [...ticker, ...ticker, ...ticker, ...ticker];
  return (
    <>
      <header className="nav">
        <div className="wrap top">
          <div className="left">
            <button className="menu-btn" aria-label={t('Open menu')} onClick={() => setMenu(true)}><i /><i /><span>{t('Menu')}</span></button>
            <form className="search" role="search" onSubmit={e => { e.preventDefault(); router.push(`/shop?q=${encodeURIComponent(q)}`); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input type="search" placeholder={t('Search')} aria-label={t('Search products')} value={q} onChange={e => setQ(e.target.value)} />
            </form>
          </div>
          <Link className="logo" href="/"><span>{name}</span></Link>
          <div className="tools">
            {langSelect('cur lang')}
            <select className="cur" aria-label={t('Currency')} value={cur} onChange={e => setCur(e.target.value as Currency)}>
              {Object.entries(CURRENCIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
            <button className="icon-btn" aria-label={t('Account')} onClick={() => open('account')}><svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" /></svg></button>
            <button className="icon-btn" aria-label={t('Wishlist')} onClick={() => open('wish')}><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>{wish.length > 0 && <span className="badge">{wish.length}</span>}</button>
            <button className="icon-btn" id="bagBtn" aria-label={t('Bag')} onClick={() => open('bag')}><svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>{count > 0 && <span key={count} className="badge pop">{count}</span>}</button>
          </div>
        </div>
        <div className="wrap catbar"><nav className="links" aria-label="Categories">
          {links.map(n => <Link key={n.label + n.to} href={href(n)} className={path === href(n) ? 'on' : ''}>{n.label}</Link>)}
          {isAdmin && <Link href="/admin" className="admin-link">{t('Admin')}</Link>}
        </nav></div>
      </header>
      {ticker.length > 0 && <div className="marquee ad-ticker"><div className="mq-track">
        {row.map((t, i) => <span key={i}><span>{t.href ? <Link className="tk-link" href={t.href}>{t.title}</Link> : t.title}</span><i aria-hidden="true"> ✦ </i></span>)}
      </div></div>}
      <aside className="menu-panel" aria-label="Menu" aria-hidden={!menu}>
        <div className="m-head"><span className="kicker">{t('Menu')}</span><button className="icon-btn" aria-label={t('Close menu')} onClick={() => setMenu(false)}>✕</button></div>
        <nav className="m-links">{links.map((n, i) => <Link key={n.label + n.to} href={href(n)} style={{ transitionDelay: `${120 + i * 60}ms` }}>{n.label}<span aria-hidden="true">→</span></Link>)}</nav>
        <div className="m-foot"><button className="link-btn" onClick={() => { setMenu(false); open('account'); }}>{t('Account')}</button><Link href="/track">{t('Track order')}</Link>{langSelect('cur m-lang')}</div>
      </aside>
      <div className={`scrim ${menu ? 'open' : ''}`} onClick={() => setMenu(false)} />
    </>
  );
}
