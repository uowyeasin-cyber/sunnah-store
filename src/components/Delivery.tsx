'use client';
import { useSyncExternalStore } from 'react';
import { useStore } from './StoreProvider';

const noop = () => () => {};
const today = () => Math.floor(Date.now() / 864e5) * 864e5;
type Row = { label: string; days: [number, number] };

// Estimated arrival dates per destination, counted from today in the visitor's language.
export default function Delivery({ rows, pre }: { rows: Row[]; pre: string }) {
  const { t, lang } = useStore();
  // Today's date, read only in the browser so the cached page never shows a stale day.
  const now = useSyncExternalStore(noop, today, () => 0);
  const fmt = (d: number) => new Date((now || 0) + d * 864e5).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  return <div className="deliv"><div className="label">{t('Estimated delivery')}</div>
    {pre ? <p>{t(pre)}</p> : <ul>{rows.map(r => <li key={r.label}><span>{t(r.label)}</span><b className="num">{now ? `${fmt(r.days[0])} – ${fmt(r.days[1])}` : `${r.days[0]}–${r.days[1]} ${t('days')}`}</b></li>)}</ul>}
  </div>;
}
