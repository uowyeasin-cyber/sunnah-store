import type { Settings } from '@/lib/settings';
import type { T } from '@/lib/i18n';
import { RETURN_DAYS } from '@/lib/returns';

// Trust and delivery promises, each read from the shop's real settings.
export default function Trust({ s, t }: { s: Settings; t: T }) {
  const cod = Object.values(s.regions || {}).some(r => r.cod);
  const items = [
    { k: 'ship', h: t('Ships worldwide'), p: t('From our stock in the USA, Malaysia and Bangladesh') },
    s.preorder?.on ? { k: 'pre', h: t('Pre-order'), p: t(s.preorder.ships) } : { k: 'stock', h: t('Ready to ship'), p: t('Dispatched from the nearest warehouse') },
    ...(cod ? [{ k: 'cod', h: t('Cash on delivery'), p: t('Pay the courier when it arrives') }] : []),
    { k: 'ret', h: t('{n}-day returns', { n: RETURN_DAYS }), p: t('Request a return from your order page') },
    ...(s.rewardRate > 0 ? [{ k: 'credit', h: t('Store credit back'), p: t('Earned on every delivered order') }] : []),
  ];
  return <section className="wrap"><ul className="trust">{items.map(i => <li key={i.k}><Icon k={i.k} /><div><b>{i.h}</b><span>{i.p}</span></div></li>)}</ul></section>;
}

function Icon({ k }: { k: string }) {
  const d: Record<string, string> = {
    ship: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1',
    pre: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    stock: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
    cod: 'M3 7h18v10H3zM12 12m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0',
    ret: 'M4 10h11a5 5 0 0 1 0 10H9M4 10l4-4M4 10l4 4',
    credit: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d[k]} /></svg>;
}
