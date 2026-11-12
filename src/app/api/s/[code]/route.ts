import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';

const bot = (req: NextRequest) => /bot|crawl|spider|facebookexternalhit|whatsapp|preview/i.test(req.headers.get('user-agent') || '');

// GET: count the click and open the target. POST (beacon from the wait page): count a view.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const l = await db.shortLink.findUnique({ where: { code } }).catch(() => null);
  if (!l || !l.on) return NextResponse.redirect(new URL('/', req.nextUrl.origin));
  if (!bot(req)) await db.shortLink.update({ where: { id: l.id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return NextResponse.redirect(new URL(l.target, req.nextUrl.origin));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!bot(req)) await db.shortLink.updateMany({ where: { code }, data: { views: { increment: 1 } } }).catch(() => {});
  return new NextResponse(null, { status: 204 });
}
