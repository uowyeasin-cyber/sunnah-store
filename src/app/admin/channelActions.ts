'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { channel } from '@/lib/channels';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const back = (m: string): never => redirect(`/admin/channels?note=${encodeURIComponent(m)}`);

// Opens the marketplace's own "allow this app" page; it sends the seller back to /api/channels/callback.
export async function linkShop(fd: FormData) {
  const ch = channel(str(fd, 'id'));
  await requireAdmin('channels', 'linkShop', ch?.id || '');
  if (!ch || ch.api !== 'lazop') back('This channel cannot be linked here yet.');
  const { appKeys, authUrl } = await import('@/lib/lazop');
  const { loadKeys } = await import('@/lib/keys');
  await loadKeys(true);
  if (!appKeys(ch!).appKey) back(`Add the ${ch!.id.startsWith('daraz') ? 'Daraz' : 'Lazada'} app key and secret in Connections → Marketplaces first.`);
  const site = process.env.SITE_URL || 'https://sunnahstore.vercel.app';
  redirect(authUrl(ch!, `${site}/api/channels/callback`, ch!.id));
}

export async function unlinkShop(fd: FormData) {
  const ch = channel(str(fd, 'id'));
  await requireAdmin('channels', 'unlinkShop', ch?.id || '');
  if (ch) { const { unlink } = await import('@/lib/lazop'); await unlink(ch); }
  revalidatePath('/admin/channels');
}

export async function syncNow(fd: FormData) {
  const id = str(fd, 'id');
  await requireAdmin('channels', 'syncChannels', id);
  const { syncChannels } = await import('@/lib/channelSync');
  const r = await syncChannels(id || undefined);
  back(r.linked ? `${r.synced} listings updated · ${r.added} new orders${r.errors.length ? ` · ${r.errors[0]}` : ''}` : 'No linked shop to sync.');
}
