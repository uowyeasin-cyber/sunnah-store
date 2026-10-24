import { NextRequest, NextResponse } from 'next/server';
import { markPaid, stripeSigOk } from '@/lib/pay';
import { loadKeys } from '@/lib/keys';

// Backup for customers who close the tab before returning: Stripe tells us directly.
export async function POST(req: NextRequest) {
  const body = await req.text();
  await loadKeys();
  if (!stripeSigOk(body, req.headers.get('stripe-signature') || '')) return new NextResponse('bad signature', { status: 400 });
  const ev = JSON.parse(body);
  const s = ev.data?.object;
  if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && s?.payment_status === 'paid' && s.metadata?.order)
    await markPaid(s.metadata.order, s.payment_intent || s.id, s.amount_total / 100, s.currency);
  return NextResponse.json({ ok: true });
}
