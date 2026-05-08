/**
 * منطق نقاط البيع على الخادم — تمرير جلسة المستخدم عند توفرها، وإلا تُنفَّذ العمليات بصلاحيات خدمة النظام.
 */

import {
  callMethod,
  createDoc,
  getDoc,
  getList,
  submitDoc,
  updateDoc,
} from '@/lib/server/backend';
import {
  buildMinimalPosProfile,
  buildPosClosingEntryFromInvoiceApi,
  buildPosOpeningEntry,
} from '@/lib/erp/erpnext-payloads';
import type {
  POSReadinessResponse,
  PosReadinessIssueCode,
  PosReadinessIssueDetail,
} from '@/lib/core/types';
import {
  getBackendVersion,
  isBackendV16OrLater,
} from '@/lib/server/frappe-connection-store';

export type PosOpenEntrySummary = {
  name: string;
  pos_profile: string;
  company: string;
  user: string;
  period_start_date: string;
  status?: string;
};

/** Type for POS invoice data returned by get_invoices method (v15 & v16 compatible). */
type PosInvoiceData = {
  invoices?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  taxes?: Record<string, unknown>[];
};

/**
 * POS Method Compatibility Layer (v15 ↔ v16)
 *
 * In ERPNext v16, the POS page module paths may be restructured:
 *   - v15: erpnext.selling.page.point_of_sale.point_of_sale.*
 *   - v16: erpnext.selling.page.point_of_sale.* (flattened)
 *         or erpnext.accounts.page.point_of_sale.* (moved to accounts)
 *
 * This helper tries the v16 path first, then falls back to the v15 path.
 * If both fail, it throws a clear error with guidance.
 */
async function callPosMethodWithFallback(
  methodName: string,
  args: Record<string, unknown>,
  userSession: string | undefined
): Promise<unknown> {
  const version = getBackendVersion();
  const isV15 = version === 'v15' || version.startsWith('v14') || version.startsWith('v13');

  // Define v16→v15 method path mappings
  // v15 path: erpnext.selling.page.point_of_sale.point_of_sale.<method>
  // v16 may use: erpnext.selling.page.point_of_sale.<method> (flattened)
  //            or erpnext.accounts.page.point_of_sale.<method> (moved to accounts)
  const v15Prefix = 'erpnext.selling.page.point_of_sale.point_of_sale';
  const v16FlattenedPrefix = 'erpnext.selling.page.point_of_sale';
  const v16AccountsPrefix = 'erpnext.accounts.page.point_of_sale';

  const shortMethod = methodName.replace(v15Prefix + '.', '');

  // Build candidate paths
  const v15Path = `${v15Prefix}.${shortMethod}`;
  const v16FlattenedPath = `${v16FlattenedPrefix}.${shortMethod}`;
  const v16AccountsPath = `${v16AccountsPrefix}.${shortMethod}`;

  if (!isV15) {
    // Try v16 flattened path first
    try {
      const result = await callMethod(v16FlattenedPath, args, userSession);
      console.log(`[POS v16 compat] Used flattened path: ${v16FlattenedPath}`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isMethodNotFound =
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('No method') ||
        msg.includes('not a valid');
      if (!isMethodNotFound) throw error; // Real error, rethrow
    }

    // Try v16 accounts path
    try {
      const result = await callMethod(v16AccountsPath, args, userSession);
      console.log(`[POS v16 compat] Used accounts path: ${v16AccountsPath}`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isMethodNotFound =
        msg.includes('not found') ||
        msg.includes('does not exist') ||
        msg.includes('No method') ||
        msg.includes('not a valid');
      if (!isMethodNotFound) throw error;
    }
  }

  // Try v15 path (original)
  try {
    const result = await callMethod(v15Path, args, userSession);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // If we've tried all paths and none work, provide clear guidance
    if (isV15) {
      throw error; // On v15, just throw the original error
    }
    throw new Error(
      `فشل استدعاء طريقة نقطة البيع «${shortMethod}» — جرّبت: ${v16FlattenedPath}, ${v16AccountsPath}, ${v15Path}. ` +
      `قد يكون مسار الواجهة تغير في الإصدار الجديد. تحقق من التوثيق أو استخدم BACKEND_VERSION=v15 للعودة إلى التوافقية السابقة. ` +
      `الخطأ الأصلي: ${msg}`
    );
  }
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0]!;
}

function nowTimeStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** التحقق من وجود وردية مفتوحة للمستخدم الحالي. */
export async function posCheckOpening(
  userSession: string | undefined,
  frappeUserName: string
): Promise<{ has_open_entry: boolean; open_entry?: PosOpenEntrySummary }> {
  if (!frappeUserName) {
    return { has_open_entry: false };
  }

  try {
    // v16 compat: uses callPosMethodWithFallback for v15↔v16 POS path compatibility
    const raw = await callPosMethodWithFallback(
      'erpnext.selling.page.point_of_sale.point_of_sale.check_opening_entry',
      { user: frappeUserName },
      userSession
    );
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      if (name && String(o.status ?? 'Open') === 'Open') {
        return {
          has_open_entry: true,
          open_entry: {
            name,
            pos_profile: String(o.pos_profile ?? ''),
            company: String(o.company ?? ''),
            user: String(o.user ?? frappeUserName),
            period_start_date: String(o.period_start_date ?? ''),
            status: String(o.status ?? 'Open'),
          },
        };
      }
    }
  } catch {
    /* يُكمَل بالاستعلام المباشر */
  }

  const rows = (await getList(
    'POS Opening Entry',
    {
      fields: ['name', 'status', 'pos_profile', 'user', 'period_start_date', 'company'],
      filters: { user: frappeUserName, status: 'Open' },
      limit: 1,
    },
    userSession
  )) as Record<string, unknown>[];

  const row = rows[0];
  if (!row || typeof row.name !== 'string') {
    return { has_open_entry: false };
  }

  return {
    has_open_entry: true,
    open_entry: {
      name: row.name,
      pos_profile: String(row.pos_profile ?? ''),
      company: String(row.company ?? ''),
      user: String(row.user ?? frappeUserName),
      period_start_date: String(row.period_start_date ?? ''),
      status: String(row.status ?? 'Open'),
    },
  };
}

