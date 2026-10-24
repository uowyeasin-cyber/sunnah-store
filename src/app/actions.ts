'use server';
import { sendLoginCode, signOut, verifyLoginCode } from '@/lib/auth';

export async function requestCode(email: string) { return sendLoginCode(email); }
export async function confirmCode(email: string, code: string) { return verifyLoginCode(email, code); }
export async function logout() { await signOut(); }

export async function submitReview(fd: FormData) {
  const { db } = await import('@/lib/db');
  const { getSettings } = await import('@/lib/catalog');
  const { saveUpload } = await import('@/lib/upload');
  const { currentCustomer } = await import('@/lib/auth');
  const { updateTag } = await import('next/cache');
  const s = await getSettings();
  const productId = String(fd.get('productId') || '');
  const text = String(fd.get('text') || '').trim().slice(0, 1200);
  const name = String(fd.get('name') || '').trim().slice(0, 60);
  const stars = Math.min(5, Math.max(1, Number(fd.get('stars')) || 5));
  if (!text || !name || !(await db.product.findUnique({ where: { id: productId } }))) return { message: 'Please add your name and a few words.' };
  const files = (fd.getAll('media') as File[]).filter(f => f && f.size).slice(0, 4).filter(f => s.allowVideoReviews || !f.type.startsWith('video/'));
  let media: string[] = [];
  try { media = await Promise.all(files.map(f => saveUpload(f, 'reviews'))); } catch (e) { return { message: (e as Error).message }; }
  const me = await currentCustomer();
  const verified = !!me && (await db.orderLine.count({ where: { productId, order: { customerId: me.id } } })) > 0;
  await db.review.create({ data: { productId, name, place: String(fd.get('place') || '').slice(0, 60), stars, text, media, verified, status: s.holdReviews ? 'pending' : 'live' } });
  if (!s.holdReviews) updateTag('catalog');
  return { message: s.holdReviews ? 'Thank you. Your review shows after a quick check.' : 'Thank you. Your review is live.' };
}
