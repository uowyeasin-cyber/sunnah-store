'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';

type Turn = { role: 'user' | 'assistant'; content: string };

// Floating "Ask us" chat. Shows only when the shop has switched the assistant on (Admin → Connections).
export default function ChatWidget() {
  const { t, lang, cur } = useStore();
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { fetch('/api/assistant').then(r => r.json()).then(r => setOn(!!r.on)).catch(() => {}); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [turns, busy]);
  if (!on) return null;
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: q }];
    setTurns(next); setText(''); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, lang, cur }) }).then(r => r.json());
      if (r.text) setTurns([...next, { role: 'assistant', content: r.text }]); else setErr(r.error || t('Something went wrong. Please try again.'));
    } catch { setErr(t('Something went wrong. Please try again.')); }
    setBusy(false);
  }
  return <>
    {!open && <button className="chat-fab" onClick={() => setOpen(true)} aria-label={t('Ask us anything')}>{t('Ask us')}</button>}
    {open && <section className="chat-box" aria-label={t('Shop assistant')}>
      <div className="chat-head"><b>{t('Shop assistant')}</b><button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('Close')}>✕</button></div>
      <div className="chat-log" aria-live="polite">
        <p className="chat-msg bot">{t('Hi! Ask me about our products, shipping, or your order. For an order, have your order number and email ready.')}</p>
        {turns.map((m, i) => <p key={i} className={`chat-msg ${m.role === 'user' ? 'me' : 'bot'}`}>{m.role === 'user' ? m.content : linkify(m.content)}</p>)}
        {busy && <p className="chat-msg bot muted">{t('Typing…')}</p>}
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <div ref={end} />
      </div>
      <form className="chat-form" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} maxLength={1500} placeholder={t('Type your question')} aria-label={t('Type your question')} /><button className="btn sm" disabled={busy || !text.trim()}>{t('Send')}</button></form>
      <p className="muted chat-note">{t('AI assistant. It can make mistakes; your order page is always right.')}</p>
    </section>}
  </>;
}

// Links in the assistant's reply become tappable; everything else stays plain text.
const linkify = (s: string) => s.split(/(https?:\/\/[^\s)"'<>]*[^\s)"'<>.,!?])/g).map((part, i) => (i % 2 ? <a key={i} href={part} target={part.startsWith(location.origin) ? undefined : '_blank'} rel="noreferrer">{part.replace(/^https?:\/\//, '')}</a> : part));
