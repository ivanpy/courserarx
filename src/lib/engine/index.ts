/**
 * Único punto de entrada del motor (§3.2, §12): "tres puertas, una
 * implementación". Express hoy, `app/api/motor/route.ts` y —en su momento—
 * el CLI llaman exactamente a esta función. Ninguno repite la lógica de
 * negocio ni puede esquivar la validación de E0.
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
import {parsearRespuestaMotor, recalcularHorasTotales} from './parse';
import {registrarEventoMotor} from './telemetry';

export {MotorInputSchema, type MotorInput, type MotorOutput} from './contracts';
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

  const projectName = input.projectName || 'Proyecto Sin Nombre';
  const modeloSolicitado = input.model || 'gemini-3.5-flash';
  const temperature = typeof input.temperature === 'number' ? input.temperature : 0.1;

  // E1 — normalización de adjuntos.
  const adjuntosNormalizados = normalizarAdjuntos(input.images);
  // E2 — limpieza base64, MIME real y saneamiento de SVG.
  const adjuntosClasificados = adjuntosNormalizados.map(clasificarYSanearAdjunto);

  // E3 + E4 — vallado anti-injection, encuadre Master Truth y ensamblado multimodal.
  const {parts, riesgoInjection} = construirPartesPrompt({
    projectName,
    notes: input.notes,
    adjuntosClasificados,
  });
  const systemInstruction = resolverSystemInstruction(input.systemInstructions);

  // E5 — inferencia con fallback.
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

  // E6 — parseo defensivo + recómputo de horas.
  let parsedData: Record<string, unknown>;
  try {
    parsedData = parsearRespuestaMotor(resultado.rawJson);
  } catch (err) {
    registrarEventoMotor({
      requestId,
      modeloSolicitado,
      modeloUsado: resultado.modeloUsado,
      latenciaMs: Date.now() - inicio,
      riesgoInjection,
      resultado: 'error',
      errorType: 'UNHANDLED_ERROR',
    });
    throw new MotorError({
      status: 500,
      errorType: 'UNHANDLED_ERROR',
      publicMessage: 'El modelo devolvió una respuesta que no se pudo interpretar. Intenta nuevamente.',
      requestId,
      cause: err,
    });
  }

  const horasRecalculadas = recalcularHorasTotales(parsedData);
  if (horasRecalculadas > 0) {
    parsedData.horas_totales_validadas = horasRecalculadas;
  }

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
    ...(parsedData as Omit<MotorOutput, 'metadata'>),
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
    },
  };
}
