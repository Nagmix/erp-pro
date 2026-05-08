/** Client-side session JWT / legacy token checks (must align with server `jwt-session`). */

export function decodeJwtPayloadBrowser(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const p = parts[1];
    const b64 = p.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    const json = atob(b64 + '='.repeat(pad));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Returns true if token exists and is not expired (supports exp in seconds or legacy ms). */
export function isSessionTokenAlive(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed.split('.').length === 3) {
    const decoded = decodeJwtPayloadBrowser(trimmed);
    if (!decoded?.userId) return false;
    const exp = decoded.exp;
    if (typeof exp !== 'number') return false;
    const expMs = exp > 1_000_000_000_000 ? exp : exp * 1000;
    return Date.now() < expMs;
  }
  try {
    const decoded = JSON.parse(atob(trimmed)) as { userId?: string; exp?: number };
    if (!decoded.userId) return false;
    const exp = decoded.exp;
    if (typeof exp !== 'number') return false;
    const expMs = exp > 1_000_000_000_000 ? exp : exp * 1000;
    return Date.now() < expMs;
  } catch {
    return false;
  }
}
