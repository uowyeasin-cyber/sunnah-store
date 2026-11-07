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
