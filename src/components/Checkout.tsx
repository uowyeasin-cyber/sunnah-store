'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { checkout, checkoutQuote } from '@/app/actions';
import { COUNTRIES } from '@/lib/shipping';
import { formatAmount, type Currency } from '@/lib/money';
import Art from './Art';
import { useStore } from './StoreProvider';

type Q = Awaited<ReturnType<typeof checkoutQuote>>;
const FIELDS = ['name', 'email', 'phone', 'country', 'address', 'city', 'zip'] as const;
type Form = Record<(typeof FIELDS)[number], string>;
const guessCountry = () => { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; return tz === 'Asia/Dhaka' ? 'Bangladesh' : tz === 'Asia/Kuala_Lumpur' ? 'Malaysia' : tz.startsWith('America/') ? 'United States' : ''; };

export default function Checkout() {
  const s = useStore();
  const router = useRouter();
  const [f, setF] = useState<Form>({ name: '', email: '', phone: '', country: '', address: '', city: '', zip: '' });
  const [pay, setPay] = useState('cod');
  const [useCredit, setUseCredit] = useState(true);
  const [q, setQ] = useState<Q | null>(null);
  const [err, setErr] = useState('');
  const [busy, start] = useTransition();
  const lines = s.bag;
  const key = JSON.stringify(lines);

  // Autofill: saved details on this device, then the signed-in account, then a guess from the time zone.
  useEffect(() => {
    let saved: Partial<Form> = {}; try { saved = JSON.parse(localStorage.getItem('pm-details') || '{}'); } catch {}
    setF(x => ({ ...x, country: guessCountry(), ...saved }));
  }, []);
  useEffect(() => {
    if (!lines.length || !f.country) { setQ(null); return; }
    let live = true;
    checkoutQuote({ lines, country: f.country, useCredit }).then(r => {
      if (!live) return; setQ(r);
      if (!r.pay.some(m => m.id === pay)) setPay(r.pay[0].id);
      if (r.me) { const a = (r.me.address || {}) as Record<string, string>; setF(x => ({ ...x, email: x.email || r.me!.email || '', name: x.name || r.me!.name, phone: x.phone || r.me!.phone || '', address: x.address || a.address || '', city: x.city || a.city || '', zip: x.zip || a.zip || '' })); }
    });
    return () => { live = false; };
  }, [key, f.country, useCredit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lines.length) return <div className="empty"><h2>Your bag is empty</h2><p>Add something you love, then come back.</p></div>;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const money = (n: number) => formatAmount(n, (q?.cur || 'USD') as Currency);
  return (
    <form className="co" onSubmit={e => {
      e.preventDefault(); setErr('');
      start(async () => {
        try { localStorage.setItem('pm-details', JSON.stringify(f)); } catch {}
        const r = await checkout({ lines, ...f, pay, useCredit });
        if ('error' in r && r.error) { setErr(r.error); return; }
        lines.forEach(l => s.setQty(l.slug, 0));
        const o = r as { id: string; pay: boolean };
        if (o.pay) location.assign(`/api/pay/start?o=${o.id}`); else router.push(`/order/${o.id}`);
      });
    }}>
      <div className="panel">
        <div className="kicker">{s.t('Checkout')}</div><h2>{s.t('Delivery details')}</h2>
        <p className="muted" style={{ fontSize: '.9rem' }}>{s.t('No account needed. Your email becomes your account, so you can track the order and use store credit later.')}</p>
        <div className="two"><div className="field"><label htmlFor="n">{s.t('Full name')}</label><input id="n" autoComplete="name" required value={f.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="t">{s.t('Phone')}</label><input id="t" type="tel" autoComplete="tel" required value={f.phone} onChange={set('phone')} /></div></div>
        <div className="field"><label htmlFor="e">{s.t('Email')}</label><input id="e" type="email" autoComplete="email" required value={f.email} onChange={set('email')} /></div>
        <div className="field"><label htmlFor="c">{s.t('Country')}</label><select id="c" autoComplete="country-name" required value={f.country} onChange={set('country')}><option value="">{s.t('Choose…')}</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="a">{s.t('Address')}</label><input id="a" autoComplete="street-address" required value={f.address} onChange={set('address')} /></div>
        <div className="two"><div className="field"><label htmlFor="ci">{s.t('City')}</label><input id="ci" autoComplete="address-level2" value={f.city} onChange={set('city')} /></div>
          <div className="field"><label htmlFor="z">{s.t('Postcode')}</label><input id="z" autoComplete="postal-code" value={f.zip} onChange={set('zip')} /></div></div>
        {q && <><h3>{s.t('Payment')}</h3><div className="pays">{q.pay.map(m => <label key={m.id} className="pay"><input type="radio" name="pay" value={m.id} checked={pay === m.id} onChange={() => setPay(m.id)} /><span>{s.t(m.label)}<small>{s.t(m.note)}</small></span></label>)}</div>
          {pay !== 'cod' && <p className="muted" style={{ fontSize: '.85rem' }}>{s.t('Online payment opens after you place the order.')}</p>}</>}
      </div>
      <div className="panel">
        <h3>{s.t('Your order')}</h3>
        {lines.map(l => { const p = s.products[l.slug]; return <div className="line-item" key={l.slug}><div className="thumb"><Art p={p} /></div><div style={{ flex: 1 }}>{p.name}<div className="muted" style={{ fontSize: '.8rem' }}>{p.sub} · ×{l.qty}</div></div></div>; })}
        {q ? <>
          <div className="sum-row"><span>{s.t('Items')}</span><span>{money(q.subtotal)}</span></div>
          <div className="sum-row"><span>{s.t('Delivery')} · {q.courier}</span><span>{q.shipping ? money(q.shipping) : s.t('Free')}</span></div>
          {q.available > 0 && <label className="toggle"><span>{s.t('Use store credit ({x} available)', { x: money(q.available) })}</span><input type="checkbox" checked={useCredit} onChange={e => setUseCredit(e.target.checked)} /></label>}
          {q.credit > 0 && <div className="sum-row"><span>{s.t('Store credit')}</span><span>−{money(q.credit)}</span></div>}
          <div className="sum-row total"><span>{s.t('Total')}</span><span>{money(q.total)}</span></div>
          {q.saved > 0 && <div className="saved"><span>{s.t('You save')}</span><b>{money(q.saved)}</b></div>}
          {q.reward > 0 && <p className="earn">{s.t('You earn {x} in store credit when this order is delivered.', { x: money(q.reward) })}</p>}
          <p className="muted" style={{ fontSize: '.85rem' }}>{s.t('Arrives in {a}–{b} days.', { a: q.days[0], b: q.days[1] })}</p>
        </> : <p className="muted">{s.t('Choose your country to see delivery and total.')}</p>}
        {err && <p className="err">{s.t(err)}</p>}
        <button className="btn" disabled={busy || !q}>{s.t(busy ? 'Placing order…' : 'Place order')}</button>
      </div>
    </form>
  );
}