export async function posOpenShift(
  userSession: string | undefined,
  input: {
    company: string;
    pos_profile: string;
    user: string;
    balance_details: { mode_of_payment: string; opening_amount: number }[];
    posting_date?: string;
    period_start_date?: string;
  }
): Promise<{ name: string }> {
  const posting_date = input.posting_date ?? todayDate();
  const period_start_date = input.period_start_date ?? nowDatetimeLocal();

  const doc = buildPosOpeningEntry({
    company: input.company,
    pos_profile: input.pos_profile,
    user: input.user,
    posting_date,
    period_start_date,
    balance_details: input.balance_details,
  });

  const created = (await createDoc('POS Opening Entry', doc, userSession)) as { name?: string };
  const name = typeof created?.name === 'string' ? created.name : '';
  if (!name) throw new Error('لم يُرجع اسم فتح الوردية');

  await submitDoc('POS Opening Entry', name, userSession);
  return { name };
}

/** دمج مبالغ الإغلاق الفعلية (إن وُجدت) مع مسودة الإغلاق. */
function applyClosingOverrides(
  closingDoc: Record<string, unknown>,
  overrides: { mode_of_payment: string; closing_amount: number }[]
): void {
  const rows = closingDoc.payment_reconciliation;
  if (!Array.isArray(rows) || overrides.length === 0) return;
  for (const row of rows) {
    const mode = String((row as Record<string, unknown>).mode_of_payment ?? '');
    const ovr = overrides.find((x) => x.mode_of_payment === mode);
    if (!ovr) continue;
    const r = row as Record<string, unknown>;
    const expected = Number(r.expected_amount ?? 0);
    r.closing_amount = ovr.closing_amount;
    r.difference = ovr.closing_amount - expected;
  }
}

export async function posCloseShift(
  userSession: string | undefined,
  input: {
    pos_opening_entry: string;
    payment_reconciliation?: { mode_of_payment: string; closing_amount: number }[];
    period_end_date?: string;
  }
): Promise<{ name: string }> {
  const opening = (await getDoc(
    'POS Opening Entry',
    input.pos_opening_entry,
    userSession
  )) as Record<string, unknown>;

  if (!opening || String(opening.status) !== 'Open') {
    throw new Error('فتحة الوردية ليست مفتوحة أو غير موجودة');
  }

  const end = input.period_end_date ?? nowDatetimeLocal();
  // v16 compat: POS Closing Entry get_invoices — try multiple module paths
  const closeInvoiceArgs = {
    start: opening.period_start_date,
    end,
    pos_profile: opening.pos_profile,
    user: opening.user,
  };
  let invData: PosInvoiceData | null = null;
  const closeVersion = getBackendVersion();
  const closeIsV15 = closeVersion === 'v15' || closeVersion.startsWith('v14') || closeVersion.startsWith('v13');

  if (!closeIsV15) {
    // v16 may restructure pos_closing_entry under billing module
    for (const closeV16Path of [
      'erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry.get_invoices',
      'erpnext.billing.doctype.pos_closing_entry.pos_closing_entry.get_invoices',
    ]) {
      try {
        invData = (await callMethod(closeV16Path, closeInvoiceArgs, userSession)) as PosInvoiceData;
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes('not found') && !msg.includes('does not exist') && !msg.includes('No method')) {
          throw error;
        }
      }
    }
  }

  if (!invData) {
    invData = (await callMethod(
      'erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry.get_invoices',
      closeInvoiceArgs,
      userSession
    )) as PosInvoiceData;
  }

  if (!invData || typeof invData !== 'object') {
    throw new Error('لا بيانات فواتير للإغلاق');
  }

  const closingDoc = buildPosClosingEntryFromInvoiceApi({
    pos_opening_entry: String(opening.name),
    period_start_date: String(opening.period_start_date),
    period_end_date: end,
    posting_date: todayDate(),
    posting_time: nowTimeStr(),
    company: String(opening.company),
    pos_profile: String(opening.pos_profile),
    user: String(opening.user),
    data: invData,
  });

  if (input.payment_reconciliation?.length) {
    applyClosingOverrides(closingDoc, input.payment_reconciliation);
  }

  const created = (await createDoc('POS Closing Entry', closingDoc, userSession)) as { name?: string };
  const name = typeof created?.name === 'string' ? created.name : '';
  if (!name) throw new Error('لم يُرجع اسم إغلاق الوردية');

  await submitDoc('POS Closing Entry', name, userSession);
  return { name };
}

