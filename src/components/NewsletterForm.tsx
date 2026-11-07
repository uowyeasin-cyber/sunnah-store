'use client';
import { useActionState } from 'react';
import { joinNewsletter } from '@/app/newsletterActions';
import { useStore } from './StoreProvider';

export default function NewsletterForm() {
  const { t, lang } = useStore();
  const [state, act, busy] = useActionState(joinNewsletter, null);
  if (state && 'ok' in state && state.ok) return <p className="muted" role="status">{t('already' in state && state.already ? 'You are already subscribed.' : 'Check your inbox and tap the link to confirm.')}</p>;
  return <form action={act} className="news-form"><input type="hidden" name="lang" value={lang} />
    <input type="email" name="email" required placeholder={t('Your email')} aria-label={t('Your email')} autoComplete="email" />
    <button className="btn sm" disabled={busy}>{t('Subscribe')}</button>
    {state && 'error' in state && <p className="err" style={{ margin: 0, flexBasis: '100%' }}>{t(state.error!)}</p>}
  </form>;
}
