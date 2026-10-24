'use client';
import { useEffect } from 'react';
// Keeps this order on the device so Track order can list it without typing the number.
export default function RememberOrder({ id }: { id: string }) {
  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem('pm-orders') || '[]');
      localStorage.setItem('pm-orders', JSON.stringify([id, ...list.filter(x => x !== id)].slice(0, 30)));
    } catch {}
  }, [id]);
  return null;
}
