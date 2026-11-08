import Link from 'next/link';
import { db } from '@/lib/db';
import { adminOrNull } from '@/lib/auth';
import { assistantReady } from '@/lib/assistant';
import { chatAction, replyChat } from '../aiActions';
import Refresh from './Refresh';

const when = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');
const WHO: Record<string, string> = { user: 'Customer', ai: 'AI', admin: 'You', system: 'Note' };

export default async function Chats({ searchParams }: PageProps<'/admin/chats'>) {
  if (!(await adminOrNull('chats'))) return null;
  const sp = (await searchParams) as Record<string, string | undefined>;
  const tab = sp.tab || 'open';
  const where = tab === 'human' ? { closed: false, needsHuman: true } : tab === 'closed' ? { closed: true } : tab === 'all' ? {} : { closed: false };
  const [list, ai, nHuman, nOpen] = await Promise.all([
    db.chatThread.findMany({ where, orderBy: [{ needsHuman: 'desc' }, { lastAt: 'desc' }], take: 60, include: { messages: { orderBy: { at: 'desc' }, take: 1 } } }),
    assistantReady(),
    db.chatThread.count({ where: { closed: false, needsHuman: true } }),
    db.chatThread.count({ where: { closed: false } }),
  ]);
  const id = sp.id || list[0]?.id;
  const t = id ? await db.chatThread.findUnique({ where: { id }, include: { messages: { orderBy: { at: 'asc' }, take: 300 } } }) : null;
  if (t?.unread) await db.chatThread.update({ where: { id: t.id }, data: { unread: 0 } });
  const name = (x: { name: string; email: string; id: string }) => x.name || x.email || 'Visitor ' + x.id.slice(-4);
  return <>
    <Refresh />
    <div className="page-head"><div><h2>Customer chats</h2><p>The AI answers customers by itself, day and night, from your real products, offers and orders. When a customer presses “Contact the seller”, or the AI cannot help, the chat comes to the top here and you get an email. Reply here and the customer sees it in the chat.</p></div></div>
    {!ai && <p className="ord-note">The AI is off, so every message waits for you. Connect a free AI in <Link href="/admin/aitools#connect">AI tools & chatbot</Link>.</p>}
    <div className="stats">
      <div className="stat"><small>Need you</small><b className={nHuman ? 'warn' : 'ok'}>{nHuman}</b></div>
      <div className="stat"><small>Open chats</small><b>{nOpen}</b></div>
      <div className="stat"><small>AI</small><b className={ai ? 'ok' : 'warn'}>{ai ? 'Answering' : 'Off'}</b></div>
    </div>
    <div className="pills" style={{ marginBottom: 14 }}>
      {[['open', 'Open'], ['human', 'Need you'], ['closed', 'Closed'], ['all', 'All']].map(([k, l]) => <Link key={k} href={`/admin/chats?tab=${k}`} className={tab === k ? 'on' : ''}>{l}</Link>)}
    </div>
    <div className="chat-admin">
      <div className="panel chat-list">
        {!list.length && <p className="muted">No chats yet. The chat button is on every shop page.</p>}
        {list.map(x => <Link key={x.id} href={`/admin/chats?tab=${tab}&id=${x.id}`} className={x.id === t?.id ? 'on' : ''}>
          <b>{name(x)} {x.needsHuman && !x.closed && <span className="tag orange">needs you</span>} {x.aiPaused && <span className="tag">AI paused</span>} {x.unread > 0 && <span className="tag blue">{x.unread} new</span>}</b>
          <span className="muted sm">{x.messages[0]?.text.slice(0, 70) || ''}</span>
          <span className="muted sm">{when(x.lastAt)} · {x.country || '?'} · {x.lang}</span>
        </Link>)}
      </div>
      {t ? <div className="panel chat-thread">
        <div className="row2" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div><h3 style={{ margin: 0 }}>{name(t)}</h3><span className="muted sm">{t.email || 'No email yet'} · started {when(t.createdAt)}</span></div>
          <form action={chatAction} className="row2" style={{ gap: 6 }}><input type="hidden" name="id" value={t.id} />
            {t.aiPaused ? <button className="btn sm" name="what" value="resume">Resume AI</button> : <button className="btn sm ghost" name="what" value="pause">Pause AI</button>}
            {t.closed ? <button className="btn sm ghost" name="what" value="reopen">Reopen</button> : <button className="btn sm ghost" name="what" value="close">Close chat</button>}
          </form>
        </div>
        <div className="chat-msgs">
          {t.messages.map(m => <div key={m.id} className={`cm ${m.role}`}><small>{WHO[m.role]} · {when(m.at)}</small><p>{m.text}</p></div>)}
        </div>
        <form action={replyChat} className="chat-reply"><input type="hidden" name="id" value={t.id} />
          <textarea name="text" rows={3} required placeholder="Write your reply. The customer sees it in the chat right away." />
          <div className="row2" style={{ gap: 8 }}><button className="btn">Send</button><button className="btn ghost" name="pause" value="1">Send & pause AI</button></div>
          <p className="muted sm" style={{ margin: 0 }}>Send & pause AI: only you answer this chat until you press Resume AI.</p>
        </form>
      </div> : <div className="panel"><p className="muted">Pick a chat.</p></div>}
    </div>
  </>;
}
