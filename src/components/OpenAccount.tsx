'use client';
import { useStore } from './StoreProvider';

export default function OpenAccount({ label }: { label: string }) {
  const { open } = useStore();
  return <button type="button" className="btn sm" onClick={() => open('account')}>{label}</button>;
}
