'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { save, getBot, BOT_DEFAULT, type Bot } from '@/lib/assistant';
import { PROVIDERS, AiError, ask, type ProviderId } from '@/lib/ai';
import { saveKeys, storedKeys } from '@/lib/keys';
import { applyJob, planJob } from '@/lib/cowork';
import { getSettings } from '@/lib/catalog';

const str = (fd: FormData, k: string) => String(fd.get(k) || '').trim();

// ---------- Customer chats ----------
export async function replyChat(fd: FormData) {
  const id = str(fd, 'id'), text = str(fd, 'text').slice(0, 3000), pause = !!fd.get('pause');
  await requireAdmin('chats', 'replyChat', id);
  // Customers see every reply, so a pasted API key is stopped here and the owner is sent to the right place.
  if (/(\bAIza[0-9A-Za-z_-]{20,}|\bAQ\.[0-9A-Za-z_-]{20,}|\bgsk_[0-9A-Za-z]{20,}|\bsk-(or-|ant-)?[0-9A-Za-z_-]{20,})/.test(text)) redirect(`/admin/chats?id=${id}&note=${encodeURIComponent('Not sent: that looks like an AI key, and customers would see it. Paste keys in AI tools & chatbot → Connect.')}`);
  if (text) await save(id, 'admin', text);
  await db.chatThread.update({ where: { id }, data: { unread: 0, ...(pause ? { aiPaused: true } : {}) } });
  redirect(`/admin/chats?id=${id}`);
}
export async function chatAction(fd: FormData) {
  const id = str(fd, 'id'), what = str(fd, 'what');
  await requireAdmin('chats', 'chat-' + what, id);
  const data = what === 'pause' ? { aiPaused: true } : what === 'resume' ? { aiPaused: false, needsHuman: false } : what === 'close' ? { closed: true, needsHuman: false, unread: 0 } : what === 'reopen' ? { closed: false } : {};
  await db.chatThread.update({ where: { id }, data });
  if (what === 'resume') await save(id, 'system', 'The AI assistant is answering again. Press "Contact the seller" any time.');
  redirect(`/admin/chats?id=${id}`);
}

// ---------- AI tools & chatbot ----------
const back = (m: string, hash = ''): never => redirect('/admin/aitools?note=' + encodeURIComponent(m) + hash);

// Which AI a key belongs to, from how it starts. Lets the owner paste any key into one box.
function detect(k: string): ProviderId | '' {
  if (/^(AIza|AQ\.)/.test(k)) return 'gemini';
  if (k.startsWith('gsk_')) return 'groq';
  if (k.startsWith('sk-or-')) return 'openrouter';
  if (k.startsWith('sk-ant-')) return 'claude';
  return '';
}

export async function connectAi(fd: FormData) {
  if (str(fd, 'provider') === 'auto') {
    const id = detect(str(fd, 'key'));
    if (!id) back('That key was not recognised. Gemini keys start with AIza or AQ., Groq with gsk_, OpenRouter with sk-or-, Claude with sk-ant-.', '#connect');
    fd.set('provider', id);
  }
  const p = PROVIDERS.find(x => x.id === str(fd, 'provider'));
  if (!p) back('Pick an AI.');
  await requireAdmin('aitools', 'connectAi', p!.id);
  const k = str(fd, 'key');
  if (k.length < 20) back(`Paste the whole ${p!.name} key.`, '#connect');
  const before = await storedKeys();
  await saveKeys({ ...before, [p!.env]: k });
  try { await ask('Reply with the word OK.', [{ role: 'user', content: 'Test' }], { maxTokens: 10, only: p!.id }); }
  catch (e) {
    // Busy or over the limit means the key itself is fine: keep it, the chat retries on its own.
    if (e instanceof AiError && [429, 500, 503].includes(e.status)) back(`${p!.name} key saved. It is busy right now (${e.status}); the chat tries again by itself on every message.`, '#connect');
    await saveKeys(before);
    back(`${p!.name} did not accept the key: ${(e as Error).message.slice(0, 160)}`, '#connect');
  }
  back(`${p!.name} is connected and answering.`, '#connect');
}
export async function aiProvider(fd: FormData) {
  const id = str(fd, 'provider') as ProviderId, what = str(fd, 'what');
  const p = PROVIDERS.find(x => x.id === id);
  if (!p) back('Pick an AI.');
  await requireAdmin('aitools', 'aiProvider-' + what, id);
  const keys = await storedKeys();
  if (what === 'remove') { delete keys[p!.env]; if (keys.AI_PROVIDER === id) delete keys.AI_PROVIDER; }
  else keys.AI_PROVIDER = id;
  await saveKeys(keys);
  back(what === 'remove' ? `${p!.name} removed.` : `${p!.name} answers first now. The others take over if it runs out.`, '#connect');
}

export async function saveBot(fd: FormData) {
  await requireAdmin('aitools', 'saveBot');
  const b: Bot = {
    on: !!fd.get('on'), handover: !!fd.get('handover'),
    name: str(fd, 'name').slice(0, 40) || BOT_DEFAULT.name, greeting: str(fd, 'greeting').slice(0, 300) || BOT_DEFAULT.greeting,
    rules: str(fd, 'rules').slice(0, 3000) || BOT_DEFAULT.rules, knowledge: str(fd, 'knowledge').slice(0, 8000),
  };
  await db.setting.upsert({ where: { key: 'chatbot' }, update: { value: b }, create: { key: 'chatbot', value: b } });
  back('Chatbot saved.', '#bot');
}

