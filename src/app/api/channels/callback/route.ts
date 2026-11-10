import { NextRequest, NextResponse } from 'next/server';
import { adminOrNull } from '@/lib/auth';
import { channel } from '@/lib/channels';

// Daraz / Lazada send the seller back here after "Link shop", with a one-time code. Only a signed-in admin can finish it.
export async function GET(req: NextRequest) {
  const site = process.env.SITE_URL || req.nextUrl.origin;
  const back = (m: string) => NextResponse.redirect(`${site}/admin/channels?note=${encodeURIComponent(m)}`);
  if (!(await adminOrNull('channels'))) return back('Sign in to the admin first, then press Link shop again.');
  const id = req.nextUrl.searchParams.get('state') || '', code = req.nextUrl.searchParams.get('code') || '';
  const ch = channel(id);
  if (!ch || ch.api !== 'lazop' || !code) return back('The marketplace did not send a link code. Try Link shop again.');
  const { exchangeCode } = await import('@/lib/lazop');
  try { await exchangeCode(ch, code); return back(`${ch.name} is linked. Stock, prices and orders now sync by themselves.`); }
  catch (e) { return back(`${ch.name} could not be linked: ${(e as Error).message.slice(0, 200)}`); }
}