/** فحص جاهزية POS لشركة — بدون تعديل جذري؛ يُبلغ عن الفجوات مع رموز للمعالجة الآمنة. */
export async function posCheckReadiness(
  company: string,
  userSession: string | undefined
): Promise<POSReadinessResponse> {
  const details: PosReadinessIssueDetail[] = [];
  const blockingMessages: string[] = [];
  const warningMessages: string[] = [];

  const pushBlock = (code: PosReadinessIssueCode, message: string, context?: string) => {
    details.push({ code, severity: 'blocking', message, context });
    blockingMessages.push(message);
  };
  const pushWarn = (code: PosReadinessIssueCode, message: string, context?: string) => {
    details.push({ code, severity: 'warning', message, context });
    warningMessages.push(message);
  };

  try {
    const ps = (await getDoc('POS Settings', 'POS Settings', userSession)) as Record<
      string,
      unknown
    > | null;
    if (ps && String(ps.invoice_type ?? '') !== 'POS Invoice') {
      pushWarn(
        'pos_settings_invoice_type',
        'نوع الفاتورة في POS Settings ليس «POS Invoice» — قد يؤثر على سلوك نقطة البيع',
        'POS Settings'
      );
    }
  } catch {
    /* إصدار/صلاحيات */
  }

  const profiles = (await getList(
    'POS Profile',
    {
      fields: ['name'],
      filters: { company, disabled: 0 },
      limit: 50,
    },
    userSession
  )) as { name?: string }[];

  if (profiles.length === 0) {
    pushBlock('no_active_pos_profile', 'لا يوجد ملف نقطة بيع (POS Profile) نشط لهذه الشركة');
  }

  const warehouses = (await getList(
    'Warehouse',
    {
      fields: ['name'],
      filters: { company, is_group: 0 },
      limit: 20,
    },
    userSession
  )) as unknown[];

  if (warehouses.length === 0) {
    pushBlock('no_company_warehouse', 'لا يوجد مستودع تابع للشركة (غير مجموعة)');
  }

  const modesFromProfiles = new Set<string>();
  const modeCountByProfile = new Map<string, number>();

  for (const p of profiles) {
    const n = typeof p.name === 'string' ? p.name : '';
    if (!n) continue;
    const doc = (await getDoc('POS Profile', n, userSession)) as Record<string, unknown> | null;
    if (!doc) continue;

    const wh = doc.warehouse;
    if (wh == null || String(wh).trim() === '') {
      pushWarn('pos_profile_missing_warehouse', `ملف نقطة البيع «${n}» بدون مستودع`, n);
    }
    const pl = doc.selling_price_list;
    if (pl == null || String(pl).trim() === '') {
      pushWarn('pos_profile_missing_price_list', `ملف نقطة البيع «${n}» بدون قائمة أسعار بيع`, n);
    }

    const paymentRows = Array.isArray(doc.payments) ? doc.payments : [];
    let countThis = 0;
    for (const row of paymentRows) {
      const m = String((row as Record<string, unknown>).mode_of_payment ?? '').trim();
      if (m) {
        countThis++;
        modesFromProfiles.add(m);
      }
    }
    modeCountByProfile.set(n, countThis);
  }

  const anyProfileHadModes = [...modeCountByProfile.values()].some((c) => c > 0);

  if (profiles.length > 0 && !anyProfileHadModes) {
    pushBlock(
      'pos_profile_no_payment_rows',
      'لا توجد طرق دفع في أي ملف نقطة بيع نشط لهذه الشركة'
    );
  }

  for (const [profileName, count] of modeCountByProfile) {
    if (anyProfileHadModes && count === 0) {
      pushWarn(
        'pos_profile_no_payment_rows',
        `ملف نقطة البيع «${profileName}» بلا طرق دفع بينما ملفات أخرى تحتوي طرق دفع`,
        profileName
      );
    }
  }

  for (const modeName of modesFromProfiles) {
    const accounts = (await getList(
      'Mode of Payment Account',
      {
        fields: ['name'],
        filters: { parent: modeName, company },
        limit: 5,
      },
      userSession
    )) as unknown[];
    if (accounts.length === 0) {
      pushBlock(
        'mode_of_payment_missing_company_account',
        `طريقة الدفع «${modeName}» مستخدمة في ملف نقطة بيع وبدون حساب مرتبط بالشركة`,
        modeName
      );
    }
  }

  const ready = blockingMessages.length === 0;

  return {
    ready,
    issues: blockingMessages,
    warnings: warningMessages.length ? warningMessages : undefined,
    details: details.length ? details : undefined,
  };
}

export async function posListSessions(
  userSession: string | undefined,
  opts?: { limit?: number; status?: string }
): Promise<PosOpenEntrySummary[]> {
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 80));
  const filters: Record<string, unknown> = {};
  if (opts?.status) filters.status = opts.status;

  const rows = (await getList(
    'POS Opening Entry',
    {
      fields: ['name', 'status', 'pos_profile', 'user', 'period_start_date', 'company'],
      filters,
      limit,
      order_by: 'modified desc',
    },
    userSession
  )) as Record<string, unknown>[];

  return rows
    .filter((r) => typeof r.name === 'string')
    .map((r) => ({
      name: String(r.name),
      pos_profile: String(r.pos_profile ?? ''),
      company: String(r.company ?? ''),
      user: String(r.user ?? ''),
      period_start_date: String(r.period_start_date ?? ''),
      status: r.status != null ? String(r.status) : undefined,
    }));
}

