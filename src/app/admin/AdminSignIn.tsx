'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { confirmCode, requestCode } from '@/app/actions';

export default function AdminSignIn() {
  const router = useRouter();
  const [to, setTo] = useState(''), [code, setCode] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState('');
  return (
    <form style={{ display: 'grid', gap: 14 }} onSubmit={async e => {
      e.preventDefault(); setErr('');
      const r = sent ? await confirmCode(to, code) : await requestCode(to);
      if ('error' in r && r.error) setErr(r.error); else if (!sent) setSent(true); else router.refresh();
    }}>
      {!sent ? <div className="field"><label htmlFor="ae">Admin email</label><input id="ae" type="email" required value={to} onChange={e => setTo(e.target.value)} /></div>
        : <div className="field"><label htmlFor="ac">Code sent to {to}</label><input id="ac" inputMode="numeric" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} /></div>}
      {err && <p className="err">{err}</p>}
      <button className="btn">{sent ? 'Sign in' : 'Send code'}</button>
    </form>
  );
}
