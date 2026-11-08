import Link from 'next/link';
import { adminOrNull } from '@/lib/auth';
import { tips, todos } from '@/lib/decisions';
import { getAutomation } from '@/lib/automation';
import { JOBS } from '@/lib/automationJobs';
import { getCowork } from '@/lib/cowork';
import { getBot } from '@/lib/assistant';
import { aiReady } from '@/lib/ai';
import Tips from '../dashboard/Tips';
import { fullAccess, toggleJob, toggleSetting } from '../automationActions';

// Which automatic switch takes each kind of decision off your hands.
const AUTO_FOR: Record<string, string> = { ship: 'courier', reviews: 'reviews', stock: 'lowStock', tasks: 'courier' };

function Switch({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className="sw-wrap">{children}<button className={`sw ${on ? 'on' : ''}`} name="on" value={on ? 'no' : 'yes'} aria-label={on ? 'Turn off' : 'Turn on'}><i /></button></span>;
}

export default async function Decisions() {
  if (!(await adminOrNull('decisions'))) return null;
  const [list, ideas, a, cw, bot, ai] = await Promise.all([todos(), tips(), getAutomation(), getCowork(), getBot(), aiReady()]);
  const live = a.master && !a.stopped;
  return <>
    <div className="page-head"><div><h2>Today&apos;s decisions</h2><p>Everything that needs you, in one place. Switch a job on and the AI and automation do it by themselves. Switch it off and it waits here for your decision.</p></div></div>

    <form action={fullAccess} className={`panel access ${a.full ? 'on' : ''}`}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <b style={{ fontSize: '1.1rem' }}>{a.full ? '✅ Full access ON: orders, courier, delivery, reviews, offers, SEO and chat run by themselves' : '🔑 Full access OFF: jobs below wait for your decision'}</b>
        <div className="muted sm">{a.full ? 'Nothing waits for you except payments you must check in your own bank or wallet. Every action is saved in Activity history.' : 'One switch turns everything to automatic. Or switch single jobs below.'}{!ai && ' Connect a free AI in AI tools so the AI jobs can work.'}</div>
      </div>
      <Switch on={a.full}><b className="sm">{a.full ? 'On' : 'Off'}</b></Switch>
    </form>

    {list.length ? <div className="panel"><h3>Waiting for you ({list.reduce((x, t) => x + t.n, 0)})</h3><div className="rows">{list.map(t => {
      const jid = AUTO_FOR[t.id], j = JOBS.find(x => x.id === jid);
      return <div key={t.id}><span className="tag orange">{t.n}</span><div className="grow"><b>{t.title}</b><p>{t.text}</p></div>
        {j && <form action={toggleJob}><input type="hidden" name="job" value={j.id} /><Switch on={live && a.jobs[j.id].mode === 'auto'}><span className="muted sm">Auto</span></Switch></form>}
        <Link className="btn sm" href={t.href}>{t.cta}</Link></div>;
    })}</div></div>
      : <div className="ok-box"><span className="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg></span><div><h3>All done for today</h3><p>Nothing needs you. Orders, reminders and replies keep running automatically.</p></div></div>}


    <div className="grid2">
      <div className="panel"><h3>What runs by itself</h3>
        <div className="rows">
          {JOBS.map(j => <form key={j.id} action={toggleJob} className="sw-row"><input type="hidden" name="job" value={j.id} />
            <div className="grow"><b>{j.name}</b><p className="muted sm" style={{ margin: 0 }}>{j.does}</p></div>
            <Switch on={live && a.jobs[j.id].mode === 'auto'}>{a.jobs[j.id].mode === 'approve' && <span className="tag">asks you</span>}</Switch></form>)}
          <form action={toggleSetting} className="sw-row"><input type="hidden" name="what" value="chatbot" /><div className="grow"><b>AI chatbot answers customers</b><p className="muted sm" style={{ margin: 0 }}>Order tracking, products, delivery, returns, 24/7. Customers can still press Contact the seller.</p></div><Switch on={bot.on}>{null}</Switch></form>
          <form action={toggleSetting} className="sw-row"><input type="hidden" name="what" value="cowork" /><div className="grow"><b>AI co-worker acts without asking</b><p className="muted sm" style={{ margin: 0 }}>Off: it shows its plan and waits for your Approve.</p></div><Switch on={cw.mode === 'auto'}>{null}</Switch></form>
        </div>
        {!live && <p className="err sm">{a.stopped ? 'Emergency stop is on in Automation: nothing runs.' : 'The master switch is off in Automation: nothing runs.'}</p>}
        <p className="muted sm">More settings, the run log and the emergency stop are in <Link className="link" href="/admin/automation">Automation</Link>.</p>
      </div>
      <Tips list={ideas} />
    </div>
  </>;
}
