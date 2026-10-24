'use client';
import { useEffect, useState } from 'react';

// Tick-all box and the bar that appears once orders are ticked.
export function TickAll() {
  return <input type="checkbox" aria-label="Tick all" onChange={e => {
    e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name=ids]').forEach(b => { b.checked = e.currentTarget.checked; });
    e.currentTarget.form?.dispatchEvent(new Event('change', { bubbles: true }));
  }} />;
}

export function BulkBar({ steps }: { steps: string[] }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = document.getElementById('ord-form') as HTMLFormElement | null;
    const count = () => setN(f?.querySelectorAll('input[name=ids]:checked').length || 0);
    f?.addEventListener('change', count);
    return () => f?.removeEventListener('change', count);
  }, []);
  return <div className={`ord-bulk${n ? ' on' : ''}`}>
    <b>{n} selected</b>
    <button className="btn sm" name="act" value="paid">Mark paid</button>
    <button className="btn ghost sm" name="act" value="book">Send to courier</button>
    <select name="act-step" aria-label="Move to step" defaultValue="" onChange={e => { const b = e.currentTarget.form?.querySelector<HTMLButtonElement>('button[data-step]'); if (b && e.currentTarget.value) { b.value = 'step-' + e.currentTarget.value; b.click(); } }}>
      <option value="">Move to step…</option>{steps.map((s, i) => <option key={s} value={i}>{s}</option>)}
    </select><button hidden data-step name="act" value="" />
    <button type="button" className="btn ghost sm" onClick={() => {
      const ids = [...document.querySelectorAll<HTMLInputElement>('#ord-form input[name=ids]:checked')].map(b => b.value);
      location.href = '/admin/orders/export?ids=' + ids.join(',');
    }}>Export CSV</button>
  </div>;
}
