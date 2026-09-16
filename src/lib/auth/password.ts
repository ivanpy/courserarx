import { toBase64Url, fromBase64Url } from './crypto';

/**
 * PBKDF2 sobre Web Crypto (`crypto.subtle`) — misma familia que `crypto.ts`
 * (HMAC), deliberadamente sin `node:crypto` para no romper la consistencia
 * de todo `lib/auth/*` (ver la nota de runtime en crypto.ts). Solo lo llama
 * `login/actions.ts` (Server Action, runtime Node) y `db/seed-admin.ts`
 * (script), nunca el proxy de Edge — pero mantener el mismo estilo evita que
 * el módulo dependa de en qué runtime termine ejecutándose.
 */
const encoder = new TextEncoder();
const PBKDF2_ITERATIONS = 210_000; // recomendación mínima OWASP (2023+) para PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const HASH_BYTES = 32;

async function derivarBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

/** Formato guardado: `pbkdf2:<iteraciones>:<salt-b64url>:<hash-b64url>` — versionable si el costo sube más adelante. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivarBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toBase64Url(salt)}:${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const partes = stored.split(':');
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false;

  const iterations = Number(partes[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(partes[2]);
  const hashEsperado = fromBase64Url(partes[3]);
  const hashCalculado = await derivarBits(password, salt, iterations);

  if (hashCalculado.length !== hashEsperado.length) return false;
  let diff = 0;
  for (let i = 0; i < hashCalculado.length; i++) diff |= hashCalculado[i] ^ hashEsperado[i];
  return diff === 0;
}

/**
 * Hash válido pero de una contraseña que nadie tiene: `loginAction` lo usa
 * cuando el email no existe, para que el tiempo de respuesta sea el mismo
 * que un password incorrecto real y no permita enumerar emails por timing.
 */
export const DUMMY_PASSWORD_HASH =
  'pbkdf2:210000:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
