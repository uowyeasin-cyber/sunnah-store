import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { PROVIDERS, connectedProviders } from '@/lib/ai';
import { getBot } from '@/lib/assistant';
import { keyHint, loadKeys } from '@/lib/keys';
import { aiProvider, connectAi, fillKnowledge, runTool, saveBot } from '../aiActions';

const FEATURES = [
  ['Shop chatbot', 'Answers customers 24/7: products, prices, offers, delivery, order tracking, returns. Hands over to you on "Contact the seller".', 'Customer chats'],
  ['AI co-worker', 'Give it a job in plain words. It makes offers and coupons, edits products, hides or shows them.', 'AI co-worker'],
  ['Business tools', 'Business analysis, market research, social media posts, customer replies, policies.', 'Below'],
  ['Automation', 'Runs jobs by itself on a schedule when you allow it.', 'Automation'],
];
const TOOLS = [
  ['analyze', 'Analyze my business', 'What should I do this week to sell more?'],
  ['research', 'Market research', 'Miswak pens in Malaysia and the USA'],
  ['posts', 'Marketing posts', 'Ramadan offer, 10% off, for Facebook and Instagram'],
  ['reply', 'Draft a customer reply', 'The customer says the parcel is late by 5 days'],
  ['policy', 'Write a policy', 'Return and refund policy, 7 days, refunds as store credit'],
];

