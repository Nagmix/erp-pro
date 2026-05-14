// ============================================================
// INTERNAL SERVER-SIDE COMMUNICATION LAYER
// This module runs ONLY on the server (Node.js).
// It communicates with the backend internally and NEVER exposes
// internal architecture details to the client.
//
// Architecture:
//   Client Browser → Next.js API Routes → This Layer → Backend
//   (no direct connection between browser and backend)
// ============================================================

import { createHash } from 'crypto';
import type { ReportDef } from '@/lib/reports/catalog';
import { logBackendRequest } from '@/lib/server/backend-log';
import { cacheGet, cacheSet } from '@/lib/server/redis-cache';
import {
  getResolvedBackendHost,
  getFrappeApiTokenPair,
  usesFrappeTokenAuth,
  getBackendVersion,
  isBackendV16OrLater,
  loadFrappeConnectionFile,
  clearFrappeConnectionCache,
} from '@/lib/server/frappe-connection-store';

// Backend server configuration - SERVER SIDE ONLY
// These are NEVER exposed to the client
const BACKEND_API_PREFIX = '/api';

const LIST_CACHE_TTL = Math.min(600, Math.max(0, parseInt(process.env.REDIS_CACHE_LIST_TTL_SEC || '45', 10)));
const DOC_CACHE_TTL = Math.min(600, Math.max(0, parseInt(process.env.REDIS_CACHE_DOC_TTL_SEC || '60', 10)));

// Internal session management
let systemSession: string | null = null;
let sessionExpiry: number = 0;

// ============================================================
// ERPNext Version Detection (v15 ↔ v16 compatibility)
// ============================================================

/** Cached detected version — persists for the Node.js process lifetime. */
let detectedVersion: string | null = null;
let detectionAttempted = false;

/**
 * Detect the ERPNext version by calling the backend.
 * Tries multiple known version endpoints, falling back gracefully.
 *
 * v16 may expose version via `frappe.utils.logger.get_version`
 * or via the standard `frappe.client.get_version` method.
 * The result is cached for the process lifetime.
 */
