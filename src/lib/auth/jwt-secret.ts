/** Shared secret for HS256 (server + edge proxy). Keep in sync with `jwt-session.ts`. */
export function getJwtSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getJwtSecretString());
}

export function getJwtSecretString(): string {
  const s = process.env.AUTH_JWT_SECRET;
  if (s && s.length >= 16) return s;
  throw new Error(
    'AUTH_JWT_SECRET must be set (min 16 chars) in all environments. ' +
    'Generate one with: openssl rand -base64 32'
  );
}