export async function posGetProfileData(
  posProfileName: string,
  userSession: string | undefined
): Promise<unknown> {
  return getDoc('POS Profile', posProfileName, userSession);
}

export async function posGetItems(
  userSession: string | undefined,
  params: {
    pos_profile: string;
    start?: number;
    page_length?: number;
    price_list?: string | null;
    item_group?: string;
    search_term?: string;
  }
): Promise<unknown> {
  // v16 compat: uses callPosMethodWithFallback for v15↔v16 POS path compatibility
  // Also handles page_length → limit parameter name change in v16
  const pageLen = Math.min(100, params.page_length ?? 40);
  return callPosMethodWithFallback(
    'erpnext.selling.page.point_of_sale.point_of_sale.get_items',
    {
      start: params.start ?? 0,
      // v16 compat: send both page_length (v15) and limit (v16) parameter names
      page_length: pageLen,
      limit: pageLen,
      price_list: params.price_list ?? null,
      item_group: params.item_group ?? '',
      pos_profile: params.pos_profile,
      search_term: params.search_term ?? '',
    },
    userSession
  );
}

/** مجموعة الأصناف الجذر المرتبطة بملف نقطة البيع (نفس منطق شاشة ERPNext POS). */
export async function posGetParentItemGroup(
  userSession: string | undefined,
  posProfile: string
): Promise<string | null> {
  // v16 compat: uses callPosMethodWithFallback for v15↔v16 POS path compatibility
  const raw = (await callPosMethodWithFallback(
    'erpnext.selling.page.point_of_sale.point_of_sale.get_parent_item_group',
    { pos_profile: posProfile.trim() },
    userSession
  )) as unknown;
  if (raw == null) return null;
  if (typeof raw === 'string') return raw.trim() || null;
  return null;
}

export async function posSearchBarcode(
  userSession: string | undefined,
  searchValue: string
): Promise<unknown> {
  // v16 compat: uses callPosMethodWithFallback for v15↔v16 POS path compatibility
  return callPosMethodWithFallback(
    'erpnext.selling.page.point_of_sale.point_of_sale.search_for_serial_or_batch_or_barcode_number',
    { search_value: searchValue },
    userSession
  );
}

export type PosCustomerInfo = {
  name: string;
  customer_name: string;
  mobile_no?: string;
  email_id?: string;
  territory?: string;
  customer_group?: string;
  outstanding_balance: number;
};

/** بيانات عميل للكاشير — مع جمع ذمم مفتوحة من فواتير البيع ونقطة البيع المرحّلة. */
export async function posGetCustomerInfo(
  userSession: string | undefined,
  customerName: string
): Promise<PosCustomerInfo> {
  const trimmed = customerName?.trim();
  if (!trimmed) throw new Error('اسم العميل مطلوب');

  const doc = (await getDoc('Customer', trimmed, userSession)) as Record<string, unknown> | null;
  if (!doc || String(doc.name ?? '') !== trimmed) {
    throw new Error('العميل غير موجود');
  }

  const arFilter = [
    ['customer', '=', trimmed],
    ['docstatus', '=', 1],
    ['outstanding_amount', '>', 0.005],
  ] as const;

  let outstanding_balance = 0;
  for (const dt of ['Sales Invoice', 'POS Invoice'] as const) {
    const rows = (await getList(
      dt,
      {
        fields: ['outstanding_amount'],
        filters: arFilter as unknown as string[][],
        limit: 500,
      },
      userSession
    )) as { outstanding_amount?: number }[];
    for (const r of rows) {
      outstanding_balance += Number(r.outstanding_amount ?? 0);
    }
  }

  return {
    name: String(doc.name),
    customer_name: String(doc.customer_name ?? doc.name),
    mobile_no: typeof doc.mobile_no === 'string' ? doc.mobile_no : undefined,
    email_id: typeof doc.email_id === 'string' ? doc.email_id : undefined,
    territory: typeof doc.territory === 'string' ? doc.territory : undefined,
    customer_group: typeof doc.customer_group === 'string' ? doc.customer_group : undefined,
    outstanding_balance,
  };
}

/** حقول مسموح تحديثها من شاشة البيع عبر أمر ERPNext الرسمي */
const POS_SET_CUSTOMER_FIELDS = new Set(['mobile_no', 'email_id', 'customer_name']);

/**
 * تحديث حقل على عميل من نقطة البيع — يستدعي `set_customer_info` كما في شاشة الكاشير في النظام.
 */
export async function posSetCustomerInfo(
  userSession: string | undefined,
  input: { customer: string; fieldname: string; value: string }
): Promise<void> {
  const customer = input.customer?.trim();
  if (!customer) throw new Error('العميل مطلوب');
  const fieldname = input.fieldname?.trim();
  if (!fieldname || !POS_SET_CUSTOMER_FIELDS.has(fieldname)) {
    throw new Error('حقل غير مسموح للتحديث من نقطة البيع');
  }
  // v16 compat: uses callPosMethodWithFallback for v15↔v16 POS path compatibility
  await callPosMethodWithFallback(
    'erpnext.selling.page.point_of_sale.point_of_sale.set_customer_info',
    {
      customer,
      fieldname,
      value: input.value ?? '',
    },
    userSession
  );
}

