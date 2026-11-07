'use client';
import { useState, useTransition } from 'react';
import { saveProfile } from '@/app/accountActions';
import { useStore } from './StoreProvider';

type P = { name: string; country: string; address: string; city: string; zip: string; state: string };
export default function ProfileForm({ p }: { p: P }) {
  const { t } = useStore();
  const [msg, setMsg] = useState('');
  const [busy, start] = useTransition();
  const f = (k: keyof P, label: string, max = 200) => <div className="field"><label>{t(label)}</label><input name={k} defaultValue={p[k]} maxLength={max} /></div>;
  return (
    <form style={{ display: 'grid', gap: 12 }} action={fd => start(async () => { const r = await saveProfile(fd); setMsg('error' in r && r.error ? r.error : 'Saved.'); })}>
      {f('name', 'Full name', 80)}
      {f('address', 'Address')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>{f('city', 'City', 80)}{f('state', 'State', 40)}{f('zip', 'Postcode', 20)}{f('country', 'Country code', 2)}</div>
      {msg && <p className="muted" style={{ fontSize: '.85rem' }}>{t(msg)}</p>}
      <button className="btn sm" disabled={busy}>{t('Save address')}</button>
    </form>
  );
}
