import 'server-only';

/**
 * E5 del pipeline — SDK con fallback y clasificación de errores (§8).
 * Puerto de server.ts:56-63 y :181-318, preservando el comportamiento actual
 * (incluidas sus limitaciones conocidas, marcadas con TODO): la resiliencia
 * real — RES-01..09 — es la Fase 3.
 */
import {GoogleGenAI} from '@google/genai';
import {construirOrdenFallback} from './models';
import {RESPONSE_SCHEMA} from './response-schema';
import {MotorError} from './errors';

type ParteGemini = {text: string} | {inlineData: {mimeType: string; data: string}};

export interface ResultadoInferencia {
  rawJson: string;
  modeloUsado: string;
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

  const candidatos = construirOrdenFallback(modeloSolicitado);

  let response: {text?: string} | null = null;
  let ultimoError: unknown = null;
  let modeloUsado = candidatos[0];

  for (const modelo of candidatos) {
    try {
      console.log(`[Gemini] Intentando generar propuesta con modelo: ${modelo}`);
      response = await ai.models.generateContent({
        model: modelo,
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature,
          topK: 40,
          topP: 0.95,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      modeloUsado = modelo;
      console.log(`[Gemini] Generación exitosa con modelo: ${modelo}`);
      break;
      // TODO(Fase 3 · RES-01/RES-02): se captura toda excepción sin
      // discriminar reintentable vs. terminal, y sin backoff entre intentos
      // — igual que server.ts:309-313. Una clave inválida sigue disparando
      // hasta 7 llamadas destinadas a fallar.
    } catch (err) {
      console.warn(`[Gemini] Falló intento con modelo ${modelo}:`, err instanceof Error ? err.message : err);
      // TODO(Fase 3 · RES-05): se sobrescribe en cada vuelta, igual que
      // server.ts:311 — un 429 real en el modelo solicitado seguido de un
      // 400 en el último candidato se reporta como error genérico.
      ultimoError = err;
    }
  }

  if (!response) {
    throw clasificarErrorInferencia(ultimoError, requestId);
  }

  return {rawJson: response.text ?? '{}', modeloUsado};
}

/**
 * Puerto de la heurística de server.ts:368-397. RES-09 (clasificación por
 * error tipado del SDK, no por substring) es la Fase 3: el `String(error)
 * .includes("429")` de hoy marca como rate-limit cualquier mensaje que
 * contenga esa subcadena, incluido un id o un contador de tokens.
 */
function clasificarErrorInferencia(error: unknown, requestId: string): MotorError {
  let isRateLimitOrDemand = false;
  const mensajeCrudo = error instanceof Error ? error.message : String(error);

  try {
    if (typeof mensajeCrudo === 'string' && mensajeCrudo.includes('{')) {
      const parsed = JSON.parse(mensajeCrudo.slice(mensajeCrudo.indexOf('{')));
      if (parsed?.error?.code === 429 || parsed?.error?.status === 'RESOURCE_EXHAUSTED') {
        isRateLimitOrDemand = true;
      } else if (parsed?.error?.code === 503 || parsed?.error?.status === 'UNAVAILABLE') {
        isRateLimitOrDemand = true;
      }
    }
  } catch {
    // se conserva la heurística de substring de abajo
  }

  if (['429', 'RESOURCE_EXHAUSTED', 'quota', '503', 'high demand'].some((t) => String(error).includes(t))) {
    isRateLimitOrDemand = true;
  }

  return new MotorError({
    status: isRateLimitOrDemand ? 429 : 500,
    errorType: isRateLimitOrDemand ? 'KNOWN_RATE_LIMIT_OR_DEMAND' : 'UNHANDLED_ERROR',
    isRateLimitOrDemand,
    publicMessage: isRateLimitOrDemand
      ? 'La API de Gemini superó temporalmente la cuota gratuita o experimenta alta demanda. Por favor, intenta de nuevo en unos momentos o selecciona otro modelo.'
      : 'No se pudo generar la propuesta en este momento. Intenta nuevamente; si el problema persiste, reporta este requestId al administrador.',
    requestId,
    cause: error,
  });
}