export type PosSessionSummaryResult = {
  pos_opening_entry: string;
  period_start_date: string;
  period_end: string;
  company: string;
  pos_profile: string;
  user: string;
  invoice_count: number;
  /** فواتير بيع (ليست مرتجعاً) */
  sales_invoice_count: number;
  /** فواتير مرتجعة ضمن نفس الفترة */
  return_invoice_count: number;
  grand_total_sum: number;
  tax_sum: number;
  payments_by_mode: Record<string, number>;
  /** أرصدة افتتاحية من POS Opening Entry لعرضها بجانب التحصيل §10.2 */
  opening_amounts_by_mode: Record<string, number>;
  invoices: {
    name: string;
    grand_total: number;
    posting_date?: string;
    customer_name?: string;
  }[];
};

/**
 * ملخص مبيعات الوردية المفتوحة — نفس مصدر بيانات إغلاق الوردية (`get_invoices`) حتى لحظة الطلب.
 */
export async function posSessionSummary(
  userSession: string | undefined,
  opts: { pos_opening_entry?: string; frappeUserName?: string }
): Promise<PosSessionSummaryResult> {
  let openingName = opts.pos_opening_entry?.trim();
  if (!openingName) {
    const user = opts.frappeUserName?.trim();
    if (!user) throw new Error('حدد فتحة الوردية أو مستخدم الكاشير');
    const check = await posCheckOpening(userSession, user);
    if (!check.has_open_entry || !check.open_entry?.name) {
      throw new Error('لا توجد وردية مفتوحة');
    }
    openingName = check.open_entry.name;
  }

  const opening = (await getDoc('POS Opening Entry', openingName, userSession)) as Record<string, unknown>;
  if (!opening || String(opening.name) !== openingName) {
    throw new Error('فتحة الوردية غير موجودة');
  }
  if (String(opening.status ?? '') !== 'Open') {
    throw new Error('الملخص الفوري متاح للجلسات المفتوحة فقط');
  }

  const end = nowDatetimeLocal();
  // v16 compat: POS Closing Entry get_invoices — try multiple module paths
  const summaryInvoiceArgs = {
    start: opening.period_start_date,
    end,
    pos_profile: opening.pos_profile,
    user: opening.user,
  };
  let invData: PosInvoiceData | null = null;
  const summaryVersion = getBackendVersion();
  const summaryIsV15 = summaryVersion === 'v15' || summaryVersion.startsWith('v14') || summaryVersion.startsWith('v13');

  if (!summaryIsV15) {
    for (const summaryV16Path of [
      'erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry.get_invoices',
      'erpnext.billing.doctype.pos_closing_entry.pos_closing_entry.get_invoices',
    ]) {
      try {
        invData = (await callMethod(summaryV16Path, summaryInvoiceArgs, userSession)) as PosInvoiceData;
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes('not found') && !msg.includes('does not exist') && !msg.includes('No method')) {
          throw error;
        }
      }
    }
  }

  if (!invData) {
    invData = (await callMethod(
      'erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry.get_invoices',
      summaryInvoiceArgs,
      userSession
    )) as PosInvoiceData;
  }

  const rawInv = Array.isArray(invData?.invoices) ? invData.invoices : [];
  let grand_total_sum = 0;
  let tax_sum = 0;
  let sales_invoice_count = 0;
  let return_invoice_count = 0;
  const payments_by_mode: Record<string, number> = {};

  for (const inv of rawInv) {
    const r = inv as Record<string, unknown>;
    if (Number(r.is_return) === 1) return_invoice_count++;
    else sales_invoice_count++;
    grand_total_sum += Number(r.grand_total ?? r.base_grand_total ?? 0);
    tax_sum += Number(r.total_taxes_and_charges ?? 0);
  }

  const opening_amounts_by_mode: Record<string, number> = {};
  const balRows = Array.isArray(opening.balance_details)
    ? (opening.balance_details as Record<string, unknown>[])
    : [];
  for (const b of balRows) {
    const row = b as Record<string, unknown>;
    const mode = String(row.mode_of_payment ?? '').trim();
    if (!mode) continue;
    opening_amounts_by_mode[mode] =
      (opening_amounts_by_mode[mode] ?? 0) + Number(row.opening_amount ?? 0);
  }

  const rawPay = Array.isArray(invData?.payments) ? invData.payments : [];
  for (const p of rawPay) {
    const row = p as Record<string, unknown>;
    const mode = String(row.mode_of_payment ?? '');
    const amt = Number(row.amount ?? 0);
    if (mode) payments_by_mode[mode] = (payments_by_mode[mode] ?? 0) + amt;
  }

  const invoices = rawInv.slice(0, 80).map((inv) => {
    const r = inv as Record<string, unknown>;
    return {
      name: String(r.name ?? ''),
      grand_total: Number(r.grand_total ?? r.base_grand_total ?? 0),
      posting_date: typeof r.posting_date === 'string' ? r.posting_date : undefined,
      customer_name:
        typeof r.customer_name === 'string'
          ? r.customer_name
          : typeof r.customer === 'string'
            ? r.customer
            : undefined,
    };
  });

  return {
    pos_opening_entry: String(opening.name),
    period_start_date: String(opening.period_start_date ?? ''),
    period_end: end,
    company: String(opening.company ?? ''),
    pos_profile: String(opening.pos_profile ?? ''),
    user: String(opening.user ?? ''),
    invoice_count: rawInv.length,
    sales_invoice_count,
    return_invoice_count,
    grand_total_sum,
    tax_sum,
    payments_by_mode,
    opening_amounts_by_mode,
    invoices,
  };
}

