// "2026-11" → that month in UTC. Anything else means the current month.
export function monthRange(m?: string | null) {
  const ok = m && /^\d{4}-\d{2}$/.test(m) ? m : new Date().toISOString().slice(0, 7);
  const from = new Date(`${ok}-01T00:00:00Z`), to = new Date(from); to.setUTCMonth(to.getUTCMonth() + 1);
  return { m: ok, from, to };
}