export default async function AiTools({ searchParams }: PageProps<'/admin/aitools'>) {
  if (!(await adminOrNull('aitools'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  await loadKeys();
  const [on, bot, jobs, job] = await Promise.all([
    connectedProviders(), getBot(),
    db.aiJob.findMany({ where: { kind: 'tool' }, orderBy: { createdAt: 'desc' }, take: 8 }),
    sp.job ? db.aiJob.findUnique({ where: { id: sp.job } }) : null,
  ]);
  const first = on[0];
  return <>
    <div className="page-head"><div><h2>AI tools & chatbot</h2><p>Connect one free AI and the chatbot, AI co-worker and every tool below start working. Connect two or three free ones: when one runs out for the day, the next takes over by itself.</p></div></div>
    {sp.note && <p className="ord-note">{sp.note}</p>}
    <div className="stats">
      <div className="stat"><small>AI connected</small><b className={on.length ? 'ok' : 'warn'}>{on.length ? on.length : 'None'}</b><span>{first ? `${first.name} answers first` : 'Connect a free one below'}</span></div>
      <div className="stat"><small>Chatbot</small><b className={bot.on && on.length ? 'ok' : 'warn'}>{bot.on ? (on.length ? 'On' : 'Waiting for AI') : 'Off'}</b><span>{bot.handover ? 'Contact the seller: on' : 'No handover'}</span></div>
    </div>

    <section className="panel" id="connect">
      <h3>Connect AI</h3>
      <p className="muted sm">Gemini, Groq and OpenRouter are free. Claude is paid and gives the best answers. Your key is saved encrypted and never shown again.</p>
      <div className="grid2">
        {PROVIDERS.map(p => { const hint = keyHint(p.env), live = on.some(x => x.id === p.id); return <div key={p.id} className="panel" style={{ margin: 0 }}>
          <div className="row2" style={{ justifyContent: 'space-between' }}><b>{p.name}</b>{live ? <span className="tag green">Connected{first?.id === p.id ? ' · first' : ''}</span> : <span className={`tag ${p.free ? 'orange' : ''}`}>{p.free ? 'Free' : 'Paid'}</span>}</div>
          <ol className="sm" style={{ paddingLeft: 18 }}>{p.steps.map((s, i) => <li key={i}>{i === 0 ? <><a href={p.signup} target="_blank" rel="noreferrer">{s}</a></> : s}</li>)}</ol>
          <p className="muted sm">{p.note}</p>
          <form action={connectAi} className="row2" style={{ gap: 6 }}><input type="hidden" name="provider" value={p.id} />
            <input name="key" type="password" autoComplete="off" placeholder={hint || `Key starting with ${p.prefix}`} style={{ flex: 1 }} required />
            <button className="btn sm">{live ? 'Replace' : 'Connect'}</button></form>
          {hint && <form action={aiProvider} className="row2" style={{ gap: 6, marginTop: 8 }}><input type="hidden" name="provider" value={p.id} />
            {first?.id !== p.id && live && <button className="btn sm ghost" name="what" value="first">Use this first</button>}
            {hint.startsWith('saved') && <button className="btn sm ghost danger" name="what" value="remove">Remove</button>}
            <span className="muted sm">{hint}</span></form>}
        </div>; })}
      </div>
    </section>

    <section className="panel">
      <h3>What the AI does here</h3>
      <table><thead><tr><th>Feature</th><th>What it does</th><th>Where</th></tr></thead><tbody>
        {FEATURES.map(([a, b, c]) => <tr key={a}><td><b>{a}</b></td><td>{b}</td><td>{c === 'AI co-worker' ? <Link href="/admin/ai">{c}</Link> : c === 'Customer chats' ? <Link href="/admin/chats">{c}</Link> : c === 'Automation' ? <Link href="/admin/automation">{c}</Link> : c}</td></tr>)}
      </tbody></table>
    </section>

    <section className="panel" id="tools">
      <h3>More AI tools</h3>
      <form action={runTool} className="grid2" style={{ alignItems: 'end' }}>
        <div className="field"><label>Tool</label><select name="tool">{TOOLS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label>What about? (optional)</label><input name="input" placeholder={TOOLS[0][2]} /></div>
        <div><button className="btn orange" disabled={!on.length}>Ask the AI</button>{!on.length && <span className="muted sm"> Connect an AI first.</span>}</div>
      </form>
      <p className="muted sm">Examples: {TOOLS.map(t => `${t[1]}: “${t[2]}”`).join(' · ')}</p>
      {job && <div className="ok-box" style={{ whiteSpace: 'pre-wrap' }}><b>{job.prompt}</b>{'\n\n'}{job.status === 'failed' ? 'The AI could not answer: ' : ''}{job.result}</div>}
      {!!jobs.length && <><h4>Earlier answers</h4><div className="rows">{jobs.map(j => <Link key={j.id} href={`/admin/aitools?job=${j.id}#tools`} className="row2" style={{ justifyContent: 'space-between' }}><span>{j.prompt.slice(0, 90)}</span><span className="muted sm">{j.createdAt.toISOString().slice(0, 10)} · {j.status}</span></Link>)}</div></>}
    </section>

    <section className="panel" id="bot">
      <h3>Chatbot settings</h3>
      <form action={saveBot}>
        <div className="row2" style={{ gap: 18, flexWrap: 'wrap' }}>
          <label><input type="checkbox" name="on" defaultChecked={bot.on} /> Chatbot on</label>
          <label><input type="checkbox" name="handover" defaultChecked={bot.handover} /> Show “Contact the seller” and let the AI hand over to you</label>
        </div>
        <div className="two"><div className="field"><label>Name</label><input name="name" defaultValue={bot.name} /></div>
          <div className="field"><label>Greeting</label><input name="greeting" defaultValue={bot.greeting} /></div></div>
        <div className="field"><label>Instructions (how it should talk and what it should do)</label><textarea name="rules" rows={4} defaultValue={bot.rules} /></div>
        <div className="field"><label>Shop knowledge (facts it may use: warranty, opening hours, how to use the pen…)</label><textarea name="knowledge" rows={7} defaultValue={bot.knowledge} placeholder="One fact per line" /></div>
        <p className="muted sm">It already knows your products, prices, offers, delivery, policies and each customer’s order (after the order number and email match).</p>
        <div className="row2" style={{ gap: 8 }}><button className="btn">Save</button><button className="btn ghost" formAction={fillKnowledge} disabled={!on.length}>Fill knowledge from my store</button></div>
      </form>
    </section>
  </>;
}
