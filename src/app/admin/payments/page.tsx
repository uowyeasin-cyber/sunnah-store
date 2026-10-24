import { adminOrNull } from '@/lib/auth';
import { getSettings } from '@/lib/catalog';
import { gatewayReady } from '@/lib/pay';
import { loadKeys } from '@/lib/keys';
import { savePayments } from '../actions';

const WHERE = [['all', 'Every country'], ['Bangladesh', 'Bangladesh'], ['Malaysia', 'Malaysia'], ['United States', 'United States'], ['other', 'Other countries']];
const GATEWAYS = [['card', 'Card, Apple Pay, Google Pay (Stripe)'], ['paypal', 'PayPal checkout'], ['sslcommerz', 'bKash, Nagad, cards in Bangladesh (SSLCommerz)']];

export default async function Payments() {
  if (!(await adminOrNull())) return null;
  const s = await getSettings();
  await loadKeys(true);
  return <>
    <div><div className="kicker">Admin</div><h2 style={{ fontSize: '2rem' }}>Payments</h2></div>
    <form className="panel" action={savePayments}>
      <h3>Pay by hand</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>Works today, no merchant account needed. Tick a method and write your number or bank details. The customer sends the money, types the transaction ID, and you mark the order paid in Orders. Cash on delivery is always on.</p>
      {s.manualPay.map((m, i) => <div key={m.id} className="panel" style={{ padding: 16 }}>
        <input type="hidden" name="id" value={m.id} />
        <div className="two"><div className="field"><label>Name customers see</label><input name="label" defaultValue={m.label} /></div>
          <div className="field"><label>Show in</label><select name="where" defaultValue={m.where}>{WHERE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
        <div className="field"><label>Your number or account details</label><textarea name="details" rows={2} defaultValue={m.details} placeholder="e.g. 017XXXXXXXX (Personal), use your order number as reference" /></div>
        <label style={{ fontSize: '.85rem' }}><input type="checkbox" name={`on-${i}`} defaultChecked={m.on} /> Show at checkout</label>
      </div>)}
      <button className="btn">Save payments</button>
    </form>
    <div className="panel">
      <h3>Automatic gateways</h3>
      <p className="muted" style={{ fontSize: '.88rem' }}>These turn on by themselves once their keys are saved in <a href="/admin/connections">Connections</a>.</p>
      <ul>{GATEWAYS.map(([id, l]) => <li key={id}>{gatewayReady(id) ? '✅' : '⚪'} {l}</li>)}</ul>
    </div>
  </>;
}
