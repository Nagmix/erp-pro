// ============================================================
// CLIENT-SIDE API LAYER
// This is the ONLY API module the client uses.
// It communicates EXCLUSIVELY with our own Next.js API routes.
// There is ZERO reference to any external backend system.
//
// Architecture:
//   Browser → This Module → /api/* (Next.js API Routes) → Internal Backend
// ============================================================

import { CSRF_HEADER } from '@/lib/auth/csrf-constants';
import type {
  POSCheckOpeningResponse,
  POSCreateInvoiceResponse,
  POSCustomerInfoResponse,
  POSPastOrderRow,
  POSReadinessResponse,
  POSSessionSummaryResponse,
  POSSetupResponseData,
} from '@/lib/core/types';

const API_BASE = '/api';

function getCsrfFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const needle = 'erp_csrf=';
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const c = part.trim();
    if (c.startsWith(needle)) return decodeURIComponent(c.slice(needle.length));
  }
  return null;
}

// Get the stored auth token
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('erp_session');
}

// Set the auth token
function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('erp_session', token);
}

// Remove the auth token
function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('erp_session');
}

// Generic request helper
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = `${API_BASE}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const mutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  const csrf = getCsrfFromDocument();
  if (mutating && csrf) {
    headers[CSRF_HEADER] = csrf;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin', // Ensure cookies are sent and received
    });
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const result = isJson ? await response.json() : null;

    if (!response.ok) {
      const fallback = `فشل الطلب (${response.status})`;
      const fromJson =
        result &&
        typeof result === 'object' &&
        'error' in result &&
        typeof (result as { error?: unknown }).error === 'string'
          ? (result as { error: string }).error
          : null;
      return { success: false, error: fromJson || fallback };
    }

    if (!result || typeof result !== 'object') {
      return { success: true };
    }
    return result as { success: boolean; data?: T; error?: string };
  } catch {
    return { success: false, error: 'فشل الاتصال بالخادم' };
  }
}

// ============================================================
// Authentication
// ============================================================

export async function apiLogin(username: string, password: string): Promise<{
  success: boolean;
  user?: { id: string; name: string; fullName: string; email: string; roles: string[] };
  error?: string;
}> {
  const result = await request<{
    token: string;
    user: { id: string; name: string; fullName: string; email: string; roles: string[] };
  }>('POST', '/auth/login', { username, password });

  if (result.success && result.data) {
    setToken(result.data.token);
    return { success: true, user: result.data.user };
  }

  return { success: false, error: result.error };
}

export async function apiLogout(): Promise<void> {
  await request('POST', '/auth/logout');
  removeToken();
}

/** تجديد رمز الجلسة (يعتمد على cookie أو Bearer الحالي) */
export async function apiRefreshSession(): Promise<{
  success: boolean;
  token?: string;
  user?: { id: string; name: string; fullName: string; email: string; roles: string[] };
  error?: string;
}> {
  const result = await request<{
    token: string;
    user: { id: string; name: string; fullName: string; email: string; roles: string[] };
  }>('POST', '/auth/refresh', undefined);

  if (result.success && result.data) {
    setToken(result.data.token);
    return { success: true, token: result.data.token, user: result.data.user };
  }
  return { success: false, error: result.error };
}

export async function apiGetMe(): Promise<{
  success: boolean;
  user?: { id: string; name: string; fullName: string; email: string; roles: string[] };
  error?: string;
}> {
  return request('GET', '/auth/me');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ============================================================
// Generic Data Operations
// ============================================================

export async function apiGetList<T>(
  doctype: string,
  options?: {
    fields?: string[];
    filters?: Record<string, unknown> | string[][];
    /** شروط أو (OR) — Frappe `or_filters` */
    or_filters?: Record<string, unknown> | string[][];
    order_by?: string;
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  const params = new URLSearchParams();
  if (options?.fields) params.set('fields', JSON.stringify(options.fields));
  if (options?.filters) params.set('filters', JSON.stringify(options.filters));
  if (options?.or_filters) params.set('or_filters', JSON.stringify(options.or_filters));
  if (options?.order_by) params.set('order_by', options.order_by);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const result = await request<T[]>(
    'GET',
    `/data/${encodeURIComponent(doctype)}?${params.toString()}`
  );
  if (!result.success) throw new Error(result.error || 'فشل تحميل القائمة');
  return result.data ?? [];
}

export async function apiGetDoc<T>(doctype: string, name: string): Promise<T | null> {
  const result = await request<T>('GET', `/data/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل السجل');
  return result.data ?? null;
}

