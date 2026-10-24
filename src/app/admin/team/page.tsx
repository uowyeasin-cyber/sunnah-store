import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { saveTeam } from '../actions';

export default async function Team() {
  if (!(await adminOrNull())) return null;
  const { admins } = await getSettings();
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Admin team</h2></div>
    <form className="panel" action={saveTeam}>
      <p className="muted" style={{ fontSize: '.88rem' }}>Up to five people. They sign in with a code sent to this email and the admin panel opens for them. There is no admin link anywhere in the store.</p>
      {[0, 1, 2, 3, 4].map(i => <div className="field" key={i}><label>Admin {i + 1}{i === 0 ? ' (owner)' : ''}</label><input type="email" name="admin" defaultValue={admins[i] || ''} placeholder="name@yourdomain.com" /></div>)}
      <div><button className="btn">Save team</button></div>
    </form>
  </>;
}
