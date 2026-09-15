import 'server-only';

/**
 * E1 del pipeline — normalización de adjuntos y límites de carga (SEC-05,
 * Fase 3, cierra D-06 junto con `images.max(8)`/`notes.max(100_000)` en
 * `contracts.ts`).
 *
 * Puerto del filtro implícito de server.ts:69-71 (`if (!img.base64Data)
 * continue;`), ahora con topes de tamaño reales en vez del único límite
 * previo (`express.json({ limit: "50mb" })`, que server.ts sigue aplicando
 * como cota exterior).
 *
 * El tamaño se mide sobre la LONGITUD del string `base64Data` tal como
 * llega, no sobre bytes decodificados: en este punto del pipeline (E1) el
 * dato puede venir como base64, como data-URL o como XML crudo de un SVG —
 * distinguir el formato es trabajo de `sanitize.ts` (E2), que corre después.
 * La longitud del string es además la métrica más relevante para lo que
 * SEC-05 realmente quiere acotar: cuánta memoria ocupa ya el payload en el
 * proceso del servidor, no el tamaño final decodificado.
 */
export interface AdjuntoNormalizado {
  name: string;
  mimeType: string;
  base64Data: string;
}

export type ResultadoIngest =
  | {ok: true; adjuntos: AdjuntoNormalizado[]}
  | {ok: false; motivo: string};

const MAX_ADJUNTOS = 8;
const MAX_BYTES_POR_ADJUNTO = 5 * 1024 * 1024;
const MAX_BYTES_TOTAL = 20 * 1024 * 1024;

export function normalizarAdjuntos(images: unknown): ResultadoIngest {
  if (!Array.isArray(images)) return {ok: true, adjuntos: []};

  if (images.length > MAX_ADJUNTOS) {
    return {ok: false, motivo: `Se admiten hasta ${MAX_ADJUNTOS} adjuntos por petición.`};
  }

  const adjuntos: AdjuntoNormalizado[] = [];
  let bytesTotales = 0;

  for (const img of images) {
    if (!img || typeof img !== 'object') continue;
    const registro = img as Record<string, unknown>;
    if (!registro.base64Data) continue;

    const base64Data = String(registro.base64Data);
    const bytesAdjunto = base64Data.length;

    if (bytesAdjunto > MAX_BYTES_POR_ADJUNTO) {
      return {
        ok: false,
        motivo: `El adjunto "${typeof registro.name === 'string' ? registro.name : 'sin nombre'}" supera el máximo de 5 MB.`,
      };
    }

    bytesTotales += bytesAdjunto;
    if (bytesTotales > MAX_BYTES_TOTAL) {
      return {ok: false, motivo: 'El total de adjuntos supera el máximo de 20 MB por petición.'};
    }

    adjuntos.push({
      name: typeof registro.name === 'string' ? registro.name : 'diseño.svg',
      mimeType: typeof registro.mimeType === 'string' ? registro.mimeType : '',
      base64Data,
    });
  }

  return {ok: true, adjuntos};
}
