import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({ id: '' }));
  if (typeof id !== 'string' || !id || id.length > 40) return new Response(null, { status: 204 });
  const day = new Date(new Date().toISOString().slice(0, 10));
  await db.productView.upsert({ where: { productId_day: { productId: id, day } }, update: { views: { increment: 1 } }, create: { productId: id, day, views: 1 } }).catch(() => {});
  return new Response(null, { status: 204 });
}
