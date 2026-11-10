import 'server-only';
import { CHANNELS, LINKABLE } from './channels';
import { linked } from './chanToken';
import { connector } from './connectors';
import { loadKeys } from './keys';

// Every linked shop (Daraz, Lazada, Shopee, TikTok Shop, eBay, Amazon, Walmart): stock and prices out, then new orders in.
// One shop failing does not stop the others.
export async function syncChannels(only?: string) {
  await loadKeys(true);
  let n = 0, synced = 0, added = 0;
  const errors: string[] = [];
  for (const ch of CHANNELS.filter(c => LINKABLE.includes(c.api) && (!only || c.id === only))) {
    const c = await connector(ch.api);
    if (!c || !c.ready(ch) || (c.keyOnly ? false : !(await linked(ch)))) continue;
    n++;
    await c.push(ch).then(r => { synced += r.synced; }, e => errors.push((e as Error).message.slice(0, 160)));
    await c.pull(ch).then(r => { added += r.added; }, e => errors.push((e as Error).message.slice(0, 160)));
  }
  return { linked: n, synced, added, errors };
}
