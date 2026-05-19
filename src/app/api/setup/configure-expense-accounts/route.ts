// ============================================================
// POST /api/setup/configure-expense-accounts
// يُعين الحسابات الافتراضية تلقائياً لأنواع مطالبات المصروفات
// وينشئ الأنواع المفقودة من القائمة الافتراضية
//
// ⚠️ تم تصحيح بنية Expense Claim Type:
//   - autoname: "field:expense_type" → حقل التسمية هو `expense_type`
//   - accounts: جدول فرعي (Expense Claim Account) بحقول company + default_account
//   - default_account ليس حقلاً مباشراً على DocType
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getList, createDoc, updateDoc, getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export const dynamic = 'force-dynamic';

/**
 * أنواع مطالبات المصروفات الافتراضية مع الكلمات المفتاحية
 */
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

/**
 * خريطة ربط أنواع المصروفات بأسماء حسابات مصاريف مناسبة
 */
const EXPENSE_TYPE_ACCOUNT_KEYWORDS: Record<string, string[]> = Object.fromEntries(
  DEFAULT_EXPENSE_CLAIM_TYPES.map(t => [t.name, t.keywords])
);

/**
 * جلب الحساب الافتراضي من الجدول الفرعي accounts
 */
function getDefaultAccountFromExpenseType(
  expenseTypeDoc: Record<string, unknown>,
  company?: string
): string | null {
  const accounts = expenseTypeDoc.accounts;
  if (!Array.isArray(accounts) || accounts.length === 0) return null;

  if (company) {
    const companyAccount = accounts.find(
      (a: Record<string, unknown>) => a.company === company && a.default_account
    );
    if (companyAccount) return String(companyAccount.default_account);
  }

  const firstAccount = accounts.find(
    (a: Record<string, unknown>) => a.default_account
  );
  return firstAccount ? String(firstAccount.default_account) : null;
}

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

/**
 * إيجاد حساب مصاريف مناسب لنوع المصروف من شجرة الحسابات
 */
