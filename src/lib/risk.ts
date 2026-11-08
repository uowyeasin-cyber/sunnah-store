// Fake-order risk, 0 to 100, from signs that often come with fake or prank orders.
// Cash-on-delivery orders matter most: a fake one costs the courier fee both ways.
const THROWAWAY = ['mailinator', 'tempmail', 'temp-mail', '10minutemail', 'guerrillamail', 'yopmail', 'trashmail', 'sharklasers', 'getnada', 'dispostable'];
export type RiskInput = { payStatus: string; payMethod: string; phone: string; name: string; email: string; address: unknown; total: number; avg: number; failedBefore: number; firstOrder: boolean };

export function fakeRisk(o: RiskInput) {
  const why: string[] = [];
  let n = 0;
  const add = (pts: number, reason: string) => { n += pts; why.push(reason); };
  const cod = o.payMethod === 'cod' && o.payStatus === 'cod';
  if (cod) add(15, 'cash on delivery');
  if (o.phone.replace(/\D/g, '').length < 10) add(20, 'short phone number');
  if (o.name.trim().length < 3 || /\d/.test(o.name) || !/\s/.test(o.name.trim())) add(10, 'name looks incomplete');
  const a = (o.address || {}) as Record<string, string>;
  if ((a.address || '').trim().length < 12) add(20, 'very short address');
  if (THROWAWAY.some(d => o.email.toLowerCase().includes('@' + d))) add(30, 'throwaway email');
  if (o.failedBefore) add(Math.min(40, 20 * o.failedBefore), `${o.failedBefore} cancelled or failed before`);
  if (cod && o.avg > 0 && o.total > o.avg * 3) add(15, 'much bigger than usual');
  if (o.firstOrder && cod) add(5, 'first order');
  return { score: Math.min(100, n), why };
}
export const RISKY = 60;
