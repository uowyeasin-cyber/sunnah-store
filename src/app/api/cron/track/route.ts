import { NextRequest, NextResponse } from 'next/server';
import { syncTracking } from '@/lib/fulfil';

// Run on a schedule (vercel.json, or any cron service) with "Authorization: Bearer CRON_SECRET".
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });
  return NextResponse.json(await syncTracking());
}
