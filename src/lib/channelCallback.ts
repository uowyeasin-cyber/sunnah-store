import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminOrNull } from '@/lib/auth';
import { channel } from '@/lib/channels';

// Marketplaces (and AliExpress) send the seller back here after "Link", with a one-time code. Only a signed-in admin can finish it.
// The channel comes back as ?state= (most) or in the path, /api/channels/callback/<id> (Shopee keeps no state).
export async function finish(req: NextRequest, fromPath: string) {
  const site = process.env.SITE_URL || req.nextUrl.origin;
  const q = req.nextUrl.searchParams;
  const id = fromPath || q.get('state') || '';
  const back = (m: string) => NextResponse.redirect(id === 'aliexpress' ? `${site}/admin/sourcing?tab=ae&note=${encodeURIComponent(m)}` : `${site}/admin/channels?note=${encodeURIComponent(m)}`);
  if (!(await adminOrNull(id === 'aliexpress' ? 'sourcing' : 'channels'))) return back('Sign in to the admin first, then press Link again.');
  const { loadKeys } = await import('@/lib/keys');
  await loadKeys(true);
  if (id === 'aliexpress') {
    const { exchange, AE } = await import('@/lib/aliexpress');
    const { saveTok } = await import('@/lib/chanToken');
    try { await saveTok(AE, await exchange(q.get('code') || '')); return back('AliExpress is linked. Paste product links below to import them.'); }
    catch (e) { return back(`AliExpress could not be linked: ${(e as Error).message.slice(0, 200)}`); }
  }
  const ch = channel(id);
  const { connector } = await import('@/lib/connectors');
  const c = ch ? await connector(ch.api) : null;
  if (!ch || !c?.exchange) return back('The marketplace did not send a link code. Try Link shop again.');
  if (q.get('error')) return back(`${ch.name}: ${q.get('error_description') || q.get('error')}`);
  try {
    const { saveTok } = await import('@/lib/chanToken');
    await saveTok(ch, await c.exchange(ch, q));
    return back(`${ch.name} is linked. Stock, prices and orders now sync by themselves.`);
  } catch (e) { return back(`${ch.name} could not be linked: ${(e as Error).message.slice(0, 200)}`); }
}
