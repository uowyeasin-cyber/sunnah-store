import { NextRequest, NextResponse } from 'next/server';
import { runAll } from '@/lib/automation';

// The daily schedule (vercel.json, or any cron service) with "Authorization: Bearer CRON_SECRET".
// Runs every automation job that the Automation Control Center has switched on.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });
  return NextResponse.json(await runAll());
}
