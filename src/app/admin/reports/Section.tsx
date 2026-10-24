'use client';
import { useEffect, useRef, useState } from 'react';

// One report part: a small card that opens on click, with its own download, print and share.
export default function Section({ id, title, headline, csv, children }: { id: string; title: string; headline: string; csv: string; children: React.ReactNode }) {
  const box = useRef<HTMLDetailsElement>(null);
  const [note, setNote] = useState('');
  useEffect(() => { if (location.hash === '#' + id && box.current) { box.current.open = true; box.current.scrollIntoView({ block: 'start' }); } }, [id]);
  const link = () => `${location.origin}${location.pathname}${location.search}#${id}`;
  const print = () => {
    const el = box.current!; el.open = true; el.classList.add('printing'); document.body.classList.add('print-one');
    const done = () => { el.classList.remove('printing'); document.body.classList.remove('print-one'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done); window.print();
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, url: link() }); } catch {} return; }
    try { await navigator.clipboard.writeText(link()); setNote('Link copied'); setTimeout(() => setNote(''), 2000); } catch {}
  };
  return <details ref={box} id={id} className="rsec panel">
    <summary><span className="label">{title}</span><b>{headline}</b><i aria-hidden="true">＋</i></summary>
    <div className="rsec-tools no-print">
      <a className="btn ghost sm" href={csv}>⬇ CSV</a>
      <button type="button" className="btn ghost sm" onClick={print}>Print / PDF</button>
      <button type="button" className="btn ghost sm" onClick={share}>↗ {note || 'Share'}</button>
    </div>
    <div className="rsec-body">{children}</div>
  </details>;
}