export async function apiCreateDoc<T>(
  doctype: string,
  doc: Record<string, unknown>
): Promise<T | null> {
  const result = await request<T>('POST', `/data/${encodeURIComponent(doctype)}`, doc);
  if (!result.success) throw new Error(result.error || 'فشل الإنشاء');
  return result.data ?? null;
}

export async function apiUpdateDoc<T>(
  doctype: string,
  name: string,
  doc: Record<string, unknown>
): Promise<T | null> {
  const result = await request<T>(
    'PUT',
    `/data/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    doc
  );
  if (!result.success) throw new Error(result.error || 'فشل التحديث');
  return result.data ?? null;
}

export async function apiDeleteDoc(doctype: string, name: string): Promise<boolean> {
  const result = await request('DELETE', `/data/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  if (!result.success) throw new Error(result.error || 'فشل الحذف');
  return true;
}

export async function apiSubmitDoc<T>(doctype: string, name: string): Promise<T | null> {
  const result = await request<T>('POST', `/data/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    action: 'submit',
  });
  if (!result.success) throw new Error(result.error || 'فشل التقديم');
  return result.data ?? null;
}

export async function apiCancelDoc<T>(doctype: string, name: string): Promise<T | null> {
  const result = await request<T>('POST', `/data/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    action: 'cancel',
  });
  if (!result.success) throw new Error(result.error || 'فشل الإلغاء');
  return result.data ?? null;
}

export async function apiAmendDoc<T>(doctype: string, name: string): Promise<T | null> {
  const result = await request<T>('POST', `/data/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    action: 'amend',
  });
  if (!result.success) throw new Error(result.error || 'فشل التعديل');
  return result.data ?? null;
}

// ============================================================
// Dashboard
// ============================================================

export async function apiGetDashboardKPIs() {
  const result = await request<import('./dashboard-kpis.shared').DashboardKPIs>('GET', '/dashboard/kpis');
  if (!result.success || !result.data) throw new Error(result.error || 'فشل تحميل المؤشرات');
  return result.data;
}

// ============================================================
// Reports
// ============================================================

export async function apiRunReport<T>(
  reportName: string,
  filters?: Record<string, unknown>
): Promise<T | null> {
  const params = new URLSearchParams();
  if (filters) params.set('filters', JSON.stringify(filters));

  const result = await request<T>('GET', `/reports/${reportName}?${params.toString()}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل التقرير');
  return result.data || null;
}

export async function apiExportReport(
  reportName: string,
  format: 'csv' | 'excel' | 'pdf',
  filters?: Record<string, unknown>
): Promise<{ url: string } | null> {
  const result = await request<{ url: string }>('POST', `/reports/export`, {
    reportName,
    format,
    filters: filters || {},
  });
  return result.data || null;
}

// ============================================================
// Tax setup (H-05) — كامل عبر API التطبيق
// ============================================================

export type SetupTaxPackageData = {
  liabilityParent: string;
  assetParent: string;
  accounts: { role: string; name: string }[];
  salesTaxTemplateTitle: string;
  purchaseTaxTemplateTitle: string;
  salesTaxTemplateName?: string;
  purchaseTaxTemplateName?: string;
  reused?: {
    accounts: boolean[];
    salesTemplate: boolean;
    purchaseTemplate: boolean;
  };
};

export async function apiSetupTaxPackage(body: {
  company: string;
  title: string;
  rate: number;
}): Promise<SetupTaxPackageData> {
  const result = await request<SetupTaxPackageData>('POST', '/accounting/setup-tax', body);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل إعداد الضريبة في النظام المحاسبي');
  }
  return result.data;
}

