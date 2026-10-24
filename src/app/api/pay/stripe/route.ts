import { NextRequest, NextResponse } from 'next/server';
import { verifyStripe } from '@/lib/pay';
import { siteOf } from '../site';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('o') || '';
  await verifyStripe(id, req.nextUrl.searchParams.get('s') || '').catch(e => console.error(e));
  return NextResponse.redirect(`${siteOf(req)}/order/${id}`, 303);
}
