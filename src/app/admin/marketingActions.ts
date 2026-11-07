'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { sendCampaign } from '@/lib/newsletter';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// "Send test to me" goes only to the signed-in admin; "Send to subscribers" needs the confirm box ticked.
export async function sendNewsletter(fd: FormData) {
  const subject = str(fd, 'subject').slice(0, 150), body = str(fd, 'body').slice(0, 20000);
  if (!subject || !body) throw new Error('Write a subject and a message');
  const test = str(fd, 'mode') === 'test';
  if (!test && fd.get('sure') !== 'yes') redirect(`/admin/marketing?${new URLSearchParams({ note: 'Tick the box to confirm before sending to everyone.' })}`);
  const me = await requireAdmin('marketing', test ? 'testNewsletter' : 'sendNewsletter', subject);
  const r = await sendCampaign(subject, body, me.email || '', test ? me.email || '' : '');
  revalidatePath('/admin/marketing');
  redirect(`/admin/marketing?${new URLSearchParams({ note: test ? `Test sent to ${me.email}.` : `Sent to ${r.sent} subscribers${r.failed ? `, ${r.failed} failed` : ''}.` })}`);
}
