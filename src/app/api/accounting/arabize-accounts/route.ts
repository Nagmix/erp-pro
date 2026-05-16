import { NextRequest, NextResponse } from 'next/server';
import { getList, updateDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

// Prevent static analysis during build
export const dynamic = 'force-dynamic';

const ACCOUNT_NAME_MAP: Record<string, string> = {
  'Application of Funds': 'تطبيق الأموال',
  'Sources of Funds': 'مصادر الأموال',
  'Current Assets': 'أصول متداولة',
  'Cash and Cash Equivalents': 'النقدية وما يعادلها',
  'Bank Accounts': 'الحسابات البنكية',
  'Cash': 'النقدية',
  'Accounts Receivable': 'العملاء',
  'Stock Assets': 'أصول المخزون',
  'Stock In Hand': 'المخزون المتاح',
  'Tax Assets': 'أصول ضريبية',
  'Fixed Assets': 'أصول ثابتة',
  'Capital Equipment': 'المعدات الرأسمالية',
  'Computers': 'أجهزة الحاسوب',
  'Furniture and Fixture': 'الأثاث والتجهيزات',
  'Office Equipment': 'معدات مكتبية',
  'Plant and Machinery': 'المصانع والآلات',
  'Accumulated Depreciation': 'الإهلاك المتراكم',
  'Accumulated Depreciation - Fixed Assets': 'الإهلاك المتراكم - أصول ثابتة',
  'Investments': 'الاستثمارات',
  'Temporary Accounts': 'حسابات مؤقتة',
  'Current Liabilities': 'التزامات متداولة',
  'Accounts Payable': 'الموردون',
  'Stock Liabilities': 'التزامات المخزون',
  'Tax Liabilities': 'التزامات ضريبية',
  'Duties and Taxes': 'الرسوم والضرائب',
  'Long Term Liabilities': 'التزامات طويلة الأجل',
  'Secured Loans': 'قروض مضمونة',
  'Unsecured Loans': 'قروض غير مضمونة',
  'Equity': 'حقوق الملكية',
  'Share Capital': 'رأس المال',
  'Reserves and Surplus': 'الاحتياطيات والفوائض',
  'Retained Earnings': 'الأرباح المحتجزة',
  'Accumulated Profit / Loss': 'الأرباح / الخسائر المتراكمة',
  'Opening Balance Equity': 'رصيد افتتاحي حقوق الملكية',
  'Direct Income': 'إيرادات مباشرة',
  'Sales': 'المبيعات',
  'Service': 'الخدمات',
  'Indirect Income': 'إيرادات غير مباشرة',
  'Indirect Expenses': 'مصروفات غير مباشرة',
  'Direct Expenses': 'مصروفات مباشرة',
  'Cost of Goods Sold': 'تكلفة البضاعة المباعة',
  'Purchase': 'المشتريات',
  'Inventory Write Off': 'شطب المخزون',
  'Exchange Gain / Loss': 'أرباح / خسائر سعر الصرف',
  'Profit / Loss': 'الأرباح / الخسائر',
  'Miscellaneous Expenses': 'مصروفات متنوعة',
  'Round Off': 'تقريب',
  'Closing Stock': 'المخزون الختامي',
  'Opening Stock': 'المخزون الافتتاحي',
  'Stock Adjustment': 'تسوية المخزون',
  'Commission': 'العمولات',
  'Bank': 'البنك',
  'Creditors': 'الدائنون',
  'Debtors': 'المدينون',
  'Loans and Advances': 'القروض والسلف',
  'Salary': 'الرواتب',
  'Travel': 'السفر',
  'Telecommunications': 'الاتصالات',
  'Marketing': 'التسويق',
  'Advertising': 'الإعلانات',
  'Entertainment': 'الترفيه',
  'Office Rent': 'إيجار المكتب',
  'Electricity': 'الكهرباء',
  'Printing and Stationery': 'الطباعة والقرطاسية',
  'Courier': 'البريد السريع',
  'Freight and Forwarding': 'الشحن والنقل',
  'Insurance': 'التأمين',
  'Legal Expenses': 'المصروفات القانونية',
  'Maintenance': 'الصيانة',
  'Depreciation': 'الإهلاك',
  'Audit Fees': 'رسوم المراجعة',
  'Bank Charges': 'مصاريف بنكية',
  'Penalty': 'الغرامات',
  'Write Off': 'شطب',
  'Provision': 'مخصص',
  'Discount': 'الخصم',
  'Cash Discount': 'خصم نقدي',
  'Trade Discount': 'خصم تجاري',
  'Unrealized Profit / Loss': 'أرباح / خسائر غير محققة',
  'Consultancy': 'الاستشارات',
  'Web Hosting': 'استضافة المواقع',
  'Software': 'البرمجيات',
  'Subscription': 'الاشتراكات',
  'Training': 'التدريب',
  'Charity': 'التبرعات',
  'Gift': 'الهدايا',
  'Customer': 'العميل',
  'Supplier': 'المورد',
  'Employee': 'الموظف',
};

/**
 * إزالة لاحقة الشركة من اسم الحساب
 * ERPNext يضيف لاحقة الشركة تلقائياً (مثل " - EP") لاسم الحساب
 * يجب إزالتها قبل المطابقة مع خريطة التعريب
 * ويجب عدم إضافتها يدوياً عند التعيين لأن ERPNext يضيفها تلقائياً
 */
function stripCompanySuffix(accountName: string, companyAbbr: string): string {
  if (!companyAbbr) return accountName;
  // إزالة " - COMPANY_ABBR" من نهاية اسم الحساب
  const suffix = ` - ${companyAbbr}`;
  if (accountName.endsWith(suffix)) {
    return accountName.slice(0, -suffix.length);
  }
  return accountName;
}

/**
 * التحقق مما إذا كان اسم الحساب باللغة الإنجليزية (يحتاج تعريب)
 */
function isEnglishName(name: string): boolean {
  // إذا كان الاسم يحتوي على أحرف لاتينية فقط (بدون عربي)
  return /^[A-Za-z\s\-\/\(\)\d.,&]+$/.test(name);
}

// GET /api/accounting/arabize-accounts — قائمة الحسابات التي لازالت بأسماء إنجليزية
export async function GET(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    
    // جلب اختصار الشركة
    let companyAbbr = '';
    try {
      const companies = await getList('Company', {
        fields: ['name', 'abbr'],
        limit: 10,
      }, sid) as { name: string; abbr: string }[];
      if (companies.length > 0) {
        companyAbbr = companies[0]!.abbr;
      }
    } catch {
      // تجاهل — قد لا يكون الاختصار متوفراً
    }

    const accounts = await getList('Account', {
      fields: ['name', 'account_name', 'company'],
      limit: 5000,
    }, sid) as { name: string; account_name: string; company: string }[];

    // مطابقة الحسابات الإنجليزية بعد إزالة لاحقة الشركة
    const toRename = accounts.filter((account) => {
      const baseName = stripCompanySuffix(account.account_name, companyAbbr);
      return baseName in ACCOUNT_NAME_MAP && isEnglishName(baseName);
    });

    return NextResponse.json({
      success: true,
      companyAbbr,
      count: toRename.length,
      total: accounts.length,
      data: toRename.map((account) => {
        const baseName = stripCompanySuffix(account.account_name, companyAbbr);
        return {
          name: account.name,
          account_name: account.account_name,
          base_name: baseName,
          arabic_name: ACCOUNT_NAME_MAP[baseName],
          company: account.company,
        };
      }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تحميل الحسابات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/accounting/arabize-accounts — تعريب أسماء الحسابات الإنجليزية دفعة واحدة
export async function POST(request: NextRequest) {
  try {
    const sid = getFrappeSidFromRequest(request);
    
    // جلب اختصار الشركة
    let companyAbbr = '';
    try {
      const companies = await getList('Company', {
        fields: ['name', 'abbr'],
        limit: 10,
      }, sid) as { name: string; abbr: string }[];
      if (companies.length > 0) {
        companyAbbr = companies[0]!.abbr;
      }
    } catch {
      // تجاهل
    }

    const accounts = await getList('Account', {
      fields: ['name', 'account_name', 'company'],
      limit: 5000,
    }, sid) as { name: string; account_name: string; company: string }[];

    // مطابقة الحسابات الإنجليزية بعد إزالة لاحقة الشركة
    const toRename = accounts.filter((account) => {
      const baseName = stripCompanySuffix(account.account_name, companyAbbr);
      return baseName in ACCOUNT_NAME_MAP && isEnglishName(baseName);
    });

    let renamedCount = 0;
    let skippedCount = 0;
    const errors: { name: string; error: string }[] = [];

    for (const account of toRename) {
      const baseName = stripCompanySuffix(account.account_name, companyAbbr);
      const arabicName = ACCOUNT_NAME_MAP[baseName];
      if (!arabicName) {
        skippedCount++;
        continue;
      }
      try {
        // تعيين الاسم العربي بدون لاحقة الشركة — ERPNext يضيفها تلقائياً
        await updateDoc('Account', account.name, {
          account_name: arabicName,
        }, sid);
        renamedCount++;
      } catch (err) {
        errors.push({
          name: account.name,
          error: err instanceof Error ? err.message : 'فشل التحديث',
        });
      }
    }

    return NextResponse.json({
      success: true,
      renamed: renamedCount,
      total: toRename.length,
      skipped: skippedCount,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'فشل تعريب الحسابات';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
