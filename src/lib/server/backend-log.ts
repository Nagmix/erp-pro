const LOG =
  process.env.BACKEND_LOG_REQUESTS === '1' ||
  process.env.NODE_ENV === 'development';

export function logBackendRequest(
  method: string,
  path: string,
  ms: number,
  ok: boolean,
  detail?: string
): void {
  if (!LOG) return;
  const status = ok ? 'ok' : 'fail';
  const extra = detail ? ` ${detail}` : '';
  console.log(`[ERPNext] ${method} ${path} ${ms}ms ${status}${extra}`);
}
