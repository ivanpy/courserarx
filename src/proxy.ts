import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSession } from '@/lib/auth/session';
import { timingSafeEqual, hashHex } from '@/lib/auth/crypto';
import { verificarLimite } from '@/lib/auth/rate-limit';

const RUTA_ADMIN_PAGINA = /^\/tpm(\/|$)/;

function extraerBearer(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

/**
 * Resuelve quién está llamando a una ruta de API (sesión de Admin o
 * MOTOR_SERVICE_TOKEN). Devuelve una identidad hasheada para usar como clave de
 * rate limit — nunca el valor crudo de la cookie/token — o `null` si no autentica.
 */
async function resolverIdentidad(request: NextRequest): Promise<string | null> {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (cookieValue) {
    const session = await getAdminSession(cookieValue);
    if (session) {
      return `session:${await hashHex(cookieValue)}`;
    }
  }

  const bearer = extraerBearer(request);
  const serviceToken = process.env.MOTOR_SERVICE_TOKEN;
  if (bearer && serviceToken && (await timingSafeEqual(bearer, serviceToken))) {
    return `service:${await hashHex(bearer)}`;
  }

  return null;
}

function noAutorizado(): NextResponse {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

/**
 * Nombre y ubicación fijados por la convención de Next.js ≥ 16 (proxy.ts reemplaza a
 * middleware.ts; ver node_modules/next/dist/docs/.../proxy.md#migration-to-proxy).
 * Nada de la lógica cambia por la migración: Proxy pasa a correr en runtime Node.js
 * por defecto desde v16, pero session.ts/crypto.ts ya estaban escritos sobre Web
 * Crypto API precisamente para no depender de qué runtime los ejecute.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (RUTA_ADMIN_PAGINA.test(pathname)) {
    const session = await getAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url), 307);
    }
    return NextResponse.next();
  }

  if (pathname === '/api/motor' || pathname === '/api/health') {
    const identidad = await resolverIdentidad(request);
    if (!identidad) {
      return noAutorizado();
    }

    if (pathname === '/api/motor') {
      const { permitido, retryAfterSegundos } = verificarLimite(identidad);
      if (!permitido) {
        return NextResponse.json(
          { error: 'Demasiadas solicitudes' },
          {
            status: 429,
            headers: retryAfterSegundos ? { 'Retry-After': String(retryAfterSegundos) } : undefined,
          }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/tpm/:path*', '/api/motor', '/api/health'],
};
