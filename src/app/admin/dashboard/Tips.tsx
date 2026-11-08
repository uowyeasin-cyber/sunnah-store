import Link from 'next/link';
import type { Tip } from '@/lib/decisions';

const LV: Record<Tip['level'], string> = { high: 'red', medium: 'amber', low: 'blue' };
export default function Tips({ list }: { list: Tip[] }) {
  return <div className="panel"><h3>Suggestions from your store data</h3>
    {list.length ? <div className="rows">{list.map(t => <div key={t.id}><div className="grow"><span className={`tag ${LV[t.level]}`}>{t.level}</span> <b>{t.title}</b><p>{t.text}</p></div><Link className="link" href={t.href}>Fix →</Link></div>)}</div> : <p className="muted">Nothing to improve right now.</p>}
  </div>;
}

