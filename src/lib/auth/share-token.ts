import 'server-only';
import { signPayload, verifyPayload, encodeBase64Url, decodeBase64Url, getAuthSecret } from './crypto';

const SHARE_TOKEN_PURPOSE = 'share-token-v1';

/**
 * Cookie efímera que guarda el share-token tras el intercambio en
 * `app/api/share/route.ts` (?token=... → cookie httpOnly). Las layouts no reciben
 * `searchParams` (ver node_modules/next/dist/docs/.../layout.md#query-params), así
 * que (stakeholder)/layout.tsx solo puede validar esta cookie, nunca el query param.
 */
export const STAKEHOLDER_TOKEN_COOKIE = 'stakeholder_token';

export interface ShareTokenPayload {
  propuestaId: string;
}

/**
 * Subclave derivada de AUTH_SECRET por dominio de uso (HMAC como PRF), nunca el
 * secreto crudo: un share-token filtrado no permite forjar una `admin_session`,
 * y viceversa. No requiere un secreto nuevo ni una tabla.
 */
async function getShareTokenSecret(): Promise<string> {
  return signPayload(SHARE_TOKEN_PURPOSE, getAuthSecret());
}

export async function generateShareToken(propuestaId: string): Promise<string> {
  const secret = await getShareTokenSecret();
  const payloadB64 = encodeBase64Url(JSON.stringify({ propuestaId } satisfies ShareTokenPayload));
  const signature = await signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export async function verifyShareToken(token: string | undefined | null): Promise<ShareTokenPayload | null> {
  if (!token) return null;

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const secret = await getShareTokenSecret();
  const isValid = await verifyPayload(payloadB64, signature, secret);
  if (!isValid) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadB64));
    if (typeof payload?.propuestaId !== 'string' || !payload.propuestaId) return null;
    return { propuestaId: payload.propuestaId };
  } catch {
    return null;
  }
}