export async function detectErpnextVersion(): Promise<string> {
  // Return cached result if already detected
  if (detectedVersion) return detectedVersion;

  // Skip re-detection if we already tried and failed
  if (detectionAttempted) return getBackendVersion();

  detectionAttempted = true;
  const host = getResolvedBackendHost();

  // Try version detection endpoints in order of likelihood
  const versionEndpoints = [
    // v16+ path: frappe.client.get_version (may be added in v16)
    '/method/frappe.client.get_version',
    // Fallback: read version from Version doctype (works in v15 and v16)
    '/method/frappe.client.get_list',
  ];

  try {
    // Attempt 1: Direct version method
    try {
      const response = await fetch(`${host}${BACKEND_API_PREFIX}${versionEndpoints[0]}`, {
        method: 'GET',
        headers: withSiteHeader({ Accept: 'application/json' }),
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json() as { message?: unknown };
        const msg = data.message;
        if (typeof msg === 'string' && msg) {
          // Parse version string like "v16.0.0" or "16.x.x"
          const match = msg.match(/v?(\d+)/);
          if (match) {
            detectedVersion = `v${match[1]}`;
            console.log(`[ERPNext Version] Detected: ${detectedVersion} via get_version`);
            return detectedVersion;
          }
        }
        // If message is an object, try to extract version
        if (msg && typeof msg === 'object') {
          const obj = msg as Record<string, unknown>;
          const ver = String(obj.version || obj.frappe_version || '');
          const match = ver.match(/v?(\d+)/);
          if (match) {
            detectedVersion = `v${match[1]}`;
            console.log(`[ERPNext Version] Detected: ${detectedVersion} via get_version object`);
            return detectedVersion;
          }
        }
      }
    } catch {
      /* endpoint not available — continue to fallback */
    }

    // Attempt 2: Query the installed apps list to determine ERPNext version
    try {
      const pair = getFrappeApiTokenPair();
      const headers = withSiteHeader({ 'Content-Type': 'application/json', Accept: 'application/json' });
      if (pair) headers['Authorization'] = `token ${pair.key}:${pair.secret}`;
      else if (systemSession) headers['Cookie'] = `sid=${systemSession}`;

      const response = await fetch(
        `${host}${BACKEND_API_PREFIX}/method/frappe.client.get_list`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            doctype: 'Installed Application',
            fields: ['app_name', 'app_version'],
            filters: [['app_name', '=', 'erpnext']],
            limit_page_length: 1,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json() as { message?: unknown[] };
        const rows = Array.isArray(data?.message) ? data.message : [];
        if (rows.length > 0) {
          const ver = String((rows[0] as Record<string, unknown>)?.app_version ?? '');
          const match = ver.match(/^(\d+)/);
          if (match) {
            detectedVersion = `v${match[1]}`;
            console.log(`[ERPNext Version] Detected: ${detectedVersion} via Installed Application`);
            return detectedVersion;
          }
        }
      }
    } catch {
      /* fallback failed */
    }

    // Attempt 3: Check the ping response headers or use the configured version
    console.log('[ERPNext Version] Auto-detection failed, using configured version');
  } catch {
    console.log('[ERPNext Version] Detection error, using configured version');
  }

  // Fall back to the configured BACKEND_VERSION env var (defaults to v16)
  return getBackendVersion();
}

/**
 * Returns the detected or configured version synchronously.
 * Call `detectErpnextVersion()` first to auto-detect, or rely on env var / file config.
 */
export function getDetectedVersion(): string {
  return detectedVersion || getBackendVersion();
}

/**
 * In ERPNext v16, some `frappe.desk.*` methods moved to `frappe.*`.
 * This helper tries the v16 path first, then falls back to the v15 path.
 */
async function callMethodWithVersionFallback(
  v16Method: string,
  v15Method: string,
  args: Record<string, unknown>,
  userSession?: string
): Promise<unknown> {
  // If we know we're on v15, skip the v16 attempt
  const configured = getBackendVersion();
  const version = detectedVersion || configured;
  const isV15 = version === 'v15' || version.startsWith('v14') || version.startsWith('v13');

  if (!isV15) {
    // Try v16 path first
    try {
      const result = await callMethod(v16Method, args, userSession);
      // If we got here, v16 path works — cache the version
      if (!detectedVersion) {
        detectedVersion = 'v16';
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // If the method doesn't exist (404 or similar), try v15 fallback
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('No method')) {
        console.log(`[v16→v15 Fallback] ${v16Method} not found, trying ${v15Method}`);
        return callMethod(v15Method, args, userSession);
      }
      // Some other error — rethrow
      throw error;
    }
  }

  // v15 path
  return callMethod(v15Method, args, userSession);
}

// ============================================================
// Internal Communication
// ============================================================

function frappeErrorMessage(json: Record<string, unknown>, status: number): string {
  const msg = json.message;
  if (typeof msg === 'string' && msg) return msg;
  if (msg && typeof msg === 'object' && 'message' in (msg as object)) {
    return String((msg as { message: unknown }).message);
  }
  const srv = json._server_messages;
  if (Array.isArray(srv) && srv[0]) {
    try {
      const inner = JSON.parse(String(srv[0])) as { message?: string };
      if (inner?.message) return inner.message;
    } catch {
      /* ignore */
    }
  }
  if (typeof json.exc === 'string' && json.exc) {
    const lines = json.exc.trim().split('\n');
    return lines[lines.length - 1] || `خطأ ${status}`;
  }
  return `خطأ الخادم (${status})`;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function frappeSiteName(): string | null {
  const fromEnv = process.env.BACKEND_SITE_NAME?.trim();
  if (fromEnv) return fromEnv;
  // ★ قراءة اسم الموقع من ملف الاتصال (يُكتب أثناء الإعداد)
  const fromFile = loadFrappeConnectionFile().backendSiteName?.trim();
  return fromFile || null;
}

function withSiteHeader(headers: Record<string, string>): Record<string, string> {
  const site = frappeSiteName();
  if (site) headers['X-Frappe-Site-Name'] = site;
  return headers;
}

function normalizeConnectionErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes('fetch failed') ||
    m.includes('econnrefused') ||
    m.includes('enotfound') ||
    m.includes('timed out')
  ) {
    return 'تعذر الاتصال بالخادم. تحقق من الإعدادات في صفحة إعداد الخادم ثم أعد المحاولة.';
  }
  return message;
}
async function internalRequest(
  method: string,
  path: string,
  body?: unknown,
  userSession?: string,
  retries: number = 3
): Promise<unknown> {
  const host = getResolvedBackendHost();
  const url = `${host}${BACKEND_API_PREFIX}${path}`;

  const headers: Record<string, string> = withSiteHeader({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  if (userSession) {
    headers['Cookie'] = `sid=${userSession}`;
  } else {
    const pair = getFrappeApiTokenPair();
    if (pair) {
      headers['Authorization'] = `token ${pair.key}:${pair.secret}`;
    } else if (systemSession && Date.now() < sessionExpiry) {
      headers['Cookie'] = `sid=${systemSession}`;
    }
  }

  let lastErr: Error = new Error('طلب غير معروف');

  for (let attempt = 0; attempt <= retries; attempt++) {
    const t0 = Date.now();
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401 && !userSession) {
        // إذا كانت مفاتيح API لا تعمل، نحاول تسجيل الدخول بالكلمة السرية بدلاً منها
        if (usesFrappeTokenAuth()) {
          console.warn('[Internal API] API token auth returned 401, falling back to session login');
        }
        systemSession = null;
        // مسح cache حتى نقرأ ملف الاتصال المحدث
        clearFrappeConnectionCache();
        // forceLogin=true لتخطي فحص usesFrappeTokenAuth وتسجيل الدخول بالكلمة السرية
        await ensureSystemSession(true);
        if (systemSession) {
          headers['Cookie'] = `sid=${systemSession}`;
          delete headers['Authorization'];
          const ms = Date.now() - t0;
          logBackendRequest(method, path, ms, false, '401→reauth');
          continue;
        }
      }

      const ms = Date.now() - t0;

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const message = frappeErrorMessage(errJson, response.status);
        lastErr = new Error(message);

        if (isRetryableStatus(response.status) && attempt < retries) {
          logBackendRequest(method, path, ms, false, `${response.status}→retry`);
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 400));
          continue;
        }

        logBackendRequest(method, path, ms, false, String(response.status));
        throw lastErr;
      }

      logBackendRequest(method, path, ms, true);
      return response.json();
    } catch (error) {
      const ms = Date.now() - t0;
      const raw = error instanceof Error ? error.message : String(error);
      lastErr = new Error(normalizeConnectionErrorMessage(raw));

      if (attempt === retries) {
        console.error('[Internal API Error]', { method, path, error: lastErr.message });
        logBackendRequest(method, path, ms, false, lastErr.message);
        throw lastErr;
      }
      logBackendRequest(method, path, ms, false, `retry ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastErr;
}

// ============================================================
// System Authentication (for background tasks / initial setup)
// ============================================================

async function ensureSystemSession(forceLogin: boolean = false): Promise<void> {
  // إذا تم طلب تسجيل دخول قسري (مثلاً بعد فشل API keys) نتخطى فحص token
  if (!forceLogin && usesFrappeTokenAuth()) return;
  if (!forceLogin && systemSession && Date.now() < sessionExpiry) return;

  // قراءة بيانات الدخول من متغيرات البيئة أو من ملف الاتصال المحلي
  const connectionFile = loadFrappeConnectionFile();
  const adminUser = process.env.BACKEND_ADMIN_USER || connectionFile.adminUser || 'Administrator';
  const adminPass = process.env.BACKEND_ADMIN_PASSWORD || connectionFile.adminPassword;
  if (!adminPass) {
    console.error('[System Auth] BACKEND_ADMIN_PASSWORD is not set — cannot establish system session');
    return;
  }
  const host = getResolvedBackendHost();

  try {
    const response = await fetch(
      `${host}${BACKEND_API_PREFIX}/method/login`,
      {
        method: 'POST',
        headers: withSiteHeader({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ usr: adminUser, pwd: adminPass }),
      }
    );

    const setCookie = response.headers.get('set-cookie');
    const sid = setCookie?.match(/sid=([^;]+)/)?.[1];
    if (sid) {
      systemSession = sid;
      const ttlHours = Number(process.env.SYSTEM_SESSION_TTL_HOURS) || 12;
      sessionExpiry = Date.now() + ttlHours * 60 * 60 * 1000;
    }
  } catch (error) {
    console.error('[System Auth Failed]', (error as Error).message);
  }
}

// ============================================================
// User Authentication (proxied through our API)
// ============================================================

export async function authenticateUser(username: string, password: string): Promise<{
  success: boolean;
  user?: {
    id: string;
    name: string;
    fullName: string;
    email: string;
    roles: string[];
  };
  session?: string;
  error?: string;
}> {
  const host = getResolvedBackendHost();
  try {
    const response = await fetch(
      `${host}${BACKEND_API_PREFIX}/method/login`,
      {
        method: 'POST',
        headers: withSiteHeader({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ usr: username, pwd: password }),
      }
    );

    if (!response.ok) {
      return { success: false, error: 'بيانات الدخول غير صحيحة' };
    }

    const data = await response.json();
    const setCookie = response.headers.get('set-cookie');
    const sid = setCookie?.match(/sid=([^;]+)/)?.[1];

    const fullName = (data.message?.full_name as string) || username;
    return {
      success: true,
      session: sid || undefined,
      user: {
        id: (data.message?.user as string) || username,
        name: fullName,
        fullName,
        email: (data.message?.user as string) || username,
        roles: [] as string[],
      },
    };
  } catch {
    return { success: false, error: 'فشل الاتصال بالخادم' };
  }
}

// ============================================================
// Generic CRUD Operations
// ============================================================

export async function getList(
  doctype: string,
  options: {
    fields?: string[];
    filters?: Record<string, unknown> | string[][];
    or_filters?: Record<string, unknown> | string[][];
    order_by?: string;
    limit?: number;
    offset?: number;
  } = {},
  userSession?: string
): Promise<unknown[]> {
  await ensureSystemSession();
  const params = new URLSearchParams();
  if (options.fields) params.set('fields', JSON.stringify(options.fields));
  if (options.filters) params.set('filters', JSON.stringify(options.filters));
  if (options.or_filters) params.set('or_filters', JSON.stringify(options.or_filters));
  if (options.order_by) params.set('order_by', options.order_by);
  // v16 compatibility: In ERPNext v16, `limit_page_length` may be renamed to `limit`.
  // We send both parameters for backward compatibility — v16 ignores `limit_page_length`
  // and v15 ignores `limit`.
  if (options.limit) {
    params.set('limit_page_length', String(options.limit));
    params.set('limit', String(options.limit));
  }
  if (options.offset) params.set('limit_start', String(options.offset));

  const encDoctype = encodeURIComponent(doctype);
  const path = `/resource/${encDoctype}?${params.toString()}`;

  if (LIST_CACHE_TTL > 0 && process.env.REDIS_URL) {
    const sid = userSession || systemSession || '';
    const tag = createHash('sha256')
      .update(JSON.stringify({ doctype, options, sid: sid.slice(0, 32) }))
      .digest('hex')
      .slice(0, 40);
    const ck = `erp:list:${tag}`;
    const hit = await cacheGet<unknown[]>(ck);
    if (hit) return hit;
    const result = await internalRequest('GET', path, undefined, userSession);
    const data = (result as { data: unknown[] }).data;
    await cacheSet(ck, data, LIST_CACHE_TTL);
    return data;
  }

  const result = await internalRequest('GET', path, undefined, userSession);
  return (result as { data: unknown[] }).data;
}

export async function getDoc(
  doctype: string,
  name: string,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  const encName = encodeURIComponent(name);
  const path = `/resource/${doctype}/${encName}`;

  if (DOC_CACHE_TTL > 0 && process.env.REDIS_URL) {
    const sid = userSession || systemSession || '';
    const ck = `erp:doc:${doctype}:${encName}:${createHash('sha256').update(sid).digest('hex').slice(0, 12)}`;
    const hit = await cacheGet<unknown>(ck);
    if (hit) return hit;
    const result = await internalRequest('GET', path, undefined, userSession);
    const data = (result as { data: unknown }).data;
    await cacheSet(ck, data, DOC_CACHE_TTL);
    return data;
  }

  const result = await internalRequest('GET', path, undefined, userSession);
  return (result as { data: unknown }).data;
}

/** Roles / profile from ERPNext `User` using an authenticated user session (DEVELOPMENT_PLAN 2.2). */
export async function loadUserProfileFromErpSession(
  sid: string,
  userName: string
): Promise<{ roles: string[]; fullName: string; email: string }> {
  const fallback = { roles: [] as string[], fullName: userName, email: userName };
  try {
    const doc = (await getDoc('User', userName, sid)) as {
      roles?: { role: string }[];
      full_name?: string;
      name?: string;
      email?: string;
    };
    const roles = Array.isArray(doc?.roles)
      ? doc.roles.map(r => r.role).filter((x): x is string => Boolean(x))
      : [];
    return {
      roles,
      fullName: typeof doc?.full_name === 'string' ? doc.full_name : doc?.name || userName,
      email: typeof doc?.email === 'string' ? doc.email : userName,
    };
  } catch {
    return fallback;
  }
}

/** Forgot-password via Frappe (no user session). Always generic message on client. */
export async function requestPasswordResetFromErp(identifier: string): Promise<void> {
  const host = getResolvedBackendHost();
  const url = `${host}${BACKEND_API_PREFIX}/method/frappe.core.doctype.user.user.reset_password`;
  await fetch(url, {
    method: 'POST',
    headers: withSiteHeader({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({ user: identifier }),
  });
}

/** Invalidate Frappe `sid` when present (DEVELOPMENT_PLAN 2.2). */
export async function logoutErpSession(sid: string): Promise<void> {
  try {
    const host = getResolvedBackendHost();
    await fetch(`${host}${BACKEND_API_PREFIX}/method/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: `sid=${sid}`,
      },
      body: '{}',
    });
  } catch {
    /* ignore */
  }
}

