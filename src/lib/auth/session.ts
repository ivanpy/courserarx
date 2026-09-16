import { signPayload, verifyPayload, encodeBase64Url, decodeBase64Url, getAuthSecret } from './crypto';

export const ADMIN_SESSION_COOKIE = 'admin_session';

/** Reautenticación periódica; no es una sesión indefinida una vez emitida la cookie. */
const SESSION_TTL_SECONDS = 60 * 60 * 12;

/** `userId`/`email` desde la Fase de usuarios reales: antes la sesión no identificaba a nadie (passphrase única). */
export interface AdminSession {
  userId: string;
  email: string;
  exp: number;
}

/** Firma una nueva sesión de Admin. El valor devuelto es lo que se persiste en la cookie `admin_session`. */
export async function createAdminSessionCookie(usuario: { id: string; email: string }): Promise<string> {
  const payload: AdminSession = {
    userId: usuario.id,
    email: usuario.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = encodeBase64Url(JSON.stringify(payload));
  const signature = await signPayload(payloadB64, getAuthSecret());
  return `${payloadB64}.${signature}`;
}

/**
 * Verifica el valor crudo de la cookie `admin_session`. Recibe el string en vez de leer
 * la request directamente para poder llamarse igual desde Server Components
 * (`next/headers`, Node) y desde middleware.ts (`NextRequest.cookies`, Edge) sin
 * duplicar la verificación por runtime.
 */
export async function getAdminSession(cookieValue: string | undefined | null): Promise<AdminSession | null> {
  if (!cookieValue) return null;

  const [payloadB64, signature] = cookieValue.split('.');
  if (!payloadB64 || !signature) return null;

  const isValid = await verifyPayload(payloadB64, signature, getAuthSecret());
  if (!isValid) return null;

  try {
    const session = JSON.parse(decodeBase64Url(payloadB64)) as AdminSession;
    if (
      typeof session.exp !== 'number' ||
      session.exp < Math.floor(Date.now() / 1000) ||
      typeof session.userId !== 'string' ||
      typeof session.email !== 'string'
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