export async function posPastOrders(
  userSession: string | undefined,
  opts?: { pos_profile?: string; company?: string; limit?: number }
): Promise<
  {
    name: string;
    customer_name?: string;
    grand_total?: number;
    posting_date?: string;
    pos_profile?: string;
  }[]
> {
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 80));
  const filters: Record<string, unknown> = { docstatus: 1, is_return: 0 };
  if (opts?.pos_profile?.trim()) filters.pos_profile = opts.pos_profile.trim();
  if (opts?.company?.trim()) filters.company = opts.company.trim();

  const rows = (await getList(
    'POS Invoice',
    {
      fields: ['name', 'customer_name', 'grand_total', 'posting_date', 'pos_profile'],
      filters,
      order_by: 'modified desc',
      limit,
    },
    userSession
  )) as Record<string, unknown>[];

  return rows.map((r) => ({
    name: String(r.name ?? ''),
    customer_name: r.customer_name != null ? String(r.customer_name) : undefined,
    grand_total: r.grand_total != null ? Number(r.grand_total) : undefined,
    posting_date: typeof r.posting_date === 'string' ? r.posting_date : undefined,
    pos_profile: typeof r.pos_profile === 'string' ? r.pos_profile : undefined,
  }));
}

export type PosCreateInvoiceResult = {
  name: string;
  rounded_total: number;
  total_taxes_and_charges: number;
  /** لم يُرحَّل — دفع جزئي وفق ملف نقطة البيع */
  draft?: boolean;
};

async function posProfileAllowsPartialPayment(
  posProfileName: string,
  userSession: string | undefined
): Promise<boolean> {
  const trimmed = posProfileName.trim();
  if (!trimmed) return false;
  const doc = (await getDoc('POS Profile', trimmed, userSession)) as Record<string, unknown> | null;
  if (!doc) return false;
  const v = doc.allow_partial_payment;
  return v === 1 || v === true || v === '1';
}

/**
 * يضبط صفوف مدفوعات POS Invoice لتطابق الإجمالي بعد الضريبة.
 * عند `rejectIfBelowGrandTotal` لا يُرفَع المبلغ تلقائيًا إن كان مجموع المدفوعات أقل من الإجمالي (مسودة دفع جزئي قبل إكمال التحصيل).
 */
async function adjustPosInvoicePaymentsAfterSave(
  name: string,
  userSession: string | undefined,
  opts?: { rejectIfBelowGrandTotal?: boolean }
): Promise<void> {
  let saved = (await getDoc('POS Invoice', name, userSession)) as Record<string, unknown> | null;
  if (!saved) throw new Error('تعذر قراءة الفاتورة');

  const isReturn = Number(saved.is_return) === 1;
  if (isReturn) return;

  const gt = Number(saved.rounded_total ?? saved.grand_total ?? 0);
  const payRows = ((saved.payments as Record<string, unknown>[]) || []).filter(
    (p) => p && typeof p === 'object'
  );
  const paySum = payRows.reduce((s, p) => s + Number((p as Record<string, unknown>).amount || 0), 0);

  if (
    opts?.rejectIfBelowGrandTotal &&
    gt > 0.005 &&
    payRows.length > 0 &&
    paySum + 0.02 < gt
  ) {
    throw new Error(
      'مجموع المدفوعات أقل من إجمالي الفاتورة — عدّل المبالغ أدناه لتغطية الإجمالي ثم رحّل'
    );
  }

  if (payRows.length > 0 && gt >= 0 && Math.abs(paySum - gt) > 0.005) {
    if (payRows.length === 1) {
      const row0 = payRows[0] as Record<string, unknown>;
      const firstMode = String(row0?.mode_of_payment ?? '');
      if (firstMode) {
        await updateDoc(
          'POS Invoice',
          name,
          {
            payments: [
              {
                ...(typeof row0.name === 'string' ? { name: row0.name } : {}),
                mode_of_payment: firstMode,
                amount: gt,
              },
            ],
          } as Record<string, unknown>,
          userSession
        );
        await getDoc('POS Invoice', name, userSession);
      }
    } else if (paySum > 0.005) {
      const factor = gt / paySum;
      const newPayments = payRows.map((row) => {
        const r = row as Record<string, unknown>;
        const oldAmt = Number(r.amount || 0);
        return {
          ...(typeof r.name === 'string' ? { name: r.name } : {}),
          mode_of_payment: r.mode_of_payment,
          amount: Math.round(oldAmt * factor * 100) / 100,
        };
      });
      let adjSum = newPayments.reduce((s, p) => s + Number(p.amount), 0);
      if (newPayments.length && Math.abs(adjSum - gt) > 0.009) {
        const last = newPayments[newPayments.length - 1]!;
        last.amount = Number(last.amount) + (gt - adjSum);
      }
      await updateDoc(
        'POS Invoice',
        name,
        { payments: newPayments } as Record<string, unknown>,
        userSession
      );
      await getDoc('POS Invoice', name, userSession);
    }
  }
}

