'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './StoreProvider';

type Msg = { id: string; role: 'user' | 'ai' | 'admin' | 'system'; text: string; at: string };
const KEY = 'pm-chat';

// Floating chat. The AI answers day and night from the real catalog and orders; "Contact the seller"
// hands the chat to a person, whose replies appear here (checked every few seconds while open).
export default function ChatWidget() {
  const { t, lang, cur } = useStore();
  const [info, setInfo] = useState<{ on: boolean; ai: boolean; name: string; greeting: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [id, setId] = useState(() => { try { return typeof window === 'undefined' ? '' : localStorage.getItem(KEY) || ''; } catch { return ''; } });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [seller, setSeller] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const merge = useCallback((list: Msg[]) => setMsgs(m => { const seen = new Set(m.map(x => x.id)); return [...m, ...list.filter(x => !seen.has(x.id))]; }), []);
  const pull = useCallback(async (tid: string, after = '') => {
    const r = await fetch(`/api/assistant?t=${tid}${after ? `&after=${encodeURIComponent(after)}` : ''}`).then(r => r.json()).catch(() => null);
    if (!r) return;
    setInfo({ on: r.on, ai: r.ai, name: r.name, greeting: r.greeting }); setSeller(!!r.seller);
    if (r.messages?.length) merge(r.messages);
  }, [merge]);

  useEffect(() => {
    const h = setTimeout(() => pull(id), 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pull]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy]);
  useEffect(() => { const o = () => setOpen(true); addEventListener('pm-chat-open', o); return () => removeEventListener('pm-chat-open', o); }, []);
  // While open, look for the seller's replies.
  const last = msgs[msgs.length - 1]?.at || '';
  useEffect(() => {
    if (!open || !id) return;
    const iv = setInterval(() => pull(id, last), seller ? 4000 : 8000);
    return () => clearInterval(iv);
  }, [open, id, last, seller, pull]);
  if (!info?.on) return null;

  async function post(body: { text?: string; seller?: boolean }) {
    setBusy(true); setErr('');
    try {
      const country = (() => { try { return JSON.parse(localStorage.getItem('pm-details') || '{}').country || ''; } catch { return ''; } })();
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, t: id || undefined, lang, cur, country }) }).then(r => r.json());
      if (r.t) { setId(r.t); try { localStorage.setItem(KEY, r.t); } catch {} }
      if (r.messages) merge(r.messages); else setErr(r.error || t('Something went wrong. Please try again.'));
      if (body.seller) setSeller(true);
    } catch { setErr(t('Something went wrong. Please try again.')); }
    setBusy(false);
  }
  function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setText('');
    merge([{ id: 'local-' + Date.now(), role: 'user', text: q, at: new Date().toISOString() }]);
    post({ text: q }).then(() => setMsgs(m => m.filter(x => !x.id.startsWith('local-') || !m.some(y => y.role === 'user' && y.text === x.text && !y.id.startsWith('local-')))));
  }
  const who = (r: Msg['role']) => r === 'admin' ? t('Seller') : r === 'ai' ? info.name : '';
  return <>
    {!open && <button className="chat-fab" onClick={() => setOpen(true)} aria-label={t('Ask us anything')}>{t('Ask us')}</button>}
    {open && <section className="chat-box" aria-label={info.name}>
      <div className="chat-head"><div><b>{seller ? t('Chat with the seller') : info.name}</b><div className="muted" style={{ fontSize: '.72rem' }}>{seller ? t('A person will reply here') : info.ai ? t('AI · answers right away') : t('The seller replies here')}</div></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('Close')}>✕</button></div>
      <div className="chat-log" aria-live="polite">
        <p className="chat-msg bot">{info.greeting}</p>
        {msgs.map(m => m.role === 'system' ? <p key={m.id} className="chat-sys">{m.text}</p>
          : <p key={m.id} className={`chat-msg ${m.role === 'user' ? 'me' : m.role === 'admin' ? 'seller' : 'bot'}`}>{who(m.role) && <small>{who(m.role)}</small>}{m.role === 'user' ? m.text : linkify(m.text)}</p>)}
        {busy && <p className="chat-msg bot muted">{t('Typing…')}</p>}
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <div ref={end} />
      </div>
      {!seller && <button type="button" className="chat-seller" disabled={busy} onClick={() => post({ seller: true })}>👤 {t('Contact the seller')}</button>}
      <form className="chat-form" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} maxLength={1500} placeholder={t('Type your question')} aria-label={t('Type your question')} /><button className="btn sm" disabled={busy || !text.trim()}>{t('Send')}</button></form>
      <p className="muted chat-note">{info.ai && !seller ? t('AI assistant. It can make mistakes; your order page is always right.') : t('Replies may take a little while.')}</p>
    </section>}
  </>;
}

// Links in replies become tappable; everything else stays plain text.
const linkify = (s: string) => s.split(/(https?:\/\/[^\s)"'<>]*[^\s)"'<>.,!?])/g).map((part, i) => (i % 2 ? <a key={i} href={part} target={part.startsWith(location.origin) ? undefined : '_blank'} rel="noreferrer">{part.replace(/^https?:\/\//, '')}</a> : part));
