'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Make live, hide, archive, restore or delete many products at once.
export async function bulkProducts(fd: FormData) {
  const ids = fd.getAll('ids').map(String).filter(Boolean).slice(0, 500), act = String(fd.get('act') || '');
  await requireAdmin('products', 'bulkProducts', `${act} ${ids.length}`);
  const where = { id: { in: ids } };
  let note = '';
  if (!ids.length) note = 'Tick at least one product.';
  else if (act === 'live') { await db.product.updateMany({ where, data: { active: true, archived: false } }); note = `${ids.length} made live.`; }
  else if (act === 'hide') { await db.product.updateMany({ where, data: { active: false } }); note = `${ids.length} hidden.`; }
  else if (act === 'archive') { await db.product.updateMany({ where, data: { active: false, archived: true } }); note = `${ids.length} archived. Restore them from the Archived tab.`; }
  else if (act === 'restore') { await db.product.updateMany({ where, data: { archived: false } }); note = `${ids.length} restored as hidden.`; }
  else if (act === 'delete') { await db.product.deleteMany({ where }); note = `${ids.length} deleted. Past orders keep their names and prices.`; }
  updateTag('catalog');
  redirect(`/admin/products?${new URLSearchParams({ tab: String(fd.get('tab') || 'all'), note })}`);
}
