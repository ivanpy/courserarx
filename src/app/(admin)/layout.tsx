import 'server-only';
import type { ReactNode } from 'react';
import { assertAdmin } from '@/lib/auth/assert';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await assertAdmin();
  return <>{children}</>;
}
