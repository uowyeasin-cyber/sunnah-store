import { adminOrNull } from '@/lib/auth';
import { getLicenses } from '@/lib/licenses';
import { LocalTime } from '../LocalTime';
import { createKey, saveDemoRules, saveSite } from './actions';

const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';

export default async function Licenses() {
  if (!(await adminOrNull('licenses'))) return null;
  const l = await getLicenses();
  const trials = l.sites.filter(s => !s.key), keys = l.sites.filter(s => s.key);
  return <>
    <div><h2 style={{ fontSize: '2rem' }}>App licenses</h2>
      <p className="muted">Copies of this store you sell. A downloaded copy runs as a free demo, then locks until you allow it here or give the client a license key.</p></div>

    <form className="panel" action={saveDemoRules}>
      <h3>Free demo rules (for new downloads)</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>A demo session is one visit; a new one starts after 30 minutes without use. The demo ends at whichever limit comes first.</p>
      <div className="two">
        <div className="field"><label>Demo sessions allowed</label><input type="number" name="opens" min={0} defaultValue={l.opens} /></div>
        <div className="field"><label>Demo days allowed</label><input type="number" name="days" min={0} defaultValue={l.days} /></div>
      </div>
      <div className="field"><label>Download file link</label><input name="download" defaultValue={l.download} /></div>
      <p className="muted" style={{ fontSize: '.88rem' }}>Public download page to share: <a href="/get-app" target="_blank">{site()}/get-app</a></p>
      <div><button className="btn">Save demo rules</button></div>
    </form>

    <form className="panel" action={createKey}>
      <h3>Make a license key (after the client pays)</h3>
      <div className="two">
        <div className="field"><label>Client name or note</label><input name="note" placeholder="e.g. Rahim Traders, paid 5,000 tk" /></div>
        <div className="field"><label>Client web address (optional, locks the key to it)</label><input name="host" placeholder="clientshop.com" /></div>
      </div>
      <p className="muted" style={{ fontSize: '.88rem' }}>The client puts the key in Vercel as <code>LICENSE_KEY</code> and redeploys. Or simply set their demo below to “Allowed”.</p>
      <div><button className="btn">Make key</button></div>
    </form>

    <Table title="License keys" rows={keys} />
    <Table title="Demo copies (downloads)" rows={trials} />
  </>;
}

function Table({ title, rows }: { title: string; rows: Awaited<ReturnType<typeof getLicenses>>['sites'] }) {
  return <div className="panel"><h3>{title} ({rows.length})</h3>
    {!rows.length ? <p className="muted">None yet.</p> : <div className="tbl-wrap"><table>
      <thead><tr><th>Web address / key</th><th>Status</th><th className="num">Sessions used / allowed</th><th className="num">Days allowed</th><th>Last seen</th><th>Note</th><th></th></tr></thead>
      <tbody>{rows.map(s => <tr key={s.id}><td colSpan={7} style={{ padding: 0 }}>
        <form action={saveSite} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr .8fr 1fr 1.2fr auto', gap: 8, alignItems: 'center', padding: '8px 10px' }}>
          <input type="hidden" name="id" value={s.id} />
          <div>{s.key ? <><code style={{ fontSize: '.8rem' }}>{s.key}</code><input name="host" defaultValue={s.host} placeholder="any address (first use)" /></> : <b>{s.host}</b>}</div>
          <select name="status" defaultValue={s.status}><option value="trial">Demo</option><option value="active">Allowed</option><option value="blocked">Blocked</option></select>
          <div className="num">{s.key ? '—' : <>{s.opens} / <input type="number" name="maxOpens" min={0} defaultValue={s.maxOpens} style={{ width: 70 }} /></>}</div>
          <div className="num">{s.key ? '—' : <input type="number" name="maxDays" min={0} defaultValue={s.maxDays} style={{ width: 60 }} />}</div>
          <div>{s.last ? <LocalTime iso={s.last} /> : 'never'}</div>
          <input name="note" defaultValue={s.note} placeholder="note" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn">Save</button>
            {!s.key && <button className="btn ghost" name="reset" value="1">Restart demo</button>}
            <button className="btn ghost" name="delete" value="1">Delete</button>
          </div>
        </form>
      </td></tr>)}</tbody></table></div>}
  </div>;
}