/**
 * ترحيل مسودة POS Invoice بعد إكمال المدفوعات (اختياريًا استبدال جدول المدفوعات).
 */
export async function posSubmitDraftPosInvoice(
  userSession: string | undefined,
  invoiceName: string,
  opts?: { payments?: { mode_of_payment: string; amount: number }[] }
): Promise<PosCreateInvoiceResult> {
  const name = invoiceName.trim();
  if (!name) throw new Error('اسم الفاتورة مطلوب');

  let saved = (await getDoc('POS Invoice', name, userSession)) as Record<string, unknown> | null;
  if (!saved) throw new Error('الفاتورة غير موجودة');
  if (String(saved.doctype) !== 'POS Invoice') throw new Error('نوع المستند غير صالح');
  if (Number(saved.docstatus) !== 0) {
    throw new Error('المستند ليس مسودة أو تم ترحيله مسبقًا');
  }
  if (Number(saved.is_return) === 1) throw new Error('لا يُستخدم هذا المسار للمرتجعات');

  const incoming =
    opts?.payments?.filter((p) => p.mode_of_payment?.trim() && p.amount > 0.005) ?? [];
  if (incoming.length > 0) {
    await updateDoc(
      'POS Invoice',
      name,
      {
        payments: incoming.map((p) => ({
          mode_of_payment: p.mode_of_payment.trim(),
          amount: p.amount,
        })),
      } as Record<string, unknown>,
      userSession
    );
  }

  await adjustPosInvoicePaymentsAfterSave(name, userSession, { rejectIfBelowGrandTotal: true });

  await submitDoc('POS Invoice', name, userSession);

  const submitted = (await getDoc('POS Invoice', name, userSession)) as Record<string, unknown> | null;
  const rounded_total = Number(submitted?.rounded_total ?? submitted?.grand_total ?? 0);
  const total_taxes_and_charges = Number(submitted?.total_taxes_and_charges ?? 0);

  return {
    name,
    rounded_total,
    total_taxes_and_charges,
    draft: false,
  };
}

/**
 * إنشاء POS Invoice وترحيلها من الخادم — مع تصحيح صف المدفوعات عند اختلاف المجموع عن الإجمالي بعد الضريبة (فواتير البيع العادية فقط).
 * عند `submit: false` يُنشأ المستند كمسودة دون تصحيح المدفوعات لتطابق الإجمالي (دفع جزئي) — ويشترط `allow_partial_payment` في ملف نقطة البيع.
 */
export async function posCreateAndSubmitPosInvoice(
  userSession: string | undefined,
  doc: Record<string, unknown>,
  opts?: { submit?: boolean }
): Promise<PosCreateInvoiceResult> {
  if (String(doc.doctype ?? '') !== 'POS Invoice') {
    throw new Error('نوع المستند غير صالح');
  }

  const submit = opts?.submit !== false;

  if (!submit) {
    const posProfile = String(doc.pos_profile ?? '').trim();
    if (!posProfile) throw new Error('ملف نقطة البيع مطلوب');
    const allowed = await posProfileAllowsPartialPayment(posProfile, userSession);
    if (!allowed) throw new Error('ملف نقطة البيع لا يسمح بالدفع الجزئي (مسودة)');
  }

  const created = (await createDoc('POS Invoice', doc, userSession)) as { name?: string };
  const name = typeof created?.name === 'string' ? created.name : '';
  if (!name) throw new Error('لم يُرجع اسم فاتورة نقطة البيع');

  let saved = (await getDoc('POS Invoice', name, userSession)) as Record<string, unknown> | null;
  if (!saved) throw new Error('تعذر قراءة المسودة بعد الإنشاء');

  const isReturn = Number(saved.is_return) === 1;
  if (!isReturn && submit) {
    await adjustPosInvoicePaymentsAfterSave(name, userSession);
    saved = (await getDoc('POS Invoice', name, userSession)) as Record<string, unknown> | null;
  }

  if (submit) {
    await submitDoc('POS Invoice', name, userSession);
  }

  const submitted = submit
    ? ((await getDoc('POS Invoice', name, userSession)) as Record<string, unknown> | null)
    : saved;
  const rounded_total = Number(
    submitted?.rounded_total ??
      submitted?.grand_total ??
      saved?.rounded_total ??
      saved?.grand_total ??
      0
  );
  const total_taxes_and_charges = Number(
    submitted?.total_taxes_and_charges ?? saved?.total_taxes_and_charges ?? 0
  );

  return {
    name,
    rounded_total,
    total_taxes_and_charges,
    draft: !submit,
  };
}

async function resolveSellingPriceListForCompany(
  company: string,
  currency: string,
  userSession: string | undefined
): Promise<string | null> {
  const comp = (await getDoc('Company', company, userSession)) as Record<string, unknown> | null;
  for (const k of ['default_selling_price_list', 'selling_price_list', 'default_price_list'] as const) {
    const v = comp?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }

  let pls = (await getList(
    'Price List',
    {
      fields: ['name'],
      filters: { selling: 1, enabled: 1, currency },
      limit: 1,
    },
    userSession
  )) as { name?: string }[];
  if (pls[0]?.name && typeof pls[0].name === 'string') return pls[0].name;

  pls = (await getList(
    'Price List',
    { fields: ['name'], filters: { selling: 1, enabled: 1 }, limit: 1 },
    userSession
  )) as { name?: string }[];
  return pls[0]?.name && typeof pls[0].name === 'string' ? pls[0].name : null;
}

