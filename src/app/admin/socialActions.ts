'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { goLink, newCode, PLATFORMS, postToFacebook, postToInstagram, syncCampaign } from '@/lib/social';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string) => Math.max(0, Number(fd.get(k)) || 0);
const date = (fd: FormData, k: string) => { const v = str(fd, k); return v && !isNaN(Date.parse(v)) ? new Date(v + 'T00:00:00Z') : null; };
const back = (id: string, note = '') => { updateTag('catalog'); redirect(`/admin/social?${new URLSearchParams(note ? { open: id, note } : { open: id })}#c-${id}`); };

// Ad spend also goes into Expenses (Advertising), so Reports count it in profit and loss.
async function spendExpense(c: { id: string; code: string; name: string; currency: string; startAt: Date }, spend: number) {
  const note = `Ad · ${c.name} [${c.code}]`.slice(0, 200);
  const row = await db.expense.findFirst({ where: { note: { endsWith: `[${c.code}]` } } });
  if (!spend) { if (row) await db.expense.delete({ where: { id: row.id } }); return; }
  const data = { date: c.startAt, category: 'Advertising', note, amount: spend, currency: c.currency };
  if (row) await db.expense.update({ where: { id: row.id }, data }); else await db.expense.create({ data });
}

export async function saveCampaign(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const platform = PLATFORMS[str(fd, 'platform')] ? str(fd, 'platform') : 'other';
  let target = str(fd, 'target') || '/';
  try { const u = new URL(target, 'http://x'); target = u.host === 'x' || u.origin === process.env.SITE_URL ? u.pathname + u.search : '/'; } catch { target = '/'; }
  const data = {
    name: str(fd, 'name').slice(0, 120) || 'Untitled', platform, kind: str(fd, 'kind') === 'ad' ? 'ad' : 'post', target,
    message: str(fd, 'message').slice(0, 2000), image: str(fd, 'image').slice(0, 500),
    currency: ['BDT', 'MYR', 'USD'].includes(str(fd, 'currency')) ? str(fd, 'currency') : 'BDT', budget: num(fd, 'budget'),
    startAt: date(fd, 'startAt') || new Date(), endAt: date(fd, 'endAt'),
  };
  const c = id ? await db.campaign.update({ where: { id }, data }) : await db.campaign.create({ data: { ...data, code: await newCode() } });
  if (id) await spendExpense(c, Number(c.spend));
  back(c.id, id ? 'Saved.' : 'Created. Copy the tracked link or post it below.');
}

export async function saveStats(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const c = await db.campaign.update({ where: { id }, data: {
    views: num(fd, 'views'), reach: num(fd, 'reach'), shares: num(fd, 'shares'), likes: num(fd, 'likes'), comments: num(fd, 'comments'),
    spend: num(fd, 'spend'), externalId: str(fd, 'externalId').slice(0, 200), status: ['active', 'paused', 'ended'].includes(str(fd, 'status')) ? str(fd, 'status') : 'active',
  } });
  await spendExpense(c, Number(c.spend));
  back(id, 'Numbers saved.');
}

export async function syncOne(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const err = await syncCampaign(id);
  const c = await db.campaign.findUnique({ where: { id } });
  if (c && !err) await spendExpense(c, Number(c.spend));
  back(id, err || 'Numbers brought back.');
}

export async function syncAll() {
  await requireAdmin();
  const list = await db.campaign.findMany({ where: { externalId: { not: '' }, status: { not: 'ended' } } });
  let ok = 0;
  for (const c of list) if (!(await syncCampaign(c.id))) { ok++; const f = await db.campaign.findUnique({ where: { id: c.id } }); if (f) await spendExpense(f, Number(f.spend)); }
  updateTag('catalog');
  redirect(`/admin/social?note=${encodeURIComponent(`Synced ${ok} of ${list.length}.`)}`);
}

export async function publish(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id'), where = str(fd, 'where');
  const c = await db.campaign.findUnique({ where: { id } });
  if (!c) return;
  let note = '';
  try {
    const link = goLink(c.code);
    const postId = where === 'instagram' ? await postToInstagram(`${c.message}\n\n${link}`.trim(), c.image) : await postToFacebook(c.message, link, c.image);
    await db.campaign.update({ where: { id }, data: { externalId: postId, platform: where === 'instagram' ? 'instagram' : 'facebook', kind: 'post' } });
    note = `Posted to ${where === 'instagram' ? 'Instagram' : 'Facebook'}.`;
  } catch (e) { note = `Could not post: ${(e as Error).message}`.slice(0, 300); }
  back(id, note);
}

export async function deleteCampaign(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const c = await db.campaign.delete({ where: { id } });
  await spendExpense(c, 0);
  updateTag('catalog');
  redirect('/admin/social?note=Deleted.');
}
