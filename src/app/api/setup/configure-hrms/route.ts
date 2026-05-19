// ============================================================
// GET & POST /api/setup/configure-hrms
// إعداد شامل لبيانات الموارد البشرية الافتراضية (HRMS)
//
// GET: فحص حالة إعداد HRMS — ما هو مُعدّ وما هو ناقص
// POST: إنشاء وتكوين جميع البيانات الافتراضية بناءً على اختيارات المستخدم
//
// ⚠️ تم تصحيح أسماء الحقول لتتوافق مع ERPNext HRMS DocTypes:
//   - Expense Claim Type: يستخدم `expense_type` كحقل التسمية
//     و `accounts` كجدول فرعي [{company, default_account}]
//   - Leave Type: يستخدم `leave_type_name` كحقل التسمية
//     و `max_continuous_days_allowed` بدلاً من `max_consecutive_leaves`
//   - Salary Component: يستخدم `salary_component` + `salary_component_abbr` (مطلوب)
//   - Employment Type: يستخدم `employee_type_name` كحقل التسمية
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, updateDoc, callMethod, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export const dynamic = 'force-dynamic';

// ============================================================
// البيانات الافتراضية لـ HRMS
// ============================================================

/** أنواع مطالبات المصروفات الافتراضية مع الكلمات المفتاحية للمطابقة */
const DEFAULT_EXPENSE_CLAIM_TYPES = [
  { name: 'مصاريف إدارية', englishName: 'Calls', keywords: ['إدارية', 'إدارة', 'عام', 'General', 'Administrative', 'Admin'] },
  { name: 'مصاريف سفر وتنقل', englishName: 'Travel', keywords: ['سفر', 'تنقل', 'Travel', 'Transport', 'Conveyance'] },
  { name: 'مصاريف ضيافة', englishName: 'Food', keywords: ['ضيافة', 'استقبال', 'طعام', 'Hospitality', 'Entertainment', 'Food', 'Meals'] },
  { name: 'مصاريف طبية', englishName: 'Medical', keywords: ['طبية', 'تأمين صحي', 'صحة', 'Medical', 'Insurance', 'Health'] },
  { name: 'مصاريف متنوعة', englishName: 'Others', keywords: ['متنوعة', 'أخرى', 'Miscellaneous', 'Other', 'Sundry'] },
  { name: 'مصاريف اتصالات', englishName: 'Communication', keywords: ['اتصالات', 'هاتف', 'إنترنت', 'Telecommunication', 'Phone', 'Communication'] },
  { name: 'مصاريف وقود', englishName: 'Fuel', keywords: ['وقود', 'بنزين', 'ديزل', 'Fuel', 'Gasoline', 'Petrol'] },
  { name: 'مصاريف صيانة', englishName: 'Maintenance', keywords: ['صيانة', 'إصلاح', 'Maintenance', 'Repair'] },
  { name: 'مصاريف إيجار', englishName: 'Rent', keywords: ['إيجار', 'أجار', 'Rent', 'Lease'] },
  { name: 'مصاريف قرطاسية ومستلزمات', englishName: 'Stationery', keywords: ['قرطاسية', 'مستلزمات', 'لوازم', 'Stationery', 'Supplies'] },
  { name: 'مصاريف تسويق وإعلان', englishName: 'Marketing', keywords: ['تسويق', 'إعلان', 'دعاية', 'Marketing', 'Advertising'] },
  { name: 'مصاريف تدريب وتطوير', englishName: 'Training', keywords: ['تدريب', 'تطوير', 'تعليم', 'Training', 'Development'] },
  { name: 'مصاريف كهرباء وماء', englishName: 'Utilities', keywords: ['كهرباء', 'ماء', 'مرافق', 'Electricity', 'Water', 'Utility', 'Utilities'] },
  { name: 'مصاريف نقل وشحن', englishName: 'Shipping', keywords: ['نقل', 'شحن', 'توصيل', 'Shipping', 'Freight', 'Delivery'] },
  { name: 'مصاريف مهنية وخدمية', englishName: 'Professional', keywords: ['مهنية', 'خدمية', 'خدمات', 'Professional', 'Service', 'Consulting'] },
];

/** أنواع الإجازات الافتراضية */
const DEFAULT_LEAVE_TYPES = [
  { name: 'إجازة سنوية', englishName: 'Casual Leave', is_carry_forward: 1, is_lwp: 0, allow_encashment: 1, max_continuous_days_allowed: 3, include_holiday: 1 },
  { name: 'إجازة مرضية', englishName: 'Sick Leave', is_carry_forward: 0, is_lwp: 0, allow_encashment: 0, max_continuous_days_allowed: 0, include_holiday: 1 },
  { name: 'إجازة دورية', englishName: 'Privilege Leave', is_carry_forward: 0, is_lwp: 0, allow_encashment: 0, max_continuous_days_allowed: 0, include_holiday: 1 },
  { name: 'إجازة بدون راتب', englishName: 'Leave Without Pay', is_carry_forward: 0, is_lwp: 1, allow_encashment: 0, max_continuous_days_allowed: 0, include_holiday: 1 },
  { name: 'إجازة تعويضية', englishName: 'Compensatory Off', is_carry_forward: 0, is_lwp: 0, allow_encashment: 0, is_compensatory: 1, max_continuous_days_allowed: 0, include_holiday: 1 },
];