// ============================================================
// Cheque lifecycle field (H-12)
// ============================================================

export type ChequeLifecycleFieldStatus = { exists: boolean };
export type EnsureChequeLifecycleFieldResponse = {
  created: boolean;
  customFieldName?: string;
  insertAfter?: string;
};

export async function apiChequeLifecycleFieldStatus(): Promise<ChequeLifecycleFieldStatus> {
  const result = await request<{ exists: boolean }>('GET', '/accounting/cheque-lifecycle-field');
  if (!result.success || result.data === undefined || typeof result.data.exists !== 'boolean') {
    throw new Error(result.error || 'تعذر التحقق من حقل دورة الشيك');
  }
  return { exists: result.data.exists };
}

export async function apiEnsureChequeLifecycleField(): Promise<EnsureChequeLifecycleFieldResponse> {
  const result = await request<EnsureChequeLifecycleFieldResponse>('POST', '/accounting/cheque-lifecycle-field');
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل إنشاء حقل دورة الشيك');
  }
  return result.data;
}

// ============================================================
// Report Scheduler
// ============================================================

export type ReportSchedule = {
  id: string;
  reportId: string;
  cron: string;
  emailTo: string;
  format: 'csv' | 'excel' | 'pdf';
  enabled: boolean;
};

export async function apiGetReportSchedules(): Promise<ReportSchedule[]> {
  const result = await request<ReportSchedule[]>('GET', '/reports/schedules');
  if (!result.success) throw new Error(result.error || 'فشل تحميل جدول التقارير');
  return result.data ?? [];
}

export async function apiCreateReportSchedule(
  schedule: Omit<ReportSchedule, 'id'>
): Promise<ReportSchedule | null> {
  const result = await request<ReportSchedule>('POST', '/reports/schedules', schedule);
  if (!result.success) throw new Error(result.error || 'فشل إنشاء جدول التقرير');
  return result.data ?? null;
}

export async function apiToggleReportSchedule(
  id: string,
  enabled: boolean
): Promise<ReportSchedule | null> {
  const result = await request<ReportSchedule>('PATCH', '/reports/schedules', { id, enabled });
  if (!result.success) throw new Error(result.error || 'فشل تحديث حالة الجدول');
  return result.data ?? null;
}

export async function apiDeleteReportSchedule(id: string): Promise<boolean> {
  const result = await request('DELETE', `/reports/schedules?id=${encodeURIComponent(id)}`);
  if (!result.success) throw new Error(result.error || 'فشل حذف جدول التقرير');
  return true;
}

// ============================================================
// Method Calls
// ============================================================

export async function apiCallMethod<T>(
  method: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  const result = await request<T>('POST', `/method/${method}`, args);
  if (!result.success) {
    throw new Error(result.error || 'فشل استدعاء دالة النظام');
  }
  return result.data ?? null;
}

// ============================================================
// File Upload
// ============================================================

export async function apiUploadFile(
  file: File,
  doctype?: string,
  docname?: string
): Promise<{ file_url: string } | null> {
  const formData = new FormData();
  formData.append('file', file);
  if (doctype) formData.append('doctype', doctype);
  if (docname) formData.append('docname', docname);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const csrf = getCsrfFromDocument();
  if (csrf) headers[CSRF_HEADER] = csrf;

  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'same-origin',
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      const msg = result && typeof result === 'object' && 'error' in result
        ? String((result as { error?: unknown }).error)
        : `فشل رفع الملف (${response.status})`;
      throw new Error(msg);
    }
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('فشل رفع الملف — خطأ غير معروف');
  }
}

// ============================================================
// Bulk Operations
// ============================================================

export async function apiBulkCreate<T>(
  doctype: string,
  docs: Record<string, unknown>[]
): Promise<T[] | null> {
  const result = await request<T[]>('POST', `/data/${doctype}/bulk`, { docs });
  return result.data || null;
}

