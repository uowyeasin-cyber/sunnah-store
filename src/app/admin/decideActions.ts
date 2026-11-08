'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { setPayStatus } from '@/lib/ledger';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// Every button in Today's decisions: approve, reject, delete or close one item right there.
export async function decideItem(fd: FormData) {
  const kind = str(fd, 'kind'), id = str(fd, 'id'), to = str(fd, 'to');
  if (kind === 'pay' || kind === 'ship') {
    const me = await requireAdmin('orders', `decide-${kind}-${to}`, id);
    if (kind === 'pay') await setPayStatus(id, to === 'yes' ? 'paid' : 'failed', me.email || '');
    else if (to === 'yes') { const { sendToCourier } = await import('@/lib/fulfil'); await sendToCourier(id).catch(() => {}); }
    else {
      // Cancel: stop the order, put its units back on the shelf and note it on the order.
      await setPayStatus(id, 'cancelled', me.email || '');
      const o = await db.order.findUnique({ where: { id }, include: { lines: true } });
      if (o) {
        const { returnStock } = await import('@/lib/stock');
        await db.$transaction(async tx => {
          const c = await tx.order.updateMany({ where: { id, stockHeld: true }, data: { stockHeld: false } });
          if (c.count) await returnStock(tx, o.warehouse, o.lines.flatMap(l => (l.productId ? [{ productId: l.productId, qty: l.qty }] : [])));
          await tx.order.update({ where: { id }, data: { events: [...(o.events as object[]), { at: new Date().toISOString(), step: -1, note: `Cancelled by ${me.email} in Today's decisions${c.count ? ', stock returned' : ''}` }] } });
        });
      }
    }
  } else if (kind === 'return') {
    const r = await db.returnRequest.findUniqueOrThrow({ where: { id }, include: { order: true } });
    const f = new FormData();
    f.set('id', id); f.set('to', to === 'yes' ? 'approved' : 'declined');
    f.set('amount', String(Number(r.order.total) + Number(r.order.creditUsed))); f.set('restock', '1');
    const { decideReturn } = await import('./orderActions');
    await decideReturn(f);
  } else if (kind === 'review') {
    await requireAdmin('reviews', `decide-review-${to}`, id);
    if (to === 'delete') await db.review.delete({ where: { id } });
    else await db.review.update({ where: { id }, data: { status: to === 'yes' ? 'live' : 'hidden' } });
    const { updateTag } = await import('next/cache'); updateTag('catalog');
  } else if (kind === 'task') {
    const me = await requireAdmin('automation', `decide-task-${to}`, id);
    const { decideTask } = await import('@/lib/automation');
    await decideTask(id, to === 'yes', me.email || '');
  } else if (kind === 'aijob') {
    await requireAdmin('ai', `decide-aijob-${to}`, id);
    const { applyJob } = await import('@/lib/cowork');
    const j = await db.aiJob.findUnique({ where: { id } });
    if (j?.status === 'proposed') { if (to === 'yes') await applyJob(id); else await db.aiJob.update({ where: { id }, data: { status: 'rejected' } }); }
  } else if (kind === 'chat') {
    await requireAdmin('chats', `decide-chat-${to}`, id);
    await db.chatThread.update({ where: { id }, data: to === 'yes' ? { needsHuman: false, aiPaused: false } : { closed: true, needsHuman: false, unread: 0 } });
  } else if (kind === 'stock') {
    await requireAdmin('products', `decide-stock-${to}`, id);
    if (to === 'hide') { await db.product.update({ where: { id }, data: { active: false } }); const { updateTag } = await import('next/cache'); updateTag('catalog'); }
  }
  revalidatePath('/admin/decisions');
  revalidatePath('/admin/dashboard');
}
