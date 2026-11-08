import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { tips, todos } from '@/lib/decisions';
import Tips from '../dashboard/Tips';

export default async function Decisions() {
  if (!(await adminOrNull('decisions'))) return null;
  const [list, ideas] = await Promise.all([todos(), tips()]);
  return <>
    <div className="page-head"><div><h2>Today&apos;s decisions</h2><p>Everything that needs you, in one place. The system does the rest on its own.</p></div></div>
    {list.length ? <div className="panel"><h3>Waiting for you ({list.reduce((a, t) => a + t.n, 0)})</h3><div className="rows">{list.map(t =>
      <div key={t.id}><span className="tag orange">{t.n}</span><div className="grow"><b>{t.title}</b><p>{t.text}</p></div><Link className="btn sm" href={t.href}>{t.cta}</Link></div>)}</div></div>
      : <div className="ok-box"><span className="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg></span><div><h3>All done for today</h3><p>Nothing needs you. Orders, reminders and replies keep running automatically.</p></div></div>}
    <div className="grid2">
      <Tips list={ideas} />
      <div className="panel"><h3>Let the system do more on its own</h3><p className="muted" style={{ margin: 0 }}>Courier booking, tracking updates, low-stock alerts, unpaid order release and the daily summary run by themselves.</p><p className="muted sm" style={{ margin: 0 }}>You choose what runs alone and what asks you first in <Link className="link" href="/admin/automation">Automation</Link>.</p></div>
    </div>
  </>;
}
