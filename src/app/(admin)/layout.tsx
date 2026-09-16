import 'server-only';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { assertAdmin } from '@/lib/auth/assert';
import { logoutAction } from '@/app/login/actions';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await assertAdmin();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <Link href="/tpm" className="hover:text-indigo-600">
              Proyectos
            </Link>
            <Link href="/tpm/nuevo" className="hover:text-indigo-600">
              Nuevo proyecto
            </Link>
          </nav>
          <form action={logoutAction}>
            <button type="submit" className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
