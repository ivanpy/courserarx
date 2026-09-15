import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

/**
 * D-11: ya no revela `hasGeminiKey` (el server.ts anterior lo hacía sin
 * autenticación, líneas 19-23). El gating real (sesión de Admin o
 * `MOTOR_SERVICE_TOKEN`) vive en `proxy.ts` (Fase 5, matcher '/api/health');
 * este handler nunca se ejecuta sin esa autenticación previa.
 */
export async function GET() {
  return NextResponse.json({status: 'ok', timestamp: new Date().toISOString()});
}
