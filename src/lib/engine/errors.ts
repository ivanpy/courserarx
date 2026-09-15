import 'server-only';

/**
 * Fase 1 (D-09): el servidor deja de devolver `error.stack`, el mensaje crudo
 * del SDK y la lista interna de modelos de fallback (server.ts:404-409 en el
 * estado anterior). `MotorError` transporta el detalle completo para el log;
 * `toPublic()` proyecta solo lo que puede cruzar al cliente — es la versión
 * mínima de `MotorErrorPublico` (RES-08), sin campos que un futuro `errorType`
 * de resiliencia todavía no necesita.
 *
 * NOTA: este módulo NO importa 'server-only' todavía. Ese guardia es entrega
 * de la Fase 2 (Cierre de frontera). Agregarlo ahora rompería `npm run dev`:
 * `tsx server.ts` no declara la condición de exportación `react-server`, y
 * fuera de esa condición el paquete `server-only` lanza al importarse (mismo
 * gotcha que documenta el README §12.1 para el CLI).
 */

export type MotorErrorType =
  | 'VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'KNOWN_RATE_LIMIT_OR_DEMAND'
  | 'UNHANDLED_ERROR';

export interface MotorErrorPublico {
  error: string;
  errorType: MotorErrorType;
  isRateLimitOrDemand: boolean;
  requestId: string;
  timestamp: string;
}

interface MotorErrorInit {
  publicMessage: string;
  errorType: MotorErrorType;
  status: number;
  requestId: string;
  isRateLimitOrDemand?: boolean;
  /** Detalle real (stack, mensaje del SDK, etc.) — SOLO para el log del servidor. */
  cause?: unknown;
}

export class MotorError extends Error {
  readonly status: number;
  readonly errorType: MotorErrorType;
  readonly requestId: string;
  readonly isRateLimitOrDemand: boolean;

  constructor(init: MotorErrorInit) {
    super(init.publicMessage, init.cause !== undefined ? {cause: init.cause} : undefined);
    this.name = 'MotorError';
    this.status = init.status;
    this.errorType = init.errorType;
    this.requestId = init.requestId;
    this.isRateLimitOrDemand = init.isRateLimitOrDemand ?? false;
  }

  /** Proyección segura para el cliente. Sin stack, sin rawMessage, sin triedModels. */
  toPublic(): MotorErrorPublico {
    return {
      error: this.message,
      errorType: this.errorType,
      isRateLimitOrDemand: this.isRateLimitOrDemand,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
    };
  }
}
