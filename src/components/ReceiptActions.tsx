'use client';
import { useState } from 'react';

// Download (the browser's Save as PDF) and share buttons for the receipt.
export default function ReceiptActions({ url, title, t }: { url: string; title: string; t: { download: string; share: string; copied: string; whatsapp: string } }) {
  const [copied, setCopied] = useState(false);
  const link = url.startsWith('http') ? url : typeof location !== 'undefined' ? location.origin + url : url;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, url: link }); return; } catch { return; } }
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return <div className="receipt-actions no-print">
    <button className="btn ghost sm" onClick={() => window.print()}>⬇ {t.download}</button>
    <button className="btn ghost sm" onClick={share}>↗ {copied ? t.copied : t.share}</button>
    <a className="btn ghost sm" href={`https://wa.me/?text=${encodeURIComponent(`${title} ${link}`)}`} target="_blank" rel="noreferrer">{t.whatsapp}</a>
  </div>;
}
