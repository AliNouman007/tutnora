// Short-lived, single-use sign-in state stored in KV: the consent step and the GitHub round trip.

const TTL_SECONDS = 600;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type PendingKind = 'consent' | 'github-state';

/** A random 256-bit token, base64url-encoded (43 characters). */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function keyFor(kind: PendingKind, token: string): string {
  return `tutnora:pending:${kind}:${token}`;
}

/** Stores a value for ten minutes and returns the token that retrieves it. */
export async function savePending(
  kv: KVNamespace,
  kind: PendingKind,
  value: unknown,
): Promise<string> {
  const token = randomToken();
  await kv.put(keyFor(kind, token), JSON.stringify(value), { expirationTtl: TTL_SECONDS });
  return token;
}

/** Reads a pending value and deletes it, so each token works only once. */
export async function takePending(
  kv: KVNamespace,
  kind: PendingKind,
  token: string,
): Promise<unknown> {
  if (!TOKEN_PATTERN.test(token)) {
    return null;
  }
  const key = keyFor(kind, token);
  const value = await kv.get(key);
  if (value === null) {
    return null;
  }
  await kv.delete(key);
  return JSON.parse(value) as unknown;
}
