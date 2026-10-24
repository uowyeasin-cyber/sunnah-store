'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Scroll reveals, eased wheel scrolling and magnetic buttons, the luxury-site feel.
const GROUPS = ['.sec-head', '.cats .cat-tile', '.rail .card', '.grid .card', '.reviews .rev', '.steps > div', '.specs > div', '.pdp .buy > *', '.pdp .stage', '.ad', '.panel'];

export default function Motion() {
  const path = usePathname();
  useEffect(() => { document.body.classList.add('ready'); }, []);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    const els: HTMLElement[] = [];
    GROUPS.forEach(sel => document.querySelectorAll<HTMLElement>('main ' + sel).forEach((el, i) => { if (el.classList.contains('in')) return; el.classList.add('reveal'); el.style.transitionDelay = (i % 4) * 110 + 'ms'; io.observe(el); els.push(el); }));
    const t = setTimeout(() => els.forEach(el => el.classList.add('in')), 6000);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [path]);
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let target = scrollY, cur = scrollY, gliding = false;
    const glide = () => { cur += (target - cur) * 0.1; if (Math.abs(target - cur) < 0.5) { cur = target; gliding = false; } scrollTo(0, cur); if (gliding) requestAnimationFrame(glide); };
    const wheel = (e: WheelEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || document.body.classList.contains('menu-open') || document.querySelector('.drawer.open, .ad-pop.open') || el.closest?.('.drawer, .menu-panel, .tbl-wrap, textarea, select, .rail, .side') || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!gliding) target = cur = scrollY;
      target = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, target + e.deltaY * (e.deltaMode === 1 ? 32 : 1)));
      if (!gliding) { gliding = true; requestAnimationFrame(glide); }
    };
    const stop = () => { gliding = false; };
    const magnet = (e: PointerEvent) => {
      const m = (e.target as HTMLElement).closest?.('.btn, .rail-btn, .icon-btn, .s-dot') as HTMLElement | null;
      document.querySelectorAll<HTMLElement>('.magnet').forEach(el => { if (el !== m) { el.classList.remove('magnet'); el.style.translate = ''; } });
      if (!m) return;
      const r = m.getBoundingClientRect();
      m.classList.add('magnet'); m.style.translate = `${((e.clientX - r.left) / r.width - 0.5) * 10}px ${((e.clientY - r.top) / r.height - 0.5) * 8}px`;
    };
    addEventListener('wheel', wheel, { passive: false }); addEventListener('keydown', stop, true); addEventListener('pointermove', magnet, { passive: true });
    return () => { removeEventListener('wheel', wheel); removeEventListener('keydown', stop, true); removeEventListener('pointermove', magnet); };
  }, []);
  return null;
}