export async function apiBulkDelete(
  doctype: string,
  names: string[]
): Promise<boolean> {
  const result = await request('POST', `/data/${doctype}/bulk-delete`, { names });
  if (!result.success) {
    throw new Error(result.error || `فشل الحذف الجماعي لـ ${doctype}`);
  }
  return true;
}

// ============================================================
// نقاط البيع — مسارات /api/pos/*
// ============================================================

export async function apiPosCheckOpening(): Promise<POSCheckOpeningResponse> {
  const result = await request<POSCheckOpeningResponse>('GET', '/pos/check-opening');
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل التحقق من الوردية');
  }
  return result.data;
}

export async function apiPosCheckReadiness(company: string): Promise<POSReadinessResponse> {
  const q = encodeURIComponent(company);
  const result = await request<POSReadinessResponse>('GET', `/pos/check-readiness?company=${q}`);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل التحقق من جاهزية نقاط البيع');
  }
  return result.data;
}

/** تهيئة خفيفة (POS Settings / ربط Cash / ملف POS أدنى) + إعادة فحص الجاهزية. */
export async function apiPosSetup(body: {
  company: string;
  apply_minimal_pos_settings?: boolean;
  ensure_cash_mode_account?: boolean;
  create_default_pos_profile_if_missing?: boolean;
}): Promise<POSSetupResponseData> {
  const result = await request<POSSetupResponseData>('POST', '/pos/setup', body);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل تهيئة نقاط البيع');
  }
  return result.data;
}

export async function apiPosOpenShift(body: {
  company: string;
  pos_profile: string;
  user: string;
  balance_details: { mode_of_payment: string; opening_amount: number }[];
  posting_date?: string;
  period_start_date?: string;
}): Promise<{ name: string }> {
  const result = await request<{ name: string }>('POST', '/pos/open-shift', body);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل فتح الوردية');
  }
  return result.data;
}

export async function apiPosCloseShift(body: {
  pos_opening_entry: string;
  payment_reconciliation?: { mode_of_payment: string; closing_amount: number }[];
  period_end_date?: string;
}): Promise<{ name: string }> {
  const result = await request<{ name: string }>('POST', '/pos/close-shift', body);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل إغلاق الوردية');
  }
  return result.data;
}

/** إنشاء وترحيل POS Invoice عبر الخادم (تصحيح المدفوعات عند الحاجة). */
export async function apiPosCreateInvoice(body: {
  doc: Record<string, unknown>;
  /** الافتراضي `true` — `false` لحفظ مسودة بمدفوعات أقل من الإجمالي (حسب الملف) */
  submit?: boolean;
}): Promise<POSCreateInvoiceResponse> {
  const result = await request<POSCreateInvoiceResponse>('POST', '/pos/create-invoice', body);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل إنشاء فاتورة نقطة البيع');
  }
  return result.data;
}

/** ترحيل مسودة POS Invoice بعد إكمال المدفوعات (استبدال صفوف المدفوعات اختياريًا). */
export async function apiPosSubmitDraftInvoice(body: {
  name: string;
  payments?: { mode_of_payment: string; amount: number }[];
}): Promise<POSCreateInvoiceResponse> {
  const result = await request<POSCreateInvoiceResponse>('POST', '/pos/submit-draft-invoice', body);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل ترحيل فاتورة نقطة البيع');
  }
  return result.data;
}

/** تفاصيل عميل وذمة مفتوحة للكاشير. */
export async function apiPosCustomerInfo(name: string): Promise<POSCustomerInfoResponse> {
  const q = encodeURIComponent(name.trim());
  const result = await request<POSCustomerInfoResponse>('GET', `/pos/customer-info?name=${q}`);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'تعذر جلب بيانات العميل');
  }
  return result.data;
}

