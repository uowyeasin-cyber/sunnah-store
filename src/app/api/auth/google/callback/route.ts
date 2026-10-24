import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail, startSession } from '@/lib/auth';

// Step 2: Google sends the visitor back with a code. Swap it for their verified email and sign them in.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams, jar = req.cookies;
  const next = jar.get('pm-g-next')?.value || '/';
  const fail = () => NextResponse.redirect(new URL(`${next}${next.includes('?') ? '&' : '?'}signin=failed`, req.url));
  if (!q.get('code') || !q.get('state') || q.get('state') !== jar.get('pm-g-state')?.value) return fail();
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: q.get('code')!, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: `${req.nextUrl.origin}/api/auth/google/callback`, grant_type: 'authorization_code',
    }),
  }).then(r => r.json()).catch(() => null);
  if (!tok?.access_token) { console.error('[google] token exchange failed', tok?.error); return fail(); }
  const me = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json()).catch(() => null);
  if (!me?.email || me.email_verified === false) return fail();
  await startSession(me.email, String(me.name || '').slice(0, 80));
  const res = NextResponse.redirect(new URL((await isAdminEmail(me.email)) && next === '/admin' ? '/admin' : next, req.url));
  res.cookies.delete('pm-g-state'); res.cookies.delete('pm-g-next');
  return res;
}
