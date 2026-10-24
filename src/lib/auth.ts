import 'server-only';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { getSettings } from './catalog';
import { sendMail } from './mail';

// Passwordless sign-in: a six-digit code by email. The same sign-in opens the admin panel
// when the email is one of the admin emails set in Settings → Admin team.
const COOKIE = 'pm_session';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const norm = (s: string) => s.trim().toLowerCase();

export async function sendLoginCode(email: string) {
  const to = norm(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: 'Enter a valid email address.' };
  const recent = await db.loginCode.count({ where: { to, createdAt: { gt: new Date(Date.now() - 10 * 60e3) } } });
  if (recent >= 5) return { error: 'Too many codes sent. Try again in a few minutes.' };
  const code = String(randomInt(0, 1e6)).padStart(6, '0');
  await db.loginCode.create({ data: { to, codeHash: hash(code), expiresAt: new Date(Date.now() + 10 * 60e3) } });
  const { store } = await getSettings();
  await sendMail(to, `${code} is your ${store.name} sign-in code`, `Your sign-in code is ${code}. It works for 10 minutes.`);
  return { ok: true };
}

export async function verifyLoginCode(email: string, code: string) {
  const to = norm(email);
  const row = await db.loginCode.findFirst({ where: { to, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!row || row.tries >= 5) return { error: 'That code has expired. Send a new one.' };
  if (row.codeHash !== hash(code.trim())) { await db.loginCode.update({ where: { id: row.id }, data: { tries: { increment: 1 } } }); return { error: 'That code is not right.' }; }
  await db.loginCode.deleteMany({ where: { to } });
  const customer = await db.customer.upsert({ where: { email: to }, update: {}, create: { email: to } });
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 864e5);
  await db.session.create({ data: { id: hash(id), customerId: customer.id, expiresAt } });
  (await cookies()).set(COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: expiresAt, path: '/' });
  return { ok: true, admin: await isAdminEmail(to) };
}

export async function signOut() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await db.session.deleteMany({ where: { id: hash(id) } });
  jar.delete(COOKIE);
}

export async function currentCustomer() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const s = await db.session.findUnique({ where: { id: hash(id) }, include: { customer: true } });
  return s && s.expiresAt > new Date() ? s.customer : null;
}

export async function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const { admins } = await getSettings();
  return admins.some(a => a && norm(a) === norm(email));
}

// Admin pages render alongside the layout's sign-in gate, so they bail out quietly.
export async function adminOrNull() {
  const c = await currentCustomer();
  return c && (await isAdminEmail(c.email)) ? c : null;
}

// Use at the top of every admin server action.
export async function requireAdmin() {
  const c = await adminOrNull();
  if (!c) throw new Error('Not allowed');
  return c;
}
