import { Suspense } from 'react';
import { currentCustomer, isAdminEmail } from '@/lib/auth';
import { ROLES, alertsOn, roleOf } from '@/lib/roles';
import { getSettings } from '@/lib/catalog';
import { todos } from '@/lib/decisions';
import { db } from '@/lib/db';
import AdminSignIn from './AdminSignIn';
import AdminShell from './AdminNav';
import BlobUploads from '@/components/BlobUploads';
import Html from '@/components/Html';
import '../globals.css';
import './admin.css';
import '@/components/badges.css';

export const metadata = { title: 'Admin', robots: { index: false } };
const FONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap';

async function Gate({ children }: { children: React.ReactNode }) {
  const [me, s] = await Promise.all([currentCustomer(), getSettings()]);
  if (!me?.email || !(await isAdminEmail(me.email))) return (
    <div className="adm" style={{ display: 'block' }}><div className="panel" style={{ maxWidth: 440, margin: '80px auto' }}>
      <div className="kicker">Staff sign in</div><h2>{s.store.name} admin</h2>
      <p className="muted">Only the admin emails set in Admins can open this page.</p>
      {me?.email && <p className="err">{me.email} is not an admin email.</p>}
      <AdminSignIn />
    </div></div>
  );
  const areas = [...ROLES[roleOf(me.email, s.roles)].areas];
  const waiting = areas.includes('decisions') ? (await todos().catch(() => [])).reduce((a, t) => a + t.n, 0) : 0;
  const chats = areas.includes('chats') ? await db.chatThread.count({ where: { closed: false, OR: [{ needsHuman: true }, { unread: { gt: 0 }, aiPaused: true }] } }).catch(() => 0) : 0;
  return <AdminShell areas={areas} store={{ name: s.store.name, mono: s.store.mono, logo: s.store.logo }} email={me.email} alerts={alertsOn(me.email, s.alertsOff)} badges={{ decisions: waiting, chats }}>
    <BlobUploads />{children}
  </AdminShell>;
}

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Html lang="en">
      <link rel="stylesheet" href={FONT} precedence="default" />
      <Suspense fallback={<div style={{ padding: 60 }}>Loading…</div>}><Gate>{children}</Gate></Suspense>
    </Html>
  );
}
