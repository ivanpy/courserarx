import 'server-only';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { STAKEHOLDER_TOKEN_COOKIE, verifyShareToken } from '@/lib/auth/share-token';

/**
 * Valida únicamente que exista un share-token válido en la cookie efímera (fijada
 * por app/api/share/route.ts). No cruza el `propuestaId` del token contra el de la
 * URL — eso requiere `params` de la página anidada, que un layout no puede leer
 * (ver node_modules/next/dist/docs/.../layout.md). Ese cruce fino queda para la
 * Fase 8 (page.tsx de la propuesta); acá el layout es el choque grueso: sin token
 * válido, nada de este árbol se renderiza.
 */
export default async function StakeholderLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const payload = await verifyShareToken(store.get(STAKEHOLDER_TOKEN_COOKIE)?.value);

  if (!payload) {
    redirect('/');
  }

  return <>{children}</>;
}
