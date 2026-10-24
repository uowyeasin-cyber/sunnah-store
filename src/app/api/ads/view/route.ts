import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { ids } = await req.json().catch(() => ({ ids: [] }));
  if (Array.isArray(ids) && ids.length && ids.length <= 20) await db.ad.updateMany({ where: { id: { in: ids.map(String) } }, data: { views: { increment: 1 } } });
  return new Response(null, { status: 204 });
}
