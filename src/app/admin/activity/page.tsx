import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';

// Every admin change, newest first: who, when, which area and what.
export default async function Activity() {
  if (!(await adminOrNull('activity'))) return null;
  const list = await db.adminLog.findMany({ orderBy: { at: 'desc' }, take: 300 });
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Activity log</h2></div>
    <p className="muted" style={{ fontSize: '.88rem' }}>Each save, delete, refund or booking in the admin panel is recorded here with the person who did it. Only owners see this page.</p>
    <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Area</th><th>Action</th></tr></thead><tbody>
      {list.map(l => <tr key={l.id}><td style={{ whiteSpace: 'nowrap' }}>{l.at.toISOString().replace('T', ' ').slice(0, 16)} UTC</td><td>{l.email}</td><td>{l.area}</td><td>{l.action.replace(/([A-Z])/g, ' $1').toLowerCase()}{l.detail && <div className="muted" style={{ fontSize: '.78rem' }}>{l.detail}</div>}</td></tr>)}
      {!list.length && <tr><td colSpan={4} className="muted">Nothing recorded yet.</td></tr>}
    </tbody></table></div></div>
  </>;
}
