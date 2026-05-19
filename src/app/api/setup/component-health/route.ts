// ============================================================
// GET /api/setup/component-health
// فحص صحة مكونات النظام بعد الإعداد
//
// يفحص:
//   - هل ERPNext يمكن الوصول إليه (ping)
//   - هل HRMS مثبت وإعداده مكتمل
//   - هل شجرة الحسابات موجودة والإعدادات الافتراضية للشركة مضبوطة
//   - هل السنة المالية موجودة
//
// يُرجع تقريراً شاملاً مع إجراءات مقترحة
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getList, isBackendAvailable, detectErpnextVersion, getCount, callMethod } from '@/lib/server/backend';
import { getDoc } from '@/lib/server/backend';
import { getFrappeSidFromRequest } from '@/lib/server/request-session';

export const dynamic = 'force-dynamic';

/** واجهة حالة المكون */
interface ComponentStatus {
  healthy: boolean;
  components: {
    erpnext: {
      reachable: boolean;
      version?: string;
    };
    hrms: {
      installed: boolean;
      setupComplete: boolean;
      missingItems: string[];
    };
    accounts: {
      chartOfAccountsExists: boolean;
      companyDefaultsSet: boolean;
      missingDefaults: string[];
    };
    fiscalYear: {
      exists: boolean;
    };
  };
  warnings: string[];
  actions: Array<{
    id: string;
    label: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    route: string;
  }>;
}

/**
 * GET — فحص صحة مكونات النظام
 */
