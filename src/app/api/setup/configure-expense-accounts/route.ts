// ============================================================
// POST /api/setup/configure-expense-accounts
// يُعين الحسابات الافتراضية تلقائياً لأنواع مطالبات المصروفات
// التي لا تحتوي على حساب افتراضي (default_account)
//
// عند إنشاء Expense Claim في ERPNext HRMS، يتحقق النظام من وجود
// حساب افتراضي لكل نوع مصروف. بدون هذا الحساب، يفشل الحفظ
// بخطأ ValidationError: "Set the default account for the Expense Claim Type"
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getList, updateDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export const dynamic = 'force-dynamic';

/**
 * خريطة ربط أنواع المصروفات بأسماء حسابات مصاريف مناسبة
 * يتم مطابقة الكلمات المفتاحية في اسم نوع المصروف مع اسم الحساب
 */
const EXPENSE_TYPE_ACCOUNT_KEYWORDS: Record<string, string[]> = {
  'مصاريف إدارية': ['إدارية', 'إدارة', 'عام', 'General', 'Administrative', 'Admin'],
  'مصاريف سفر وتنقل': ['سفر', 'تنقل', 'Travel', 'Transport'],
  'مصاريف ضيافة': ['ضيافة', 'استقبال', 'ضيوف', 'Hospitality', 'Entertainment', 'Guest'],
  'مصاريف صيانة': ['صيانة', 'إصلاح', 'Maintenance', 'Repair'],
  'مصاريف نقل وشحن': ['نقل', 'شحن', 'توصيل', 'Shipping', 'Freight', 'Delivery'],
  'مصاريف اتصالات': ['اتصالات', 'هاتف', 'إنترنت', 'internet', 'Telecommunication', 'Phone'],
  'مصاريف قرطاسية ومستلزمات': ['قرطاسية', 'مستلزمات', 'لوازم', 'Stationery', 'Supplies', 'Office Supplies'],
  'مصاريف وقود': ['وقود', 'بنزين', 'ديزل', 'Fuel', 'Gasoline', 'Petrol'],
  'مصاريف إيجار': ['إيجار', 'أجار', 'Rent', 'Lease'],
  'مصاريف كهرباء وماء': ['كهرباء', 'ماء', 'مرافق', 'Electricity', 'Water', 'Utility', 'Utilities'],
  'مصاريف تسويق وإعلان': ['تسويق', 'إعلان', 'دعاية', 'Marketing', 'Advertising', 'Promotion'],
  'مصاريف تدريب وتطوير': ['تدريب', 'تطوير', 'تعليم', 'Training', 'Development'],
  'مصاريف طبية وتأمين': ['طبية', 'تأمين', 'صحة', 'Medical', 'Insurance', 'Health'],
  'مصاريف مهنية وخدمية': ['مهنية', 'خدمية', 'خدمات', 'Professional', 'Service', 'Consulting'],
  'مصاريف متنوعة': ['متنوعة', 'أخرى', 'Miscellaneous', 'Other', 'Sundry'],
};

/**
 * إيجاد حساب مصاريف مناسب لنوع المصروف من شجرة الحسابات
 */
