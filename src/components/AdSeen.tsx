'use client';
import { useEffect } from 'react';
// Counts one view for each ad shown on a page.
export default function AdSeen({ ids }: { ids: string[] }) {
  const key = ids.join(',');
  useEffect(() => { if (key) navigator.sendBeacon?.('/api/ads/view', JSON.stringify({ ids: key.split(',') })); }, [key]);
  return null;
}
