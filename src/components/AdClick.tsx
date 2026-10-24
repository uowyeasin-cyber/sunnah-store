'use client';
// Counts a click on an ad before following its link.
export default function AdClick({ id, children }: { id: string; children: React.ReactNode }) {
  return <span style={{ display: 'contents' }} onClickCapture={() => navigator.sendBeacon?.('/api/ads/click', JSON.stringify({ id }))}>{children}</span>;
}
