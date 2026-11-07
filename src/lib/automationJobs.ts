// The automation jobs and their settings. No server code here so admin pages and actions can share it.
export type Mode = 'off' | 'approve' | 'auto';
export const JOBS = [
  { id: 'courier', name: 'Courier booking', does: 'Books the courier for paid and cash-on-delivery orders as soon as they come in, and retries ones that failed (up to 3 times each).', modes: ['off', 'approve', 'auto'] as Mode[], def: 'auto' as Mode },
  { id: 'tracking', name: 'Tracking updates', does: 'Checks the courier for every open order once a day and moves it forward. Customers get an email at each step.', modes: ['off', 'auto'] as Mode[], def: 'auto' as Mode },
  { id: 'lowStock', name: 'Low-stock alert', does: 'Emails the owners when a product is at or under the low-stock level in any warehouse.', modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
  { id: 'dailySummary', name: 'Daily summary email', does: "Emails the owners yesterday's orders and sales, and what is waiting for them.", modes: ['off', 'auto'] as Mode[], def: 'off' as Mode },
] as const;
export type JobId = (typeof JOBS)[number]['id'];
export type Automation = { master: boolean; stopped: boolean; stoppedBy: string; stoppedAt: string; lowStockAt: number; jobs: Record<JobId, { mode: Mode; paused: boolean }> };
export const MODE_LABEL: Record<Mode, string> = { off: 'Off', approve: 'Ask me first', auto: 'Automatic' };

export const defaultAutomation = (): Automation => ({
  master: true, stopped: false, stoppedBy: '', stoppedAt: '', lowStockAt: 5,
  jobs: Object.fromEntries(JOBS.map(j => [j.id, { mode: j.def, paused: false }])) as Automation['jobs'],
});
