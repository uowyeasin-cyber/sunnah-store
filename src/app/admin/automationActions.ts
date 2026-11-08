'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { decideTask, getAutomation, runJob, saveAutomation } from '@/lib/automation';
import { JOBS, type JobId, type Mode } from '@/lib/automationJobs';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const job = (fd: FormData) => { const j = JOBS.find(x => x.id === str(fd, 'job')); if (!j) throw new Error('Unknown job'); return j; };
const done = () => revalidatePath('/admin/automation');

export async function saveJobs(fd: FormData) {
  const a = await getAutomation();
  const changes: string[] = [];
  for (const j of JOBS) {
    const m = str(fd, `mode-${j.id}`) as Mode;
    if (!j.modes.includes(m)) continue;
    if (a.jobs[j.id].mode !== m || a.jobs[j.id].paused) changes.push(`${j.name}: ${m}`);
    a.jobs[j.id] = { mode: m, paused: false };
  }
  a.master = fd.get('master') === 'on';
  a.lowStockAt = Math.min(1000, Math.max(0, Math.floor(Number(fd.get('lowStockAt')) || 0)));
  await requireAdmin('automation', 'saveAutomation', `master ${a.master ? 'on' : 'off'}${changes.length ? ' · ' + changes.join(', ') : ''}`);
  await saveAutomation(a);
  done();
}

// One tap stops every automation at once, whatever each job is set to. Only a second tap starts them again.
export async function emergencyStop(fd: FormData) {
  const stop = str(fd, 'stop') === 'yes';
  const me = await requireAdmin('automation', stop ? 'emergencyStop' : 'emergencyResume');
  const a = await getAutomation();
  a.stopped = stop; a.stoppedBy = stop ? me.email || '' : ''; a.stoppedAt = stop ? new Date().toISOString() : '';
  await saveAutomation(a);
  done();
}

export async function runNow(fd: FormData) {
  const j = job(fd);
  await requireAdmin('automation', 'runNow', j.name);
  await runJob(j.id as JobId, 'manual');
  done();
}

export async function decide(fd: FormData) {
  const approve = str(fd, 'to') === 'approve';
  const me = await requireAdmin('automation', approve ? 'approveTask' : 'rejectTask', str(fd, 'label').slice(0, 200));
  await decideTask(str(fd, 'id'), approve, me.email || '');
  done();
}

// One switch for everything: every job, the AI co-worker and the chatbot run by themselves (A to Z).
export async function fullAccess(fd: FormData) {
  const on = str(fd, 'on') === 'yes';
  await requireAdmin('automation', on ? 'giveFullAccess' : 'takeAccessBack');
  const a = await getAutomation();
  a.full = on;
  if (on) { a.master = true; a.stopped = false; }
  for (const j of JOBS) a.jobs[j.id] = { mode: on ? 'auto' : j.modes.includes('approve') ? 'approve' : a.jobs[j.id].mode, paused: false };
  await saveAutomation(a);
  const { db } = await import('@/lib/db');
  await db.setting.upsert({ where: { key: 'cowork' }, update: { value: { mode: on ? 'auto' : 'ask' } }, create: { key: 'cowork', value: { mode: on ? 'auto' : 'ask' } } });
  if (on) {
    const { getBot } = await import('@/lib/assistant');
    const b = { ...(await getBot()), on: true, handover: true };
    await db.setting.upsert({ where: { key: 'chatbot' }, update: { value: b }, create: { key: 'chatbot', value: b } });
  }
  done();
}

// Reminders and jobs set for a time (Dashboard and Automation).
const KINDS = ['reminder', 'hide_product', 'show_product', 'set_offer', 'stop_offer', 'book_courier', 'ai_job'];
export async function schedule(fd: FormData) {
  const kind = KINDS.includes(str(fd, 'kind')) ? str(fd, 'kind') : 'reminder';
  // The time is typed in the admin's own clock; tz is their browser's offset from UTC in minutes.
  const when = new Date(new Date(str(fd, 'at') + ':00Z').getTime() + (Number(fd.get('tz')) || 0) * 60e3);
  const me = await requireAdmin('reminders', 'schedule', `${kind} ${str(fd, 'title')}`);
  if (isNaN(when.getTime())) throw new Error('Pick a date and time');
  const slug = str(fd, 'product'), pct = Number(fd.get('pct')) || 10, hours = Number(fd.get('hours')) || 0;
  const data = kind === 'hide_product' || kind === 'show_product' ? { slug } : kind === 'set_offer' ? { slugs: [slug || 'all'], pct, hours } : kind === 'stop_offer' ? { slugs: [slug || 'all'] }
    : kind === 'book_courier' ? { order: str(fd, 'order') } : kind === 'ai_job' ? { prompt: str(fd, 'title') } : {};
  const LABEL: Record<string, string> = { reminder: 'Reminder', hide_product: 'Hide a product', show_product: 'Make a product live', set_offer: 'Start an offer', stop_offer: 'Stop an offer', book_courier: 'Book courier for an order', ai_job: 'AI co-worker job' };
  const { db } = await import('@/lib/db');
  await db.scheduled.create({ data: { kind, title: (str(fd, 'title') || LABEL[kind]).slice(0, 200), note: [LABEL[kind], slug, str(fd, 'order'), str(fd, 'note')].filter(Boolean).join(' · ').slice(0, 500), at: when, data, by: me.email || '' } });
  revalidatePath('/admin/dashboard'); revalidatePath('/admin/reminders'); done();
}
export async function scheduledAction(fd: FormData) {
  const id = str(fd, 'id'), what = str(fd, 'what');
  await requireAdmin('reminders', 'scheduled-' + what, id);
  const { db } = await import('@/lib/db');
  await db.scheduled.updateMany({ where: { id, status: { in: ['pending', 'due'] } }, data: { status: what === 'cancel' ? 'cancelled' : 'done', ...(what === 'done' ? { result: 'Ticked off' } : {}) } });
  revalidatePath('/admin/dashboard'); revalidatePath('/admin/reminders'); done();
}

