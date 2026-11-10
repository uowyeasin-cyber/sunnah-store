import 'server-only';
import { CHANNELS } from './channels';

// Every linked LazOp shop (Daraz, Lazada): stock and prices out, then new orders in. One shop failing does not stop the others.
export async function syncChannels(only?: string) {
  const { linked, pushStock, pullOrders } = await import('./lazop');
  let n = 0, synced = 0, added = 0;
  const errors: string[] = [];
  for (const ch of CHANNELS.filter(c => c.api === 'lazop' && (!only || c.id === only))) {
    if (!(await linked(ch))) continue;
    n++;
    await pushStock(ch.id).then(r => { synced += r.synced; }, e => errors.push((e as Error).message.slice(0, 160)));
    await pullOrders(ch.id).then(r => { added += r.added; }, e => errors.push((e as Error).message.slice(0, 160)));
  }
  return { linked: n, synced, added, errors };
}
