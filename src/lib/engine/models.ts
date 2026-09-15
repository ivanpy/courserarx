/**
 * E5 del pipeline (README §5.1) — orden de fallback entre modelos.
 *
 * Sin allowlist todavía: D-02 (Fase 2) es quien restringe el modelo
 * solicitado a un enum cerrado server-side. Por ahora se preserva
 * exactamente la cascada de server.ts:182-193 para mantener paridad
 * funcional; solo cambia dónde vive el código.
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
