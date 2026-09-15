/**
 * E2 del pipeline (README §5.1) — limpieza de base64, verificación de MIME
 * real y saneamiento del XML de un SVG antes de que cualquiera de los dos
 * llegue al prompt (VAL-05).
 *
 * Nuevo en la Fase 1: server.ts:95-114 decodificaba el SVG pero no lo
 * saneaba en absoluto — cualquier <script>, handler on*, o comentario XML
 * llegaba intacto al modelo como texto de confianza. Regex, no un parser XML
 * completo: alcanza para los vectores de inyección conocidos sin sumar una
 * dependencia nueva en esta fase.
 */

export type AdjuntoClasificado =
  | {kind: 'svg'; name: string; svgText: string}
  | {kind: 'raster'; name: string; mimeType: string; base64: string}
  | {kind: 'descartado'; name: string; motivo: string};

import type {AdjuntoNormalizado} from './ingest';

const FIRMAS_RASTER: Array<{mime: string; check: (buf: Buffer) => boolean}> = [
  {
    mime: 'image/png',
    check: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {mime: 'image/jpeg', check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff},
  {mime: 'image/gif', check: (b) => b.length > 4 && b.toString('ascii', 0, 4) === 'GIF8'},
  {
    mime: 'image/webp',
    check: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/** VAL-05: se confía en los bytes reales, no en el `mimeType` ni la extensión que declara el cliente. */
function detectarMimeReal(buf: Buffer): string | null {
  for (const firma of FIRMAS_RASTER) {
    if (firma.check(buf)) return firma.mime;
  }
  return null;
}

function esProbableSvg(mimeType: string, rawData: string, name: string): boolean {
  return (
    mimeType.includes('svg') ||
    rawData.includes('%3Csvg') ||
    rawData.includes('<svg') ||
    name.toLowerCase().endsWith('.svg')
  );
}

/** Puerto exacto de server.ts:96-114. */
function decodificarSvg(rawData: string): string {
  try {
    if (rawData.includes('%3C') || rawData.includes('%20')) return decodeURIComponent(rawData);
    if (rawData.trim().startsWith('<')) return rawData;
    const decoded = Buffer.from(rawData, 'base64').toString('utf-8');
    if (decoded.includes('<svg') || decoded.includes('<?xml') || decoded.includes('<text')) return decoded;
    return rawData;
  } catch {
    return rawData;
  }
}

/**
 * VAL-05: elimina `<script>`, `<foreignObject>`, `<iframe>`, atributos `on*`,
 * URIs `javascript:` y comentarios XML (escondite habitual de texto
 * dirigido al modelo). Neutraliza `href`/`xlink:href` externos en `<use>`
 * conservando las referencias locales (`#id`), que son legítimas en un SVG.
 */
export function sanearSvg(svgOriginal: string): string {
  let svg = svgOriginal;

  svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '');
  svg = svg.replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, '');

  // XML no admite escape con backslash dentro de un valor de atributo: un
  // valor entre comillas dobles simplemente no puede contener `"` (iría como
  // `&quot;`). Por eso alcanza con excluir la comilla delimitadora, sin la
  // semántica de escape de un string JS/JSON.
  svg = svg.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  svg = svg.replace(/\son\w+\s*=\s*'[^']*'/gi, '');

  svg = svg.replace(/(["'])\s*javascript:[^"']*\1/gi, '$1#$1');

  svg = svg.replace(/<use\b[^>]*>/gi, (tag) =>
    tag.replace(/((?:xlink:)?href)\s*=\s*(["'])((?:(?!\2).)*)\2/gi, (attrMatch, attrName, quote, value) =>
      value.trim().startsWith('#') ? attrMatch : `${attrName}=${quote}#${quote}`
    )
  );

  return svg;
}

/** Puerto de server.ts:73-93. */
function extraerMimeYData(rawData: string, mimeTypeDeclarado: string): {rawData: string; mimeType: string} {
  if (!rawData.startsWith('data:')) return {rawData, mimeType: mimeTypeDeclarado};

  const commaIdx = rawData.indexOf(',');
  if (commaIdx === -1) return {rawData, mimeType: mimeTypeDeclarado};

  const prefix = rawData.slice(0, commaIdx);
  const matchedMime = prefix.match(/^data:([^;,]+)/)?.[1];
  return {
    rawData: rawData.slice(commaIdx + 1),
    mimeType: matchedMime || mimeTypeDeclarado,
  };
}

export function clasificarYSanearAdjunto(adjunto: AdjuntoNormalizado): AdjuntoClasificado {
  const {rawData, mimeType} = extraerMimeYData(adjunto.base64Data, adjunto.mimeType);

  if (esProbableSvg(mimeType, rawData, adjunto.name)) {
    return {kind: 'svg', name: adjunto.name, svgText: sanearSvg(decodificarSvg(rawData))};
  }

  const cleanBase64 = rawData.replace(/\s+/g, '');
  const pareceBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanBase64.slice(0, 1000));
  if (!pareceBase64 || cleanBase64.length <= 20) {
    return {kind: 'descartado', name: adjunto.name, motivo: 'base64 inválido o demasiado corto'};
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    return {kind: 'descartado', name: adjunto.name, motivo: 'no se pudo decodificar base64'};
  }

  const mimeReal = detectarMimeReal(buffer);
  if (!mimeReal) {
    return {
      kind: 'descartado',
      name: adjunto.name,
      motivo: 'los bytes no corresponden a ningún formato de imagen soportado',
    };
  }

  return {kind: 'raster', name: adjunto.name, mimeType: mimeReal, base64: cleanBase64};
}
