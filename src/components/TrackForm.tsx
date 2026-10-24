'use client';
import { useState, useTransition } from 'react';
import { findOrder } from '@/app/actions';

export default function TrackForm() {
  const [err, setErr] = useState('');
  const [busy, go] = useTransition();
  return <form action={fd => go(async () => { const r = await findOrder(fd); setErr(r?.error ?? ''); })} style={{ display: 'grid', gap: 14 }}>
    <div className="field"><label htmlFor="no">Order number</label><input id="no" name="no" placeholder="PM-…" required /></div>
    <div className="field"><label htmlFor="em">Email used at checkout</label><input id="em" name="email" type="email" autoComplete="email" required /></div>
    {err && <p className="muted" role="alert">{err}</p>}
    <button className="btn" disabled={busy}>{busy ? 'Finding…' : 'Track order'}</button>
  </form>;
}
