import { connection } from 'next/server';
import { currentCustomer, isAdminEmail } from '@/lib/auth';

export async function GET() {
  await connection();
  const c = await currentCustomer();
  return Response.json(c?.email ? { email: c.email, admin: await isAdminEmail(c.email) } : null);
}
