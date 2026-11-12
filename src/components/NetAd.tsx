'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Runs an ad network's code (AdSense, Adsterra, Monetag...). Scripts in innerHTML never run, so the code is
// turned into real nodes. Hidden on pages the owner listed (checkout, bag, account by default).
export default function NetAd({ html, hideFor, label }: { html: string; hideFor: string[]; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const hidden = hideFor.some(p => p && (path === p || path.startsWith(p + '/') || path.replace(/^\/(en|bn|ar|hi)(?=\/|$)/, '').startsWith(p)));
  useEffect(() => {
    const el = box.current;
    if (!el || hidden) return;
    el.replaceChildren(document.createRange().createContextualFragment(html));
    return () => el.replaceChildren();
  }, [html, hidden]);
  if (hidden) return null;
  return <div className="net-ad" aria-label={label || 'Advertisement'}><div ref={box} /></div>;
}
