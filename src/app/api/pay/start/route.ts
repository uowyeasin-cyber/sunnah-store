import { NextRequest, NextResponse } from 'next/server';
import { startPayment } from '@/lib/pay';
import { siteOf } from '../site';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('o') || '';
  const site = siteOf(req);
  try { return NextResponse.redirect(await startPayment(id, site), 303); }
  catch (e) { console.error('payment start failed', e); return NextResponse.redirect(`${site}/order/${id}?pay=error`, 303); }
}
