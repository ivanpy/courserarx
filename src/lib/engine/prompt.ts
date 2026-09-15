import 'server-only';

/**
 * E4 del pipeline — ensambla las partes multimodales para @google/genai.
 * Puerto de server.ts:65-179, reescrito para pasar el contenido no confiable
 * por el vallado de guardrails.ts en lugar de interpolarlo directo (D-05).
 */
import {MASTER_TRUTH_PREAMBLE, construirBloqueVallado, type NivelRiesgoInjection} from './guardrails';
import type {AdjuntoClasificado} from './sanitize';

type ParteGemini = {text: string} | {inlineData: {mimeType: string; data: string}};

export interface ResultadoPrompt {
  parts: ParteGemini[];
  riesgoInjection: NivelRiesgoInjection;
  coincidenciasOverride: string[];
}

export function construirPartesPrompt({
  projectName,
  notes,
  adjuntosClasificados,
}: {
  projectName: string;
  notes: string;
  adjuntosClasificados: AdjuntoClasificado[];
}): ResultadoPrompt {
  const parts: ParteGemini[] = [];

  // Las imágenes rasterizadas van como inlineData, nunca como texto (VAL-05).
  for (const adjunto of adjuntosClasificados) {
    if (adjunto.kind === 'raster') {
      parts.push({inlineData: {mimeType: adjunto.mimeType, data: adjunto.base64}});
    }
  }

  const sketches = adjuntosClasificados
    .filter((a): a is Extract<AdjuntoClasificado, {kind: 'svg'}> => a.kind === 'svg')
    .map((a) => ({name: a.name, svgText: a.svgText}));

  const {bloqueTexto, riesgoInjection, coincidenciasOverride} = construirBloqueVallado({notes, sketches});

  const promptText = `Analiza los archivos adjuntos (capturas de pantalla y bocetos) y procésalos junto con mi análisis preliminar.

PROYECTO: ${projectName}

${MASTER_TRUTH_PREAMBLE}

${bloqueTexto}

Genera la propuesta y el backlog detallado siguiendo las instrucciones del sistema. Aplica estrictamente la Prioridad de Verdad (Master Truth), Aislamiento de Alcance (0 horas para extras detectados en capturas pero no pedidos en notas), Desglose Técnico Atómico, Detección de Gaps (sugerencias proactivas), Alertas de Conflicto y Asignación de Roles.`;

  parts.push({text: promptText});

  return {parts, riesgoInjection, coincidenciasOverride};
}