async function modeHasCompanyAccount(
  modeName: string,
  company: string,
  userSession: string | undefined
): Promise<boolean> {
  const rows = (await getList(
    'Mode of Payment Account',
    { fields: ['name'], filters: { parent: modeName, company }, limit: 1 },
    userSession
  )) as unknown[];
  return rows.length > 0;
}

/** يربط حساب النقد الافتراضي للشركة بصف «Mode of Payment Account» لطريقة «Cash» إن وُجدت. */
async function ensureCashModeAccountForCompany(
  company: string,
  defaultAccount: string,
  userSession: string | undefined
): Promise<boolean> {
  const cashRows = (await getList(
    'Mode of Payment',
    { fields: ['name'], filters: { name: 'Cash' }, limit: 1 },
    userSession
  )) as { name?: string }[];
  const cashName = typeof cashRows[0]?.name === 'string' ? cashRows[0].name : '';
  if (!cashName) return false;

  const existing = (await getList(
    'Mode of Payment Account',
    { fields: ['name'], filters: { parent: cashName, company }, limit: 1 },
    userSession
  )) as unknown[];
  if (existing.length > 0) return false;

  const mop = (await getDoc('Mode of Payment', cashName, userSession)) as Record<string, unknown> | null;
  if (!mop) return false;
  const prev = Array.isArray(mop.accounts)
    ? ([...(mop.accounts as Record<string, unknown>[])].filter(Boolean) as Record<string, unknown>[])
    : [];
  prev.push({ company, default_account: defaultAccount });
  await updateDoc('Mode of Payment', cashName, { accounts: prev }, userSession);
  return true;
}

/** إنشاء ملف POS Profile أدنى — فقط عند عدم وجود ملفات واستيفاء المخزون وقائمة الأسعار وربط Cash. */
async function tryCreateMinimalPosProfileForCompany(
  company: string,
  userSession: string | undefined
): Promise<string | null> {
  const existing = (await getList(
    'POS Profile',
    { fields: ['name'], filters: { company, disabled: 0 }, limit: 1 },
    userSession
  )) as { name?: string }[];
  if (existing.length > 0) return null;

  const warehouses = (await getList(
    'Warehouse',
    { fields: ['name'], filters: { company, is_group: 0 }, limit: 1 },
    userSession
  )) as { name?: string }[];
  const warehouse = typeof warehouses[0]?.name === 'string' ? warehouses[0].name : '';
  if (!warehouse) return null;

  const comp = (await getDoc('Company', company, userSession)) as Record<string, unknown> | null;
  const currency =
    comp && typeof comp.default_currency === 'string' ? comp.default_currency.trim() : '';
  if (!currency) return null;

  const priceList = await resolveSellingPriceListForCompany(company, currency, userSession);
  if (!priceList) return null;

  const cashOk = await modeHasCompanyAccount('Cash', company, userSession);
  if (!cashOk) return null;

  const payload = buildMinimalPosProfile({
    company,
    warehouse,
    selling_price_list: priceList,
    currency,
    payments: [{ mode_of_payment: 'Cash' }],
  });

  const created = (await createDoc('POS Profile', payload, userSession)) as { name?: string };
  const name = typeof created?.name === 'string' ? created.name : '';
  return name ? `إنشاء ملف نقطة بيع: ${name}` : null;
}

/**
 * ضبط خفيف وآمن: POS Settings، و(اختياري) ربط Cash بالشركة، و(اختياري) إنشاء ملف POS أدنى.
 * لا يُنشئ شركة ولا مخطط حسابات كاملاً.
 */
export async function posApplyMinimalSetup(
  userSession: string | undefined,
  opts?: {
    company?: string;
    ensure_cash_mode_account?: boolean;
    create_default_pos_profile_if_missing?: boolean;
  }
): Promise<{ actions: string[] }> {
  const actions: string[] = [];
  try {
    const doc = (await getDoc('POS Settings', 'POS Settings', userSession)) as Record<string, unknown>;
    if (doc && String(doc.invoice_type ?? '') !== 'POS Invoice') {
      await updateDoc(
        'POS Settings',
        'POS Settings',
        { invoice_type: 'POS Invoice' },
        userSession
      );
      actions.push('POS Settings: invoice_type → POS Invoice');
    }
  } catch {
    /* يختلف الإعداد أو الصلاحيات */
  }

  const company = opts?.company?.trim();
  if (!company) return { actions };

  if (opts?.ensure_cash_mode_account) {
    try {
      const comp = (await getDoc('Company', company, userSession)) as Record<string, unknown> | null;
      const cashAcc =
        comp && typeof comp.default_cash_account === 'string' ? comp.default_cash_account.trim() : '';
      if (cashAcc) {
        const did = await ensureCashModeAccountForCompany(company, cashAcc, userSession);
        if (did) actions.push('ربط الحساب النقدي الافتراضي للشركة بطريقة الدفع «Cash»');
      }
    } catch {
      /* */
    }
  }

  if (opts?.create_default_pos_profile_if_missing) {
    try {
      const msg = await tryCreateMinimalPosProfileForCompany(company, userSession);
      if (msg) actions.push(msg);
    } catch {
      /* */
    }
  }

  return { actions };
}
