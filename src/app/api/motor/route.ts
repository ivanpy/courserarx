import {NextResponse} from 'next/server';
import {ejecutarMotor, MotorError} from '@/lib/engine';

// El motor usa el SDK de Node de @google/genai — no puede correr en el Edge Runtime.
export const runtime = 'nodejs';
// RES-04: margen sobre el presupuesto global de 45s que ya aplica
// ejecutarInferencia() (inference.ts) en toda la cascada de fallback.
export const maxDuration = 60;

/**
 * Adaptador fino (§12): leer entrada → ejecutarMotor() → serializar. La
 * autorización (`assertAdmin()` / sesión) es la Fase 5 — hoy esta ruta no
 * está conectada a ninguna UI (el cliente sigue hablando con el Express
 * legacy en /api/analyze), así que no se abre superficie nueva todavía.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: 'El cuerpo de la petición debe ser JSON válido.',
        errorType: 'VALIDATION_ERROR',
        isRateLimitOrDemand: false,
        requestId: 'n/a',
        timestamp: new Date().toISOString(),
      },
      {status: 400}
    );
  }

  try {
    const resultado = await ejecutarMotor(body);
    return NextResponse.json(resultado);
  } catch (err) {
    if (err instanceof MotorError) {
      return NextResponse.json(err.toPublic(), {status: err.status});
    }
    // Salvaguarda: ninguna excepción no clasificada debe filtrar stack ni
    // internals al cliente (RES-08 / D-09).
    console.error('[api/motor] Error no clasificado:', err);
    return NextResponse.json(
      {
        error: 'Ocurrió un error inesperado.',
        errorType: 'UNHANDLED_ERROR',
        isRateLimitOrDemand: false,
        requestId: 'n/a',
        timestamp: new Date().toISOString(),
      },
      {status: 500}
    );
  }
}
