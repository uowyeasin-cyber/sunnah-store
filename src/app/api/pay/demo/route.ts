import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { markPaid } from '@/lib/pay';
import { siteOf } from '../site';

// Local testing only (PAY_DEMO=1): pretends the gateway took the money.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('o') || '';
  if (!process.env.PAY_DEMO) return new NextResponse('Not found', { status: 404 });
  const o = await db.order.findUnique({ where: { id } });
  if (o) await markPaid(o.id, 'demo', Number(o.total), o.currency);
  return NextResponse.redirect(`${siteOf(req)}/order/${id}`, 303);
}