export async function createDoc(
  doctype: string,
  doc: Record<string, unknown>,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  const result = await internalRequest(
    'POST',
    `/resource/${encodeURIComponent(doctype)}`,
    doc,
    userSession
  );
  return (result as { data: unknown }).data;
}

export async function updateDoc(
  doctype: string,
  name: string,
  doc: Record<string, unknown>,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  const result = await internalRequest(
    'PUT',
    `/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { doctype, name, ...doc },
    userSession
  );
  return (result as { data: unknown }).data;
}

export async function deleteDoc(
  doctype: string,
  name: string,
  userSession?: string
): Promise<void> {
  await ensureSystemSession();
  await internalRequest(
    'DELETE',
    `/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    undefined,
    userSession
  );
}

export async function submitDoc(
  doctype: string,
  name: string,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  // [v16 NOTE] frappe.client.submit is a core Frappe method and is stable across v15/v16.
  // If v16 changes this, the version fallback mechanism would handle it.
  const result = await internalRequest(
    'POST',
    '/method/frappe.client.submit',
    { doc: { doctype, name } },
    userSession
  );
  return (result as { data: unknown }).data;
}

export async function cancelDoc(
  doctype: string,
  name: string,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  // [v16 NOTE] frappe.client.cancel is a core Frappe method and is stable across v15/v16.
  const result = await internalRequest(
    'POST',
    '/method/frappe.client.cancel',
    { doc: { doctype, name } },
    userSession
  );
  return (result as { data: unknown }).data;
}

