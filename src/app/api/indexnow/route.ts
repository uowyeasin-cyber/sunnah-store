import { indexNowKey } from '@/lib/indexnow';

// Search engines fetch this to confirm the IndexNow pings really come from this shop.
export function GET() {
  return new Response(indexNowKey(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
