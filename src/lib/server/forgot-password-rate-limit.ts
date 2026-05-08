type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

export function isForgotPasswordRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = store.get(ip);
  if (!e || now - e.windowStart > WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return false;
  }
  e.count += 1;
  return e.count > MAX_PER_WINDOW;
}
