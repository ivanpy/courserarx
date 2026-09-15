import 'server-only';

/**
 * Único punto de entrada del motor (§3.2, §12): "tres puertas, una
 * implementación". Express hoy, `app/api/motor/route.ts` y —en su momento—
 * el CLI llaman exactamente a esta función. Ninguno repite la lógica de
 * negocio ni puede esquivar la validación de E0.
 *
 * Fase 3: ya no parsea la respuesta del modelo ni la re-valida — eso ahora
 * vive dentro de `ejecutarInferencia()` (RES-06). Este orquestador aplica
 * los invariantes "blandos" (INV-01/03/05) sobre la salida ya validada, y
 * traduce el resultado discriminado de `normalizarAdjuntos` (SEC-05) a
 * `MotorError` cuando corresponde.
 */
import {randomUUID} from 'crypto';
import {ZodError} from 'zod';
import {MotorInputSchema, type MotorOutput} from './contracts';
import {MotorError} from './errors';
import {normalizarAdjuntos} from './ingest';
import {clasificarYSanearAdjunto} from './sanitize';
import {construirPartesPrompt} from './prompt';
import {resolverSystemInstruction} from './system-instruction';
import {ejecutarInferencia} from './inference';
import {recalcularHorasTotales} from './parse';
import {aplicarInvariantesSuaves} from './invariants';
import {registrarEventoMotor} from './telemetry';

export {MotorInputSchema, type MotorInput, type MotorOutput, type MotorOutputData} from './contracts';
export {MotorError, type MotorErrorPublico} from './errors';

export async function ejecutarMotor(inputCrudo: unknown): Promise<MotorOutput> {
  const requestId = randomUUID();
  const inicio = Date.now();

  // E0 — la validación vive DENTRO del motor (VAL-01), no en el caller.
  let input;
  try {
    input = MotorInputSchema.parse(inputCrudo);
  } catch (err) {
    const mensaje =
      err instanceof ZodError ? err.issues[0]?.message ?? 'Entrada inválida.' : 'Entrada inválida.';
    throw new MotorError({
      status: 400,
      errorType: 'VALIDATION_ERROR',
      publicMessage: mensaje,
      requestId,
      cause: err,
    });
  }

  const projectName = input.projectName || 'Proyecto Sin Nombre';
  // `model` ya trae default del propio Zod schema (MODELO_DEFAULT) y está
  // validado contra el enum; no hace falta un fallback manual acá.
  const modeloSolicitado = input.model;
  const temperature = typeof input.temperature === 'number' ? input.temperature : 0.1;

  // E1 — normalización de adjuntos + límites de carga (SEC-05, D-06). Va
  // antes que la comprobación de la API key a propósito: un payload mal
  // formado se rechaza (400) sin importar si el servicio está disponible.
  const resultadoIngest = normalizarAdjuntos(input.images);
  if (!resultadoIngest.ok) {
    throw new MotorError({
      status: 400,
      errorType: 'VALIDATION_ERROR',
      publicMessage: resultadoIngest.motivo,
      requestId,
    });
  }
  const adjuntosNormalizados = resultadoIngest.adjuntos;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new MotorError({
      status: 500,
      errorType: 'CONFIGURATION_ERROR',
      publicMessage: 'El servicio de IA no está disponible en este momento. Contacta al administrador.',
      requestId,
      cause: new Error('GEMINI_API_KEY no encontrada en el entorno del servidor'),
    });
  }

  // E2 — limpieza base64, MIME real y saneamiento de SVG.
  const adjuntosClasificados = adjuntosNormalizados.map(clasificarYSanearAdjunto);

  // E3 + E4 — vallado anti-injection, encuadre Master Truth y ensamblado multimodal.
  const {parts, riesgoInjection} = construirPartesPrompt({
    projectName,
    notes: input.notes,
    adjuntosClasificados,
  });
  const systemInstruction = resolverSystemInstruction();

  // E5 — inferencia con fallback, timeout, circuit breaker y validación de forma.
  let resultado;
  try {
    resultado = await ejecutarInferencia({
      apiKey,
      modeloSolicitado,
      systemInstruction,
      temperature,
      contentsPayload: [{role: 'user', parts}],
      requestId,
    });
  } catch (err) {
    registrarEventoMotor({
      requestId,
      modeloSolicitado,
      latenciaMs: Date.now() - inicio,
      riesgoInjection,
      resultado: 'error',
      errorType: err instanceof MotorError ? err.errorType : 'UNHANDLED_ERROR',
    });
    throw err;
  }

  // E6 — invariantes "blandos" (INV-01, 03, 05) + recómputo de horas (INV-02).
  // Los invariantes "duros" (INV-04, 06) ya se aplicaron dentro de la
  // cascada vía MotorOutputDataSchema — lo que llega acá ya tiene forma válida.
  const {data: dataCorregida, correcciones} = aplicarInvariantesSuaves(resultado.data);
  const horasRecalculadas = recalcularHorasTotales(dataCorregida);
  dataCorregida.horas_totales_validadas = horasRecalculadas;

  const isAutoResolved = resultado.modeloUsado !== modeloSolicitado;

  registrarEventoMotor({
    requestId,
    modeloSolicitado,
    modeloUsado: resultado.modeloUsado,
    latenciaMs: Date.now() - inicio,
    riesgoInjection,
    resultado: 'ok',
  });

  return {
    ...dataCorregida,
    metadata: {
      proyecto: projectName,
      fechaGeneracion: new Date().toISOString(),
      modeloUsado: resultado.modeloUsado,
      modeloOriginal: modeloSolicitado,
      autoResolvedFallback: isAutoResolved,
      resolucionAutomatica: isAutoResolved
        ? `Se recuperó automáticamente de la alta demanda o límite de cuota en ${modeloSolicitado} utilizando el modelo disponible ${resultado.modeloUsado}.`
        : null,
      cantidadImagenes: adjuntosNormalizados.length,
      requestId,
      riesgoInjection,
      intentosCascada: resultado.intentos,
      correccionesInvariantes: correcciones,
    },
  };
}
