import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyShareToken, STAKEHOLDER_TOKEN_COOKIE } from '@/lib/auth/share-token';

/**
 * Único lugar donde el share-token (?token=...) se convierte en la cookie
 * `stakeholder_token`: los Server Components no pueden `cookies().set()` durante el
 * render (ver node_modules/next/dist/docs/.../cookies.md), así que este intercambio
 * tiene que vivir en un Route Handler. Después de esto, (stakeholder)/layout.tsx
 * solo necesita leer la cookie, nunca el query param.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  const payload = await verifyShareToken(token);

  if (!payload) {
    return new NextResponse('Enlace inválido o expirado.', { status: 400 });
  }

  const store = await cookies();
  store.set(STAKEHOLDER_TOKEN_COOKIE, token as string, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return NextResponse.redirect(new URL(`/p/${payload.propuestaId}`, request.url), 307);
}