export async function getCount(
  doctype: string,
  filters?: Record<string, unknown> | string[][],
  userSession?: string
): Promise<number> {
  await ensureSystemSession();
  const params = new URLSearchParams();
  params.set('doctype', doctype);
  if (filters) params.set('filters', JSON.stringify(filters));

  const result = await internalRequest(
    'GET',
    `/method/frappe.client.get_count?${params.toString()}`,
    undefined,
    userSession
  );
  return (result as { message: number }).message;
}

export async function callMethod(
  method: string,
  args?: Record<string, unknown>,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  const result = await internalRequest(
    'POST',
    `/method/${method}`,
    args,
    userSession
  );
  return (result as { message: unknown }).message;
}

/** Copy submitted doc then save as amendment (uses Frappe `copy_doc` + `amended_from`). */
export async function amendDoc(
  doctype: string,
  name: string,
  userSession?: string
): Promise<unknown> {
  // [v16 NOTE] frappe.client.copy_doc is a core Frappe method and is stable across v15/v16.
  // Verify against v16 if the method path changes.
  const copied = await callMethod('frappe.client.copy_doc', { doctype, name }, userSession);
  if (!copied || typeof copied !== 'object') {
    throw new Error('فشل نسخ المستند للتعديل');
  }
  const d = { ...(copied as Record<string, unknown>) };
  delete d.name;
  d.amended_from = name;
  return createDoc(doctype, d, userSession);
}

