import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { PLATFORMS } from '@/lib/social';

// Tracked link for a social media post or ad: counts the click, remembers the campaign for the order, then opens the page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = await db.campaign.findUnique({ where: { code } }).catch(() => null);
  const url = new URL(c?.target || '/', req.nextUrl.origin);
  if (!c) return NextResponse.redirect(url);
  if (!/bot|crawl|spider|facebookexternalhit|whatsapp|preview/i.test(req.headers.get('user-agent') || ''))
    await db.campaign.update({ where: { id: c.id }, data: { clicks: { increment: 1 } } });
  url.searchParams.set('utm_source', c.platform);
  url.searchParams.set('utm_medium', c.kind === 'ad' ? 'paid_social' : 'social');
  url.searchParams.set('utm_campaign', c.code);
  const res = NextResponse.redirect(url);
  const month = { path: '/', maxAge: 2592000, sameSite: 'lax' as const };
  res.cookies.set('pm-cmp', c.code, month);
  res.cookies.set('pm-src', PLATFORMS[c.platform]?.source || c.platform, month);
  return res;
}