/** مكونات الراتب الافتراضية مع الاختصارات المطلوبة */
const DEFAULT_SALARY_COMPONENTS = [
  { name: 'الراتب الأساسي', abbr: 'BS', type: 'Earning', keywords: ['راتب', 'أساسي', 'Salary', 'Basic', 'Wages'], accountType: 'expense' },
  { name: 'بدل سكن', abbr: 'HR', type: 'Earning', keywords: ['سكن', 'إيجار', 'House Rent', 'HRA', 'Housing'], accountType: 'expense' },
  { name: 'بدل نقل', abbr: 'TA', type: 'Earning', keywords: ['نقل', 'مواصلات', 'Transport', 'Conveyance'], accountType: 'expense' },
  { name: 'ضريبة الدخل', abbr: 'IT', type: 'Deduction', keywords: ['ضريبة', 'دخل', 'Income Tax', 'Tax'], accountType: 'liability', is_income_tax_component: 1 },
  { name: 'تقاعد', abbr: 'PF', type: 'Deduction', keywords: ['تقاعد', 'معاش', 'Provident Fund', 'PF', 'Pension'], accountType: 'liability' },
];

/** أنواع التوظيف الافتراضية */
const DEFAULT_EMPLOYMENT_TYPES = [
  'دوام كامل', 'دوام جزئي', 'فترة تجريبية', 'عقد مؤقت', 'عمولة', 'قطعة', 'تدريب', 'تلمذة',
];

// ============================================================
// دوال مساعدة
// ============================================================

/** كلمات مفتاحية لحسابات لا يجب استخدامها كحساب افتراضي */
const UNSUPPORTED_ACCOUNT_KEYWORDS = [
  'Impairment', 'خسائر الهبوط', 'Interest Expense', 'فوائد',
  'Tax Expense', 'ضريبة', 'الربح / الخسارة', 'تقريب',
  'تسوية المخزون', 'المصروفات متضمنة', 'النفقات المدرجة',
  'لا تصلح', 'Cost of Goods', 'تكلفة البضاعة',
];

/** حسابات عامة مفضلة كـ fallback */
const GENERIC_EXPENSE_KEYWORDS = ['نفقات إدارية', 'مصاريف إدارية', 'General', 'Administrative', 'نفقات متنوعة', 'مصاريف متنوعة', 'Miscellaneous'];

/** التحقق من أن الحساب مناسب للاستخدام كحساب افتراضي */
function isSuitableExpenseAccount(accountName: string, accountNameAlt?: string): boolean {
  const combined = `${accountName} ${accountNameAlt || ''}`.toLowerCase();
  return !UNSUPPORTED_ACCOUNT_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
}

/** إيجاد حساب مصاريف مناسب بناءً على الكلمات المفتاحية */
function findMatchingExpenseAccount(
  keywords: string[],
  expenseAccounts: Array<{ name: string; account_name?: string }>
): string | null {
  // 1. مطابقة بالكلمات المفتاحية بالترتيب (فقط الحسابات المناسبة)
  for (const kw of keywords) {
    const match = expenseAccounts.find(
      (a) =>
        (a.name?.includes(kw) || a.account_name?.includes(kw)) &&
        isSuitableExpenseAccount(a.name || '', a.account_name)
    );
    if (match) return match.name;
  }

  // 2. مطابقة بالكلمات المفتاحية (بما فيها الحسابات غير المفضلة)
  for (const kw of keywords) {
    const match = expenseAccounts.find(
      (a) =>
        a.name?.includes(kw) ||
        a.account_name?.includes(kw)
    );
    if (match) return match.name;
  }

  // 3. استخدام حساب عام مفضل كـ fallback
  for (const gkw of GENERIC_EXPENSE_KEYWORDS) {
    const genericMatch = expenseAccounts.find(
      (a) =>
        (a.name?.includes(gkw) || a.account_name?.includes(gkw)) &&
        isSuitableExpenseAccount(a.name || '', a.account_name)
    );
    if (genericMatch) return genericMatch.name;
  }

  // 4. أول حساب مصاريف مناسب كـ fallback أخير
  const suitable = expenseAccounts.find(a => isSuitableExpenseAccount(a.name || '', a.account_name));
  if (suitable) return suitable.name;

  // 5. لا يوجد حساب مناسب — إرجاع null بدلاً من حساب غير مناسب
  return null;
}

/** إيجاد حساب مناسب لمكون الراتب (مصاريف أو التزامات) */
function findMatchingSalaryAccount(
  keywords: string[],
  accountType: 'expense' | 'liability',
  expenseAccounts: Array<{ name: string; account_name?: string }>,
  liabilityAccounts: Array<{ name: string; account_name?: string }>
): string | null {
  const accounts = accountType === 'expense' ? expenseAccounts : liabilityAccounts;

  for (const kw of keywords) {
    const match = accounts.find(
      (a) =>
        a.name?.includes(kw) ||
        a.account_name?.includes(kw)
    );
    if (match) return match.name;
  }

  // fallback: أول حساب من نفس النوع
  return accounts.length > 0 ? accounts[0]!.name : null;
}