// One job on or off from Today's decisions. Off means it waits for you (Ask me first where the job has it).
export async function toggleJob(fd: FormData) {
  const j = job(fd), on = str(fd, 'on') === 'yes';
  await requireAdmin('automation', 'toggleJob', `${j.name} ${on ? 'on' : 'off'}`);
  const a = await getAutomation();
  a.jobs[j.id] = { mode: on ? 'auto' : j.modes.includes('approve') ? 'approve' : 'off', paused: false };
  if (on) { a.master = true; }
  a.full = JOBS.every(x => a.jobs[x.id].mode === 'auto');
  await saveAutomation(a);
  revalidatePath('/admin/decisions'); done();
}
export async function toggleSetting(fd: FormData) {
  const what = str(fd, 'what'), on = str(fd, 'on') === 'yes';
  await requireAdmin('automation', 'toggle-' + what, on ? 'on' : 'off');
  const { db } = await import('@/lib/db');
  if (what === 'cowork') await db.setting.upsert({ where: { key: 'cowork' }, update: { value: { mode: on ? 'auto' : 'ask' } }, create: { key: 'cowork', value: { mode: on ? 'auto' : 'ask' } } });
  if (what === 'chatbot') {
    const { getBot } = await import('@/lib/assistant');
    const b = { ...(await getBot()), on };
    await db.setting.upsert({ where: { key: 'chatbot' }, update: { value: b }, create: { key: 'chatbot', value: b } });
  }
  revalidatePath('/admin/decisions'); done();
}

// "Remind me tomorrow at 5 pm to call the supplier": the AI turns plain words into a reminder or a timed job.
export async function aiSchedule(fd: FormData) {
  const text = str(fd, 'text').slice(0, 500), tz = Number(fd.get('tz')) || 0;
  const me = await requireAdmin('reminders', 'aiSchedule', text);
  const { db } = await import('@/lib/db');
  const { ask, parseJson } = await import('@/lib/ai');
  const local = new Date(Date.now() - tz * 60e3).toISOString().slice(0, 16);
  const products = await db.product.findMany({ where: { archived: false }, select: { slug: true, name: true, sub: true } });
  const fallback = () => { const f = new FormData(); f.set('kind', 'reminder'); f.set('title', text); f.set('at', new Date(Date.now() - tz * 60e3 + 3600e3).toISOString().slice(0, 16)); f.set('tz', String(tz)); f.set('note', 'The AI was not available, so this is a reminder in 1 hour. Change it if needed.'); return schedule(f); };
  let r: { text: string };
  try { r = await ask(`You turn the shop owner's words (any language) into one scheduled item. The owner's local time now is ${local} (${new Date(Date.now() - tz * 60e3).toUTCString().slice(0, 3)}).
Kinds: reminder (just remind), hide_product, show_product, set_offer, stop_offer, book_courier, ai_job (any other store task for the AI co-worker; put the task in title).
Products (slug: name): ${products.map(p => `${p.slug}: ${p.name} ${p.sub}`).join('; ')}
Answer ONLY JSON {"kind":"reminder","title":"short title","at":"YYYY-MM-DDTHH:MM in the owner's local time","product":"slug or empty","pct":10,"hours":48,"order":"PM-... or empty","note":""}. If no time is given, use 1 hour from now.`, [{ role: 'user', content: text }], { maxTokens: 300, json: true }); } catch { return fallback(); }
  const j = parseJson<{ kind?: string; title?: string; at?: string; product?: string; pct?: number; hours?: number; order?: string; note?: string }>(r.text);
  if (!j?.at || isNaN(Date.parse(j.at.slice(0, 16) + ':00Z'))) return fallback();
  const f = new FormData();
  for (const [k, v] of Object.entries({ kind: j.kind || 'reminder', title: j.title || text, at: j.at.slice(0, 16), product: j.product || '', pct: String(j.pct || 10), hours: String(j.hours || 0), order: j.order || '', note: j.note || `Set by AI from: "${text}"`, tz: String(tz) })) f.set(k, v);
  void me;
  await schedule(f);
}
