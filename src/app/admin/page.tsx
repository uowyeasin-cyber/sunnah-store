import { redirect } from 'next/navigation';
import { adminRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

// Staff land on the first area their role opens.
export default async function AdminHome() {
  const a = await adminRole();
  redirect(`/admin/${a ? ROLES[a.role].areas[0] : 'reports'}`);
}
