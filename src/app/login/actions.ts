'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { timingSafeEqual } from '@/lib/auth/crypto';
import { ADMIN_SESSION_COOKIE, createAdminSessionCookie } from '@/lib/auth/session';

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const passphrase = formData.get('passphrase');
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    return { error: 'Ingresá la passphrase.' };
  }

  const adminPassphrase = process.env.ADMIN_PASSPHRASE;
  if (!adminPassphrase) {
    return { error: 'El servidor no tiene configurada la autenticación. Contactá al administrador.' };
  }

  const esValida = await timingSafeEqual(passphrase, adminPassphrase);
  if (!esValida) {
    return { error: 'Passphrase incorrecta.' };
  }

  const cookieValue = await createAdminSessionCookie();
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