// ============================================================
// Reports
// ============================================================

type ReportDocRow = { name: string; report_name?: string; report_type?: string };

/** تقارير ERPNext المفعّلة لنوع مستند مرجعي (جدول Report). */
export async function listReportsForRefDoctype(
  refDoctype: string,
  userSession?: string
): Promise<ReportDocRow[]> {
  const raw = await callMethod(
    'frappe.client.get_list',
    {
      doctype: 'Report',
      fields: ['name', 'report_name', 'report_type'],
      filters: [
        ['ref_doctype', '=', refDoctype],
        ['disabled', '=', 0],
      ],
      // v16 compat: send both limit_page_length and limit for backward compatibility
      limit_page_length: 50,
      limit: 50,
      order_by: 'modified desc',
    },
    userSession
  );
  return Array.isArray(raw) ? (raw as ReportDocRow[]) : [];
}

function pickResolvedReportName(rows: ReportDocRow[], preferred: string): string {
  if (rows.length === 0) return preferred;
  const want = preferred.trim();
  const byName = rows.find((r) => r.name === want);
  if (byName) return byName.name;
  const byReportName = rows.find((r) => r.report_name === want);
  if (byReportName) return byReportName.name;
  const script = rows.find((r) => r.report_type === 'Script Report');
  if (script) return script.name;
  return rows[0]!.name;
}

/**
 * يحدّد اسم تقرير ERPNext الفعلي لـ `query_report.run`: إما الاسم في الكتالوج أو تقرير مطابق لـ `ref_doctype` في جدول Report.
 */
export async function resolveReportExecutionName(def: ReportDef, userSession?: string): Promise<string> {
  if (!def.resolveByRefDoctype) return def.reportName;
  const rows = await listReportsForRefDoctype(def.resolveByRefDoctype, userSession);
  return pickResolvedReportName(rows, def.reportName);
}

