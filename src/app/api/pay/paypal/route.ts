import { NextRequest, NextResponse } from 'next/server';
import { capturePaypal } from '@/lib/pay';
import { siteOf } from '../site';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('o') || '';
  await capturePaypal(id, req.nextUrl.searchParams.get('token') || '').catch(e => console.error(e));
  return NextResponse.redirect(`${siteOf(req)}/order/${id}`, 303);
}
