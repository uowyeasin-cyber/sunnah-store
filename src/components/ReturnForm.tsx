'use client';
import { useState, useTransition } from 'react';
import { requestReturn } from '@/app/accountActions';
import { useStore } from './StoreProvider';

export default function ReturnForm({ orderId, reasons }: { orderId: string; reasons: string[] }) {
  const { t } = useStore();
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  if (done) return <p className="earn">{t('Return requested. We will email you within 2 working days.')}</p>;
  return (
    <details className="return-form"><summary className="btn ghost sm">{t('Request a return')}</summary>
      <form style={{ display: 'grid', gap: 10, marginTop: 12 }} action={fd => start(async () => { const r = await requestReturn(fd); if ('error' in r && r.error) setMsg(r.error); else setDone(true); })}>
        <input type="hidden" name="orderId" value={orderId} />
        <div className="field"><label>{t('Reason')}</label><select name="reason" required defaultValue="">{[<option key="" value="" disabled>{t('Choose one')}</option>, ...reasons.map(r => <option key={r} value={r}>{t(r)}</option>)]}</select></div>
        <div className="field"><label>{t('Tell us more (optional)')}</label><textarea name="note" rows={3} maxLength={1000} /></div>
        {msg && <p className="err">{t(msg)}</p>}
        <button className="btn sm" disabled={busy}>{t(busy ? 'Sending…' : 'Send request')}</button>
      </form>
    </details>
  );
}
