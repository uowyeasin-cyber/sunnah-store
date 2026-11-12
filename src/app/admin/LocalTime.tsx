'use client';
import { useEffect, useState } from 'react';

// Shows a time in the admin's own clock (the server only knows UTC).
export function LocalTime({ iso }: { iso: string }) {
  const [s, set] = useState(iso.slice(0, 16).replace('T', ' ') + ' UTC');
  useEffect(() => { const h = setTimeout(() => set(new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })), 0); return () => clearTimeout(h); }, [iso]);
  return <span suppressHydrationWarning>{s}</span>;
}

// Hidden field with the browser's offset from UTC, so a typed time means the admin's local time.
export function TzField() {
  const [tz, set] = useState('0');
  useEffect(() => { const h = setTimeout(() => set(String(new Date().getTimezoneOffset())), 0); return () => clearTimeout(h); }, []);
  return <input type="hidden" name="tz" value={tz} />;
}

// A date-and-time box showing a UTC time in the admin's own clock. Pair it with <TzField /> in the same form.
export function LocalInput({ name, iso }: { name: string; iso: string }) {
  const [v, set] = useState(iso.slice(0, 16));
  useEffect(() => { const h = setTimeout(() => { const d = new Date(iso); if (!isNaN(+d)) set(new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16)); }, 0); return () => clearTimeout(h); }, [iso]);
  return <input type="datetime-local" name={name} value={v} onChange={e => set(e.target.value)} required />;
}
