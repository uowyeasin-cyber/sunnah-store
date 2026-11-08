'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Reloads the chat list every few seconds so new customer messages show without pressing anything.
export default function Refresh({ every = 8000 }: { every?: number }) {
  const r = useRouter();
  useEffect(() => {
    const iv = setInterval(() => { if (!document.hidden && !document.activeElement?.matches('textarea,input')) r.refresh(); }, every);
    return () => clearInterval(iv);
  }, [r, every]);
  return null;
}
