import Link from 'next/link';
import { Suspense } from 'react';
import { currentCustomer, isAdminEmail } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import AdminSignIn from './AdminSignIn';
import AdminNav from './AdminNav';
import Html from '@/components/Html';
import '../globals.css';

export const metadata = { title: 'Admin', robots: { index: false } };

async function Gate({ children }: { children: React.ReactNode }) {
  const [me, s] = await Promise.all([currentCustomer(), getSettings()]);
  if (!me?.email || !(await isAdminEmail(me.email))) return (
    <div className="wrap"><div className="gate panel" style={{ maxWidth: 480, margin: '80px auto' }}>
      <div className="kicker">Staff sign in</div><h2>{s.store.name} admin</h2>
      <p className="muted">Only the admin emails set in the admin team can open this page.</p>
      {me?.email && <p className="err">{me.email} is not an admin email.</p>}
      <AdminSignIn />
    </div></div>
  );
  return (
    <div className="wrap"><div className="admin">
      <AdminNav />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>{children}</div>
    </div></div>
  );
}

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Html lang="en">
      <header className="nav"><div className="wrap top"><div className="left"><Link href="/" className="link-arrow">← Store</Link></div><Link className="logo" href="/admin"><span>Admin</span></Link><div className="tools" /></div></header>
      <main><Suspense fallback={<div className="wrap" style={{ padding: 60 }}>Loading…</div>}><Gate>{children}</Gate></Suspense></main>
    </Html>
  );
}
