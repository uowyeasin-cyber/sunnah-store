import { NextRequest } from 'next/server';
import { confirm, unsubscribe } from '@/lib/newsletter';

// Links from newsletter emails: ?confirm=<token> or ?unsubscribe=<token>.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ok = p.get('confirm') ? await confirm(p.get('confirm')!) : p.get('unsubscribe') ? await unsubscribe(p.get('unsubscribe')!) : false;
  const msg = !ok ? 'This link is not valid any more.' : p.get('confirm') ? 'Thank you. You are subscribed.' : 'You are unsubscribed. You will not get newsletter emails from us.';
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Newsletter</title><body style="font-family:system-ui,sans-serif;background:#f7f5f0;color:#1d1b18;display:grid;place-items:center;min-height:90vh;margin:0;padding:16px"><div style="max-width:420px;text-align:center"><p style="font-size:1.1rem">${msg}</p><p><a href="/" style="color:inherit">Back to the shop</a></p></div></body>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
