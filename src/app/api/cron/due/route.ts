import { NextRequest, NextResponse } from 'next/server';
import { runDue } from '@/lib/schedule';

// Runs reminders and jobs whose time has come. Call it from any cron service (e.g. cron-job.org,
// every 5 minutes) with "Authorization: Bearer CRON_SECRET" or ?key=CRON_SECRET.
export async function GET(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  if (!s || (req.headers.get('authorization') !== `Bearer ${s}` && req.nextUrl.searchParams.get('key') !== s)) return new NextResponse('Unauthorized', { status: 401 });
  return NextResponse.json({ ran: await runDue() });
}
