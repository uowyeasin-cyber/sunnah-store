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
  function ask(q: string) {
    if (!q || busy) return;
    merge([{ id: 'local-' + msgs.length, role: 'user', text: q, at: '' }]);
    post({ text: q }).then(() => setMsgs(m => m.filter(x => !x.id.startsWith('local-') || !m.some(y => y.role === 'user' && y.text === x.text && !y.id.startsWith('local-')))));
  }
  function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    setText('');
    ask(q);
  }
  const who = (r: Msg['role']) => r === 'admin' ? t('Seller') : r === 'ai' ? info.name : '';
  const hm = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  const asked = msgs.some(m => m.role === 'user');
  const QUICK = [t('Track my order'), t('Delivery time and cost'), t('Returns and refunds'), t('Which product is right for me?')];
  const status = seller ? t('Seller · a person replies here') : info.ai ? t('Online · replies in seconds') : t('The seller replies here');
  return <>
    {!open && <button className="chat-fab" onClick={() => setOpen(true)} aria-label={t('Ask us anything')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 5h16v11H9l-5 4z" /></svg>
      <span>{t('Chat with us')}</span><i className="chat-dot" aria-hidden />
    </button>}
    {open && <section className="chat-box" aria-label={info.name} role="dialog">
      <div className="chat-head">
        <span className="chat-av" aria-hidden>{seller ? '👤' : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>}</span>
        <div className="chat-title"><b>{seller ? t('Chat with the seller') : info.name}</b><small><i className="chat-dot" aria-hidden />{status}</small></div>
        <button className="chat-x" onClick={() => setOpen(false)} aria-label={t('Close')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </div>
      <div className="chat-log" aria-live="polite">
        <div className="chat-row bot"><span className="chat-mini" aria-hidden>✦</span><div><p className="chat-msg bot">{info.greeting}</p></div></div>
        {!asked && <div className="chat-quick">{QUICK.map(q => <button key={q} type="button" onClick={() => ask(q)} disabled={busy}>{q}</button>)}</div>}
        {msgs.map(m => m.role === 'system' ? <p key={m.id} className="chat-sys"><span>{m.text}</span></p>
          : <div key={m.id} className={`chat-row ${m.role === 'user' ? 'me' : m.role === 'admin' ? 'seller' : 'bot'}`}>
            {m.role !== 'user' && <span className="chat-mini" aria-hidden>{m.role === 'admin' ? '👤' : '✦'}</span>}
            <div><p className={`chat-msg ${m.role === 'user' ? 'me' : m.role === 'admin' ? 'seller' : 'bot'}`}>{who(m.role) && <small>{who(m.role)}</small>}{m.role === 'user' ? m.text : linkify(m.text)}</p>
              <time className="chat-time" suppressHydrationWarning>{hm(m.at)}</time></div></div>)}
        {busy && <div className="chat-row bot"><span className="chat-mini" aria-hidden>✦</span><p className="chat-msg bot chat-typing" aria-label={t('Typing…')}><i /><i /><i /></p></div>}
        {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
        <div ref={end} />
      </div>
      <div className="chat-foot">
        {!seller && <button type="button" className="chat-seller" disabled={busy} onClick={() => post({ seller: true })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" /></svg>{t('Talk to the seller')}</button>}
        <form className="chat-form" onSubmit={send}>
          <input value={text} onChange={e => setText(e.target.value)} maxLength={1500} placeholder={t('Write a message…')} aria-label={t('Type your question')} />
          <button className="chat-send" disabled={busy || !text.trim()} aria-label={t('Send')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
        </form>
        <p className="chat-note">{info.ai && !seller ? t('AI assistant · your order page is always right') : t('Replies may take a little while')}</p>
      </div>
    </section>}
  </>;
}

// Links in replies become tappable; everything else stays plain text.
const linkify = (s: string) => s.split(/(https?:\/\/[^\s)"'<>]*[^\s)"'<>.,!?])/g).map((part, i) => (i % 2 ? <a key={i} href={part} target={part.startsWith(location.origin) ? undefined : '_blank'} rel="noreferrer">{part.replace(/^https?:\/\//, '')}</a> : part));
