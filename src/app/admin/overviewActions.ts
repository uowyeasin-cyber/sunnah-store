'use server';
import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { addCredit } from '@/lib/credit';
import { isCurrency } from '@/lib/money';

export async function saveLoyalty(fd: FormData) {
  await requireAdmin('loyalty', 'saveLoyalty', String(fd.get('rewardRate')));
  const rate = Math.min(5, Math.max(0, Number(fd.get('rewardRate')) || 0));
  await db.setting.upsert({ where: { key: 'rewardRate' }, update: { value: rate }, create: { key: 'rewardRate', value: rate } });
  updateTag('catalog');
  redirect('/admin/loyalty?saved=1');
}

// Give (or take back, with a minus amount) store credit by hand, e.g. a goodwill gesture.
export async function giveCredit(fd: FormData) {
  const email = String(fd.get('email') || '').trim().toLowerCase(), amount = Math.round(Number(fd.get('amount')) * 100) / 100;
  const cur = String(fd.get('currency') || 'USD'), note = String(fd.get('note') || '').trim().slice(0, 120) || 'Given by the store';
  await requireAdmin('loyalty', 'giveCredit', `${email} ${amount} ${cur}`);
  const back = (m: string) => redirect('/admin/loyalty?note=' + encodeURIComponent(m));
  if (!amount || !isCurrency(cur)) back('Enter an amount.');
  const c = await db.customer.findUnique({ where: { email } });
  if (!c) back(`No customer with the email ${email}.`);
  if (amount < 0 && Number(c!.credit) < -amount) back(`${email} has only ${c!.credit} ${c!.currency} credit.`);
  await db.$transaction(tx => addCredit(tx, c!.id, amount, cur, note, ''));
  back(`${amount > 0 ? 'Added' : 'Took back'} ${Math.abs(amount)} ${cur} ${amount > 0 ? 'to' : 'from'} ${email}.`);
}
