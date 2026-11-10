import { NextResponse, type NextRequest } from 'next/server';
import { check } from '@/lib/licenses';

// Called by sold copies of the store: { key, host } → active / trial / locked.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as { key?: unknown; host?: unknown };
  const answer = await check(String(b.key || ''), String(b.host || '')).catch(e => { console.error('license check', e); return null; });
  if (!answer) return NextResponse.json({ status: 'error' }, { status: 500 });
  return NextResponse.json(answer, { headers: { 'Cache-Control': 'no-store' } });
}
