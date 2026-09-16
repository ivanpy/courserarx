'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPool } from '@/lib/db/client';
import { obtenerUsuarioPorEmail } from '@/lib/db/usuarios';
import { verifyPassword, DUMMY_PASSWORD_HASH } from '@/lib/auth/password';
import { ADMIN_SESSION_COOKIE, createAdminSessionCookie } from '@/lib/auth/session';

export interface LoginState {
  error: string | null;
}

/**
 * Reemplaza el passphrase único de la Fase 5 por cuentas reales
 * (`usuarios`, db/0002_usuarios.sql). Siempre se llama a `verifyPassword`
 * — incluso cuando el email no existe, contra `DUMMY_PASSWORD_HASH` — para
 * que el tiempo de respuesta no delate si un email está o no registrado.
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email');
  const password = formData.get('password');
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return { error: 'Ingresá tu email y tu contraseña.' };
  }

  const usuario = await obtenerUsuarioPorEmail(getPool(), email.trim().toLowerCase());
  const esValida = await verifyPassword(password, usuario?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!usuario || !esValida) {
    return { error: 'Email o contraseña incorrectos.' };
  }

  const cookieValue = await createAdminSessionCookie({ id: usuario.id, email: usuario.email });
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  redirect('/tpm');
}

/** Se usa como `<form action={logoutAction}>` (Server Component, sin JS de por medio). */
export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  redirect('/login');
}
