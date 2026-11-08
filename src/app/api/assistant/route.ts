import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assistantReady, botReply, getBot, notifySeller, save } from '@/lib/assistant';
import { currentCustomer } from '@/lib/auth';
import { runDueSoon } from '@/lib/schedule';

// GET: is the chat on, plus new messages of this visitor's chat (the seller's replies arrive this way).
// POST: a customer message (or "contact the seller"); the AI answers unless the seller has taken over.
const pub = (m: { id: string; role: string; text: string; at: Date }) => ({ id: m.id, role: m.role, text: m.text, at: m.at.toISOString() });

async function thread(id: string | null) {
  return id && /^[a-z0-9]{20,40}$/.test(id) ? db.chatThread.findUnique({ where: { id } }) : null;
}

export async function GET(req: NextRequest) {
  runDueSoon();
  const sp = req.nextUrl.searchParams;
  const [on, bot, t] = await Promise.all([assistantReady(), getBot(), thread(sp.get('t'))]);
  const after = sp.get('after') && !isNaN(Date.parse(sp.get('after')!)) ? new Date(sp.get('after')!) : new Date(0);
  const messages = t ? await db.chatMessage.findMany({ where: { threadId: t.id, at: { gt: after } }, orderBy: { at: 'asc' }, take: 100 }) : [];
  // The chat button also shows when the AI is off but the seller can still answer.
  return NextResponse.json({ on: on || bot.handover, ai: on, name: bot.name, greeting: bot.greeting, messages: messages.map(pub), seller: !!t?.needsHuman, paused: !!t?.aiPaused });
}

const hits = new Map<string, number[]>(); // per server instance: at most 30 messages per visitor per 10 minutes
function limited(ip: string) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(x => now - x < 600e3);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 30;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'Too many messages. Please wait a few minutes.' }, { status: 429 });
  const body = await req.json().catch(() => null) as { t?: string; text?: string; seller?: boolean; lang?: string; cur?: string; country?: string } | null;
  const text = String(body?.text || '').trim().slice(0, 1500);
  if (!text && !body?.seller) return NextResponse.json({ error: 'Type a question.' }, { status: 400 });
  const me = await currentCustomer();
  let t = await thread(body?.t || null);
  if (!t) t = await db.chatThread.create({ data: { email: me?.email || '', name: me?.name || '', country: String(body?.country || me?.country || '').slice(0, 60), lang: String(body?.lang || 'en').slice(0, 5) } });
  else if (me?.email && !t.email) t = await db.chatThread.update({ where: { id: t.id }, data: { email: me.email, name: me.name } });
  const since = new Date(Date.now() - 1000);
  if (text) await save(t.id, 'user', text);
  try {
    if (body?.seller) {
      await notifySeller(t.id, 'The customer pressed "Contact the seller".');
      await save(t.id, 'system', 'The seller has been notified and will reply right here. Leave your email or phone too, so they can reach you if you close this page.');
    } else if (!t.aiPaused && (await assistantReady())) await botReply(t.id, String(body?.cur || 'USD'));
    else if (!t.needsHuman) { await notifySeller(t.id, 'New chat message (AI is off for this chat).'); await save(t.id, 'system', 'Thank you! The seller will reply here soon.'); }
  } catch (e) { console.error('chat failed', e); }
  const messages = await db.chatMessage.findMany({ where: { threadId: t.id, at: { gte: since } }, orderBy: { at: 'asc' } });
  return NextResponse.json({ t: t.id, messages: messages.map(pub) });
}
