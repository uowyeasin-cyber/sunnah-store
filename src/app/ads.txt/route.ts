import { readEarn } from '@/lib/earn';

// ads.txt for ad networks: the AdSense line is made from the publisher ID, plus any lines typed in Earn money.
export async function GET() {
  const e = await readEarn();
  const pub = e.net.client.replace(/^ca-/, '').replace(/[^\w-]/g, '');
  const lines = [pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0` : '', e.net.adsTxt].filter(Boolean).join('\n');
  return new Response(lines + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
