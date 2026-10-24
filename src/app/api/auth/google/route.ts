import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

// Step 1 of "Continue with Google": send the visitor to Google's sign-in page.
export function GET(req: NextRequest) {
  const id = process.env.GOOGLE_CLIENT_ID;
  const back = req.nextUrl.searchParams.get('next') || '/';
  if (!id) return NextResponse.redirect(new URL(back, req.url));
  const state = randomBytes(16).toString('hex');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: id, redirect_uri: `${req.nextUrl.origin}/api/auth/google/callback`, response_type: 'code',
    scope: 'openid email profile', state, prompt: 'select_account',
  }).toString();
  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, secure: req.nextUrl.protocol === 'https:', sameSite: 'lax' as const, maxAge: 600, path: '/' };
  res.cookies.set('pm-g-state', state, opts);
  res.cookies.set('pm-g-next', back.startsWith('/') && !back.startsWith('//') ? back : '/', opts);
  return res;
}
