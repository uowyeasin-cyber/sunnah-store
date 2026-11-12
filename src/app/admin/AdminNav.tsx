'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { FIRST, ICONS, NAV } from './nav';
import { adminSignOut, setAlerts } from './shellActions';

export const Icon = ({ name }: { name: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name] || ICONS.grid} /></svg>;

type Props = { areas: string[]; store: { name: string; mono: string; logo: string }; email: string; alerts: boolean; badges: Record<string, number>; children: React.ReactNode };

export default function AdminShell({ areas, store, email, alerts, badges, children }: Props) {
  const path = usePathname(), here = path.split('/')[2] || '';
  const [open, setOpen] = useState(false);
  const items = NAV.map(g => ({ ...g, items: g.items.filter(i => areas.includes(i.area)) })).filter(g => g.items.length);
  const item = NAV.flatMap(g => g.items).find(i => i.area === here || i.also?.some(([a]) => a === here));
  const tabs = item?.also ? [[item.area, FIRST[item.area] || item.label] as [string, string], ...item.also].filter(([a]) => areas.includes(a)) : [];
  const brand = <><span className="mk">{store.logo ? <img src={store.logo} alt="" /> : store.mono || store.name.slice(0, 2)}</span><span><b>{store.name}</b><small>Admin console</small></span></>;
  return <div className={`adm${open ? ' open' : ''}`}>
    <div className="adm-top"><button type="button" aria-label="Open menu" onClick={() => setOpen(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button><b>{store.name} admin</b></div>
    <aside className="adm-side" onClick={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).closest('a')) setOpen(false); }}>
      <Link href="/admin/dashboard" className="adm-brand">{brand}</Link>
      <nav className="adm-nav" aria-label="Admin">{items.map(g => <div key={g.title}><h6>{g.title}</h6>
        {g.items.map(i => { const on = i.area === here || !!i.also?.some(([a]) => a === here); return <Link key={i.area} href={`/admin/${i.area}`} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}><Icon name={i.icon} />{i.label}{badges[i.area] ? <span className="n">{badges[i.area]}</span> : null}</Link>; })}
      </div>)}</nav>
      <div className="adm-me"><div className="who"><span className="av">{email.slice(0, 1).toUpperCase()}</span><span>{email}</span></div>
        <div className="acts"><a href="/" target="_blank">↗ View store</a><form action={adminSignOut}><button>⎋ Sign out</button></form></div>
        <form action={setAlerts} className="alerts"><input type="hidden" name="on" value={alerts ? '0' : '1'} /><button role="switch" aria-checked={alerts} aria-label="Email alerts" className={alerts ? 'on' : ''}>
          <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{alerts ? <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /> : <path d="M8.7 3A6 6 0 0 1 18 8a21 21 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0M2 2l20 20" />}</svg></span>
          <span className="tx"><b>Email alerts</b><small>{alerts ? 'On · emails to you' : 'Off · no store emails'}</small></span>
          <span className="sw" aria-hidden="true" /></button></form></div>
    </aside>
    <main className="adm-main"><div className="adm-body">
      {tabs.length > 1 && <nav className="adm-sub">{tabs.map(([a, l]) => <Link key={a} href={`/admin/${a}`} className={a === here ? 'on' : ''}>{l}</Link>)}</nav>}
      {children}
    </div></main>
  </div>;
}