// Writes the shop knowledge (FAQ) from the real store settings so the bot can answer more by itself.
export async function fillKnowledge() {
  await requireAdmin('aitools', 'fillKnowledge');
  const [s, bot] = await Promise.all([getSettings(), getBot()]);
  try {
    const r = await ask('You write short FAQ notes for a shop chatbot. Plain text, one fact per line, no invented facts.', [{ role: 'user', content: `Write up to 25 lines of facts a customer may ask about, only from this store data:\n${JSON.stringify(s).slice(0, 12000)}` }], { maxTokens: 900 });
    const b = { ...bot, knowledge: r.text.slice(0, 8000) };
    await db.setting.upsert({ where: { key: 'chatbot' }, update: { value: b }, create: { key: 'chatbot', value: b } });
  } catch (e) { back('The AI could not answer: ' + (e as Error).message.slice(0, 160), '#bot'); }
  back('Knowledge filled from your store. Read it and change anything that is wrong.', '#bot');
}

const TOOLS: Record<string, [string, string]> = {
  analyze: ['Analyze my business', 'You are a sharp e-commerce advisor. Look at the store data and give the 5 most useful, concrete next steps, each with why.'],
  research: ['Market research', 'You are a market researcher. Give demand, competitors to watch, price ranges, target customers and the best countries to sell to, as short bullet points. Say what is an estimate.'],
  posts: ['Marketing posts', 'You write social media posts (Facebook, Instagram, TikTok captions) with hashtags. Give 5 varied posts.'],
  reply: ['Draft a customer reply', 'You write warm, short, honest customer service replies for the shop.'],
  policy: ['Write a policy', 'You write clear, fair shop policies in plain language with headings.'],
};
export async function runTool(fd: FormData) {
  const tool = str(fd, 'tool'), input = str(fd, 'input').slice(0, 3000);
  const t = TOOLS[tool];
  if (!t) back('Pick a tool.');
  const me = await requireAdmin('aitools', 'aiTool-' + tool, input.slice(0, 100));
  const job = await db.aiJob.create({ data: { kind: 'tool', prompt: `${t![0]}: ${input}`, by: me.email || '', status: 'thinking' } });
  try {
    const { snapshot } = await import('@/lib/cowork');
    const r = await ask(`${t![1]}\nSTORE: ${(await getSettings()).store.name}\nDATA: ${await snapshot()}`, [{ role: 'user', content: input || t![0] }], { maxTokens: 1500 });
    await db.aiJob.update({ where: { id: job.id }, data: { status: 'done', result: r.text.slice(0, 8000), provider: r.provider } });
  } catch (e) { await db.aiJob.update({ where: { id: job.id }, data: { status: 'failed', result: (e as Error).message.slice(0, 500) } }); }
  redirect(`/admin/aitools?job=${job.id}#tools`);
}

// ---------- AI co-worker ----------
export async function newJob(fd: FormData) {
  const prompt = str(fd, 'prompt');
  const me = await requireAdmin('ai', 'newJob', prompt.slice(0, 200));
  if (prompt.length < 4) redirect('/admin/ai?note=' + encodeURIComponent('Write the job first.'));
  const id = await planJob(prompt, me.email || '');
  redirect(`/admin/ai?job=${id}`);
}
export async function jobAction(fd: FormData) {
  const id = str(fd, 'id'), what = str(fd, 'what');
  await requireAdmin('ai', 'job-' + what, id);
  const job = await db.aiJob.findUniqueOrThrow({ where: { id } });
  if (job.status === 'proposed') {
    if (what === 'approve') await applyJob(id);
    else await db.aiJob.update({ where: { id }, data: { status: 'rejected' } });
  }
  redirect(`/admin/ai?job=${id}`);
}
export async function saveCowork(fd: FormData) {
  await requireAdmin('ai', 'saveCowork', str(fd, 'mode'));
  const v = { mode: str(fd, 'mode') === 'auto' ? 'auto' : 'ask' };
  await db.setting.upsert({ where: { key: 'cowork' }, update: { value: v }, create: { key: 'cowork', value: v } });
  redirect('/admin/ai?note=' + encodeURIComponent(v.mode === 'auto' ? 'Automatic: the AI does the jobs by itself and tells you what it did.' : 'Ask first: the AI shows its plan and waits for your Approve.'));
}

// Asks the shop chatbot's AI a real customer question and shows the answer or the exact error.
export async function testBot() {
  await requireAdmin('aitools', 'testBot');
  try {
    const r = await ask('You are a helpful shop assistant. Answer in one short sentence.', [{ role: 'user', content: 'Hello, do you ship to Malaysia?' }], { maxTokens: 80 });
    back(`Chatbot test passed. ${r.provider} answered: “${r.text.slice(0, 160)}”`, '#connect');
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    back(`Chatbot test failed: ${(e as Error).message.slice(0, 220)}`, '#connect');
  }
}