function findMatchingAccount(
  expenseTypeName: string,
  expenseAccounts: Array<{ name: string; account_name?: string; parent_account?: string }>
): string | null {
  // 1. مطابقة مباشرة مع الكلمات المفتاحية
  const keywords = EXPENSE_TYPE_ACCOUNT_KEYWORDS[expenseTypeName];
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

  // 2. مطابقة بالكلمات المفتاحية من اسم نوع المصروف
  const typeWords = expenseTypeName
    .replace(/مصاريف\s*/g, '')
    .replace(/و/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  for (const word of typeWords) {
    const match = expenseAccounts.find(
      (a) =>
        a.name?.includes(word) ||
        a.account_name?.includes(word)
    );
    if (match) return match.name;
  }

  // 3. إرجاع أول حساب مصاريف متوفر كـ fallback
  return expenseAccounts.length > 0 ? expenseAccounts[0]!.name : null;
}

/**
 * GET — فحص حالة الحسابات الافتراضية لأنواع المصروفات
 */
export async function GET(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);

    // جلب أنواع المصروفات مع حساباتها الافتراضية
    let expenseTypes: Array<Record<string, unknown>> = [];
    try {
      expenseTypes = (await getList('Expense Claim Type', {
        fields: ['name', 'default_account'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'أنواع مطالبات المصروفات غير متوفرة — تأكد من تثبيت وحدة HRMS',
      }, { status: 500 });
    }

    // جلب حسابات المصاريف من شجرة الحسابات
    let expenseAccounts: Array<{ name: string; account_name?: string; parent_account?: string }> = [];
    try {
      expenseAccounts = (await getList('Account', {
        fields: ['name', 'account_name', 'parent_account'],
        filters: [['root_type', '=', 'Expense'], ['is_group', '=', '0']],
        limit: 500,
      }, userSession)) as Array<{ name: string; account_name?: string; parent_account?: string }>;
    } catch {
      // لا توجد حسابات مصاريف
    }

    const typesWithoutAccount = expenseTypes.filter((t) => !t.default_account);
    const typesWithAccount = expenseTypes.filter((t) => !!t.default_account);

    return NextResponse.json({
      success: true,
      totalTypes: expenseTypes.length,
      typesWithAccount: typesWithAccount.length,
      typesWithoutAccount: typesWithoutAccount.length,
      expenseAccountsAvailable: expenseAccounts.length,
      typesNeedingAccount: typesWithoutAccount.map((t) => t.name),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل فحص حسابات المصروفات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST — تعيين الحسابات الافتراضية تلقائياً لأنواع المصروفات بدون حساب
 */
export async function POST(request: NextRequest) {
  try {
    const userSession = getFrappeSidFromRequest(request);
    const body = await request.json().catch(() => ({}));

    // يمكن تمرير company محددة أو استخدام الافتراضية
    const company = body.company as string | undefined;

    // 1. جلب أنواع المصروفات
    let expenseTypes: Array<Record<string, unknown>> = [];
    try {
      expenseTypes = (await getList('Expense Claim Type', {
        fields: ['name', 'default_account'],
        limit: 200,
      }, userSession)) as Array<Record<string, unknown>>;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'أنواع مطالبات المصروفات غير متوفرة — تأكد من تثبيت وحدة HRMS',
      }, { status: 500 });
    }

    const typesNeedingAccount = expenseTypes.filter((t) => !t.default_account);

    if (typesNeedingAccount.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'جميع أنواع المصروفات لديها حسابات افتراضية بالفعل',
        updated: 0,
        skipped: 0,
        failed: 0,
      });
    }

    // 2. جلب حسابات المصاريف
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
      // لا توجد حسابات
    }

    if (expenseAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'لا توجد حسابات مصاريف في شجرة الحسابات. يجب إنشاء حسابات مصاريف أولاً قبل تعيينها لأنواع المصروفات.',
        updated: 0,
        skipped: typesNeedingAccount.length,
        failed: 0,
      }, { status: 400 });
    }

    // 3. تعيين الحسابات المناسبة
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{ type: string; account: string | null; status: string }> = [];

    for (const typeDoc of typesNeedingAccount) {
      const typeName = String(typeDoc.name);
      const matchedAccount = findMatchingAccount(typeName, expenseAccounts);

      if (!matchedAccount) {
        // لم يتم العثور على حساب مناسب
        skipped++;
        results.push({ type: typeName, account: null, status: 'no_match' });
        continue;
      }

      try {
        await updateDoc('Expense Claim Type', typeName, {
          default_account: matchedAccount,
        }, userSession);
        updated++;
        results.push({ type: typeName, account: matchedAccount, status: 'updated' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
        console.error(`[ConfigureExpenseAccounts] Failed to update "${typeName}":`, msg);
        failed++;
        results.push({ type: typeName, account: matchedAccount, status: 'failed' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم تعيين الحسابات الافتراضية لـ ${updated} نوع مصروف${skipped > 0 ? `، تم تخطي ${skipped} نوع` : ''}${failed > 0 ? `، فشل ${failed} نوع` : ''}`,
      updated,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تعيين الحسابات الافتراضية';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