/** فلاتر قائمة سجلات نقاط الولاء من معايير التقرير المرسلة من الواجهة. */
function loyaltyPointEntryListFilters(filters: Record<string, unknown>): string[][] {
  const pairs: string[][] = [];
  const company = filters.company;
  if (typeof company === 'string' && company) pairs.push(['company', '=', company]);
  const from =
    (typeof filters.from_date === 'string' && filters.from_date) ||
    (typeof filters.period_start_date === 'string' && filters.period_start_date);
  const to =
    (typeof filters.to_date === 'string' && filters.to_date) ||
    (typeof filters.period_end_date === 'string' && filters.period_end_date);
  if (from) pairs.push(['posting_date', '>=', from]);
  if (to) pairs.push(['posting_date', '<=', to]);
  return pairs;
}

/**
 * عند عدم وجود تقرير قياسي على الخادم لـ Loyalty Point Entry: نفس شكل مخرجات `query_report` للتوافق مع الواجهة.
 */
export async function buildLoyaltyPointEntrySyntheticReport(
  filters: Record<string, unknown>,
  userSession?: string
): Promise<{
  columns: { fieldname: string; label: string; fieldtype: string; width?: number }[];
  result: Record<string, unknown>[];
  message?: string;
}> {
  const fields = [
    'name',
    'posting_date',
    'customer',
    'loyalty_program',
    'loyalty_program_tier',
    'loyalty_points',
    'purchase_amount',
    'invoice_type',
    'invoice',
    'expiry_date',
    'company',
  ];
  const filterPairs = loyaltyPointEntryListFilters(filters);
  const listArgs: Record<string, unknown> = {
    doctype: 'Loyalty Point Entry',
    fields,
    // v16 compat: send both limit_page_length and limit for backward compatibility
    limit_page_length: 500,
    limit: 500,
    order_by: 'posting_date desc',
  };
  if (filterPairs.length) listArgs.filters = filterPairs;

  const raw = await callMethod('frappe.client.get_list', listArgs, userSession);
  const result = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];

  const columns: { fieldname: string; label: string; fieldtype: string; width?: number }[] = [
    { fieldname: 'posting_date', label: 'تاريخ القيد', fieldtype: 'Date', width: 120 },
    { fieldname: 'customer', label: 'العميل', fieldtype: 'Link', width: 160 },
    { fieldname: 'loyalty_program', label: 'برنامج الولاء', fieldtype: 'Link', width: 160 },
    { fieldname: 'loyalty_program_tier', label: 'المستوى', fieldtype: 'Data', width: 120 },
    { fieldname: 'loyalty_points', label: 'النقاط', fieldtype: 'Int', width: 90 },
    { fieldname: 'purchase_amount', label: 'مبلغ الشراء', fieldtype: 'Currency', width: 120 },
    { fieldname: 'invoice_type', label: 'نوع المستند', fieldtype: 'Link', width: 130 },
    { fieldname: 'invoice', label: 'المستند', fieldtype: 'Dynamic Link', width: 140 },
    { fieldname: 'expiry_date', label: 'انتهاء الصلاحية', fieldtype: 'Date', width: 120 },
    { fieldname: 'company', label: 'الشركة', fieldtype: 'Link', width: 140 },
    { fieldname: 'name', label: 'رقم القيد', fieldtype: 'Link', width: 160 },
  ];

  return {
    columns,
    result,
    message:
      'عرض مباشر من مستند «Loyalty Point Entry» لأنه لا يوجد تقرير (Report) مفعّل لهذا النوع على الخادم.',
  };
}

/**
 * Run a Frappe Query Report.
 *
 * v16 COMPATIBILITY: In ERPNext v16, `frappe.desk.query_report.run` may be
 * moved to `frappe.query_report.run` (without the `desk` segment).
 * We use a fallback mechanism that tries the v16 path first, then v15.
 */
export async function runReport(
  reportName: string,
  filters?: Record<string, unknown>,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();

  const args = { report_name: reportName, filters };

  // Determine if we should try v16 path first
  const version = detectedVersion || getBackendVersion();
  const isV15 = version === 'v15' || version.startsWith('v14') || version.startsWith('v13');

  if (!isV15) {
    // Try v16 path first: frappe.query_report.run (without 'desk')
    try {
      const result = await internalRequest(
        'POST',
        '/method/frappe.query_report.run',
        args,
        userSession
      );
      // Success — cache version as v16
      if (!detectedVersion) detectedVersion = 'v16';
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('No method')) {
        console.log('[v16→v15 Fallback] frappe.query_report.run not found, trying frappe.desk.query_report.run');
      } else {
        // Some other error — rethrow
        throw error;
      }
    }
  }

  // v15 path (or v16 fallback): frappe.desk.query_report.run
  const result = await internalRequest(
    'POST',
    '/method/frappe.desk.query_report.run',
    args,
    userSession
  );
  return result;
}