/** تحديث حقل عميل عبر أمر `set_customer_info` في الخلفية (جوال، بريد، اسم عرض… حسب المسموح في الخادم). */
export async function apiPosSetCustomerInfo(body: {
  customer: string;
  fieldname: string;
  value: string;
}): Promise<void> {
  const result = await request('POST', '/pos/set-customer-info', body);
  if (!result.success) {
    throw new Error(result.error || 'فشل تحديث بيانات العميل');
  }
}

/** بحث باركود/سيريال/باتش عبر الخادم (نفس أمر شاشة نقطة البيع في النظام). */
export async function apiPosSearchBarcode(searchValue: string): Promise<unknown> {
  const v = searchValue.trim();
  if (!v) throw new Error('أدخل قيمة المسح');
  const result = await request<unknown>('POST', '/pos/search-barcode', { search_value: v });
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل البحث بالباركود');
  }
  return result.data;
}

/** أصناف نقطة البيع عبر `get_items` (مجموعة أصلية + بحث + قائمة أسعار). */
export async function apiPosGetItems(opts: {
  pos_profile: string;
  price_list?: string | null;
  item_group?: string;
  search?: string;
  start?: number;
  page_length?: number;
}): Promise<unknown> {
  const p = new URLSearchParams();
  p.set('pos_profile', opts.pos_profile.trim());
  if (opts.price_list) p.set('price_list', opts.price_list.trim());
  p.set('item_group', opts.item_group ?? '');
  if (opts.search?.trim()) p.set('search', opts.search.trim());
  if (opts.start != null && !Number.isNaN(opts.start)) p.set('start', String(opts.start));
  if (opts.page_length != null && opts.page_length > 0) p.set('page_length', String(opts.page_length));
  const result = await request<unknown>('GET', `/pos/items?${p.toString()}`);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'فشل جلب أصناف نقطة البيع');
  }
  return result.data;
}

/** مجموعة الأصناف الجذر لملف نقطة البيع (لعرض «الكل» ضمن شجرة المجموعات). */
export async function apiPosParentItemGroup(posProfile: string): Promise<string | null> {
  const q = encodeURIComponent(posProfile.trim());
  const result = await request<string | null>('GET', `/pos/parent-item-group?pos_profile=${q}`);
  if (!result.success) {
    throw new Error(result.error || 'تعذر جلب مجموعة الأصناف');
  }
  return result.data ?? null;
}

/** ملخص مبيعات الوردية المفتوحة (حتى «الآن») — يمرَّر `pos_opening_entry` أو يُستنتج من وردية المستخدم. */
export async function apiPosSessionSummary(
  posOpeningEntry?: string
): Promise<POSSessionSummaryResponse> {
  const q = posOpeningEntry?.trim()
    ? `?pos_opening_entry=${encodeURIComponent(posOpeningEntry.trim())}`
    : '';
  const result = await request<POSSessionSummaryResponse>('GET', `/pos/session-summary${q}`);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'تعذر جلب ملخص الوردية');
  }
  return result.data;
}

/** آخر فواتير نقطة البيع المرحّلة (اختياري: ملف نقطة بيع / شركة). */
export async function apiPosPastOrders(opts?: {
  pos_profile?: string;
  company?: string;
  limit?: number;
}): Promise<POSPastOrderRow[]> {
  const p = new URLSearchParams();
  if (opts?.pos_profile?.trim()) p.set('pos_profile', opts.pos_profile.trim());
  if (opts?.company?.trim()) p.set('company', opts.company.trim());
  if (opts?.limit != null && opts.limit > 0) p.set('limit', String(opts.limit));
  const qs = p.toString();
  const path = qs ? `/pos/past-orders?${qs}` : '/pos/past-orders';
  const result = await request<POSPastOrderRow[]>('GET', path);
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'تعذر جلب الطلبات السابقة');
  }
  return result.data;
}

