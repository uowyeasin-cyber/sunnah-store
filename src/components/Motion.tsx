'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Quick scroll reveals and magnetic buttons. Native scrolling is kept: eased wheel scrolling made the shop feel slow.
const GROUPS = ['.sec-head', '.cats .cat-tile', '.rail .card', '.grid .card', '.reviews .rev', '.steps > div', '.specs > div', '.pdp .buy > *', '.pdp .stage', '.ad', '.panel'];

export default function Motion() {
  const path = usePathname();
  useEffect(() => { document.body.classList.add('ready'); }, []);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px 10% 0px' });
    const els: HTMLElement[] = [];
    GROUPS.forEach(sel => document.querySelectorAll<HTMLElement>('main ' + sel).forEach((el, i) => { if (el.classList.contains('in')) return; el.classList.add('reveal'); el.style.transitionDelay = (i % 4) * 50 + 'ms'; io.observe(el); els.push(el); }));
    const t = setTimeout(() => els.forEach(el => el.classList.add('in')), 6000);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [path]);
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const magnet = (e: PointerEvent) => {
      const m = (e.target as HTMLElement).closest?.('.btn, .rail-btn, .icon-btn, .s-dot') as HTMLElement | null;
      document.querySelectorAll<HTMLElement>('.magnet').forEach(el => { if (el !== m) { el.classList.remove('magnet'); el.style.translate = ''; } });
      if (!m) return;
      const r = m.getBoundingClientRect();
      m.classList.add('magnet'); m.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 10}px ${((e.clientY - r.top) / r.height - 0.5) * 8}px`;
    };
    addEventListener('pointermove', magnet, { passive: true });
    return () => removeEventListener('pointermove', magnet);
  }, []);
  return null;
}
