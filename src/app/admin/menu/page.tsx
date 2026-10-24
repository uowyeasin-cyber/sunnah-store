import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { saveMenu } from '../actions';

export default async function Menu() {
  if (!(await adminOrNull())) return null;
  const [s, cats] = await Promise.all([getSettings(), db.category.findMany({ orderBy: { sort: 'asc' } })]);
  const targets = [['all', 'Shop all products'], ...cats.map(c => [`cat:${c.slug}`, `Category: ${c.name}`]), ['track', 'Track order page']];
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Menu bar</h2></div>
    <form className="panel" action={saveMenu}>
      <p className="muted" style={{ fontSize: '.88rem' }}>These links show under the logo, in this order.</p>
      <div className="tbl-wrap"><table><thead><tr><th>Label</th><th>Opens</th><th>Show</th><th></th><th>Delete</th></tr></thead><tbody>
        {s.nav.map((n, i) => <tr key={i}><td><input name="label" defaultValue={n.label} style={{ maxWidth: 200 }} /></td>
          <td><select name="to" defaultValue={n.to}>{targets.map(([v, l]) => <option key={v} value={v}>{l}</option>)}{!targets.some(t => t[0] === n.to) && <option value={n.to}>{n.to}</option>}</select></td>
          <td><input type="checkbox" name={`show-${i}`} defaultChecked={n.show} /></td><td>{i > 0 && <button className="btn ghost sm" name="up" value={i}>↑</button>}</td><td><input type="checkbox" name={`del-${i}`} /></td></tr>)}
      </tbody></table></div>
      <div className="row2"><button className="btn">Save menu</button><button className="btn ghost" name="add" value="1">Add a link</button></div>
    </form>
  </>;
}