export async function GET(request: NextRequest) {
  const userSession = getFrappeSidFromRequest(request);

  const status: ComponentStatus = {
    healthy: true,
    components: {
      erpnext: { reachable: false },
      hrms: { installed: false, setupComplete: false, missingItems: [] },
      accounts: { chartOfAccountsExists: false, companyDefaultsSet: false, missingDefaults: [] },
      fiscalYear: { exists: false },
    },
    warnings: [],
    actions: [],
  };

  // ────────────────────────────────────────────────
  // 1. فحص الاتصال بـ ERPNext
  // ────────────────────────────────────────────────
  try {
    const available = await isBackendAvailable().catch(() => false);
    status.components.erpnext.reachable = available;

    if (available) {
      // محاولة جلب رقم الإصدار
      try {
        const version = await detectErpnextVersion();
        status.components.erpnext.version = version;
      } catch {
        // لا نوقف الفحص
      }
    } else {
      status.healthy = false;
      status.warnings.push('تعذر الاتصال بخادم ERPNext');
      status.actions.push({
        id: 'check_connection',
        label: 'فحص الاتصال',
        description: 'تعذر الاتصال بخادم ERPNext. تحقق من إعدادات الخادم الخلفي.',
        priority: 'high',
        route: '/settings/erp-backend',
      });
      // إذا لم يكن الخادم متاحاً، لا نستطيع إكمال الفحوصات
      return NextResponse.json(status);
    }
  } catch {
    status.healthy = false;
    status.components.erpnext.reachable = false;
    status.warnings.push('خطأ في فحص الاتصال بـ ERPNext');
    return NextResponse.json(status);
  }

  // ────────────────────────────────────────────────
  // 2. فحص HRMS
  // ────────────────────────────────────────────────
  try {
    // فحص وحدة HR
    let hrModuleExists = false;
    try {
      const hrModule = await getDoc('Module Def', 'HR', userSession) as Record<string, unknown>;
      hrModuleExists = !!hrModule?.name;
    } catch { /* غير موجود */ }

    // فحص DocType Expense Claim Type (يدل على HRMS مثبت ومُهجر)
    let expenseClaimTypeExists = false;
    try {
      await getList('Expense Claim Type', { fields: ['name'], limit: 1 }, userSession);
      expenseClaimTypeExists = true;
    } catch { /* غير موجود */ }

    const hrmsInstalled = hrModuleExists || expenseClaimTypeExists;
    status.components.hrms.installed = hrmsInstalled;

    if (hrmsInstalled) {
      // فحص تفصيلي لإعداد HRMS
      const missingItems: string[] = [];

      // فحص أنواع المصروفات — هل لديها حسابات افتراضية؟
      // ⚠️ Expense Claim Type يستخدم child table `accounts` وليس حقل `default_account` مباشر
      try {
        const expenseTypes = (await getList('Expense Claim Type', {
          fields: ['name', 'expense_type'],
          limit: 200,
        }, userSession)) as Array<Record<string, unknown>>;

        if (expenseTypes.length === 0) {
          missingItems.push('أنواع مطالبات المصروفات غير موجودة');
        } else {
          // جلب الحسابات الافتراضية لكل نوع عبر getDoc
          let withoutAccountCount = 0;
          for (const type of expenseTypes) {
            try {
              const fullDoc = (await getDoc('Expense Claim Type', String(type.name), userSession)) as Record<string, unknown>;
              const accounts = fullDoc.accounts;
              if (!Array.isArray(accounts) || accounts.length === 0 || !accounts.some((a: Record<string, unknown>) => a.default_account)) {
                withoutAccountCount++;
              }
            } catch {
              withoutAccountCount++;
            }
          }
          if (withoutAccountCount > 0) {
            missingItems.push(`${withoutAccountCount} نوع مصروف بدون حساب افتراضي`);
          }
        }
      } catch {
        missingItems.push('تعذر فحص أنواع المصروفات');
      }

      // فحص أنواع الإجازات
      try {
        const leaveTypeCount = await getCount('Leave Type', undefined, userSession).catch(() => 0);
        if (leaveTypeCount === 0) {
          missingItems.push('أنواع الإجازات غير موجودة');
        }
      } catch {
        missingItems.push('تعذر فحص أنواع الإجازات');
      }

      // فحص مكونات الرواتب
      try {
        const salaryComponentCount = await getCount('Salary Component', undefined, userSession).catch(() => 0);
        if (salaryComponentCount === 0) {
          missingItems.push('مكونات الرواتب غير موجودة');
        }
      } catch {
        missingItems.push('تعذر فحص مكونات الرواتب');
      }

      // فحص أنواع التوظيف
      try {
        const employmentTypeCount = await getCount('Employment Type', undefined, userSession).catch(() => 0);
        if (employmentTypeCount === 0) {
          missingItems.push('أنواع التوظيف غير موجودة');
        }
      } catch {
        missingItems.push('تعذر فحص أنواع التوظيف');
      }

      status.components.hrms.missingItems = missingItems;
      status.components.hrms.setupComplete = missingItems.length === 0;

      if (missingItems.length > 0) {
        status.healthy = false;
        status.actions.push({
          id: 'configure_hrms',
          label: 'إعداد الموارد البشرية',
          description: 'يحتاج النظام لإعداد أنواع المصروفات والإجازات والرواتب',
          priority: 'high',
          route: '/settings/hr-setup',
        });
      }
    } else {
      // HRMS غير مثبت
      status.healthy = false;
      status.components.hrms.missingItems = ['HRMS غير مثبت'];
      status.actions.push({
        id: 'install_hrms',
        label: 'تثبيت HRMS',
        description: 'يجب تثبيت تطبيق الموارد البشرية (HRMS) لتفعيل وحدة الموارد البشرية',
        priority: 'high',
        route: '/settings/module-settings/hr',
      });
    }
  } catch {
    status.warnings.push('تعذر فحص حالة HRMS');
  }

  // ────────────────────────────────────────────────
  // 3. فحص الحسابات والإعدادات الافتراضية
  // ────────────────────────────────────────────────
  try {
    // فحص شجرة الحسابات
    let accountCount = 0;
    try {
      accountCount = await getCount('Account', [['is_group', '=', '0']] as string[][], userSession).catch(() => 0);
    } catch { /* تجاهل */ }

    status.components.accounts.chartOfAccountsExists = accountCount > 0;

    if (accountCount === 0) {
      status.warnings.push('شجرة الحسابات فارغة أو غير موجودة');
    }

    // فحص إعدادات الشركة الافتراضية
    const missingDefaults: string[] = [];
    try {
      const companies = (await getList('Company', {
        fields: ['name'],
        limit: 5,
      }, userSession)) as Array<Record<string, unknown>>;

      if (companies.length === 0) {
        missingDefaults.push('لا توجد شركة');
      } else {
        // فحص إعدادات الشركة الأولى
        const companyName = String(companies[0]!.name);
        const companyDoc = (await getDoc('Company', companyName, userSession)) as Record<string, unknown>;

        const hrDefaultFields = [
          'default_expense_claim_payable_account',
          'default_employee_advance_account',
          'default_payroll_payable_account',
        ];

        const accountDefaultFields = [
          'default_receivable_account',
          'default_payable_account',
          'default_expense_account',
          'default_income_account',
        ];

        // فحص حقول الموارد البشرية (فقط إذا HRMS مثبت)
        if (status.components.hrms.installed) {
          for (const field of hrDefaultFields) {
            if (!companyDoc[field]) {
              missingDefaults.push(field.replace(/_/g, ' '));
            }
          }
        }

        // فحص الحقول المحاسبية الأساسية
        for (const field of accountDefaultFields) {
          if (!companyDoc[field]) {
            missingDefaults.push(field.replace(/_/g, ' '));
          }
        }

        // فحص shجرة الحسابات للشركة
        if (companyDoc.chart_of_accounts) {
          status.components.accounts.chartOfAccountsExists = true;
        }
      }
    } catch {
      missingDefaults.push('تعذر فحص إعدادات الشركة');
    }

    status.components.accounts.missingDefaults = missingDefaults;
    status.components.accounts.companyDefaultsSet = missingDefaults.length === 0;

    if (missingDefaults.length > 0) {
      // لا نعتبر النظام غير صحي بسبب إعدادات الشركة فقط، لكن نضيف تحذير
      status.warnings.push(`إعدادات الشركة ناقصة: ${missingDefaults.join(', ')}`);

      if (status.components.hrms.installed && missingDefaults.some(d =>
        d.includes('expense_claim') || d.includes('employee_advance') || d.includes('payroll')
      )) {
        status.actions.push({
          id: 'configure_hrms',
          label: 'إعداد الموارد البشرية',
          description: 'يحتاج النظام لإعداد حسابات الموارد البشرية الافتراضية',
          priority: 'medium',
          route: '/settings/hr-setup',
        });
      }

      status.actions.push({
        id: 'setup_accounts',
        label: 'إعداد الحسابات',
        description: 'بعض الحسابات الافتراضية للشركة غير معينة',
        priority: 'medium',
        route: '/settings/module-settings/accounts',
      });
    }
  } catch {
    status.warnings.push('تعذر فحص الحسابات');
  }

  // ────────────────────────────────────────────────
  // 4. فحص السنة المالية
  // ────────────────────────────────────────────────
  try {
    const fiscalYearCount = await getCount('Fiscal Year', [['disabled', '=', '0']] as string[][], userSession).catch(() => 0);
    status.components.fiscalYear.exists = fiscalYearCount > 0;

    if (fiscalYearCount === 0) {
      status.healthy = false;
      status.warnings.push('لا توجد سنة مالية مفعّلة');
      status.actions.push({
        id: 'setup_fiscal_year',
        label: 'إنشاء سنة مالية',
        description: 'يجب إنشاء سنة مالية لتفعيل العمليات المحاسبية',
        priority: 'high',
        route: '/accounting/fiscal-year',
      });
    }
  } catch {
    status.warnings.push('تعذر فحص السنة المالية');
  }

  return NextResponse.json(status);
}
