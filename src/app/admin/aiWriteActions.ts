'use server';
import { requireAdmin } from '@/lib/auth';

type Draft = { name: string; sub: string; details: string };

// "✨ Write with AI" on the product page: writes name, short line and description from what is in the form
// and the owner's instruction. Nothing is saved: the text goes into the form for the owner to check and save.
export async function aiWriteProduct(input: Draft & { instruction: string; lang: string; keep: boolean }): Promise<Draft | { error: string }> {
  await requireAdmin('products', 'aiWriteProduct', input.name.slice(0, 80));
  const { ask, parseJson } = await import('@/lib/ai');
  const { getSettings } = await import('@/lib/catalog');
  const s = await getSettings();
  const system = `You write product copy for ${s.store.name}, an online store. Write honest, premium, clear copy that sells. No made-up facts, specs, certificates, awards or health claims; use only what the product information says. No emojis unless asked.
Reply with JSON only: {"name": "...", "sub": "...", "details": "..."}.
name: the product name, at most 60 characters${input.keep ? ', keep the current name unless it is empty' : ''}. sub: one short line under the name, at most 80 characters. details: the description, 60 to 160 words, short paragraphs separated by a blank line; a few lines may start with "• " for key points.
Language: ${input.lang || 'English'}.`;
  const user = `Product information:\nName: ${input.name || '(none)'}\nShort line: ${input.sub || '(none)'}\nDescription: ${input.details.slice(0, 4000) || '(none)'}\n\nOwner's instruction: ${input.instruction.slice(0, 600) || 'Make it better and more appealing.'}`;
  try {
    const r = await ask(system, [{ role: 'user', content: user }], { json: true, maxTokens: 1200 });
    const d = parseJson<Draft>(r.text);
    if (!d?.details) return { error: 'The AI answer could not be read. Try again.' };
    return { name: input.keep && input.name ? input.name : String(d.name || input.name).slice(0, 120), sub: String(d.sub || '').slice(0, 160), details: String(d.details).slice(0, 6000) };
  } catch (e) { return { error: (e as Error).message.slice(0, 200) }; }
}