/** مستند POS Profile كاملاً لتحميل الشاشة — `GET /api/pos/profile-data`. */
export async function apiPosProfileData(posProfile: string): Promise<Record<string, unknown>> {
  const q = encodeURIComponent(posProfile.trim());
  const result = await request<Record<string, unknown>>(
    'GET',
    `/pos/profile-data?pos_profile=${q}`
  );
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || 'تعذر جلب بيانات ملف نقطة البيع');
  }
  return result.data;
}

// ============================================================
// Document Comments
// ============================================================

export type DocComment = {
  name: string;
  content: string;
  comment_type?: string;
  comment_by?: string;
  sender?: string;
  creation: string;
  reference_doctype?: string;
  reference_name?: string;
};

export async function apiGetDocComments(
  doctype: string,
  name: string
): Promise<DocComment[]> {
  const params = new URLSearchParams();
  params.set('doctype', doctype);
  params.set('name', name);
  const result = await request<DocComment[]>('GET', `/comments?${params.toString()}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل التعليقات');
  return result.data ?? [];
}

export async function apiAddDocComment(
  doctype: string,
  name: string,
  content: string
): Promise<DocComment | null> {
  const result = await request<DocComment>('POST', '/comments', { doctype, name, content });
  if (!result.success) throw new Error(result.error || 'فشل إضافة التعليق');
  return result.data ?? null;
}

// ============================================================
// Setup Wizard — معالج الإعداد الأولي
// ============================================================

/** التحقق من حالة إعداد النظام */
export async function apiCheckSetupStatus(): Promise<{
  configured: boolean;
  steps: { company: boolean; fiscalYear: boolean; costCenter: boolean };
}> {
  const result = await request<{
    configured: boolean;
    steps: { company: boolean; fiscalYear: boolean; costCenter: boolean };
  }>('GET', '/setup/status');
  if (!result.success) throw new Error(result.error || 'فشل التحقق من حالة الإعداد');
  return result.data!;
}

/** تنفيذ الإعداد الكامل */
export async function apiExecuteSetup(body: Record<string, unknown>): Promise<{
  success: boolean;
  message: string;
  results: Record<string, unknown>;
}> {
  const result = await request<{
    success: boolean;
    message: string;
    results: Record<string, unknown>;
  }>('POST', '/setup/execute', body);
  if (!result.success) throw new Error(result.error || 'فشل تنفيذ الإعداد');
  return result.data!;
}

// ============================================================
// Calendar Events
// ============================================================

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  color?: string;
  type: 'event' | 'task' | 'holiday';
  status?: string;
  doctype: string;
  name: string;
};

export async function apiGetCalendarEvents(
  startDate: string,
  endDate: string,
  company?: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  params.set('start_date', startDate);
  params.set('end_date', endDate);
  if (company) params.set('company', company);
  const result = await request<CalendarEvent[]>('GET', `/calendar/events?${params.toString()}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل أحداث التقويم');
  return result.data ?? [];
}

// ============================================================
// Auto Backup
// ============================================================

export type BackupRecord = {
  id: string;
  name: string;
  date: string;
  size: number;
  type: 'database' | 'files' | 'full';
  status: 'completed' | 'failed' | 'in_progress';
};

export type BackupSettings = {
  autoBackupEnabled: boolean;
  autoBackupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionCount: number;
};

export type BackupListResponse = {
  backups: BackupRecord[];
  settings: BackupSettings;
};

export async function apiGetBackups(): Promise<BackupListResponse> {
  const result = await request<BackupListResponse>('GET', '/backup');
  if (!result.success) throw new Error(result.error || 'فشل تحميل النسخ الاحتياطية');
  const data = result.data;
  if (!data) return { backups: [], settings: { autoBackupEnabled: false, autoBackupFrequency: 'daily', retentionCount: 10 } };
  return {
    backups: Array.isArray(data.backups) ? data.backups : [],
    settings: data.settings ?? { autoBackupEnabled: false, autoBackupFrequency: 'daily', retentionCount: 10 },
  };
}

export async function apiCreateBackup(type: 'database' | 'files' | 'full'): Promise<{ success: boolean; message: string } | null> {
  const result = await request<{ success: boolean; message: string }>('POST', '/backup', { type });
  if (!result.success) throw new Error(result.error || 'فشل إنشاء نسخة احتياطية');
  return result.data ?? null;
}

export async function apiDeleteBackup(id: string): Promise<boolean> {
  const result = await request('DELETE', `/backup?id=${encodeURIComponent(id)}`);
  if (!result.success) throw new Error(result.error || 'فشل حذف النسخة الاحتياطية');
  return true;
}

export async function apiUpdateBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings | null> {
  const result = await request<BackupSettings>('PUT', '/backup', settings);
  if (!result.success) throw new Error(result.error || 'فشل تحديث إعدادات النسخ الاحتياطي');
  return result.data ?? null;
}

// ============================================================
// Version History
// ============================================================

export type VersionChange = {
  fieldname: string;
  old_value?: string;
  new_value?: string;
};

export type DocVersion = {
  name: string;
  ref_doctype: string;
  docname: string;
  owner: string;
  creation: string;
  data?: VersionChange[];
};

export async function apiGetVersionHistory(
  doctype: string,
  name: string
): Promise<DocVersion[]> {
  const params = new URLSearchParams();
  params.set('doctype', doctype);
  params.set('name', name);
  const result = await request<DocVersion[]>('GET', `/version-history?${params.toString()}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل سجل التعديلات');
  return result.data ?? [];
}

// ============================================================
// Print Format Builder
// ============================================================

export type PrintFormatField = {
  fieldname: string;
  label: string;
  fieldtype: string;
  visible: boolean;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
};

export type PrintFormatSection = {
  id: string;
  label: string;
  visible: boolean;
  fields: PrintFormatField[];
};

export type PrintFormat = {
  name: string;
  doc_type: string;
  standard: 'Yes' | 'No';
  custom_format: number;
  print_format_builder?: number;
  sections?: PrintFormatSection[];
  module?: string;
};

export type DocTypeFieldDef = {
  fieldname: string;
  label: string;
  fieldtype: string;
  field_group?: string;
  collabel?: string;
  options?: string;
  reqd?: number;
  in_list_view?: number;
  hidden?: number;
};

export type PrintFormatBuilderData = PrintFormat & {
  docTypeFields: DocTypeFieldDef[];
  sections: PrintFormatSection[];
};

export async function apiGetPrintFormats(doctype: string): Promise<PrintFormat[]> {
  const params = new URLSearchParams();
  params.set('doctype', doctype);
  const result = await request<PrintFormat[]>('GET', `/print-formats?${params.toString()}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل تنسيقات الطباعة');
  return result.data ?? [];
}

export async function apiCreatePrintFormat(format: Omit<PrintFormat, 'name'> & { name: string }): Promise<PrintFormat | null> {
  const result = await request<PrintFormat>('POST', '/print-formats', format);
  if (!result.success) throw new Error(result.error || 'فشل إنشاء تنسيق الطباعة');
  return result.data ?? null;
}

export async function apiUpdatePrintFormat(name: string, fields: Record<string, unknown>): Promise<PrintFormat | null> {
  const result = await request<PrintFormat>('PUT', '/print-formats', { name, ...fields });
  if (!result.success) throw new Error(result.error || 'فشل تحديث تنسيق الطباعة');
  return result.data ?? null;
}

export async function apiGetPrintFormatBuilder(name: string): Promise<PrintFormatBuilderData | null> {
  const result = await request<PrintFormatBuilderData>('GET', `/print-formats/builder?name=${encodeURIComponent(name)}`);
  if (!result.success) throw new Error(result.error || 'فشل تحميل منشئ التنسيق');
  return result.data ?? null;
}

export async function apiSavePrintFormatBuilder(name: string, layout: PrintFormatSection[]): Promise<PrintFormat | null> {
  const result = await request<PrintFormat>('PUT', '/print-formats/builder', { name, layout });
  if (!result.success) throw new Error(result.error || 'فشل حفظ تنسيق الطباعة');
  return result.data ?? null;
}
