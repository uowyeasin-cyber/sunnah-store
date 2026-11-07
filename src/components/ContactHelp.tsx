'use client';
import { useEffect, useState } from 'react';
import { useStore } from './StoreProvider';

// Contact options that really work right now: the chat when the assistant is switched on, otherwise email replies.
export default function ContactHelp() {
  const { t } = useStore();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => { fetch('/api/assistant').then(r => r.json()).then(r => setOn(!!r.on)).catch(() => setOn(false)); }, []);
  return <>
    {on && <p><button className="btn sm" onClick={() => dispatchEvent(new Event('pm-chat-open'))}>{t('Chat with us')}</button> <span className="muted">{t('The shop assistant answers right away and can pass your message to our team.')}</span></p>}
    <p className="muted">{t('Already ordered? Reply to your order email and our team will answer you there.')}</p>
  </>;
}
