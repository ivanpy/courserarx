import 'server-only';

/**
 * E5 del pipeline — SDK con fallback, timeout y clasificación de errores
 * tipada (§8). Reescrito en la Fase 3 (RES-01, 02, 04, 05, 06, 07, 09;
 * cierra D-06 parcialmente vía circuit breaker, D-07 y D-10).
 *
 * `@google/genai` expone `ApiError` (única clase pública, con `.status` =
 * código HTTP real de Gemini) y clases internas sin exportar como tipo pero
 * con `.name` estable en runtime: `RequestTimeoutError`, `ConnectionError`.
 * Esto reemplaza la heurística de substring de las fases anteriores
 * (`String(error).includes("429")`) por clasificación tipada real (RES-09).
 *
 * El SDK reintenta internamente por defecto (`httpOptions.retryOptions`,
 * hasta 5 intentos con backoff propio sobre 408/429/5xx). Se desactiva
 * (`attempts: 1`) en cada llamada: sin esto, la cascada de hasta 6 modelos
 * anidada sobre 5 reintentos internos podría disparar hasta 30 llamadas HTTP
 * reales por petición — lo opuesto al criterio de salida de esta fase ("una
 * clave inválida produce 1 intento, no 7"). Con el retry interno apagado,
 * este módulo es la única fuente de decisiones de reintento.
 *
 * RES-04 (timeout por intento + presupuesto global) se resuelve con
 * `httpOptions.timeout` en vez de un `AbortController` construido a mano:
 * activa el `AbortSignal` interno del SDK, produce `RequestTimeoutError` de
 * forma confiable, y calculando el valor como
 * `min(tope por intento, presupuesto global restante)` cubre ambos
 * requisitos con un solo mecanismo.
 */
import {GoogleGenAI, ApiError} from '@google/genai';
import {construirOrdenFallback} from './models';
import {RESPONSE_SCHEMA} from './response-schema';
import {MotorError} from './errors';
import {MotorOutputDataSchema, type MotorOutputData} from './contracts';
import {parsearRespuestaMotor} from './parse';
import {estaAbierto, registrarResultado} from './circuit-breaker';

type ParteGemini = {text: string} | {inlineData: {mimeType: string; data: string}};

export interface ResultadoInferencia {
  data: MotorOutputData;
  modeloUsado: string;
  intentos: number;
}

