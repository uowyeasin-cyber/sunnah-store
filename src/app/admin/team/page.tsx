import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { ROLES, alertsOn, roleOf } from '@/lib/roles';
import { saveTeam } from '../actions';
import { setAlerts } from '../shellActions';

export default async function Team() {
  const me = await adminOrNull('team');
  if (!me) return null;
  const { admins, roles, alertsOff } = await getSettings();
  const mine = (me.email || '').toLowerCase();
  // Same for every admin: everyone sees and can switch everyone's alerts.
  const alertRows = admins.filter(Boolean);
  const rows = [...admins.filter(Boolean), ...Array(10).fill('')].slice(0, 10);
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>Admin team</h2></div>
    <form className="panel" action={saveTeam}>
      <p className="muted" style={{ fontSize: '.88rem' }}>Up to ten people. They sign in with a code sent to this email and see only the parts of the admin their role opens. There is no admin link anywhere in the store. Emails also listed in the Vercel setting SEED_ADMIN_EMAILS come back as owners on each deploy.</p>
      {rows.map((e, i) => <div className="two" key={i}>
        <div className="field"><label>Email {i + 1}</label><input type="email" name="admin" defaultValue={e} placeholder="name@example.com" /></div>
        <div className="field"><label>Role</label><select name="role" defaultValue={e ? roleOf(e, roles) : 'orders'}>{Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></div>
      </div>)}
      <div><button className="btn">Save team</button></div>
    </form>
    <div className="panel">
      <h3>Email alerts</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>Store alert emails: customer wants the seller, daily summary, low stock, reminders and automation notices. They go to owners whose switch is on. Turning it off changes nothing else: the person keeps the same admin access. Every admin sees everyone here and can switch anyone on or off.</p>
      {alertRows.map(e => { const on = alertsOn(e, alertsOff); return <form key={e} action={setAlerts} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid var(--line, #e5e7eb)' }}>
        <span>{e}{e.toLowerCase() === mine ? ' (you)' : ''}{roleOf(e, roles) !== 'owner' ? <span className="muted"> · gets no alerts in this role</span> : null}</span>
        <input type="hidden" name="email" value={e} /><input type="hidden" name="on" value={on ? '0' : '1'} />
        <button className={on ? 'btn' : 'btn ghost'} aria-pressed={on}>{on ? 'On' : 'Off'}</button>
      </form>; })}
    </div>
  </>;
}
