export type ReportDef = {
  id: string;
  title: string;
  category: string;
  /** مطابق لحقل `name` / `report_name` في مستند Report في ERPNext (يُمرَّر إلى `frappe.desk.query_report.run`). */
  reportName: string;
  allowedRoles: string[];
  defaultFilters?: Record<string, unknown>;
  /**
   * عند التعيين: يُستَعلَم من ERPNext عن تقرير فعلي لـ `ref_doctype` (جدول Report) ويُختار الاسم تلقائياً
   * إذا اختلف اسم التقرير بين مواقع التثبيت — دون تعديل يدوي من المستخدم.
   */
  resolveByRefDoctype?: string;
};

/**
 * مصدر أسماء التقارير: مسارات التقارير القياسية في frappe/erpnext (Accounts، Stock، …) و frappe/hrms (HR، Payroll).
 * عند إضافة تقرير: انسخ الاسم حرفياً من قائمة Report في النظام أو من ملف JSON الخاص بالتقرير في المصدر.
 */
export const REPORTS_CATALOG: ReportDef[] = [
  { id: 'balance-sheet', title: 'الميزانية العمومية', category: 'financial', reportName: 'Balance Sheet', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'income-statement', title: 'قائمة الدخل', category: 'financial', reportName: 'Profit and Loss Statement', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'cash-flow', title: 'التدفقات النقدية', category: 'financial', reportName: 'Cash Flow', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'trial-balance', title: 'ميزان المراجعة', category: 'financial', reportName: 'Trial Balance', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'general-ledger', title: 'دفتر الأستاذ العام', category: 'financial', reportName: 'General Ledger', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'accounts-receivable', title: 'الأستاذ المساعد (ذمم العملاء)', category: 'financial', reportName: 'Accounts Receivable', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'accounts-payable', title: 'الأستاذ المساعد (ذمم الموردين)', category: 'financial', reportName: 'Accounts Payable', allowedRoles: ['Accounts', 'Purchase', 'System Manager'] },
  { id: 'sales-register', title: 'تقارير الضرائب (سجل المبيعات)', category: 'financial', reportName: 'Sales Register', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'item-wise-sales-register', title: 'تصريح ضريبي (تحليلي)', category: 'financial', reportName: 'Item-wise Sales Register', allowedRoles: ['Accounts', 'System Manager'] },

  { id: 'sales-by-customer', title: 'مبيعات حسب العميل', category: 'sales', reportName: 'Sales Analytics', allowedRoles: ['Sales', 'System Manager'] },
  { id: 'sales-by-product', title: 'مبيعات حسب المنتج', category: 'sales', reportName: 'Sales Analytics', allowedRoles: ['Sales', 'System Manager'] },
  { id: 'sales-by-rep', title: 'مبيعات حسب المندوب', category: 'sales', reportName: 'Sales Person-wise Transaction Summary', allowedRoles: ['Sales', 'System Manager'] },
  { id: 'sales-profit', title: 'أرباح المبيعات', category: 'sales', reportName: 'Gross Profit', allowedRoles: ['Sales', 'System Manager'] },
  { id: 'sales-invoice-status', title: 'فواتير حسب الحالة', category: 'sales', reportName: 'Accounts Receivable', allowedRoles: ['Sales', 'Accounts', 'System Manager'] },
  { id: 'payment-splits', title: 'مدفوعات مقسمة بالفترة', category: 'sales', reportName: 'Payment Ledger', allowedRoles: ['Accounts', 'System Manager'] },
  { id: 'overdue-invoices', title: 'الفواتير المستحقة', category: 'sales', reportName: 'Accounts Receivable', allowedRoles: ['Sales', 'Accounts', 'System Manager'] },
  { id: 'pos-transactions', title: 'تقارير نقاط البيع', category: 'sales', reportName: 'POS Register', allowedRoles: ['Sales', 'System Manager'] },

  { id: 'purchases-by-supplier', title: 'مشتريات حسب المورد', category: 'purchase', reportName: 'Purchase Analytics', allowedRoles: ['Purchase', 'System Manager'] },
  { id: 'purchases-by-product', title: 'مشتريات حسب المنتج', category: 'purchase', reportName: 'Purchase Analytics', allowedRoles: ['Purchase', 'System Manager'] },
  { id: 'purchase-payments-period', title: 'مدفوعات حسب الفترة', category: 'purchase', reportName: 'Payment Ledger', allowedRoles: ['Purchase', 'Accounts', 'System Manager'] },
  { id: 'purchase-followup', title: 'متابعة المشتريات', category: 'purchase', reportName: 'Purchase Order Analysis', allowedRoles: ['Purchase', 'System Manager'] },
  { id: 'purchase-register', title: 'سجل المشتريات', category: 'purchase', reportName: 'Purchase Register', allowedRoles: ['Purchase', 'Accounts', 'System Manager'] },

  { id: 'stock-balance', title: 'كمية وقيمة المخزون', category: 'inventory', reportName: 'Stock Balance', allowedRoles: ['Stock', 'System Manager'] },
  { id: 'stock-ledger', title: 'حركة المخزون', category: 'inventory', reportName: 'Stock Ledger', allowedRoles: ['Stock', 'System Manager'] },
  { id: 'low-stock', title: 'المنتجات منخفضة المخزون', category: 'inventory', reportName: 'Item Shortage Report', allowedRoles: ['Stock', 'System Manager'] },
  { id: 'stock-reconciliation', title: 'مقارنة المخزون والحسابات', category: 'inventory', reportName: 'Stock and Account Value Comparison', allowedRoles: ['Stock', 'System Manager'] },
  { id: 'work-order-summary', title: 'تقارير التصنيع', category: 'inventory', reportName: 'Work Order Summary', allowedRoles: ['Manufacturing', 'System Manager'] },

  { id: 'hr-attendance', title: 'تقارير الحضور والانصراف', category: 'hr', reportName: 'Monthly Attendance Sheet', allowedRoles: ['HR', 'System Manager'] },
  { id: 'hr-attendance-summary', title: 'ملخص الحضور (ورديات)', category: 'hr', reportName: 'Shift Attendance', allowedRoles: ['HR', 'System Manager'] },
  { id: 'hr-salary-register', title: 'تقارير المرتبات', category: 'hr', reportName: 'Salary Register', allowedRoles: ['HR', 'System Manager'] },
  { id: 'hr-leave-balance', title: 'تقارير الإجازات', category: 'hr', reportName: 'Employee Leave Balance', allowedRoles: ['HR', 'System Manager'] },
  { id: 'hr-employee-info', title: 'تقارير الموظفين', category: 'hr', reportName: 'Employee Information', allowedRoles: ['HR', 'System Manager'] },
  { id: 'hr-employee-analytics', title: 'تحليل الموظفين (توزيع)', category: 'hr', reportName: 'Employee Analytics', allowedRoles: ['HR', 'System Manager'] },

  { id: 'crm-customer-statement', title: 'كشف حساب عميل', category: 'crm', reportName: 'Accounts Receivable', allowedRoles: ['Sales', 'Accounts', 'System Manager'] },
  { id: 'crm-overdue-customers', title: 'عملاء مستحقاتهم متأخرة', category: 'crm', reportName: 'Accounts Receivable', allowedRoles: ['Sales', 'Accounts', 'System Manager'] },
  {
    id: 'crm-loyalty',
    title: 'نقاط الولاء',
    category: 'crm',
    reportName: 'Loyalty Point Entry Report',
    resolveByRefDoctype: 'Loyalty Point Entry',
    allowedRoles: ['Sales', 'System Manager'],
  },
  { id: 'crm-credits', title: 'تقارير الأرصدة', category: 'crm', reportName: 'Payment Ledger', allowedRoles: ['Sales', 'Accounts', 'System Manager'] },
  {
    id: 'crm-subscriptions-installments',
    title: 'أقساط واشتراكات (دفتر المدفوعات)',
    category: 'crm',
    reportName: 'Payment Ledger',
    allowedRoles: ['Sales', 'Accounts', 'System Manager'],
  },
  {
    id: 'crm-rental-installments',
    title: 'أقساط عقود إيجار (دفتر المدفوعات)',
    category: 'crm',
    reportName: 'Payment Ledger',
    allowedRoles: ['Sales', 'Accounts', 'System Manager'],
  },
];

export function getReportDef(reportId: string): ReportDef | null {
  return REPORTS_CATALOG.find((r) => r.id === reportId) ?? null;
}
