'use server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { addCredit } from '@/lib/credit';
import { advance, sendToCourier } from '@/lib/fulfil';
import { DELIVERED } from '@/lib/tracking';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const D = (n: number) => new Prisma.Decimal(n.toFixed(2));

export async function saveOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const status = Math.min(DELIVERED, Math.max(0, Number(fd.get('status')) || 0));
  const date = (k: string) => (str(fd, k) ? new Date(str(fd, k)) : null);
  await advance(o.id, status, {
    manual: true, courier: str(fd, 'courier'), trackingNo: str(fd, 'trackingNo'), riderName: str(fd, 'riderName'), riderPhone: str(fd, 'riderPhone'),
    payStatus: str(fd, 'payStatus') || o.payStatus, etaFrom: date('etaFrom') ?? o.etaFrom, etaTo: date('etaTo') ?? o.etaTo,
  });
}

export async function bookCourier(fd: FormData) {
  await requireAdmin();
  await sendToCourier(str(fd, 'id'));
}

export async function refundOrder(fd: FormData) {
  await requireAdmin();
  const o = await db.order.findUniqueOrThrow({ where: { id: str(fd, 'id') } });
  const amount = Math.min(Number(o.total) + Number(o.creditUsed), Math.max(0, Number(fd.get('amount')) || 0));
  if (!o.customerId || !amount) return;
  await db.$transaction(async tx => {
    await addCredit(tx, o.customerId!, amount, o.currency, `Refund for order ${o.no}${str(fd, 'reason') ? ` · ${str(fd, 'reason')}` : ''}`, o.no);
    await tx.order.update({ where: { id: o.id }, data: { payStatus: 'refunded' } });
  });
}
