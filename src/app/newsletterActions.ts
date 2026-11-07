'use server';
import { subscribe } from '@/lib/newsletter';

export async function joinNewsletter(_: unknown, fd: FormData) {
  try { return await subscribe(String(fd.get('email') ?? ''), String(fd.get('lang') ?? 'en').slice(0, 5), 'footer'); }
  catch (e) { console.error('subscribe failed', e); return { error: 'Could not sign you up just now. Please try again.' }; }
}
