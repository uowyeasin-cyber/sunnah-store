'use client';
import { useEffect, useState } from 'react';
import { myShareCode, unlockShare } from '@/app/actions';
import { useStore } from './StoreProvider';
import Share from './Share';

// Share buttons with Share & earn: a signed-in shopper's link carries their code, so a friend's order gives them store credit.
// With share-to-unlock on, tapping any share button also unlocks a discount on this device.
export default function ShareEarn({ title, path }: { title: string; path: string }) {
  const { share: sh, me, t, toast, open } = useStore();
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { if (sh.on && me?.email) myShareCode().then(setCode).catch(() => {}); }, [sh.on, me?.email]);
  const onShare = () => {
    if (!sh.unlock || unlocked) return;
    unlockShare().then(pct => { if (pct) { setUnlocked(true); toast(t('{n}% off unlocked. It is taken off at checkout.', { n: pct })); } }).catch(() => {});
  };
  const link = code ? `${path}${path.includes('?') ? '&' : '?'}r=${code}` : path;
  if (!sh.on && !sh.unlock) return <Share title={title} path={path} />;
  return <div className="share-earn">
    {sh.unlock && sh.unlockPct > 0 && <p className="se-line"><b>{unlocked ? t('{n}% off unlocked', { n: sh.unlockPct }) : t('Share to unlock {n}% off', { n: sh.unlockPct })}</b>{!unlocked && <span> · {t('Tap any button below.')}</span>}</p>}
    {sh.on && <p className="se-line">{sh.text ? t(sh.text) : t('Share and earn: when a friend buys with your link, you get {n}% back as store credit.', { n: sh.rewardPct })}
      {sh.friendPct > 0 && <> {t('Your friend gets {n}% off.', { n: sh.friendPct })}</>}
      {!me?.email && <> <button type="button" className="link-arrow se-in" onClick={() => open('account')}>{t('Sign in to get your link')}</button></>}</p>}
    <Share title={title} path={link} onShare={onShare} label={sh.on && code ? t('Share your link') : undefined} />
  </div>;
}
