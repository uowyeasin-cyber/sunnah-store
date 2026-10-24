'use client';
import { useState } from 'react';

export default function CopyLink({ url }: { url: string }) {
  const [ok, setOk] = useState(false);
  return <div className="copylink"><input readOnly value={url} onFocus={e => e.target.select()} aria-label="Tracked link" />
    <button type="button" className="btn sm" onClick={async () => { try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 1800); } catch {} }}>{ok ? 'Copied' : 'Copy'}</button></div>;
}
