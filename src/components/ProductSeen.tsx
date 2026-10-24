'use client';
import { useEffect } from 'react';
// Counts one view of a product page, for Reports.
export default function ProductSeen({ id }: { id: string }) {
  useEffect(() => { navigator.sendBeacon?.('/api/views', JSON.stringify({ id })); }, [id]);
  return null;
}
