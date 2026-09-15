import 'server-only';

/**
 * E1 del pipeline — normalización de adjuntos.
 *
 * Puerto del filtro implícito de server.ts:69-71 (`if (!img.base64Data)
 * continue;`). Los topes de tamaño/cantidad de SEC-05 (D-06) son trabajo de
 * la Fase 3 — por ahora se preserva el único límite existente,
 * `express.json({ limit: "50mb" })`, sin agregar caps nuevos que cambiarían
 * qué peticiones se aceptan hoy.
 */
export interface AdjuntoNormalizado {
  name: string;
  mimeType: string;
  base64Data: string;
}

export function normalizarAdjuntos(images: unknown): AdjuntoNormalizado[] {
  if (!Array.isArray(images)) return [];

  const normalizados: AdjuntoNormalizado[] = [];
  for (const img of images) {
    if (!img || typeof img !== 'object') continue;
    const registro = img as Record<string, unknown>;
    if (!registro.base64Data) continue;

    normalizados.push({
      name: typeof registro.name === 'string' ? registro.name : 'diseño.svg',
      mimeType: typeof registro.mimeType === 'string' ? registro.mimeType : '',
      base64Data: String(registro.base64Data),
    });
  }
  return normalizados;
}