function findMatchingAccount(
  expenseTypeName: string,
  expenseAccounts: Array<{ name: string; account_name?: string; parent_account?: string }>
): string | null {
  // 1. مطابقة مباشرة مع الكلمات المفتاحية (فقط الحسابات المناسبة)
  const keywords = EXPENSE_TYPE_ACCOUNT_KEYWORDS[expenseTypeName];
  if (keywords) {
    for (const kw of keywords) {
      const match = expenseAccounts.find(
        (a) =>
          (a.name?.includes(kw) || a.account_name?.includes(kw)) &&
          isSuitableExpenseAccount(a.name || '', a.account_name)
      );
      if (match) return match.name;
    }
  }

  // 2. مطابقة بالكلمات المفتاحية (بما فيها الحسابات غير المفضلة)
  if (keywords) {
    for (const kw of keywords) {
      const match = expenseAccounts.find(
        (a) =>
          a.name?.includes(kw) ||
          a.account_name?.includes(kw)
      );
      if (match) return match.name;
    }
  }

  // 3. مطابقة بالكلمات المفتاحية من اسم نوع المصروف
  const typeWords = expenseTypeName
    .replace(/مصاريف\s*/g, '')
    .replace(/و/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  for (const word of typeWords) {
    const match = expenseAccounts.find(
      (a) =>
        (a.name?.includes(word) || a.account_name?.includes(word)) &&
        isSuitableExpenseAccount(a.name || '', a.account_name)
    );
    if (match) return match.name;
  }

  // 4. استخدام حساب عام مفضل كـ fallback
  for (const gkw of GENERIC_EXPENSE_KEYWORDS) {
    const genericMatch = expenseAccounts.find(
      (a) =>
        (a.name?.includes(gkw) || a.account_name?.includes(gkw)) &&
        isSuitableExpenseAccount(a.name || '', a.account_name)
    );
    if (genericMatch) return genericMatch.name;
  }

  // 5. أول حساب مصاريف مناسب كـ fallback أخير
  const suitable = expenseAccounts.find(a => isSuitableExpenseAccount(a.name || '', a.account_name));
  if (suitable) return suitable.name;

  // 6. لا يوجد حساب مناسب — إرجاع null بدلاً من حساب غير مناسب
  return null;
}

/**
 * GET — فحص حالة الحسابات الافتراضية لأنواع المصروفات
 */
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);

    const url = new URL(request.url);
    const company = url.searchParams.get('company') || undefined;

    // جلب أنواع المصروفات
    let expenseTypes: Array<Record<string, unknown>> = [];
    try {
      expenseTypes = (await getList('Expense Claim Type', {
        fields: ['name', 'expense_type'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;

      // جلب الحسابات الافتراضية لكل نوع عبر getDoc
      for (const type of expenseTypes) {
        try {
          const fullDoc = (await getDoc('Expense Claim Type', String(type.name), userSession)) as Record<string, unknown>;
          const defaultAcct = getDefaultAccountFromExpenseType(fullDoc, company);
          type.default_account = defaultAcct;
        } catch {
          type.default_account = null;
        }
      }
    } catch {
      return NextResponse.json({
        success: false,
        error: 'أنواع مطالبات المصروفات غير متوفرة — تأكد من تثبيت وحدة HRMS',
      }, { status: 500 });
    }

    // جلب حسابات المصاريف من شجرة الحسابات
    let expenseAccounts: Array<{ name: string; account_name?: string; parent_account?: string }> = [];
    try {
      const filters: string[][] = [['root_type', '=', 'Expense'], ['is_group', '=', '0']];
      if (company) {
        filters.push(['company', '=', company]);
      }
      expenseAccounts = (await getList('Account', {
        fields: ['name', 'account_name', 'parent_account'],
        filters,
        limit: 500,
      }, userSession)) as Array<{ name: string; account_name?: string; parent_account?: string }>;
    } catch {
      // لا توجد حسابات مصاريف
    }

    const typesWithoutAccount = expenseTypes.filter((t) => !t.default_account);
    const typesWithAccount = expenseTypes.filter((t) => !!t.default_account);

    // تحديد الأنواع المفقودة من القائمة الافتراضية
    const existingNames = new Set(expenseTypes.map(t => String(t.name)));
    const missingDefaultTypes = DEFAULT_EXPENSE_CLAIM_TYPES.filter(
      t => !existingNames.has(t.name)
    );

    return NextResponse.json({
      success: true,
      totalTypes: expenseTypes.length,
      typesWithAccount: typesWithAccount.length,
      typesWithoutAccount: typesWithoutAccount.length,
      expenseAccountsAvailable: expenseAccounts.length,
      typesNeedingAccount: typesWithoutAccount.map((t) => t.name),
      missingDefaultTypes: missingDefaultTypes.map(t => ({ name: t.name, englishName: t.englishName })),
      defaults: DEFAULT_EXPENSE_CLAIM_TYPES,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل فحص حسابات المصروفات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST — تعيين الحسابات الافتراضية تلقائياً لأنواع المصروفات بدون حساب
 * وإنشاء الأنواع المفقودة من القائمة الافتراضية
 */
export async function POST(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json().catch(() => ({})) as {
      company?: string;
      createMissing?: boolean;
      selectedTypes?: string[];
    };

    const company = body.company as string | undefined;
    const createMissing = body.createMissing !== false;
    const selectedTypes = body.selectedTypes as string[] | undefined;

    // نحتاج اسم الشركة لربط الحسابات في الجدول الفرعي
    let companyToUse = company || '';
    if (!companyToUse) {
      try {
        const companies = (await getList('Company', {
          fields: ['name'],
          limit: 1,
        }, userSession)) as Array<Record<string, unknown>>;
        if (companies.length > 0) companyToUse = String(companies[0]!.name);
      } catch { /* تجاهل */ }
    }

    // 1. جلب أنواع المصروفات الحالية مع الحسابات
    let expenseTypes: Array<Record<string, unknown>> = [];
    try {
      expenseTypes = (await getList('Expense Claim Type', {
        fields: ['name', 'expense_type'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;

      // جلب الحسابات الافتراضية لكل نوع
      for (const type of expenseTypes) {
        try {
          const fullDoc = (await getDoc('Expense Claim Type', String(type.name), userSession)) as Record<string, unknown>;
          const defaultAcct = getDefaultAccountFromExpenseType(fullDoc, companyToUse);
          type.default_account = defaultAcct;
        } catch {
          type.default_account = null;
        }
      }
    } catch {
      return NextResponse.json({
        success: false,
        error: 'أنواع مطالبات المصروفات غير متوفرة — تأكد من تثبيت وحدة HRMS',
      }, { status: 500 });
    }

    const existingNames = new Set(expenseTypes.map(t => String(t.name)));
    const typesNeedingAccount = expenseTypes.filter((t) => !t.default_account);

    // 2. جلب حسابات المصاريف
    let expenseAccounts: Array<{ name: string; account_name?: string; parent_account?: string }> = [];
    try {
      const filters: string[][] = [['root_type', '=', 'Expense'], ['is_group', '=', '0']];
      if (companyToUse) {
        filters.push(['company', '=', companyToUse]);
      }
      expenseAccounts = (await getList('Account', {
        fields: ['name', 'account_name', 'parent_account'],
        filters,
        limit: 500,
      }, userSession)) as Array<{ name: string; account_name?: string; parent_account?: string }>;
    } catch {
      // لا توجد حسابات
    }

    if (expenseAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'لا توجد حسابات مصاريف في شجرة الحسابات. يجب إنشاء حسابات مصاريف أولاً قبل تعيينها لأنواع المصروفات.',
        updated: 0,
        created: 0,
        skipped: 0,
        failed: 0,
      }, { status: 400 });
    }

    // 3. تعيين الحسابات المناسبة للأنواع الموجودة بدون حساب
    // ✅ عبر الجدول الفرعي accounts (وليس default_account المباشر)
    let updated = 0;
    let created = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{ type: string; action: string; account: string | null; status: string }> = [];

    for (const typeDoc of typesNeedingAccount) {
      const typeName = String(typeDoc.name);
      const matchedAccount = findMatchingAccount(typeName, expenseAccounts);

      if (!matchedAccount) {
        skipped++;
        results.push({ type: typeName, action: 'update', account: null, status: 'no_match' });
        continue;
      }

      try {
        // ✅ جلب المستند الكامل أولاً للحفاظ على الحقول الإلزامية والجدول الفرعي
        let fullDoc: Record<string, unknown> = {};
        try {
          fullDoc = (await getDoc('Expense Claim Type', typeName, userSession)) as Record<string, unknown>;
        } catch { /* تجاهل */ }

        // دمج حسابات موجودة مع الحساب الجديد
        const existingAccounts = Array.isArray(fullDoc.accounts) ? [...fullDoc.accounts] : [];
        const existingCompanyIdx = existingAccounts.findIndex(
          (a: Record<string, unknown>) => a.company === companyToUse
        );
        const newAccountRow = { company: companyToUse, default_account: matchedAccount };
        if (existingCompanyIdx >= 0) {
          existingAccounts[existingCompanyIdx] = newAccountRow;
        } else {
          existingAccounts.push(newAccountRow);
        }

        // ✅ تحديث عبر الجدول الفرعي accounts مع تضمين expense_type
        await updateDoc('Expense Claim Type', typeName, {
          expense_type: typeName,  // ← حقل إلزامي مطلوب في التحديث
          accounts: existingAccounts,
        }, userSession);
        updated++;
        results.push({ type: typeName, action: 'update', account: matchedAccount, status: 'updated' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error(`[ConfigureExpenseAccounts] Failed to update "${typeName}":`, msg);
        failed++;
        results.push({ type: typeName, action: 'update', account: matchedAccount, status: 'failed' });
      }
    }

    // 4. إنشاء الأنواع المفقودة من القائمة الافتراضية
    // ✅ باستخدام `expense_type` كحقل التسمية و `accounts` كجدول فرعي
    if (createMissing) {
      const missingTypes = selectedTypes
        ? DEFAULT_EXPENSE_CLAIM_TYPES.filter(t => selectedTypes.includes(t.name) && !existingNames.has(t.name))
        : DEFAULT_EXPENSE_CLAIM_TYPES.filter(t => !existingNames.has(t.name));

      for (const defaultType of missingTypes) {
        const matchedAccount = findMatchingAccount(defaultType.name, expenseAccounts);

        try {
          const docData: Record<string, unknown> = {
            // ✅ استخدام `expense_type` كحقل التسمية
            expense_type: defaultType.name,
          };

          // ✅ إضافة الحساب الافتراضي عبر الجدول الفرعي accounts
          if (matchedAccount && companyToUse) {
            docData.accounts = [{
              company: companyToUse,
              default_account: matchedAccount,
              doctype: 'Expense Claim Account',  // ← نوع الجدول الفرعي مطلوب
            }];
          }

          await createDoc('Expense Claim Type', docData, userSession);
          created++;
          results.push({ type: defaultType.name, action: 'create', account: matchedAccount, status: 'created' });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
          console.error(`[ConfigureExpenseAccounts] Failed to create "${defaultType.name}":`, msg);
          failed++;
          results.push({ type: defaultType.name, action: 'create', account: matchedAccount, status: 'failed' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم تعيين الحسابات الافتراضية لـ ${updated} نوع مصروف${created > 0 ? `، إنشاء ${created} نوع جديد` : ''}${skipped > 0 ? `، تم تخطي ${skipped} نوع` : ''}${failed > 0 ? `، فشل ${failed} نوع` : ''}`,
      updated,
      created,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تعيين الحسابات الافتراضية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
