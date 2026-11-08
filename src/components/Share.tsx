'use client';
import { useStore } from './StoreProvider';

// Share a product or the whole shop: the phone's own share sheet when there is one, plus direct buttons.
const NETS: [string, string, (u: string, t: string) => string, string][] = [
  ['whatsapp', 'WhatsApp', (u, t) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}`, 'M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3zm4.6 12.6c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-3-1-4.9-4-5.1-4.2-.1-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.6-.1 1.2z'],
  ['facebook', 'Facebook', u => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`, 'M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4V11H8v3.5h2V21h3.5v-6.5H16l.5-3.5h-3V8.8c0-.5.3-.8.5-.8z'],
  ['x', 'X', (u, t) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`, 'M4 4h4.5l4 5.6L17.3 4H20l-6.2 7.2L20.5 20H16l-4.3-6-5.2 6H4l6.5-7.5z'],
  ['telegram', 'Telegram', (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`, 'M21 4L3 11l5 2 2 6 3-4 5 4 3-15zM8 13l9-6-7 8'],
  ['pinterest', 'Pinterest', (u, t) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}`, 'M12 3a9 9 0 00-3.3 17.4c-.1-.8-.1-1.9 0-2.7l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.8 0 1.2.6 1.2 1.4 0 .8-.5 2.1-.8 3.2-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3l.1.3-.3 1.1c0 .2-.2.2-.4.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.2 6.4-5.4 6.4-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A9 9 0 1012 3z'],
  ['email', 'Email', (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(t + '\n' + u)}`, 'M3 6h18v12H3zM3 6l9 7 9-7'],
];

export default function Share({ title, path = '', label }: { title: string; path?: string; label?: string }) {
  const { t, toast } = useStore();
  const url = () => (typeof location === 'undefined' ? '' : location.origin + (path || location.pathname));
  const copy = async () => { try { await navigator.clipboard.writeText(url()); toast(t('Link copied')); } catch { toast(url()); } };
  // Phones open their own share sheet (Messenger, Instagram, SMS…); computers copy the link.
  const native = async () => { if (navigator.share) { try { await navigator.share({ title, text: title, url: url() }); } catch {} } else copy(); };
  return <div className="share">
    <button type="button" className="share-main" onClick={native}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" /></svg>{label || t('Share')}
    </button>
    <div className="share-row" role="group" aria-label={t('Share')}>
      {NETS.map(([k, name, href, d]) => <a key={k} className={`share-ic ${k}`} href="#" onClick={e => { e.preventDefault(); window.open(href(url(), title), '_blank', 'noopener,width=620,height=560'); }} aria-label={`${t('Share on')} ${name}`} title={name}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill={k === 'email' || k === 'telegram' ? 'none' : 'currentColor'} stroke={k === 'email' || k === 'telegram' ? 'currentColor' : 'none'} strokeWidth="1.5" aria-hidden="true"><path d={d} /></svg></a>)}
      <button type="button" className="share-ic copy" onClick={copy} aria-label={t('Copy link')} title={t('Copy link')}>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg></button>
    </div>
  </div>;
}
