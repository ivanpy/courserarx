import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, getAdminSession, type AdminSession } from './session';

export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

async function resolveAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return getAdminSession(store.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Guard para Server Components (ej. `(admin)/layout.tsx`): sin sesión válida, redirige
 * a /login antes de que el árbol siga renderizando — el payload RSC de los hijos
 * (prompts, config) nunca llega a serializarse.
 */
export async function assertAdmin(): Promise<AdminSession> {
  const session = await resolveAdminSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/** Guard para Route Handlers / Server Actions, que no pueden navegar: lanza en vez de redirigir. */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await resolveAdminSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
