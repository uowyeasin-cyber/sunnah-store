'use client';
import { useState, useTransition } from 'react';
import { findOrder } from '@/app/actions';
import { useStore } from './StoreProvider';

export default function TrackForm() {
  const { t } = useStore();
  const [err, setErr] = useState('');
  const [busy, go] = useTransition();
  return <form action={fd => go(async () => { const r = await findOrder(fd); setErr(r?.error ?? ''); })} style={{ display: 'grid', gap: 14 }}>
    <div className="field"><label htmlFor="no">{t('Order number')}</label><input id="no" name="no" placeholder="PM-…" required /></div>
    <div className="field"><label htmlFor="em">{t('Email used at checkout')}</label><input id="em" name="email" type="email" autoComplete="email" required /></div>
    {err && <p className="muted" role="alert">{t(err)}</p>}
    <button className="btn" disabled={busy}>{t(busy ? 'Finding…' : 'Track order')}</button>
  </form>;
}
