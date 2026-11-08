import 'server-only';
import { db } from './db';
import { getSettings } from './catalog';
import { loadKeys, key } from './keys';

// Everything that waits for a person, and suggestions worked out from the store's own data.
export type Todo = { id: string; n: number; title: string; text: string; href: string; cta: string };
export type Tip = { id: string; level: 'high' | 'medium' | 'low'; title: string; text: string; href: string };
export const LOW_STOCK = 5;

const stockOf = (s: unknown) => Object.values((s || {}) as Record<string, number>).reduce((a, n) => a + (Number(n) || 0), 0);

export async function lowStock() {
  const list = await db.product.findMany({ where: { active: true }, select: { id: true, name: true, sub: true, stock: true } });
  return list.map(p => ({ ...p, all: stockOf(p.stock) })).filter(p => p.all <= LOW_STOCK).sort((a, b) => a.all - b.all);
}

export async function todos(): Promise<Todo[]> {
  const s = await getSettings();
  const [confirm, ship, returns, reviews, tasks, low] = await Promise.all([
    db.order.count({ where: { payStatus: 'pending', payRef: { not: '' } } }),
    db.order.count({ where: { status: { lte: 1 }, payStatus: { in: ['paid', 'cod'] } } }),
    db.returnRequest.count({ where: { status: 'pending' } }),
    db.review.count({ where: { status: 'pending' } }),
    db.automationTask.count({ where: { status: 'pending' } }),
    s.preorder.on ? Promise.resolve([]) : lowStock(),
  ]);
  const all: Todo[] = [
    { id: 'confirm', n: confirm, title: 'Payments to check', text: 'Customers sent money and typed a transaction ID. Check it in your bKash, bank or PayPal and mark the order paid.', href: '/admin/orders?tab=confirming', cta: 'Check payments' },
    { id: 'ship', n: ship, title: 'Orders to pack and ship', text: 'Paid or cash-on-delivery orders that are not with a courier yet.', href: '/admin/orders?tab=preparing', cta: 'Open orders' },
    { id: 'returns', n: returns, title: 'Return requests', text: 'Customers asked to send something back. Approve to refund as store credit, or decline with a note.', href: '/admin/returns', cta: 'Decide returns' },
    { id: 'reviews', n: reviews, title: 'Reviews waiting', text: 'New reviews are held until you publish them, so fake ones never show.', href: '/admin/reviews', cta: 'Check reviews' },
    { id: 'tasks', n: tasks, title: 'Automation waiting for your OK', text: 'Jobs set to "ask first" want to do something.', href: '/admin/automation', cta: 'Approve or reject' },
    { id: 'stock', n: low.length, title: 'Products running low', text: low.slice(0, 4).map(p => `${p.name}${p.sub ? ' · ' + p.sub : ''} (${p.all} left)`).join(', '), href: '/admin/suppliers', cta: 'Restock' },
  ];
  return all.filter(t => t.n > 0);
}

export async function tips(): Promise<Tip[]> {
  const [s] = await Promise.all([getSettings(), loadKeys()]);
  const [live, offers, orders30, pay] = await Promise.all([
    db.product.count({ where: { active: true } }),
    db.offer.count({ where: { on: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }], product: { active: true } } }),
    db.order.count({ where: { createdAt: { gt: new Date(Date.now() - 30 * 864e5) } } }),
    Promise.resolve(s.manualPay.filter(m => m.on && m.details).length),
  ]);
  const out: Tip[] = [];
  if (!pay) out.push({ id: 'pay', level: 'high', title: 'No hand payment method is switched on', text: 'Switch on bKash, Nagad, bank or PayPal and write your number, so customers can pay before delivery.', href: '/admin/payments' });
  if (!offers) out.push({ id: 'offers', level: 'medium', title: 'No active offers', text: "Start a 'Buy 2 get 1 free' or a 48-hour flash sale on a product to lift orders.", href: '/admin/products' });
  if (live < 12) out.push({ id: 'products', level: 'low', title: `Only ${live} products live`, text: 'Stores with more products convert better. Add more from your suppliers.', href: '/admin/products/new' });
  if (!orders30) out.push({ id: 'orders', level: 'medium', title: 'No orders in the last 30 days', text: 'Share a product on Facebook with a tracked link from Marketing, so you can see which post sells.', href: '/admin/social' });
  if (!key('ANTHROPIC_API_KEY')) out.push({ id: 'ai', level: 'low', title: 'The AI shop assistant is off', text: 'Connect an AI key so customers get answers day and night.', href: '/admin/connections' });
  if (!s.rewardRate) out.push({ id: 'loyalty', level: 'low', title: 'Loyalty points are off', text: 'A small reward on every order brings customers back.', href: '/admin/loyalty' });
  return out;
}
