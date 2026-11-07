'use client';
import { useEffect } from 'react';
import { rememberSeen } from './RecentlyViewed';
// Counts one view of a product page, for Reports, and remembers it for "Recently viewed" on this device.
export default function ProductSeen({ id, slug }: { id: string; slug: string }) {
  useEffect(() => { navigator.sendBeacon?.('/api/views', JSON.stringify({ id })); rememberSeen(slug); }, [id, slug]);
  return null;
}
