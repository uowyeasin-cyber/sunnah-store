import { NextResponse, type NextRequest } from 'next/server';

// License check for this copy of the store. Every page and the admin ask the seller's license server
// whether this web address may run (cached for a few minutes). Without LICENSE_KEY the copy runs as a
// free demo until the seller's limit; then it shows a locked page. Put the key you bought in the
// Vercel setting LICENSE_KEY and redeploy.
const SERVER = '__LICENSE_SERVER__';
type Answer = { status: 'active' | 'trial' | 'locked'; message: string; left?: { opens: number; days: number } };
let cache: { at: number; host: string; a: Answer } | null = null;
const TTL = 5 * 60e3;

async function ask(host: string): Promise<Answer | null> {
  try {
    const r = await fetch(`${SERVER}/api/license`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: process.env.LICENSE_KEY || '', host }), signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!r.ok) return null;
    const a = await r.json() as Answer;
    return a && ['active', 'trial', 'locked'].includes(a.status) ? a : null;
  } catch { return null; }
}

export async function licenseGate(req: NextRequest): Promise<NextResponse | null> {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.hostname).split(',')[0].trim();
  if (!cache || cache.host !== host || Date.now() - cache.at > TTL) {
    const a = await ask(host);
    // If the license server cannot be reached, keep the last answer (a short outage must not take a paid shop down).
    if (a) cache = { at: Date.now(), host, a };
    else if (!cache || cache.host !== host) return null;
  }
  if (cache.a.status !== 'locked') return null;
  const msg = cache.a.message.replace(/[<>&]/g, '');
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>License needed</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f4ef;color:#222">
<div style="max-width:440px;padding:32px;background:#fff;border-radius:14px;box-shadow:0 6px 30px #0001;text-align:center">
<h1 style="font-size:1.4rem">License needed</h1><p>${msg}</p>
<p style="color:#666;font-size:.9rem">Already have a key? Add it in Vercel → Settings → Environment Variables as <b>LICENSE_KEY</b>, then redeploy.</p>
<p><a href="${SERVER}/get-app" style="color:#0a6">Contact the seller</a></p></div></body>`, { status: 402, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