/** إيجاد حساب التزامات/دائنين مناسب لحسابات الشركة الافتراضية */
function findPayableAccount(
  liabilityAccounts: Array<{ name: string; account_name?: string }>,
  keywords: string[] = ['دائنون', 'مستحقة', 'Payable', 'Accrued', 'مطلوبات']
): string | null {
  for (const kw of keywords) {
    const match = liabilityAccounts.find(
      (a) => a.name?.includes(kw) || a.account_name?.includes(kw)
    );
    if (match) return match.name;
  }
  return liabilityAccounts.length > 0 ? liabilityAccounts[0]!.name : null;
}

/** إيجاد حساب أصول مناسب لسلف الموظفين */
function findAdvanceAccount(
  assetAccounts: Array<{ name: string; account_name?: string }>,
  keywords: string[] = ['سلف', 'مقدم', 'Advance', 'Employee Advance', 'Prepaid']
): string | null {
  for (const kw of keywords) {
    const match = assetAccounts.find(
      (a) => a.name?.includes(kw) || a.account_name?.includes(kw)
    );
    if (match) return match.name;
  }
  return assetAccounts.length > 0 ? assetAccounts[0]!.name : null;
}

/** فحص هل HRMS مثبت عبر فحص DocType */
async function checkHrmsInstalled(userSession?: string): Promise<boolean> {
  try {
    const hrModule = await getDoc('Module Def', 'HR', userSession) as Record<string, unknown>;
    if (hrModule?.name) return true;
  } catch { /* غير موجود */ }

  try {
    await getList('Expense Claim Type', { fields: ['name'], limit: 1 }, userSession);
    return true;
  } catch {
    return false;
  }
}

/**
 * جلب الحساب الافتراضي لنوع مصروفات من الجدول الفرعي `accounts`
 * Expense Claim Type يستخدم child table `Expense Claim Account` بحقول:
 *   - company: Link → Company
 *   - default_account: Link → Account
 */
function getDefaultAccountFromExpenseType(
  expenseTypeDoc: Record<string, unknown>,
  company?: string
): string | null {
  const accounts = expenseTypeDoc.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;

  // إذا حُددت الشركة، نبحث عن حساب مخصص لها
  if (company) {
    const companyAccount = accounts.find(
      (a: Record<string, unknown>) => a.company === company && a.default_account
    );
    if (companyAccount) return String(companyAccount.default_account);
  }

  // نرجع أول حساب متوفر
  const firstAccount = accounts.find(
    (a: Record<string, unknown>) => a.default_account
  );
  return firstAccount ? String(firstAccount.default_account) : null;
}

