import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { monthRange } from '../month';

// The month's ledger as a CSV for the accountant or a spreadsheet.
export async function GET(req: Request) {
  if (!(await adminOrNull('ledger'))) return new Response('Not allowed', { status: 403 });
  const { m, from, to } = monthRange(new URL(req.url).searchParams.get('m'));
  const list = await db.ledgerEntry.findMany({ where: { at: { gte: from, lt: to } }, orderBy: { at: 'asc' } });
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [['Date', 'Direction', 'Kind', 'Method', 'Amount', 'Currency', 'Order', 'Reference', 'Note', 'By'].join(','),
    ...list.map(e => [e.at.toISOString(), e.dir, e.kind, e.method, Number(e.amount).toFixed(2), e.currency, e.orderNo, e.ref, e.note, e.by].map(q).join(','))].join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="ledger-${m}.csv"` } });
}
