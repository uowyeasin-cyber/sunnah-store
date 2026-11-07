import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getAutomation } from '@/lib/automation';
import { JOBS, MODE_LABEL } from '@/lib/automationJobs';
import { decide, emergencyStop, runNow, saveJobs } from '../automationActions';

const when = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

// Automation Control Center: master switch, emergency stop, each job's mode, approvals and the run log.
export default async function Automation() {
  if (!(await adminOrNull('automation'))) return null;
  const a = await getAutomation();
  const [runs, tasks, done] = await Promise.all([
    db.automationRun.findMany({ orderBy: { at: 'desc' }, take: 60 }),
    db.automationTask.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 100 }),
    db.automationTask.findMany({ where: { status: { not: 'pending' } }, orderBy: { decidedAt: 'desc' }, take: 20 }),
  ]);
  const name = (id: string) => JOBS.find(j => j.id === id)?.name || id;
  const last = (id: string) => runs.find(r => r.job === id);
  const live = a.master && !a.stopped;
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Automation</h2></div>
    <p className="muted" style={{ fontSize: '.88rem' }}>Jobs that run by themselves once a day (06:00 UTC) and when orders come in. Each one is Off, Ask me first (it lists what it wants to do below and waits for you) or Automatic. A job that fails 3 runs in a row pauses itself and emails the owners.</p>

    <div className="panel" style={{ borderColor: a.stopped ? '#b3261e' : undefined }}>
      <form action={emergencyStop} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b>{a.stopped ? 'Emergency stop is ON' : live ? 'Automations are running' : 'Master switch is off'}</b>
          <div className="muted" style={{ fontSize: '.85rem' }}>{a.stopped ? `Stopped by ${a.stoppedBy} at ${a.stoppedAt.replace('T', ' ').slice(0, 16)} UTC. Nothing runs, not even Run now, until you start them again.` : 'The emergency stop halts every job at once, whatever each one is set to.'}</div>
        </div>
        {a.stopped ? <button className="btn" name="stop" value="no">Start automations again</button> : <button className="btn" name="stop" value="yes" style={{ background: '#b3261e', borderColor: '#b3261e', color: '#fff' }}>Emergency stop</button>}
      </form>
    </div>

    <form key={JSON.stringify(a)} action={saveJobs} className="panel" style={{ display: 'grid', gap: 14 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="master" defaultChecked={a.master} /> <b>Master switch</b> <span className="muted" style={{ fontSize: '.85rem' }}>(off means no job runs)</span></label>
      <div className="tbl-wrap"><table><thead><tr><th>Job</th><th>Mode</th><th>Last run</th></tr></thead><tbody>
        {JOBS.map(j => { const r = last(j.id), s = a.jobs[j.id]; return <tr key={j.id}>
          <td style={{ minWidth: 220 }}><b>{j.name}</b>{s.paused && <span className="status hidden" style={{ marginLeft: 6 }}>paused</span>}<div className="muted" style={{ fontSize: '.8rem' }}>{j.does}</div></td>
          <td><select name={`mode-${j.id}`} defaultValue={s.mode} aria-label={`${j.name} mode`}>{j.modes.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select></td>
          <td style={{ fontSize: '.82rem', minWidth: 180 }}>{r ? <><span className={`status ${r.status === 'ok' ? 'live' : 'hidden'}`}>{r.status}</span> {when(r.at)}<div className="muted">{r.summary}</div></> : <span className="muted">Not run yet</span>}</td>
        </tr>; })}
      </tbody></table></div>
      <div className="field" style={{ maxWidth: 260 }}><label htmlFor="ls">Low-stock level (units per warehouse)</label><input id="ls" name="lowStockAt" type="number" min="0" max="1000" defaultValue={a.lowStockAt} /></div>
      <div><button className="btn">Save automation settings</button></div>
    </form>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Run a job now</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{JOBS.map(j => <form key={j.id} action={runNow}><input type="hidden" name="job" value={j.id} /><button className="btn ghost sm" disabled={!live}>{j.name}</button></form>)}</div>
      {!live && <p className="muted" style={{ fontSize: '.82rem', marginBottom: 0 }}>Turn the master switch on and clear the emergency stop to run jobs.</p>}
    </div>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Waiting for your approval ({tasks.length})</h3>
      <div className="tbl-wrap"><table><tbody>
        {tasks.map(t => <tr key={t.id}><td>{t.label}<div className="muted" style={{ fontSize: '.78rem' }}>{name(t.job)} · {when(t.createdAt)} · <Link href={`/admin/orders/${t.ref}`}>open order</Link></div></td>
          <td><form action={decide} style={{ display: 'flex', gap: 6 }}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="label" value={t.label} /><button className="btn sm" name="to" value="approve">Approve</button><button className="btn ghost sm" name="to" value="reject">Reject</button></form></td></tr>)}
        {!tasks.length && <tr><td className="muted">Nothing waiting. Set a job to Ask me first to review its work here.</td></tr>}
        {done.map(t => <tr key={t.id}><td className="muted" style={{ fontSize: '.82rem' }}>{t.label}<br />{t.status} by {t.decidedBy}{t.decidedAt ? ` · ${when(t.decidedAt)}` : ''}{t.result ? ` · ${t.result}` : ''}</td><td /></tr>)}
      </tbody></table></div>
    </div>

    <div className="panel"><h3 style={{ marginTop: 0 }}>Run log</h3>
      <div className="tbl-wrap"><table><thead><tr><th>When</th><th>Job</th><th>How</th><th>Result</th></tr></thead><tbody>
        {runs.map(r => <tr key={r.id}><td style={{ whiteSpace: 'nowrap' }}>{when(r.at)}</td><td>{name(r.job)}</td><td>{r.trigger}</td><td><span className={`status ${r.status === 'ok' ? 'live' : 'hidden'}`}>{r.status}</span> {r.summary} <span className="muted">({(r.ms / 1000).toFixed(1)} s)</span></td></tr>)}
        {!runs.length && <tr><td colSpan={4} className="muted">No runs yet.</td></tr>}
      </tbody></table></div>
    </div>
  </>;
}
