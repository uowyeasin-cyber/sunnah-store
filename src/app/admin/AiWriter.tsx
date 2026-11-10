'use client';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { aiWriteProduct } from './aiWriteActions';

const LANGS = ['English', 'Bangla', 'Arabic', 'Hindi', 'Malay'];
const QUICK = ['Premium and short', 'Warm, for a gift', 'Highlight the Sunnah benefit', 'SEO friendly with key points', 'Fix grammar only'];

// Sits inside the product form: reads the name, short line and description, asks the AI and writes the answer back.
export default function AiWriter({ ready }: { ready: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [instruction, setInstruction] = useState('');
  const [lang, setLang] = useState('English');
  const [keep, setKeep] = useState(true);
  const [msg, setMsg] = useState('');
  const [undo, setUndo] = useState<Record<string, string> | null>(null);
  const [busy, start] = useTransition();
  const field = (n: string) => box.current?.closest('form')?.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null;
  const read = () => ({ name: field('name')?.value || '', sub: field('sub')?.value || '', details: field('details')?.value || '' });
  const write = (d: Record<string, string>) => { for (const [k, v] of Object.entries(d)) { const f = field(k); if (f) f.value = v; } };
  const go = () => start(async () => {
    setMsg('');
    const before = read();
    const r = await aiWriteProduct({ ...before, instruction, lang, keep });
    if ('error' in r) { setMsg(r.error); return; }
    setUndo(before); write(r); setMsg('Written into the form below. Check it, then press Save product.');
  });
  return <div ref={box} className="panel" style={{ background: 'var(--cloth)', display: 'grid', gap: 10 }}>
    <b>✨ Write with AI</b>
    {!ready ? <p className="muted sm" style={{ margin: 0 }}>Connect a free AI in <Link className="link" href="/admin/aitools">AI tools &amp; chatbot</Link> first.</p> : <>
      <div className="field" style={{ margin: 0 }}><label htmlFor="ai-ins">What should it write? (optional)</label>
        <textarea id="ai-ins" rows={2} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="e.g. Premium tone, short, mention it fits a shirt pocket and holds attar" maxLength={600} /></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{QUICK.map(q => <button key={q} type="button" className="btn ghost sm" onClick={() => setInstruction(q)}>{q}</button>)}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select aria-label="Language" value={lang} onChange={e => setLang(e.target.value)}>{LANGS.map(l => <option key={l}>{l}</option>)}</select>
        <label className="sm" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} /> Keep the name</label>
        <button type="button" className="btn sm orange" onClick={go} disabled={busy}>{busy ? 'Writing…' : '✨ Write it'}</button>
        {undo && !busy && <button type="button" className="btn ghost sm" onClick={() => { write(undo); setUndo(null); setMsg('Put back as it was.'); }}>Undo</button>}
      </div>
      {msg && <p className="sm" style={{ margin: 0 }} role="status">{msg}</p>}
    </>}
  </div>;
}
