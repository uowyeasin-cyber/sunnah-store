import { NextRequest } from 'next/server';
import { finish } from '@/lib/channelCallback';

// Same as /api/channels/callback, for marketplaces that keep no state (Shopee): the channel is in the path.
export async function GET(req: NextRequest, ctx: RouteContext<'/api/channels/callback/[ch]'>) {
  return finish(req, (await ctx.params).ch);
}
