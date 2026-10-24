import { STEPS } from '@/lib/tracking';

export default function Timeline({ status, events, rider }: { status: number; events: { at: string; step: number; note: string }[]; rider: { name: string; phone: string } | null }) {
  const when = (k: number) => events.find(e => e.step === k)?.at;
  return <>
    <ol className="tl">{STEPS.map((s, k) => <li key={s} className={k < status || status === STEPS.length - 1 ? 'done' : k === status ? 'now' : ''}>
      <span className="dot">{k <= status ? '✓' : ''}</span><div>{s}{when(k) && <small>{new Date(when(k)!).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</small>}</div></li>)}</ol>
    {rider && <div className="rider"><div className="av">{rider.name.slice(0, 1) || 'R'}</div><div><b>{rider.name || 'Your rider'}</b><br /><a href={`tel:${rider.phone}`}>{rider.phone}</a></div></div>}
  </>;
}
