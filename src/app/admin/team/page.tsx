import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { ROLES, roleOf } from '@/lib/roles';
import { saveTeam } from '../actions';

export default async function Team() {
  if (!(await adminOrNull('team'))) return null;
  const { admins, roles } = await getSettings();
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
  </>;
}
