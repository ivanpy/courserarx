/**
 * Primitivas de firma HMAC-SHA256 sobre Web Crypto API (`crypto.subtle`), deliberado
 * en vez de `node:crypto`: session.ts debe poder ejecutarse tanto en Server Components
 * (Node) como en middleware.ts (Edge runtime), y `node:crypto` no existe en Edge.
 * Sin `import 'server-only'` por el mismo motivo: ese guard fuerza la condición de
 * exportación `react-server`, que el bundle de Edge middleware no activa.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** Usa crypto.subtle.verify (comparación de MAC nativa) en vez de comparar strings con `===`. */
export async function verifyPayload(payload: string, signature: string, secret: string): Promise<boolean> {
  const key = await importHmacKey(secret);
  try {
    return await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

export function encodeBase64Url(value: string): string {
  return toBase64Url(encoder.encode(value));
}

export function decodeBase64Url(value: string): string {
  return decoder.decode(fromBase64Url(value));
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return new Uint8Array(digest);
}

/**
 * Compara dos strings sin filtrar por timing cuántos caracteres coinciden. Hashea
 * ambos primero (longitud fija, 32 bytes) para no filtrar tampoco una diferencia de
 * longitud por la vía rápida de un `return false` temprano en el mismatch de tamaño.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256Bytes(a), sha256Bytes(b)]);
  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }
  return diff === 0;
}

/** Hex de SHA-256, usado para no guardar valores crudos de cookies/tokens como clave de un Map en memoria. */
export async function hashHex(value: string): Promise<string> {
  const bytes = await sha256Bytes(value);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Secreto único del servidor para todo lo que firma con HMAC en `lib/auth/*`:
 * `session.ts` lo usa para firmar `admin_session`, `share-token.ts` lo deriva
 * (nunca lo usa crudo) para el token de enlace de Stakeholder. Reemplaza a
 * `ADMIN_PASSPHRASE` (Fase 5): esa variable ya no es un passphrase de login
 * — el login real compara contra `usuarios.password_hash` — así que un
 * nombre que siga sugiriendo "la contraseña del admin" sería engañoso.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET no está configurada en el entorno del servidor.');
  }
  return secret;
}