// ============================================================
// Single Field Retrieval
// ============================================================

export async function getValue(
  doctype: string,
  fieldname: string,
  name: string,
  userSession?: string
): Promise<unknown> {
  await ensureSystemSession();
  const params = new URLSearchParams();
  params.set('doctype', doctype);
  params.set('fieldname', fieldname);
  params.set('name', name);

  const result = await internalRequest(
    'GET',
    `/method/frappe.client.get_value?${params.toString()}`,
    undefined,
    userSession
  );
  return (result as { message: unknown }).message;
}

// ============================================================
// Dashboard KPIs
// ============================================================

const DASH_PIE_COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(35, 90%, 55%)',
  'hsl(280, 55%, 50%)',
  'hsl(340, 65%, 50%)',
];

function dashboardMonthKey(postingDate: string): string {
  if (!postingDate || postingDate.length < 7) return '';
  return postingDate.slice(0, 7);
}

function lastNCalendarMonthKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

export type DashboardKPIsPayload = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalItems: number;
  totalEmployees: number;
  openSalesOrders: number;
  openPurchaseOrders: number;
  lowStockItems: number;
  monthlyRevenueExpenses: { month: string; revenue: number; expenses: number }[];
  salesByModule: { name: string; value: number; color: string }[];
  monthlyOrderCounts: { month: string; sales: number; purchases: number }[];
  revenueSparkline: number[];
  expensesSparkline: number[];
  receivablesSparkline: number[];
  payablesSparkline: number[];
};

