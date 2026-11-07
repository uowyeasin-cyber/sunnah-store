import 'server-only';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { getSettings } from './catalog';
import { sendMail } from './mail';
import { canUse, roleOf, type Area } from './roles';

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

export async function verifyLoginCode(email: string, code: string, name = '', phone = '') {
  const to = norm(email);
  const row = await db.loginCode.findFirst({ where: { to, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!row || row.tries >= 5) return { error: 'That code has expired. Send a new one.' };
  if (row.codeHash !== hash(code.trim())) { await db.loginCode.update({ where: { id: row.id }, data: { tries: { increment: 1 } } }); return { error: 'That code is not right.' }; }
  await db.loginCode.deleteMany({ where: { to } });
  return startSession(to, name, phone);
}

// Signs in (and registers on first visit) a verified email. Google sign-in uses this too.
export async function startSession(email: string, name = '', phone = '') {
  const to = norm(email);
  const found = await db.customer.findUnique({ where: { email: to } });
  const customer = found
    ? ((name && !found.name) || (phone && !found.phone) ? await db.customer.update({ where: { id: found.id }, data: { name: found.name || name, phone: found.phone || phone } }) : found)
    : await db.customer.create({ data: { email: to, name, phone } });
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

// The signed-in admin's role, or null for shoppers.
export async function adminRole() {
  const c = await currentCustomer();
  if (!c?.email || !(await isAdminEmail(c.email))) return null;
  const { roles } = await getSettings();
  return { customer: c, role: roleOf(c.email, roles) };
}

// Admin pages render alongside the layout's sign-in gate, so they bail out quietly.
// With an area, staff whose role does not open that area get nothing.
export async function adminOrNull(area?: Area) {
  const a = await adminRole();
  return a && (!area || canUse(a.role, area)) ? a.customer : null;
}

// Use at the top of every admin server action: checks the role opens the area, then records who did what.
export async function requireAdmin(area?: Area, action = '', detail = '') {
  const a = await adminRole();
  if (!a || (area && !canUse(a.role, area))) throw new Error('Not allowed');
  if (action) await db.adminLog.create({ data: { email: a.customer.email || '', area: area || '', action, detail: detail.slice(0, 300) } }).catch(e => console.error('admin log failed', e));
  return a.customer;
}
