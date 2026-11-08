'use client';
import { useEffect } from 'react';

type W = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void; ttq?: { track: (...a: unknown[]) => void }; snaptr?: (...a: unknown[]) => void; pintrk?: (...a: unknown[]) => void };

// Tells every connected pixel about the order once (the receipt can be opened again later).
// The same order number goes to the server-side event, so Meta and Google count it only once.
export default function PurchaseEvent({ no, value, currency, gadsSend }: { no: string; value: number; currency: string; gadsSend: string }) {
  useEffect(() => {
    const k = 'pm-px-' + no;
    try { if (localStorage.getItem(k)) return; } catch {}
    const w = window as W;
    const fire = () => {
      try { localStorage.setItem(k, '1'); } catch {}
      w.fbq?.('track', 'Purchase', { value, currency }, { eventID: no });
      w.gtag?.('event', 'purchase', { transaction_id: no, value, currency });
      if (gadsSend) w.gtag?.('event', 'conversion', { send_to: gadsSend, value, currency, transaction_id: no });
      w.ttq?.track('CompletePayment', { value, currency, content_type: 'product' });
      w.snaptr?.('track', 'PURCHASE', { price: value, currency, transaction_id: no });
      w.pintrk?.('track', 'checkout', { value, currency, order_id: no });
    };
    const h = setTimeout(fire, 1500); // pixels load after the page
    return () => clearTimeout(h);
  }, [no, value, currency, gadsSend]);
  return null;
}
