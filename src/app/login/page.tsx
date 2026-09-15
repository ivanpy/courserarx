import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, getAdminSession } from '@/lib/auth/session';
import { LoginForm } from '@/components/admin/LoginForm';

export default async function LoginPage() {
  const store = await cookies();
  const session = await getAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (session) {
    redirect('/tpm');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <LoginForm />
    </main>
  );
}
