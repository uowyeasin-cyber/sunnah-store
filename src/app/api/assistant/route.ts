import { NextRequest, NextResponse } from 'next/server';
import { assistantReady, chat, type ChatTurn } from '@/lib/assistant';

// GET: is the chat button on? POST: one assistant reply to the conversation so far.
export async function GET() {
  return NextResponse.json({ on: await assistantReady() });
}

const hits = new Map<string, number[]>(); // per server instance: at most 20 messages per visitor per 10 minutes
function limited(ip: string) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 600e3);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 20;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (limited(ip)) return NextResponse.json({ error: 'Too many messages. Please wait a few minutes.' }, { status: 429 });
  const body = await req.json().catch(() => null) as { messages?: ChatTurn[]; lang?: string; cur?: string } | null;
  const history = (Array.isArray(body?.messages) ? body!.messages : []).slice(-16)
    .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') return NextResponse.json({ error: 'Type a question.' }, { status: 400 });
  try {
    const r = await chat(history, String(body?.lang || 'en').slice(0, 5), String(body?.cur || 'USD'));
    if (r.error === 'off') return NextResponse.json({ error: 'The assistant is not available right now.' }, { status: 503 });
    if (r.error === 'busy') return NextResponse.json({ error: 'The assistant is busy today. Please use Track order or email us.' }, { status: 503 });
    return NextResponse.json({ text: r.text });
  } catch (e) {
    console.error('assistant failed', e);
    return NextResponse.json({ error: 'The assistant could not answer just now. Please try again.' }, { status: 502 });
  }
}
