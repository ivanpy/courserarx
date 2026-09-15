import {NextResponse} from 'next/server';
import {obtenerCatalogoPublico} from '@/lib/engine/models';

export const runtime = 'nodejs';

/**
 * DTO ModeloPublico (Fase 2, mismo endpoint que server.ts para el legacy).
 * No conectado a ninguna UI de este árbol todavía.
 */
export async function GET() {
  return NextResponse.json({modelos: obtenerCatalogoPublico()});
}
