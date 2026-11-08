import 'server-only';
import { db } from './db';
import { key, loadKeys } from './keys';
import { getProduct, getProducts, getSettings } from './catalog';
import { formatPrice, isCurrency, unitCents, type Currency } from './money';
import { COUNTRIES, payMethodsFor, shippingFor } from './shipping';
import { DELIVERED, STEPS } from './tracking';
import { RETURN_DAYS, RETURN_REASONS } from './returns';
import { sendMail } from './mail';
import { roleOf } from './roles';
import { aiReady, ask, type Turn } from './ai';

// The shop's chat assistant. It works with any connected AI (free Gemini, Groq or OpenRouter, or Claude).
// It answers only from facts read here from the real catalog, shipping rules, policies and orders,
// and hands the chat to the seller when it cannot help or the customer asks.
export const DAILY_LIMIT = 400; // assistant replies per day across the whole shop
const site = () => process.env.SITE_URL || 'https://sunnahstore.vercel.app';

type Ctx = { cur: Currency; transcript: string };

async function runTool(name: string, input: Record<string, unknown>, ctx: Ctx): Promise<string> {
  const s = await getSettings();
  const str = (k: string) => String(input[k] ?? '').trim();
  if (name === 'search_products' || name === 'get_product') {
    const all = await getProducts();
    const avail = s.preorder?.on ? `Pre-order: ${s.preorder.ships}` : 'Call get_product for stock';
    if (name === 'get_product') {
      const d = await getProduct(str('slug'));
      if (!d) return 'No product with that slug.';
      const left = Object.values(d.stock || {}).reduce((a, n) => a + Number(n || 0), 0);
      return JSON.stringify({ name: d.name, variant: d.sub, category: d.category.name, price: formatPrice(unitCents(d.priceCents, d.offer?.pct || 0), ctx.cur, s.rates), was: d.offer ? formatPrice(d.priceCents, ctx.cur, s.rates) : undefined,
        offer: d.offer?.label, availability: s.preorder?.on ? `Pre-order: ${s.preorder.ships}` : left > 0 ? 'In stock' : 'Out of stock', details: d.details, link: `${site()}/p/${d.slug}` });
    }
    const words = str('query').toLowerCase().split(/\s+/).filter(Boolean);
    const hit = all.filter(p => !words.length || words.some(w => `${p.name} ${p.sub} ${p.finish} ${p.kind} ${p.category.name}`.toLowerCase().includes(w)));
    return JSON.stringify((hit.length ? hit : all).slice(0, 20).map(p => ({ slug: p.slug, name: p.name, variant: p.sub, category: p.category.name, price: formatPrice(unitCents(p.priceCents, p.offer?.pct || 0), ctx.cur, s.rates), offer: p.offer?.label, availability: avail, link: `${site()}/p/${p.slug}` })));
  }
  if (name === 'shipping_info') {
    const c = COUNTRIES.find(x => x.toLowerCase() === str('country').toLowerCase());
    if (!c) return `We do not list that country. Countries we ship to: ${COUNTRIES.join(', ')}`;
    const sh = shippingFor(c, Math.round((Number(input.order_value_usd) || 0) * 100), s.regions);
    return JSON.stringify({ country: c, shipsFrom: sh.warehouse, courier: sh.courier, deliveryDays: `${sh.days[0]}–${sh.days[1]}`, shipping: formatPrice(sh.costCents, ctx.cur, s.rates), payMethods: payMethodsFor(c, s.regions), preorder: s.preorder?.on ? s.preorder.ships : undefined });
  }
  if (name === 'order_status') {
    const o = await db.order.findUnique({ where: { no: str('order_no').toUpperCase() }, include: { lines: true } });
    if (!o || o.email.toLowerCase() !== str('email').toLowerCase()) return 'No order matches that order number and email. Ask the customer to check both (the order number is in the receipt email).';
    return JSON.stringify({ order: o.no, status: STEPS[o.status] || 'Order placed', delivered: o.status >= DELIVERED, payment: o.payStatus, courier: o.courier, trackingNo: o.trackingNo || 'not booked yet',
      expected: o.etaFrom && o.etaTo ? `${o.etaFrom.toISOString().slice(0, 10)} to ${o.etaTo.toISOString().slice(0, 10)}` : undefined, preorder: o.preorder || undefined, items: o.lines.map(l => `${l.qty}× ${l.name}`), page: `${site()}/order/${o.id}` });
  }
  if (name === 'store_policies') {
    return JSON.stringify({ returns: `Within ${RETURN_DAYS} days of delivery, from the order page (Request a return). Reasons: ${RETURN_REASONS.join(', ')}. Approved refunds go to store credit.`,
      storeCredit: `Every delivered order earns some store credit back (do not quote a percentage), usable at checkout when signed in with the same email. Approved refunds also go to store credit.`,
      preorder: s.preorder?.on ? `Everything currently sells as pre-order: ${s.preorder.ships}.` : 'Items ship from stock.',
      account: 'Sign in with a six-digit email code (no password) to see orders, tracking, returns and store credit.', track: `${site()}/track`, contact: 'Ask me to pass a message to the team.' });
  }
  if (name === 'contact_human') {
    const email = str('email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Ask the customer for a valid email so the team can reply.';
    const owners = s.admins.filter(e => e && roleOf(e, s.roles) === 'owner');
    for (const to of owners) await sendMail(to, `Customer needs help: ${str('name') || email}`, `${str('summary')}\n\nReply to: ${email}\n\n--- Conversation ---\n${ctx.transcript}`.slice(0, 8000)).catch(e => console.error('handoff mail failed', e));
    return owners.length ? 'Sent to the team. They will reply by email.' : 'The team inbox is not set up; tell the customer to try again later.';
  }
  return 'Unknown tool';
}

// One counter row per day, so a runaway bot cannot run up the bill.
async function underDailyLimit() {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db.setting.findUnique({ where: { key: 'assistantUsage' } });
  const v = (row?.value || {}) as { day?: string; n?: number };
  const n = v.day === day ? (v.n || 0) + 1 : 1;
  if (n > DAILY_LIMIT) return false;
  await db.setting.upsert({ where: { key: 'assistantUsage' }, update: { value: { day, n } }, create: { key: 'assistantUsage', value: { day, n } } });
  return true;
}

// Chatbot settings, edited in Admin → AI tools & chatbot.
export type Bot = { on: boolean; handover: boolean; name: string; greeting: string; rules: string; knowledge: string };
export const BOT_DEFAULT: Bot = {
  on: true, handover: true, name: 'Shop assistant', greeting: 'Assalamu alaikum! How can I help you today? I can answer in any language.',
  rules: 'Be friendly and short. Reply in the customer\'s language. Recommend products from the catalog and mention active offers. Never invent prices, stock or delivery dates that are not in the data. If unsure, offer to connect the seller.',
  knowledge: '',
};
export async function getBot(): Promise<Bot> {
  const r = await db.setting.findUnique({ where: { key: 'chatbot' } });
  return { ...BOT_DEFAULT, ...((r?.value as Partial<Bot>) || {}) };
}
export async function assistantReady() {
  await loadKeys();
  return (await getBot()).on && key('ASSISTANT_ON') !== 'off' && (await aiReady());
}

const SELLER = '[[SELLER]]';
const CUR_COUNTRY: Record<string, string> = { BDT: 'Bangladesh', MYR: 'Malaysia', USD: 'United States' };

// Everything the bot may say comes from here: catalog, policies, delivery, and the customer's own orders.
async function facts(thread: { email: string; country: string }, transcript: string, cur: Currency) {
  const ctx: Ctx = { cur, transcript };
  const run = (n: string, i: Record<string, unknown>) => runTool(n, i, ctx).catch(() => 'not available');
  const countries = [...new Set([thread.country, CUR_COUNTRY[cur], 'Bangladesh', 'Malaysia', 'United States', 'United Kingdom'].filter(Boolean))];
  const nos = [...new Set((transcript.match(/PM-\d{6}-\d{5}/gi) || []).map(x => x.toUpperCase()))].slice(0, 3);
  const emails = [...new Set([thread.email, ...(transcript.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi) || [])].filter(Boolean).map(e => e.toLowerCase()))];
  const lookups = await Promise.all(nos.map(async no => {
    for (const email of emails) { const r = await run('order_status', { order_no: no, email }); if (r.startsWith('{')) return r; }
    return `${no}: ask for the email used on this order (it must match) before sharing anything.`;
  }));
  const mine = thread.email ? await db.order.findMany({ where: { email: thread.email }, orderBy: { createdAt: 'desc' }, take: 3, select: { no: true, status: true, courier: true, trackingNo: true, id: true, payStatus: true } }) : [];
  return [
    `CATALOG (prices already in the customer's currency): ${await run('search_products', { query: '' })}`,
    `POLICIES: ${await run('store_policies', {})}`,
    `DELIVERY: ${(await Promise.all(countries.map(c => run('shipping_info', { country: c, order_value_usd: 0 })))).join('\n')}`,
    `TRACK PAGE: ${site()}/track (order number + email)`,
    mine.length ? `SIGNED-IN CUSTOMER'S ORDERS: ${JSON.stringify(mine.map(o => ({ order: o.no, status: STEPS[o.status], payment: o.payStatus, courier: o.courier, tracking: o.trackingNo || 'not booked yet', page: `${site()}/order/${o.id}` })))}` : '',
    lookups.length ? `ORDER LOOKUPS: ${lookups.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');
}

// Emails the owners once when a chat needs a person.
export async function notifySeller(threadId: string, why: string) {
  const t = await db.chatThread.findUnique({ where: { id: threadId }, include: { messages: { orderBy: { at: 'asc' }, take: 40 } } });
  if (!t || t.needsHuman) return;
  await db.chatThread.update({ where: { id: threadId }, data: { needsHuman: true, unread: { increment: 1 } } });
  const s = await getSettings();
  const owners = s.admins.filter(e => e && roleOf(e, s.roles) === 'owner');
  const log = t.messages.map(m => `${m.role === 'user' ? 'Customer' : m.role === 'admin' ? 'You' : 'Bot'}: ${m.text}`).join('\n');
  for (const to of owners) await sendMail(to, `Customer wants the seller${t.email ? ': ' + t.email : ''}`, `${why}\n\nReply in Admin → Customer chats: ${site()}/admin/chats?id=${t.id}\n\n${log}`.slice(0, 8000)).catch(e => console.error('seller mail failed', e));
}

// One AI reply to a chat, saved to the thread. The bot hands over to the seller when it cannot help.
export async function botReply(threadId: string, cur: string): Promise<string> {
  const t = await db.chatThread.findUniqueOrThrow({ where: { id: threadId }, include: { messages: { orderBy: { at: 'desc' }, take: 16 } } });
  const msgs = t.messages.reverse();
  const turns: Turn[] = [];
  for (const m of msgs) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const text = m.role === 'admin' ? `(Seller) ${m.text}` : m.text;
    if (turns.length && turns[turns.length - 1].role === role) turns[turns.length - 1].content += '\n' + text; else turns.push({ role, content: text });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return '';
  if (!(await underDailyLimit())) { await notifySeller(t.id, 'The bot reached its daily limit.'); return save(t.id, 'system', 'Our assistant is busy right now. The seller has been told and will reply here soon.'); }
  const [s, bot] = await Promise.all([getSettings(), getBot()]);
  const c: Currency = isCurrency(cur) ? cur : 'USD';
  const system = `You are "${bot.name}", the chat assistant of ${s.store.name}, an online shop: ${s.store.tagline}
You answer customers 24/7 about products, prices, offers, delivery, payment (including cash on delivery), order tracking, returns, refunds and store credit, and you keep them happy.
SHOP OWNER'S INSTRUCTIONS: ${bot.rules}
${bot.knowledge ? `SHOP KNOWLEDGE: ${bot.knowledge}\n` : ''}HARD RULES:
- Facts come ONLY from the DATA below. Never guess a price, stock, delivery date, order status or policy. If it is not in the DATA, say you will check with the seller.
- Order status: you need the order number (like PM-261108-12345) AND the email used on the order; only share an order shown under ORDER LOOKUPS or SIGNED-IN CUSTOMER'S ORDERS. Give the order page link.
- If a parcel is late, lost or damaged, or the customer is upset: apologise sincerely, explain what the DATA says, offer the return/refund path from POLICIES (refunds go to store credit), and offer the seller.
- Never promise discounts, refunds or changes yourself. Never show the store credit percentage.
- Reply in the customer's language (site language: ${t.lang}). Short, warm, plain text, no tables. Share product links from the DATA.
${bot.handover ? `- If the customer asks for a human, the seller, a phone call, or you cannot solve it, reply kindly and put ${SELLER} at the very end of your message.` : ''}

DATA:
${await facts(t, turns.map(x => `${x.role}: ${x.content}`).join('\n'), c)}`;
  let text: string;
  try { text = (await ask(system, turns, { maxTokens: 700 })).text; }
  catch (e) { console.error('bot failed', e); await notifySeller(t.id, `The AI could not answer: ${(e as Error)?.message?.slice(0, 200) || 'no key, or every free allowance is used up today'}. Check Admin → AI tools & chatbot → Test the chatbot.`); return save(t.id, 'system', 'Sorry, I cannot answer right now. The seller has been told and will reply here.'); }
  const wantsSeller = text.includes(SELLER);
  text = text.replaceAll(SELLER, '').trim() || 'Let me get the seller for you.';
  const out = await save(t.id, 'ai', text);
  if (wantsSeller && bot.handover) { await notifySeller(t.id, 'The bot handed this chat to you.'); await save(t.id, 'system', 'The seller has been notified and will reply here. You can keep writing.'); }
  return out;
}

export async function save(threadId: string, role: 'user' | 'ai' | 'admin' | 'system', text: string) {
  await db.chatMessage.create({ data: { threadId, role, text: text.slice(0, 4000) } });
  await db.chatThread.update({ where: { id: threadId }, data: { lastAt: new Date(), ...(role === 'user' ? { unread: { increment: 1 }, closed: false } : {}) } });
  return text;
}
