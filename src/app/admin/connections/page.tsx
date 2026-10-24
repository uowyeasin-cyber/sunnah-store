import { adminOrNull } from '@/lib/auth';
import { connected, keyHint, loadKeys, MODE_LABEL, SERVICES, key } from '@/lib/keys';
import { getSettings } from '@/lib/catalog';
import { gatewayReady } from '@/lib/pay';
import { payMethodsFor, REGIONS } from '@/lib/shipping';
import { saveConnections } from '../actions';

const COUNTRY = { BD: 'Bangladesh', MY: 'Malaysia', US: 'United States', INTL: 'Other' } as const;

export default async function Connections() {
  if (!(await adminOrNull())) return null;
  await loadKeys(true);
  const st = await getSettings();
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Connections</h2></div>
    <p className="muted" style={{ maxWidth: 680 }}>Paste the keys from each merchant account here. A service turns on by itself as soon as its keys are saved: payment methods appear at checkout, couriers book and track parcels. Saved keys are never shown again; leave a box empty to keep what is saved.</p>
    <form action={saveConnections} style={{ display: 'grid', gap: 18 }}>
      <h3>By country</h3>
      <div className="two">{REGIONS.map(r => {
        const c = COUNTRY[r.id];
        const pays = [...payMethodsFor(c).map(m => ({ label: m.label, on: m.id === 'cod' ? st.regions[r.id].cod : gatewayReady(m.id) })),
          ...st.manualPay.filter(m => m.where === 'all' || m.where === c || (m.where === 'other' && r.id === 'INTL')).map(m => ({ label: m.label + ' (by hand)', on: m.on && !!m.details.trim() }))];
        return <div key={r.id} className="panel">
          <b>{r.name}</b>
          <div className="field"><label htmlFor={`courier-${r.id}`}>Courier for new orders</label>
            <select id={`courier-${r.id}`} name={`courier-${r.id}`} defaultValue={st.regions[r.id].courier}>{[...new Set([st.regions[r.id].courier, ...r.couriers])].map(x => <option key={x}>{x}</option>)}</select></div>
          <label style={{ fontSize: '.85rem' }}><input type="checkbox" name={`cod-${r.id}`} defaultChecked={st.regions[r.id].cod} /> Offer cash on delivery</label>
          <div className="label" style={{ marginTop: 12 }}>Payment at checkout</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.88rem' }}>{pays.map(x => <li key={x.label}>{x.on ? '✅' : '⚪'} {x.label}</li>)}</ul>
        </div>;
      })}</div>
      <p className="muted" style={{ fontSize: '.85rem' }}>⚪ means not on yet: connect its account below, or for “by hand” methods add your number in <a href="/admin/payments">Payments</a>.</p>
      {(['Payments', 'Couriers'] as const).map(g => <div key={g} style={{ display: 'grid', gap: 14 }}>
        <h3>{g}</h3>
        {SERVICES.filter(s => s.group === g).map(s => <div key={s.id} className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <b>{connected(s) ? '✅' : '⚪'} {s.name}</b>
            <a className="muted" href={s.signup} target="_blank" rel="noreferrer" style={{ fontSize: '.85rem' }}>Open {s.name} account ↗</a>
          </div>
          <p className="muted" style={{ fontSize: '.88rem' }}>{s.does}</p>
          <div className="two">{s.fields.map(([env, label, kind]) => <div key={env} className="field">
            <label htmlFor={env}>{label}</label>
            {Array.isArray(kind)
              ? <select id={env} name={env} defaultValue={key(env)}>{kind.map(v => <option key={v} value={v}>{MODE_LABEL[v]}</option>)}</select>
              : <input id={env} name={env} type={kind === 'secret' ? 'password' : 'text'} autoComplete="off" placeholder={keyHint(env) || 'Not set'} />}
          </div>)}</div>
          {s.fields.some(([e, , k]) => !Array.isArray(k) && keyHint(e).startsWith('saved')) && <label style={{ fontSize: '.85rem' }}><input type="checkbox" name="clear" value={s.id} /> Disconnect (delete saved keys)</label>}
        </div>)}
      </div>)}
      <div className="panel"><h3>Other couriers</h3><p className="muted" style={{ fontSize: '.88rem' }}>Pathao, RedX, DHL, FedEx, Aramex, UPS, USPS, J&amp;T and Pos Malaysia: book the parcel in the courier&apos;s own app, then put the courier and tracking number on the order. With Ship24 connected the customer gets live tracking. Direct booking for a courier can be added once you have its merchant account.</p></div>
      <button className="btn">Save connections</button>
    </form>
  </>;
}
