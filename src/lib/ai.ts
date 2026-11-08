import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { key, loadKeys } from './keys';

// One door to every AI the shop can use. Three have free plans (Gemini, Groq, OpenRouter); Claude is paid and best.
// The admin pastes a key in AI tools & chatbot; the first connected one (or the one picked) answers,
// and when its free daily allowance runs out the next connected one takes over by itself.
export type ProviderId = 'gemini' | 'groq' | 'openrouter' | 'claude';
export type Provider = { id: ProviderId; name: string; env: string; modelEnv: string; model: string; free: boolean; signup: string; prefix: string; steps: string[]; note: string };
export const PROVIDERS: Provider[] = [
  { id: 'gemini', name: 'Google Gemini', env: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', model: 'gemini-flash-latest', free: true, signup: 'https://aistudio.google.com/apikey', prefix: 'AIza',
    steps: ['Open aistudio.google.com/apikey and sign in with your Google account.', 'Press Create API key and copy it (it starts with AIza).', 'Paste it below and press Connect. No card is needed.'],
    note: 'Free, no card. Google sets a daily request limit per model. Free-plan messages may be used by Google to improve its products, so do not send private customer data you would not share.' },
  { id: 'groq', name: 'Groq', env: 'GROQ_API_KEY', modelEnv: 'GROQ_MODEL', model: 'llama-3.3-70b-versatile', free: true, signup: 'https://console.groq.com/keys', prefix: 'gsk_',
    steps: ['Open console.groq.com/keys and sign up.', 'Press Create API key and copy it (it starts with gsk_).', 'Paste it below and press Connect.'],
    note: 'Free plan: about 30 requests a minute and 1,000 a day. Very fast.' },
  { id: 'openrouter', name: 'OpenRouter (free models)', env: 'OPENROUTER_API_KEY', modelEnv: 'OPENROUTER_MODEL', model: 'meta-llama/llama-3.3-70b-instruct:free', free: true, signup: 'https://openrouter.ai/keys', prefix: 'sk-or-',
    steps: ['Open openrouter.ai/keys and sign up.', 'Press Create key and copy it (it starts with sk-or-).', 'Paste it below and press Connect. A free model is picked by itself.'],
    note: 'Free models: about 50 requests a day (1,000 a day once you have ever bought $10 of credit), 20 a minute.' },
  { id: 'claude', name: 'Claude (Anthropic)', env: 'ANTHROPIC_API_KEY', modelEnv: 'ASSISTANT_MODEL', model: 'claude-sonnet-5-5', free: false, signup: 'https://console.anthropic.com/settings/keys', prefix: 'sk-ant-',
    steps: ['Open console.anthropic.com and sign up.', 'Go to Billing and add a small credit (for example $5).', 'Go to API keys, create a key and copy it (it starts with sk-ant-).', 'Paste it below and press Connect.'],
    note: 'Pay as you go. Best quality for the AI co-worker, research and long writing.' },
];
export type Turn = { role: 'user' | 'assistant'; content: string };

export async function connectedProviders() {
  await loadKeys();
  const on = PROVIDERS.filter(p => key(p.env));
  const pick = key('AI_PROVIDER');
  return [...on.filter(p => p.id === pick), ...on.filter(p => p.id !== pick)];
}
export const aiReady = async () => (await connectedProviders()).length > 0;

const OPENAI_BASE: Record<string, string> = { groq: 'https://api.groq.com/openai/v1', openrouter: 'https://openrouter.ai/api/v1' };

async function call(p: Provider, system: string, messages: Turn[], maxTokens: number, json: boolean): Promise<string> {
  const k = key(p.env), model = key(p.modelEnv) || p.model;
  if (p.id === 'claude') {
    const client = new Anthropic({ apiKey: k });
    const r = await client.messages.create({ model: model.startsWith('claude-') ? model : p.model, max_tokens: maxTokens, system, messages });
    return r.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('\n').trim();
  }
  const ctl = AbortSignal.timeout(45e3);
  if (p.id === 'gemini') {
    const r = await fetch(`${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent`, {
      method: 'POST', signal: ctl, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) } }),
    });
    if (!r.ok) throw new AiError(p.name, r.status, (await r.text()).slice(0, 300));
    const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (d.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('').trim();
  }
  const base = (p.id === 'groq' ? process.env.GROQ_BASE_URL : process.env.OPENROUTER_BASE_URL) || OPENAI_BASE[p.id];
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST', signal: ctl, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${k}`, ...(p.id === 'openrouter' ? { 'HTTP-Referer': process.env.SITE_URL || 'https://sunnahstore.vercel.app', 'X-Title': 'Sunnah Store' } : {}) },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages], ...(json ? { response_format: { type: 'json_object' } } : {}) }),
  });
  if (!r.ok) throw new AiError(p.name, r.status, (await r.text()).slice(0, 300));
  const d = await r.json() as { choices?: { message?: { content?: string } }[] };
  return (d.choices?.[0]?.message?.content || '').trim();
}

export class AiError extends Error {
  constructor(public provider: string, public status: number, detail: string) { super(`${provider} answered ${status}: ${detail}`); }
}

// Asks the first connected AI; on a limit or outage, the next one. Throws when none is connected or all fail.
export async function ask(system: string, messages: Turn[], opts: { maxTokens?: number; json?: boolean; only?: ProviderId } = {}) {
  const list = (await connectedProviders()).filter(p => !opts.only || p.id === opts.only);
  if (!list.length) throw new Error('No AI connected. Paste a free key in AI tools & chatbot.');
  let last: unknown;
  for (const p of list) {
    try {
      const text = await call(p, system, messages, opts.maxTokens || 1200, !!opts.json);
      if (text) return { text, provider: p.name };
    } catch (e) { last = e; console.error('ai call failed', p.id, (e as Error).message); }
  }
  throw last instanceof Error ? last : new Error('The AI did not answer.');
}

// Pulls the first JSON object out of a reply (free models sometimes wrap it in ``` fences or words).
export function parseJson<T>(text: string): T | null {
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(text.slice(s, e + 1)) as T; } catch { return null; }
}