const PRESUPUESTO_GLOBAL_MS = 45_000;
const TIMEOUT_POR_INTENTO_MS = 20_000;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ejecutarInferencia({
  apiKey,
  modeloSolicitado,
  systemInstruction,
  temperature,
  contentsPayload,
  requestId,
}: {
  apiKey: string;
  modeloSolicitado: string;
  systemInstruction: string;
  temperature: number;
  contentsPayload: Array<{role: string; parts: ParteGemini[]}>;
  requestId: string;
}): Promise<ResultadoInferencia> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {headers: {'User-Agent': 'aistudio-build'}},
  });

  const candidatosOriginal = construirOrdenFallback(modeloSolicitado);

  // RES-07: se saltan los modelos con el circuito abierto, salvo que eso
  // dejara la cascada vacía — mejor intentar igual que fallar sin probar nada.
  const disponibles = candidatosOriginal.filter((m) => !estaAbierto(m));
  const candidatos = disponibles.length > 0 ? disponibles : candidatosOriginal;

  const deadline = Date.now() + PRESUPUESTO_GLOBAL_MS;

  let errorDelSolicitado: unknown = null;
  let ultimoError: unknown = null;
  let intentos = 0;

  for (const modelo of candidatos) {
    if (Date.now() >= deadline) {
      console.warn('[Gemini] Presupuesto global agotado; no se intentan más modelos.');
      break;
    }

    // RES-02: backoff con jitter antes de cada reintento (no antes del primero).
    if (intentos > 0) {
      const backoff = Math.min(4000, 500 * 2 ** intentos) + Math.random() * 300;
      const restante = Math.max(0, deadline - Date.now());
      const espera = Math.min(backoff, restante);
      if (espera > 0) await esperar(espera);
    }

    if (Date.now() >= deadline) break;

    intentos++;
    const timeoutIntento = Math.min(TIMEOUT_POR_INTENTO_MS, Math.max(1000, deadline - Date.now()));

    try {
      console.log(`[Gemini] Intentando generar propuesta con modelo: ${modelo} (timeout ${timeoutIntento}ms)`);
      const response = await ai.models.generateContent({
        model: modelo,
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature,
          topK: 40,
          topP: 0.95,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          httpOptions: {timeout: timeoutIntento, retryOptions: {attempts: 1}},
        },
      });

      // RES-06 + VAL-07/INV-04/INV-06: parseo defensivo y re-validación de
      // forma DENTRO del intento — un JSON truncado o una forma inválida ya
      // no puede escapar hacia un 500 genérico; se trata como un fallo más
      // de este candidato y se prueba el siguiente modelo.
      let parsedJson: unknown;
      try {
        parsedJson = parsearRespuestaMotor(response.text ?? '{}');
      } catch (parseErr) {
        throw new Error(`JSON_INVALIDO: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
      }

      const validado = MotorOutputDataSchema.safeParse(parsedJson);
      if (!validado.success) {
        throw new Error(`FORMA_INVALIDA: ${validado.error.issues[0]?.message ?? 'forma inesperada'}`);
      }

      console.log(`[Gemini] Generación exitosa con modelo: ${modelo}`);
      registrarResultado(modelo, true);
      return {data: validado.data, modeloUsado: modelo, intentos};
    } catch (err) {
      registrarResultado(modelo, false);
      if (modelo === modeloSolicitado) errorDelSolicitado = err;
      ultimoError = err;

      const clasificacion = clasificarTipoDeError(err);
      console.warn(
        `[Gemini] Falló intento con modelo ${modelo} (${clasificacion}):`,
        err instanceof Error ? err.message : err
      );

      // RES-01: un error terminal (payload rechazado, clave inválida, etc.)
      // falla igual en cualquier modelo — seguir probando la cascada es
      // ruido, no resiliencia. Se aborta de inmediato.
      if (clasificacion === 'terminal') break;
    }
  }

  // RES-05: se prioriza el error del modelo SOLICITADO sobre el del último
  // candidato probado — hoy `ultimoError` se sobrescribía en cada vuelta, así
  // que un 429 real en el modelo pedido seguido de un 400 en el último
  // candidato se reportaba como error genérico.
  throw clasificarErrorFinal(errorDelSolicitado ?? ultimoError, requestId);
}

type TipoError = 'reintentable' | 'terminal';

/** RES-01/RES-09 — clasificación tipada del SDK, no heurística de substring. */
export function clasificarTipoDeError(error: unknown): TipoError {
  const mensaje = error instanceof Error ? error.message : String(error);

  if (mensaje.startsWith('JSON_INVALIDO') || mensaje.startsWith('FORMA_INVALIDA')) {
    return 'reintentable';
  }

  if (error instanceof ApiError) {
    if (error.status === 429 || error.status === 503) return 'reintentable';
    return 'terminal'; // 400/401/403/404 y cualquier otro código: defecto propio, no saturación del proveedor.
  }

  const name = error instanceof Error ? error.name : '';
  if (name === 'RequestTimeoutError' || name === 'ConnectionError') return 'reintentable';

  return 'terminal';
}

/** Construye el MotorError final una vez agotada o abortada la cascada. */
function clasificarErrorFinal(error: unknown, requestId: string): MotorError {
  const mensaje = error instanceof Error ? error.message : String(error);

  if (mensaje.startsWith('JSON_INVALIDO') || mensaje.startsWith('FORMA_INVALIDA')) {
    return new MotorError({
      status: 500,
      errorType: 'UNHANDLED_ERROR',
      publicMessage: 'El modelo no pudo generar un backlog con una forma válida tras varios intentos. Intenta nuevamente.',
      requestId,
      cause: error,
    });
  }

  if (error instanceof ApiError) {
    if (error.status === 429 || error.status === 503) {
      return new MotorError({
        status: 429,
        errorType: 'KNOWN_RATE_LIMIT_OR_DEMAND',
        isRateLimitOrDemand: true,
        publicMessage:
          'La API de Gemini superó temporalmente la cuota gratuita o experimenta alta demanda. Por favor, intenta de nuevo en unos momentos o selecciona otro modelo.',
        requestId,
        cause: error,
      });
    }
    return new MotorError({
      status: 500,
      errorType: 'UNHANDLED_ERROR',
      publicMessage:
        'No se pudo generar la propuesta en este momento. Intenta nuevamente; si el problema persiste, reporta este requestId al administrador.',
      requestId,
      cause: error,
    });
  }

  const name = error instanceof Error ? error.name : '';
  if (name === 'RequestTimeoutError') {
    return new MotorError({
      status: 504,
      errorType: 'TIMEOUT',
      publicMessage: 'El servicio de IA tardó demasiado en responder. Intenta nuevamente.',
      requestId,
      cause: error,
    });
  }

  return new MotorError({
    status: 500,
    errorType: 'UNHANDLED_ERROR',
    publicMessage:
      'No se pudo generar la propuesta en este momento. Intenta nuevamente; si el problema persiste, reporta este requestId al administrador.',
    requestId,
    cause: error,
  });
}
