import 'server-only';

/**
 * E5 del pipeline (README §5.1) — allowlist de modelos y orden de fallback.
 *
 * Fase 2 (VAL-03, cierra D-02): `modelo` ya no es un string libre reflejado
 * de vuelta al cliente (server.ts:38 original) — se valida contra este
 * enum cerrado en contracts.ts. El orden de fallback lo sigue decidiendo
 * el servidor exclusivamente.
 */
export const MODELOS_PERMITIDOS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
] as const;

export type ModeloId = (typeof MODELOS_PERMITIDOS)[number];

export const MODELO_DEFAULT: ModeloId = 'gemini-3.5-flash';

const ETIQUETAS: Record<ModeloId, string> = {
  'gemini-3.5-flash': 'Gemini 3.5 Flash (Recomendado / Máxima disponibilidad y velocidad)',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite (Ultra rápido / Baja latencia)',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash Lite (Eficiente)',
  'gemini-3.8-flash': 'Gemini 3.8 Flash (Sujeto a cuota y alta demanda)',
  'gemini-flash-latest': 'Gemini Flash Latest',
};

/**
 * Cascada interna de fallback (§5.1 E5) — puerto de server.ts:182-193. Incluye
 * un peldaño (`gemini-flash-lite-latest`) que NO es seleccionable por el
 * cliente (no está en `MODELOS_PERMITIDOS`/el dropdown): existe solo como red
 * de resiliencia interna, nunca como elección directa.
 */
const CASCADA_FALLBACK_DEFAULT = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

/** Modelo solicitado primero, luego la cascada, sin duplicados. */
export function construirOrdenFallback(modeloSolicitado: string): string[] {
  const candidatos = [modeloSolicitado, ...CASCADA_FALLBACK_DEFAULT].filter(Boolean) as string[];
  return Array.from(new Set(candidatos));
}

/**
 * DTO `ModeloPublico` (§4.1, §4.2 Nivel 1): lo único que cruza al cliente
 * sobre los modelos. Sin `topK`, `topP` ni `temperature` — esos son
 * constantes/parámetros de servidor sin representación en el lado cliente.
 */
export interface ModeloPublico {
  id: ModeloId;
  etiqueta: string;
  disponible: boolean;
}

export function obtenerCatalogoPublico(): ModeloPublico[] {
  return MODELOS_PERMITIDOS.map((id) => ({id, etiqueta: ETIQUETAS[id], disponible: true}));
}