export async function getDashboardKPIs(userSession?: string): Promise<DashboardKPIsPayload> {
  const fallback: DashboardKPIsPayload = {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingReceivables: 0,
    outstandingPayables: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalItems: 0,
    totalEmployees: 0,
    openSalesOrders: 0,
    openPurchaseOrders: 0,
    lowStockItems: 0,
    monthlyRevenueExpenses: [],
    salesByModule: [],
    monthlyOrderCounts: [],
    revenueSparkline: [],
    expensesSparkline: [],
    receivablesSparkline: [],
    payablesSparkline: [],
  };

  try {
    await ensureSystemSession();
    const monthKeys = lastNCalendarMonthKeys(6);
    const zMonth = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;

    const [
      customerCount,
      supplierCount,
      itemCount,
      employeeCount,
      openSOCount,
      openPOCount,
      siRows,
      piRows,
      soRows,
      poRows,
      lowStockBins,
    ] = await Promise.all([
      getCount('Customer', undefined as unknown as string[][], userSession).catch(() => 0),
      getCount('Supplier', undefined as unknown as string[][], userSession).catch(() => 0),
      getCount('Item', [['is_stock_item', '=', '1']] as string[][], userSession).catch(() => 0),
      getCount('Employee', [['status', '=', 'Active']] as string[][], userSession).catch(() => 0),
      getCount('Sales Order', [['status', 'in', ['Draft', 'To Deliver and Bill', 'To Deliver', 'To Bill']]] as string[][], userSession).catch(() => 0),
      getCount('Purchase Order', [['status', 'in', ['Draft', 'To Receive and Bill', 'To Receive', 'To Bill']]] as string[][], userSession).catch(() => 0),
      getList(
        'Sales Invoice',
        {
          fields: ['posting_date', 'base_grand_total', 'outstanding_amount', 'customer_name'],
          filters: [['docstatus', '=', 1]] as unknown as string[][],
          limit: 4000,
          order_by: 'posting_date desc',
        },
        userSession
      ).catch(() => []),
      getList(
        'Purchase Invoice',
        {
          fields: ['posting_date', 'base_grand_total', 'outstanding_amount'],
          filters: [['docstatus', '=', 1]] as unknown as string[][],
          limit: 4000,
          order_by: 'posting_date desc',
        },
        userSession
      ).catch(() => []),
      getList(
        'Sales Order',
        {
          fields: ['transaction_date', 'name'],
          filters: [['docstatus', 'in', ['0', '1']]] as unknown as string[][],
          limit: 2500,
          order_by: 'transaction_date desc',
        },
        userSession
      ).catch(() => []),
      getList(
        'Purchase Order',
        {
          fields: ['transaction_date', 'name'],
          filters: [['docstatus', 'in', ['0', '1']]] as unknown as string[][],
          limit: 2500,
          order_by: 'transaction_date desc',
        },
        userSession
      ).catch(() => []),
      getList(
        'Bin',
        {
          fields: ['actual_qty'],
          filters: [['actual_qty', '<', 1]] as unknown as string[][],
          limit: 2500,
        },
        userSession
      ).catch(() => []),
    ]);

    const si = siRows as Record<string, unknown>[];
    const pi = piRows as Record<string, unknown>[];
    const revenueByMonth = zMonth(monthKeys);
    const expensesByMonth = zMonth(monthKeys);
    const arByMonth = zMonth(monthKeys);
    const apByMonth = zMonth(monthKeys);
    const soByMonth = zMonth(monthKeys);
    const poByMonth = zMonth(monthKeys);

    let totalRevenue = 0;
    let outstandingReceivables = 0;
    const custTotals = new Map<string, number>();
    for (const r of si) {
      const amt = Number(r.base_grand_total ?? 0);
      const outst = Number(r.outstanding_amount ?? 0);
      totalRevenue += amt;
      outstandingReceivables += outst;
      const mk = dashboardMonthKey(String(r.posting_date ?? ''));
      if (mk && mk in revenueByMonth) revenueByMonth[mk] += amt;
      if (mk && mk in arByMonth) arByMonth[mk] += outst;
      const cn = String(r.customer_name || 'أخرى');
      custTotals.set(cn, (custTotals.get(cn) || 0) + amt);
    }

    let totalExpenses = 0;
    let outstandingPayables = 0;
    for (const r of pi) {
      const amt = Number(r.base_grand_total ?? 0);
      const outst = Number(r.outstanding_amount ?? 0);
      totalExpenses += amt;
      outstandingPayables += outst;
      const mk = dashboardMonthKey(String(r.posting_date ?? ''));
      if (mk && mk in expensesByMonth) expensesByMonth[mk] += amt;
      if (mk && mk in apByMonth) apByMonth[mk] += outst;
    }

    const topCust = [...custTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const pieDenom = topCust.reduce((s, [, v]) => s + v, 0) || 1;
    const salesByModule = topCust.map(([name, val], i) => ({
      name,
      value: Math.round((val / pieDenom) * 1000) / 10,
      color: DASH_PIE_COLORS[i % DASH_PIE_COLORS.length]!,
    }));

    for (const r of soRows as Record<string, unknown>[]) {
      const mk = dashboardMonthKey(String(r.transaction_date ?? ''));
      if (mk && mk in soByMonth) soByMonth[mk] += 1;
    }
    for (const r of poRows as Record<string, unknown>[]) {
      const mk = dashboardMonthKey(String(r.transaction_date ?? ''));
      if (mk && mk in poByMonth) poByMonth[mk] += 1;
    }

    const monthlyRevenueExpenses = monthKeys.map((m) => ({
      month: m,
      revenue: revenueByMonth[m] || 0,
      expenses: expensesByMonth[m] || 0,
    }));
    const monthlyOrderCounts = monthKeys.map((m) => ({
      month: m,
      sales: soByMonth[m] || 0,
      purchases: poByMonth[m] || 0,
    }));

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      outstandingReceivables,
      outstandingPayables,
      totalCustomers: customerCount,
      totalSuppliers: supplierCount,
      totalItems: itemCount,
      totalEmployees: employeeCount,
      openSalesOrders: openSOCount,
      openPurchaseOrders: openPOCount,
      lowStockItems: Array.isArray(lowStockBins) ? lowStockBins.length : 0,
      monthlyRevenueExpenses,
      salesByModule,
      monthlyOrderCounts,
      revenueSparkline: monthKeys.map((m) => revenueByMonth[m] || 0),
      expensesSparkline: monthKeys.map((m) => expensesByMonth[m] || 0),
      receivablesSparkline: monthKeys.map((m) => arByMonth[m] || 0),
      payablesSparkline: monthKeys.map((m) => apByMonth[m] || 0),
    };
  } catch {
    return fallback;
  }
}

// Check if the backend is available
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const host = getResolvedBackendHost();
    const response = await fetch(`${host}/api/method/ping`, {
      method: 'GET',
      headers: withSiteHeader({ Accept: 'application/json' }),
      signal: AbortSignal.timeout(10000), // 10 ثوانٍ كافية لـ Railway
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Auto-detect ERPNext version on backend availability check.
 * Safe to call multiple times — detection is cached after first success.
 */
export async function isBackendAvailableWithVersionDetection(): Promise<{ available: boolean; version?: string }> {
  const available = await isBackendAvailable();
  if (!available) return { available: false };
  try {
    const version = await detectErpnextVersion();
    return { available: true, version };
  } catch {
    return { available: true, version: getBackendVersion() };
  }
}



