import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

/**
 * D-11: ya no revela `hasGeminiKey` (el server.ts anterior lo hacía sin
 * autenticación, líneas 19-23). Gating real con sesión de Admin es la
 * Fase 5; el cierre práctico de la fuga hoy es simplemente dejar de exponer
 * el estado de configuración del servidor.
 */
export async function GET() {
  return NextResponse.json({status: 'ok', timestamp: new Date().toISOString()});
}