// ============================================================
// GET — فحص حالة إعداد HRMS
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);

    // 1. فحص هل HRMS مثبت
    const hrmsInstalled = await checkHrmsInstalled(userSession);

    if (!hrmsInstalled) {
      return NextResponse.json({
        success: true,
        hrmsInstalled: false,
        message: 'HRMS غير مثبت — يجب تثبيته أولاً',
        status: {
          expenseClaimTypes: { configured: [], missing: DEFAULT_EXPENSE_CLAIM_TYPES.map(t => t.name) },
          leaveTypes: { configured: [], missing: DEFAULT_LEAVE_TYPES.map(t => t.name) },
          salaryComponents: { configured: [], missing: DEFAULT_SALARY_COMPONENTS.map(t => t.name) },
          employmentTypes: { configured: [], missing: DEFAULT_EMPLOYMENT_TYPES },
          companyDefaults: { set: false, missing: ['default_expense_claim_payable_account', 'default_employee_advance_account', 'default_payroll_payable_account'] },
        },
        defaults: {
          expenseClaimTypes: DEFAULT_EXPENSE_CLAIM_TYPES,
          leaveTypes: DEFAULT_LEAVE_TYPES,
          salaryComponents: DEFAULT_SALARY_COMPONENTS,
          employmentTypes: DEFAULT_EMPLOYMENT_TYPES,
        },
      });
    }

    // جلب اسم الشركة الأولى
    let companyName = '';
    try {
      const companies = (await getList('Company', {
        fields: ['name'],
        limit: 1,
      }, userSession)) as Array<Record<string, unknown>>;
      if (companies.length > 0) companyName = String(companies[0]!.name);
    } catch { /* تجاهل */ }

    // 2. جلب أنواع المصروفات الحالية مع الجدول الفرعي accounts
    let existingExpenseTypes: Array<Record<string, unknown>> = [];
    try {
      existingExpenseTypes = (await getList('Expense Claim Type', {
        fields: ['name', 'expense_type'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;

      // جلب الحسابات الافتراضية لكل نوع عبر getDoc (للحصول على child table)
      for (const type of existingExpenseTypes) {
        try {
          const fullDoc = (await getDoc('Expense Claim Type', String(type.name), userSession)) as Record<string, unknown>;
          const defaultAcct = getDefaultAccountFromExpenseType(fullDoc, companyName);
          type.default_account = defaultAcct;
          type.hasAccount = !!defaultAcct;
        } catch {
          type.default_account = null;
          type.hasAccount = false;
        }
      }
    } catch { /* تجاهل */ }

    const existingExpenseNames = new Set(existingExpenseTypes.map(t => String(t.name)));
    const expenseTypesWithAccount = existingExpenseTypes.filter(t => !!t.default_account);
    const expenseTypesWithoutAccount = existingExpenseTypes.filter(t => !t.default_account);

    const missingExpenseTypes = DEFAULT_EXPENSE_CLAIM_TYPES.filter(
      t => !existingExpenseNames.has(t.name)
    );

    // 3. جلب أنواع الإجازات الحالية
    let existingLeaveTypes: Array<Record<string, unknown>> = [];
    try {
      existingLeaveTypes = (await getList('Leave Type', {
        fields: ['name', 'leave_type_name'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;
    } catch { /* تجاهل */ }

    const existingLeaveNames = new Set(existingLeaveTypes.map(t => String(t.name)));
    const missingLeaveTypes = DEFAULT_LEAVE_TYPES.filter(
      t => !existingLeaveNames.has(t.name)
    );

    // 4. جلب مكونات الرواتب الحالية
    let existingSalaryComponents: Array<Record<string, unknown>> = [];
    try {
      existingSalaryComponents = (await getList('Salary Component', {
        fields: ['name', 'type', 'salary_component_abbr'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;
    } catch { /* تجاهل */ }

    const existingSalaryNames = new Set(existingSalaryComponents.map(t => String(t.name)));
    const missingSalaryComponents = DEFAULT_SALARY_COMPONENTS.filter(
      t => !existingSalaryNames.has(t.name)
    );

    // 5. جلب أنواع التوظيف الحالية
    let existingEmploymentTypes: Array<Record<string, unknown>> = [];
    try {
      existingEmploymentTypes = (await getList('Employment Type', {
        fields: ['name', 'employee_type_name'],
        limit: 100,
      }, userSession)) as Array<Record<string, unknown>>;
    } catch { /* تجاهل */ }

    const existingEmploymentNames = new Set(existingEmploymentTypes.map(t => String(t.name)));
    const missingEmploymentTypes = DEFAULT_EMPLOYMENT_TYPES.filter(
      t => !existingEmploymentNames.has(t)
    );

    // 6. فحص إعدادات الشركة الافتراضية
    let companyDefaultsSet = false;
    const missingCompanyDefaults: string[] = [];

    try {
      if (companyName) {
        const companyDoc = (await getDoc('Company', companyName, userSession)) as Record<string, unknown>;

        const hrFields = [
          'default_expense_claim_payable_account',
          'default_employee_advance_account',
          'default_payroll_payable_account',
        ];

        for (const field of hrFields) {
          if (!companyDoc[field]) {
            missingCompanyDefaults.push(field);
          }
        }

        companyDefaultsSet = missingCompanyDefaults.length === 0;
      } else {
        missingCompanyDefaults.push('لا توجد شركة — يجب إنشاء شركة أولاً');
      }
    } catch {
      missingCompanyDefaults.push('تعذر فحص إعدادات الشركة');
    }

    // تحديد ما إذا كان الإعداد مكتمل
    const setupComplete =
      missingExpenseTypes.length === 0 &&
      expenseTypesWithoutAccount.length === 0 &&
      missingLeaveTypes.length === 0 &&
      missingSalaryComponents.length === 0 &&
      missingEmploymentTypes.length === 0 &&
      companyDefaultsSet;

    return NextResponse.json({
      success: true,
      hrmsInstalled: true,
      setupComplete,
      company: companyName,
      status: {
        expenseClaimTypes: {
          configured: existingExpenseTypes.map(t => ({ name: String(t.name), hasAccount: !!t.default_account, account: t.default_account ? String(t.default_account) : null })),
          missing: missingExpenseTypes.map(t => t.name),
          withoutAccount: expenseTypesWithoutAccount.map(t => String(t.name)),
          totalConfigured: expenseTypesWithAccount.length,
        },
        leaveTypes: {
          configured: existingLeaveTypes.map(t => String(t.name)),
          missing: missingLeaveTypes.map(t => t.name),
        },
        salaryComponents: {
          configured: existingSalaryComponents.map(t => ({ name: String(t.name), type: String(t.type) })),
          missing: missingSalaryComponents.map(t => t.name),
        },
        employmentTypes: {
          configured: existingEmploymentTypes.map(t => String(t.name)),
          missing: missingEmploymentTypes,
        },
        companyDefaults: {
          set: companyDefaultsSet,
          missing: missingCompanyDefaults,
        },
      },
      defaults: {
        expenseClaimTypes: DEFAULT_EXPENSE_CLAIM_TYPES,
        leaveTypes: DEFAULT_LEAVE_TYPES,
        salaryComponents: DEFAULT_SALARY_COMPONENTS,
        employmentTypes: DEFAULT_EMPLOYMENT_TYPES,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل فحص حالة إعداد HRMS';
    console.error('[ConfigureHRMS GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ============================================================
// POST — تكوين بيانات HRMS الافتراضية
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json().catch(() => ({})) as {
      company?: string;
      selectedExpenseTypes?: string[];
      customExpenseTypes?: Array<{ name: string; accountKeywords?: string[] }>;
      selectedLeaveTypes?: string[];
      selectedSalaryComponents?: string[];
      selectedEmploymentTypes?: string[];
    };

    const company = body.company || '';
    if (!company) {
      return NextResponse.json({
        success: false,
        error: 'اسم الشركة مطلوب لتكوين HRMS',
      }, { status: 400 });
    }

    const selectedExpenseTypes = body.selectedExpenseTypes || [];
    const customExpenseTypes = body.customExpenseTypes || [];
    const selectedLeaveTypes = body.selectedLeaveTypes || [];
    const selectedSalaryComponents = body.selectedSalaryComponents || [];
    const selectedEmploymentTypes = body.selectedEmploymentTypes || [];

    // نتائج العملية
    const results = {
      expenseClaimTypes: { created: 0, updated: 0, skipped: 0, failed: 0, details: [] as Array<{ name: string; action: string; account?: string | null; status: string; error?: string }> },
      leaveTypes: { created: 0, skipped: 0, failed: 0, details: [] as Array<{ name: string; action: string; status: string; error?: string }> },
      salaryComponents: { created: 0, skipped: 0, failed: 0, details: [] as Array<{ name: string; action: string; account?: string | null; status: string; error?: string }> },
      employmentTypes: { created: 0, skipped: 0, failed: 0, details: [] as Array<{ name: string; action: string; status: string; error?: string }> },
      companyDefaults: { set: false, details: {} as Record<string, string | null> },
    };

    // ────────────────────────────────────────────────
    // 1. جلب حسابات شجرة الحسابات
    // ────────────────────────────────────────────────
    let expenseAccounts: Array<{ name: string; account_name?: string }> = [];
    let liabilityAccounts: Array<{ name: string; account_name?: string }> = [];
    let assetAccounts: Array<{ name: string; account_name?: string }> = [];

    try {
      const companyFilter: string[][] = company ? [['company', '=', company]] : [];

      const [expAccts, liaAccts, assAccts] = await Promise.all([
        getList('Account', {
          fields: ['name', 'account_name'],
          filters: [['root_type', '=', 'Expense'], ['is_group', '=', '0'], ...companyFilter],
          limit: 500,
        }, userSession).catch(() => []),
        getList('Account', {
          fields: ['name', 'account_name'],
          filters: [['root_type', '=', 'Liability'], ['is_group', '=', '0'], ...companyFilter],
          limit: 500,
        }, userSession).catch(() => []),
        getList('Account', {
          fields: ['name', 'account_name'],
          filters: [['root_type', '=', 'Asset'], ['is_group', '=', '0'], ...companyFilter],
          limit: 500,
        }, userSession).catch(() => []),
      ]);

      expenseAccounts = expAccts as Array<{ name: string; account_name?: string }>;
      liabilityAccounts = liaAccts as Array<{ name: string; account_name?: string }>;
      assetAccounts = assAccts as Array<{ name: string; account_name?: string }>;
    } catch {
      // لن نوقف العملية، لكن المطابقة ستفشل
    }

    // ────────────────────────────────────────────────
    // 2. جلب أنواع المصروفات الموجودة
    // ────────────────────────────────────────────────
    let existingExpenseTypes: Array<Record<string, unknown>> = [];
    try {
      existingExpenseTypes = (await getList('Expense Claim Type', {
        fields: ['name', 'expense_type'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;

      // جلب الحسابات الافتراضية لكل نوع
      for (const type of existingExpenseTypes) {
        try {
          const fullDoc = (await getDoc('Expense Claim Type', String(type.name), userSession)) as Record<string, unknown>;
          const defaultAcct = getDefaultAccountFromExpenseType(fullDoc, company);
          type.default_account = defaultAcct;
        } catch {
          type.default_account = null;
        }
      }
    } catch { /* تجاهل */ }

    const existingExpenseMap = new Map(
      existingExpenseTypes.map(t => [String(t.name), t])
    );

    // ────────────────────────────────────────────────
    // 3. إنشاء/تحديث أنواع مطالبات المصروفات
    // ⚠️ Expense Claim Type DocType:
    //   - autoname: "field:expense_type" → حقل التسمية هو `expense_type`
    //   - accounts: جدول فرعي (Expense Claim Account) بحقول company + default_account
    // ────────────────────────────────────────────────

    const allExpenseTypesToProcess = [
      ...selectedExpenseTypes.map(name => {
        const defaultDef = DEFAULT_EXPENSE_CLAIM_TYPES.find(d => d.name === name);
        return {
          name,
          keywords: defaultDef?.keywords || [],
          englishName: defaultDef?.englishName || name,
        };
      }),
      ...customExpenseTypes.map(ct => ({
        name: ct.name,
        keywords: ct.accountKeywords || [],
        englishName: ct.name,
      })),
    ];

    for (const expenseType of allExpenseTypesToProcess) {
      const existing = existingExpenseMap.get(expenseType.name);

      if (existing) {
        // النوع موجود — هل يحتاج تحديث الحساب الافتراضي؟
        const currentAccount = existing.default_account as string | null;
        if (currentAccount) {
          results.expenseClaimTypes.skipped++;
          results.expenseClaimTypes.details.push({
            name: expenseType.name,
            action: 'skip',
            account: currentAccount,
            status: 'already_configured',
          });
          continue;
        }

        // تعيين الحساب الافتراضي عبر الجدول الفرعي accounts
        const matchedAccount = findMatchingExpenseAccount(expenseType.keywords, expenseAccounts);
        if (!matchedAccount) {
          results.expenseClaimTypes.skipped++;
          results.expenseClaimTypes.details.push({
            name: expenseType.name,
            action: 'update',
            account: null,
            status: 'no_matching_account',
          });
          continue;
        }

        try {
          // ✅ جلب المستند الكامل أولاً للحفاظ على الحقول الإلزامية والجدول الفرعي
          let fullDoc: Record<string, unknown> = {};
          try {
            fullDoc = (await getDoc('Expense Claim Type', expenseType.name, userSession)) as Record<string, unknown>;
          } catch { /* تجاهل — سنستخدم البيانات الأساسية */ }

          // دمج حسابات موجودة مع الحساب الجديد
          const existingAccounts = Array.isArray(fullDoc.accounts) ? [...fullDoc.accounts] : [];
          const existingCompanyIdx = existingAccounts.findIndex(
            (a: Record<string, unknown>) => a.company === company
          );
          const newAccountRow = { company, default_account: matchedAccount };
          if (existingCompanyIdx >= 0) {
            existingAccounts[existingCompanyIdx] = newAccountRow;
          } else {
            existingAccounts.push(newAccountRow);
          }

          await updateDoc('Expense Claim Type', expenseType.name, {
            expense_type: expenseType.name,  // ← حقل إلزامي مطلوب في التحديث
            accounts: existingAccounts,
          }, userSession);
          results.expenseClaimTypes.updated++;
          results.expenseClaimTypes.details.push({
            name: expenseType.name,
            action: 'update',
            account: matchedAccount,
            status: 'updated',
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';
          console.error(`[ConfigureHRMS] Failed to update Expense Claim Type "${expenseType.name}":`, errMsg);
          results.expenseClaimTypes.failed++;
          results.expenseClaimTypes.details.push({
            name: expenseType.name,
            action: 'update',
            account: matchedAccount,
            status: 'failed',
            error: errMsg,
          });
        }
      } else {
        // النوع غير موجود — يجب إنشاؤه
        const matchedAccount = findMatchingExpenseAccount(expenseType.keywords, expenseAccounts);

        try {
          // ✅ استخدام `expense_type` كحقل التسمية (autoname: "field:expense_type")
          const docData: Record<string, unknown> = {
            expense_type: expenseType.name,
          };

          // ✅ إضافة الحساب الافتراضي عبر الجدول الفرعي accounts
          if (matchedAccount && company) {
            docData.accounts = [{
              company: company,
              default_account: matchedAccount,
              doctype: 'Expense Claim Account',  // ← نوع الجدول الفرعي مطلوب
            }];
          }

          await createDoc('Expense Claim Type', docData, userSession);
          results.expenseClaimTypes.created++;
          results.expenseClaimTypes.details.push({
            name: expenseType.name,
            action: 'create',
            account: matchedAccount,
            status: 'created',
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';
          console.error(`[ConfigureHRMS] Failed to create Expense Claim Type "${expenseType.name}":`, errMsg);
          results.expenseClaimTypes.failed++;
          results.expenseClaimTypes.details.push({
            name: expenseType.name,
            action: 'create',
            account: matchedAccount,
            status: 'failed',
            error: errMsg,
          });
        }
      }
    }

    // ────────────────────────────────────────────────
    // 4. إنشاء أنواع الإجازات
    // ⚠️ Leave Type DocType:
    //   - autoname: "field:leave_type_name" → حقل التسمية هو `leave_type_name`
    //   - max_continuous_days_allowed (وليس max_consecutive_leaves)
    // ────────────────────────────────────────────────
    let existingLeaveNames = new Set<string>();
    try {
      const existingLeaves = (await getList('Leave Type', {
        fields: ['name'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;
      existingLeaveNames = new Set(existingLeaves.map(t => String(t.name)));
    } catch { /* تجاهل */ }

    for (const leaveName of selectedLeaveTypes) {
      if (existingLeaveNames.has(leaveName)) {
        results.leaveTypes.skipped++;
        results.leaveTypes.details.push({
          name: leaveName,
          action: 'skip',
          status: 'already_exists',
        });
        continue;
      }

      const defaultDef = DEFAULT_LEAVE_TYPES.find(d => d.name === leaveName);

      try {
        const docData: Record<string, unknown> = {
          // ✅ استخدام `leave_type_name` كحقل التسمية (autoname: "field:leave_type_name")
          leave_type_name: leaveName,
          is_carry_forward: defaultDef?.is_carry_forward || 0,
          is_lwp: defaultDef?.is_lwp || 0,
          allow_encashment: defaultDef?.allow_encashment || 0,
          include_holiday: defaultDef?.include_holiday || 0,
        };

        // ✅ استخدام max_continuous_days_allowed (وليس max_consecutive_leaves)
        if (defaultDef?.max_continuous_days_allowed) {
          docData.max_continuous_days_allowed = defaultDef.max_continuous_days_allowed;
        }

        if ((defaultDef as Record<string, unknown> | undefined)?.is_compensatory) {
          docData.is_compensatory = 1;
        }

        await createDoc('Leave Type', docData, userSession);
        results.leaveTypes.created++;
        results.leaveTypes.details.push({
          name: leaveName,
          action: 'create',
          status: 'created',
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error(`[ConfigureHRMS] Failed to create Leave Type "${leaveName}":`, errMsg);
        results.leaveTypes.failed++;
        results.leaveTypes.details.push({
          name: leaveName,
          action: 'create',
          status: 'failed',
          error: errMsg,
        });
      }
    }

    // ────────────────────────────────────────────────
    // 5. إنشاء مكونات الرواتب
    // ⚠️ Salary Component DocType:
    //   - autoname: "field:salary_component" → حقل التسمية هو `salary_component`
    //   - salary_component_abbr: حقل مطلوب (اختصار فريد)
    //   - accounts: جدول فرعي (Salary Component Account) بحقول company + account
    // ────────────────────────────────────────────────
    let existingSalaryNames = new Set<string>();
    try {
      const existingSalaries = (await getList('Salary Component', {
        fields: ['name'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;
      existingSalaryNames = new Set(existingSalaries.map(t => String(t.name)));
    } catch { /* تجاهل */ }

    for (const compName of selectedSalaryComponents) {
      if (existingSalaryNames.has(compName)) {
        results.salaryComponents.skipped++;
        results.salaryComponents.details.push({
          name: compName,
          action: 'skip',
          status: 'already_exists',
        });
        continue;
      }

      const defaultDef = DEFAULT_SALARY_COMPONENTS.find(d => d.name === compName);
      if (!defaultDef) {
        results.salaryComponents.skipped++;
        results.salaryComponents.details.push({
          name: compName,
          action: 'skip',
          status: 'not_in_defaults',
        });
        continue;
      }

      // إيجاد الحساب المناسب
      const matchedAccount = findMatchingSalaryAccount(
        defaultDef.keywords,
        defaultDef.accountType as 'expense' | 'liability',
        expenseAccounts,
        liabilityAccounts
      );

      try {
        const docData: Record<string, unknown> = {
          // ✅ استخدام `salary_component` كحقل التسمية
          salary_component: compName,
          // ✅ حقل مطلوب: اختصار فريد لمكون الراتب
          salary_component_abbr: defaultDef.abbr,
          type: defaultDef.type,
        };

        // ✅ إضافة علامة ضريبة الدخل إذا كانت مناسبة
        if (defaultDef.is_income_tax_component) {
          docData.is_income_tax_component = 1;
        }

        // ✅ إضافة حساب الشركة في جدول accounts الفرعي
        if (matchedAccount && company) {
          docData.accounts = [{
            company: company,
            account: matchedAccount,
          }];
        }

        await createDoc('Salary Component', docData, userSession);
        results.salaryComponents.created++;
        results.salaryComponents.details.push({
          name: compName,
          action: 'create',
          account: matchedAccount,
          status: 'created',
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error(`[ConfigureHRMS] Failed to create Salary Component "${compName}":`, errMsg);
        results.salaryComponents.failed++;
        results.salaryComponents.details.push({
          name: compName,
          action: 'create',
          account: matchedAccount,
          status: 'failed',
          error: errMsg,
        });
      }
    }

    // ────────────────────────────────────────────────
    // 6. إنشاء أنواع التوظيف
    // ⚠️ Employment Type DocType:
    //   - autoname: "field:employee_type_name" → حقل التسمية هو `employee_type_name`
    // ────────────────────────────────────────────────
    let existingEmploymentNames = new Set<string>();
    try {
      const existingEmployment = (await getList('Employment Type', {
        fields: ['name'],
        limit: 100,
      }, userSession)) as Array<Record<string, unknown>>;
      existingEmploymentNames = new Set(existingEmployment.map(t => String(t.name)));
    } catch { /* تجاهل */ }

    for (const empType of selectedEmploymentTypes) {
      if (existingEmploymentNames.has(empType)) {
        results.employmentTypes.skipped++;
        results.employmentTypes.details.push({
          name: empType,
          action: 'skip',
          status: 'already_exists',
        });
        continue;
      }

      try {
        // ✅ استخدام `employee_type_name` كحقل التسمية
        await createDoc('Employment Type', {
          employee_type_name: empType,
        }, userSession);
        results.employmentTypes.created++;
        results.employmentTypes.details.push({
          name: empType,
          action: 'create',
          status: 'created',
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error(`[ConfigureHRMS] Failed to create Employment Type "${empType}":`, errMsg);
        results.employmentTypes.failed++;
        results.employmentTypes.details.push({
          name: empType,
          action: 'create',
          status: 'failed',
          error: errMsg,
        });
      }
    }

    // ────────────────────────────────────────────────
    // 7. تعيين إعدادات الشركة الافتراضية
    // ────────────────────────────────────────────────
    const companyDefaults: Record<string, string | null> = {};

    // حساب المصروفات المستحقة الدفع
    // ⚠️ نستخدم حساب الدائنين الرئيسي (Payable) بدلاً من Accrued Expenses
    // لأن Accrued Expenses له قيود عملة ولا يصلح كحساب دائنون لمطالبات المصروفات
    const expensePayableAccount = findPayableAccount(liabilityAccounts, [
      'الدائنين', 'دائنون', 'مصروفات مستحقة', 'دائنون مصروفات',
      'Accounts Payable', 'Creditors', 'Expense Payable', 'Expense Claims Payable',
      'مستحقة', 'خصوم متداولة',
    ]);
    companyDefaults.default_expense_claim_payable_account = expensePayableAccount;

    // حساب سلف الموظفين
    const advanceAccount = findAdvanceAccount(assetAccounts, [
      'سلف الموظفين', 'مقدمات الموظفين', 'مقدم رواتب',
      'Employee Advance', 'Advances to Employees', 'Prepaid', 'سلف', 'مقدم',
    ]);
    companyDefaults.default_employee_advance_account = advanceAccount;

    // حساب رواتب مستحقة الدفع
    const payrollPayableAccount = findPayableAccount(liabilityAccounts, [
      'رواتب مستحقة', 'مستحقات الرواتب', 'دائنون رواتب',
      'Payroll Payable', 'Salary Payable', 'Accrued Salary', 'Accrued Payroll',
      'دائنون', 'مستحقة',
    ]);
    companyDefaults.default_payroll_payable_account = payrollPayableAccount;

    // تحديث الشركة
    try {
      const updateData: Record<string, unknown> = {};
      if (expensePayableAccount) updateData.default_expense_claim_payable_account = expensePayableAccount;
      if (advanceAccount) updateData.default_employee_advance_account = advanceAccount;
      if (payrollPayableAccount) updateData.default_payroll_payable_account = payrollPayableAccount;

      if (Object.keys(updateData).length > 0) {
        await updateDoc('Company', company, updateData, userSession);
        results.companyDefaults.set = true;
      }
    } catch (err) {
      // محاولة بديلة عبر callMethod
      try {
        if (expensePayableAccount) {
          await callMethod('frappe.client.set_value', {
            doctype: 'Company',
            name: company,
            fieldname: 'default_expense_claim_payable_account',
            value: expensePayableAccount,
          }, userSession);
        }
        if (advanceAccount) {
          await callMethod('frappe.client.set_value', {
            doctype: 'Company',
            name: company,
            fieldname: 'default_employee_advance_account',
            value: advanceAccount,
          }, userSession);
        }
        if (payrollPayableAccount) {
          await callMethod('frappe.client.set_value', {
            doctype: 'Company',
            name: company,
            fieldname: 'default_payroll_payable_account',
            value: payrollPayableAccount,
          }, userSession);
        }
        results.companyDefaults.set = true;
      } catch (innerErr) {
        const errMsg = innerErr instanceof Error ? innerErr.message : 'خطأ غير معروف';
        console.error('[ConfigureHRMS] Failed to set Company HR defaults:', errMsg);
      }
    }

    results.companyDefaults.details = companyDefaults;

    // ────────────────────────────────────────────────
    // 8. تعديل إعدادات الموارد البشرية
    // ────────────────────────────────────────────────
    // تعطيل اشتراط معتمد المصروفات وتفعيل الموافقة التلقائية
    try {
      await updateDoc('HR Settings', 'HR Settings', {
        expense_approver_mandatory_in_expense_claim: 0,
        auto_approve_expense_claim: 1,
        leave_approver_mandatory_in_leave_application: 0,
      }, userSession);
    } catch {
      // محاولة بديلة عبر callMethod
      try {
        await callMethod('frappe.client.set_value', {
          doctype: 'HR Settings',
          name: 'HR Settings',
          fieldname: 'expense_approver_mandatory_in_expense_claim',
          value: 0,
        }, userSession);
        await callMethod('frappe.client.set_value', {
          doctype: 'HR Settings',
          name: 'HR Settings',
          fieldname: 'auto_approve_expense_claim',
          value: 1,
        }, userSession);
      } catch (hrErr) {
        const hrErrMsg = hrErr instanceof Error ? hrErr.message : 'خطأ غير معروف';
        console.error('[ConfigureHRMS] Failed to update HR Settings:', hrErrMsg);
      }
    }

    // ────────────────────────────────────────────────
    // إرجاع النتائج
    // ────────────────────────────────────────────────
    const totalCreated =
      results.expenseClaimTypes.created +
      results.leaveTypes.created +
      results.salaryComponents.created +
      results.employmentTypes.created;

    const totalUpdated = results.expenseClaimTypes.updated;
    const totalFailed =
      results.expenseClaimTypes.failed +
      results.leaveTypes.failed +
      results.salaryComponents.failed +
      results.employmentTypes.failed;

    return NextResponse.json({
      success: true,
      message: `تم إعداد HRMS: إنشاء ${totalCreated} عنصر${totalUpdated > 0 ? `، تحديث ${totalUpdated} عنصر` : ''}${totalFailed > 0 ? `، فشل ${totalFailed} عنصر` : ''}`,
      results,
      summary: {
        totalCreated,
        totalUpdated,
        totalFailed,
        accountsAvailable: {
          expense: expenseAccounts.length,
          liability: liabilityAccounts.length,
          asset: assetAccounts.length,
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تكوين HRMS';
    console.error('[ConfigureHRMS POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
