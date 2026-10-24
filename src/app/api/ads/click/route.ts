import { db } from '@/lib/db';

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({ id: '' }));
  if (id) await db.ad.updateMany({ where: { id: String(id) }, data: { clicks: { increment: 1 } } });
  return new Response(null, { status: 204 });
}
