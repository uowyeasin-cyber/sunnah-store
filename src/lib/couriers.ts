import 'server-only';

// Courier connections. Booking: Steadfast (Bangladesh). Tracking: Steadfast, and Ship24 for every other
// carrier (DHL, FedEx, Aramex, USPS, J&T, Pos Malaysia…) once the admin enters a tracking number.
// Steps match lib/tracking: 2 accepted, 3 picked up, 4 in transit, 5 out for delivery, 6 delivered.
import { key as env, loadKeys } from './keys';
export { loadKeys };
const sf = (path: string, init?: RequestInit) => fetch(`${env('STEADFAST_BASE') || 'https://portal.packzy.com/api/v1'}${path}`, {
  ...init, headers: { 'Api-Key': env('STEADFAST_API_KEY'), 'Secret-Key': env('STEADFAST_SECRET_KEY'), 'Content-Type': 'application/json' },
}).then(r => r.json());

export const steadfastReady = () => !!(env('STEADFAST_API_KEY') && env('STEADFAST_SECRET_KEY'));
export const isSteadfast = (courier: string) => /steadfast/i.test(courier);

// Steadfast wants a local 11-digit number (01XXXXXXXXX).
const bdPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.startsWith('880') ? d.slice(2) : d.startsWith('1') && d.length === 10 ? '0' + d : d; };

export async function bookSteadfast(o: { no: string; name: string; phone: string; address: unknown; codDue: number; note?: string }) {
  await loadKeys();
  const a = o.address as Record<string, string>;
  const r = await sf('/create_order', { method: 'POST', body: JSON.stringify({
    invoice: o.no, recipient_name: o.name, recipient_phone: bdPhone(o.phone), recipient_address: [a.address, a.city, a.zip].filter(Boolean).join(', ').slice(0, 250),
    cod_amount: Math.round(o.codDue), note: o.note || '' }) });
  if (r.status !== 200 || !r.consignment) throw new Error(r.message || JSON.stringify(r.errors || r));
  return { trackingNo: String(r.consignment.tracking_code), ref: String(r.consignment.consignment_id) };
}

export type TrackResult = { step: number; eta?: Date; riderName?: string; riderPhone?: string } | null;

const SF_STEP: Record<string, number> = { pending: 2, in_review: 2, hold: 4, delivered_approval_pending: 6, partial_delivered_approval_pending: 6, delivered: 6, partial_delivered: 6 };
const SHIP24_STEP: Record<string, number> = { info_received: 2, in_transit: 4, available_for_pickup: 5, out_for_delivery: 5, failed_attempt: 5, delivered: 6 };

export async function track(courier: string, trackingNo: string): Promise<TrackResult> {
  if (!trackingNo) return null;
  await loadKeys();
  if (isSteadfast(courier) && steadfastReady()) {
    const r = await sf(`/status_by_trackingcode/${encodeURIComponent(trackingNo)}`);
    return r.delivery_status in SF_STEP ? { step: SF_STEP[r.delivery_status] } : null;
  }
  if (!env('SHIP24_API_KEY')) return null;
  const r = await fetch('https://api.ship24.com/public/v1/trackers/track', { method: 'POST', headers: { Authorization: `Bearer ${env('SHIP24_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ trackingNumber: trackingNo }) }).then(r => r.json());
  const sh = r.data?.trackings?.[0]?.shipment;
  const step = SHIP24_STEP[sh?.statusMilestone];
  if (step === undefined) return null;
  const eta = sh.delivery?.estimatedDeliveryDate;
  return { step, eta: eta ? new Date(eta) : undefined };
}
