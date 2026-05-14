import type { SystemModule } from './types';

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: 'accounting',
    name: 'Accounting',
    nameAr: 'المحاسبة والمالية',
    icon: 'Calculator',
    path: '/accounting',
    color: 'blue',
    subModules: [
      { id: 'chart-of-accounts', name: 'Chart of Accounts', nameAr: 'دليل الحسابات', path: '/accounting/chart-of-accounts', doctype: 'Account' },
      { id: 'journal-entry', name: 'Journal Entry', nameAr: 'القيود اليومية', path: '/accounting/journal-entry', doctype: 'Journal Entry' },
      { id: 'payment-entry', name: 'Payment Entry', nameAr: 'سندات القبض والصرف', path: '/accounting/payment-entry', doctype: 'Payment Entry' },
      { id: 'treasuries', name: 'Treasuries', nameAr: 'الخزائن', path: '/accounting/treasuries', doctype: 'Account' },
      { id: 'bank-accounts', name: 'Bank Accounts', nameAr: 'الحسابات البنكية', path: '/accounting/bank-accounts', doctype: 'Bank Account' },
      { id: 'cheques', name: 'Cheques', nameAr: 'الشيكات', path: '/accounting/cheques', doctype: 'Payment Entry' },
      { id: 'expenses', name: 'Expenses', nameAr: 'المصروفات', path: '/accounting/expenses', doctype: 'Expense Claim' },
      { id: 'cost-centers', name: 'Cost Centers', nameAr: 'مراكز التكلفة', path: '/accounting/cost-centers', doctype: 'Cost Center' },
      { id: 'assets', name: 'Assets', nameAr: 'الأصول الثابتة', path: '/accounting/assets', doctype: 'Asset' },
      { id: 'budgets', name: 'Budgets', nameAr: 'إدارة الميزانيات', path: '/accounting/budgets', doctype: 'Budget' },
    ],
    settingsGroups: [
      {
        id: 'accounting-settings',
        nameAr: 'إعدادات المحاسبة',
        path: '/accounting/settings',
        items: [],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    nameAr: 'المبيعات',
    icon: 'ShoppingCart',
    path: '/sales',
    color: 'green',
    subModules: [
      { id: 'sales-invoices', name: 'Sales Invoices', nameAr: 'فواتير المبيعات', path: '/sales/sales-invoices', doctype: 'Sales Invoice' },
      { id: 'customers', name: 'Customers', nameAr: 'العملاء', path: '/sales/customers', doctype: 'Customer' },
      { id: 'quotations', name: 'Quotations', nameAr: 'عروض الأسعار', path: '/sales/quotations', doctype: 'Quotation' },
      { id: 'sales-orders', name: 'Sales Orders', nameAr: 'أوامر البيع', path: '/sales/sales-orders', doctype: 'Sales Order' },
      { id: 'delivery-notes', name: 'Delivery Notes', nameAr: 'إشعارات التسليم', path: '/sales/delivery-notes', doctype: 'Delivery Note' },
      { id: 'shipping', name: 'Shipping', nameAr: 'الشحن والتوصيل', path: '/sales/shipping' },
      { id: 'recurring-invoices', name: 'Recurring Invoices', nameAr: 'الفواتير الدورية', path: '/sales/recurring-invoices' },
      { id: 'commissions', name: 'Commissions', nameAr: 'عمولات المبيعات', path: '/sales/commissions' },
    ],
    settingsGroups: [
      {
        id: 'sales-settings',
        nameAr: 'إعدادات المبيعات',
        path: '/sales/settings',
        items: [],
      },
    ],
  },
  {
    id: 'pos',
    name: 'Point of Sale',
    nameAr: 'نقاط البيع',
    icon: 'Store',
    path: '/pos',
    color: 'emerald',
    subModules: [
      { id: 'pos-sell', name: 'POS Sell', nameAr: 'بدء البيع', path: '/pos/sell', doctype: 'POS Invoice' },
      { id: 'pos-sessions', name: 'POS Sessions', nameAr: 'إدارة الورديات', path: '/pos/sessions', doctype: 'POS Opening Entry' },
      { id: 'pos-invoices', name: 'POS Invoices', nameAr: 'فواتير نقطة البيع', path: '/pos/invoices', doctype: 'POS Invoice' },
    ],
    settingsGroups: [
      {
        id: 'pos-settings',
        nameAr: 'إعدادات نقاط البيع',
        path: '/pos/settings',
        items: [],
      },
    ],
  },
  {
    id: 'purchases',
    name: 'Purchases',
    nameAr: 'المشتريات',
    icon: 'Truck',
    path: '/purchases',
    color: 'amber',
    subModules: [
      { id: 'purchase-invoices', name: 'Purchase Invoices', nameAr: 'فواتير المشتريات', path: '/purchases/purchase-invoices', doctype: 'Purchase Invoice' },
      { id: 'purchase-suppliers', name: 'Suppliers', nameAr: 'الموردون', path: '/purchases/suppliers', doctype: 'Supplier' },
      { id: 'purchase-orders-p', name: 'Purchase Orders', nameAr: 'أوامر الشراء', path: '/purchases/purchase-orders', doctype: 'Purchase Order' },
      { id: 'purchase-receipts', name: 'Purchase Receipts', nameAr: 'استلام المشتريات', path: '/purchases/purchase-receipts', doctype: 'Purchase Receipt' },
      { id: 'request-for-quotation', name: 'RFQ', nameAr: 'طلب عروض أسعار', path: '/purchases/request-for-quotation', doctype: 'Request for Quotation' },
      { id: 'supplier-quotations', name: 'Supplier Quotations', nameAr: 'عروض أسعار الموردين', path: '/purchases/supplier-quotations', doctype: 'Supplier Quotation' },
      { id: 'purchase-requests', name: 'Purchase Requests', nameAr: 'طلبات الشراء', path: '/purchases/purchase-requests', doctype: 'Material Request' },
    ],
    settingsGroups: [
      {
        id: 'purchases-settings',
        nameAr: 'إعدادات المشتريات',
        path: '/purchases/settings',
        items: [],
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    nameAr: 'المخزون',
    icon: 'Package',
    path: '/inventory',
    color: 'orange',
    subModules: [
      { id: 'items', name: 'Items', nameAr: 'الأصناف', path: '/inventory/items', doctype: 'Item' },
      { id: 'warehouses', name: 'Warehouses', nameAr: 'المستودعات', path: '/inventory/warehouses', doctype: 'Warehouse' },
      { id: 'stock-entry', name: 'Stock Entry', nameAr: 'حركة المخزون', path: '/inventory/stock-entry', doctype: 'Stock Entry' },
      { id: 'price-lists', name: 'Price Lists', nameAr: 'قوائم الأسعار', path: '/inventory/price-lists', doctype: 'Price List' },
      { id: 'stock-count', name: 'Stock Count', nameAr: 'جرد المخزون', path: '/inventory/stock-count', doctype: 'Stock Reconciliation' },
      { id: 'serial-numbers', name: 'Serial Numbers', nameAr: 'الأرقام التسلسلية', path: '/inventory/serial-numbers', doctype: 'Serial No' },
      { id: 'batches', name: 'Batches', nameAr: 'الدفعات', path: '/inventory/batches', doctype: 'Batch' },
    ],
    settingsGroups: [
      {
        id: 'inventory-settings',
        nameAr: 'إعدادات المخزون',
        path: '/inventory/settings',
        items: [],
      },
    ],
  },
  {
    id: 'hr',
    name: 'Human Resources',
    nameAr: 'الموارد البشرية',
    icon: 'Users',
    path: '/hr',
    color: 'purple',
    requiredApp: 'hrms',
    subModules: [
      { id: 'employees', name: 'Employees', nameAr: 'الموظفين', path: '/hr/employees', doctype: 'Employee' },
      { id: 'attendance', name: 'Attendance', nameAr: 'الحضور والانصراف', path: '/hr/attendance', doctype: 'Attendance' },
      { id: 'leave-applications', name: 'Leave Applications', nameAr: 'طلبات الإجازة', path: '/hr/leave-applications', doctype: 'Leave Application' },
      { id: 'salary-slips', name: 'Salary Slips', nameAr: 'كشوف الرواتب', path: '/hr/salary-slips', doctype: 'Salary Slip' },
      { id: 'payroll-entry', name: 'Payroll Entry', nameAr: 'مسير الرواتب', path: '/hr/payroll-entry', doctype: 'Payroll Entry' },
    ],
    settingsGroups: [
      {
        id: 'hr-settings',
        nameAr: 'إعدادات الموارد البشرية',
        path: '/hr/settings',
        items: [],
      },
    ],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    nameAr: 'التصنيع',
    icon: 'Factory',
    path: '/manufacturing',
    color: 'teal',
    subModules: [
      { id: 'bom', name: 'Bill of Materials', nameAr: 'قوائم المواد', path: '/manufacturing/bom', doctype: 'BOM' },
      { id: 'production-plans', name: 'Production Plans', nameAr: 'خطط الإنتاج', path: '/manufacturing/production-plans', doctype: 'Production Plan' },
      { id: 'work-orders-mfg', name: 'Work Orders', nameAr: 'أوامر العمل', path: '/manufacturing/work-orders', doctype: 'Work Order' },
    ],
    settingsGroups: [
      {
        id: 'manufacturing-settings',
        nameAr: 'إعدادات التصنيع',
        path: '/manufacturing/settings',
        items: [],
      },
    ],
  },
  {
    id: 'operations',
    name: 'Operations',
    nameAr: 'التشغيل والعمليات',
    icon: 'Cog',
    path: '/operations',
    color: 'slate',
    subModules: [
      { id: 'workflow-studio', name: 'Workflow Studio', nameAr: 'منشئ سير العمل', path: '/operations/workflow-studio', doctype: 'Workflow' },
      { id: 'time-tracking', name: 'Time Tracking', nameAr: 'تتبع الوقت', path: '/operations/time-tracking' },
      { id: 'auto-repeat', name: 'Auto Repeat', nameAr: 'الجدولة التلقائية', path: '/operations/auto-repeat' },
      { id: 'projects', name: 'Projects', nameAr: 'إدارة المشاريع', path: '/operations/projects', doctype: 'Project' },
      { id: 'approvals', name: 'Approvals', nameAr: 'سير الموافقات', path: '/operations/approvals' },
      { id: 'fleet', name: 'Fleet', nameAr: 'إدارة الأسطول', path: '/operations/fleet' },
      { id: 'rentals', name: 'Rentals', nameAr: 'إدارة الإيجارات', path: '/operations/rentals' },
    ],
    settingsGroups: [
      {
        id: 'operations-settings',
        nameAr: 'إعدادات العمليات',
        path: '/operations/settings',
        items: [],
      },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    nameAr: 'إدارة العملاء',
    icon: 'Heart',
    path: '/crm',
    color: 'pink',
    subModules: [
      { id: 'leads', name: 'Leads', nameAr: 'العملاء المحتملون', path: '/crm/leads', doctype: 'Lead' },
      { id: 'opportunities', name: 'Opportunities', nameAr: 'الفرص', path: '/crm/opportunities', doctype: 'Opportunity' },
      { id: 'activities', name: 'Activities', nameAr: 'الأنشطة', path: '/crm/activities', doctype: 'Communication' },
      { id: 'crm-messages', name: 'Messages', nameAr: 'الرسائل', path: '/crm/messages', doctype: 'Notification Log' },
      { id: 'account-statements', name: 'Account Statements', nameAr: 'كشف حساب العميل', path: '/crm/account-statements' },
    ],
    settingsGroups: [
      {
        id: 'crm-settings',
        nameAr: 'إعدادات إدارة العملاء',
        path: '/crm/settings',
        items: [],
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    nameAr: 'التقارير والتحليلات',
    icon: 'BarChart3',
    path: '/reports',
    color: 'indigo',
    subModules: [
      { id: 'reports-dashboard', name: 'Reports Dashboard', nameAr: 'لوحة التقارير المتقدمة', path: '/reports/dashboard' },
    ],
    settingsGroups: [
      {
        id: 'accounting-reports',
        nameAr: 'تقارير المحاسبة',
        items: [
          { id: 'trial-balance', nameAr: 'ميزان المراجعة', path: '/accounting/trial-balance' },
          { id: 'aging-report', nameAr: 'أعمار الذمم', path: '/accounting/aging-report' },
          { id: 'profit-loss-monthly', nameAr: 'الأرباح والخسائر الشهرية', path: '/accounting/profit-loss-monthly' },
          { id: 'tax-report', nameAr: 'التقرير الضريبي', path: '/accounting/tax-report' },
          { id: 'cash-flow', nameAr: 'التدفقات النقدية', path: '/accounting/cash-flow' },
          { id: 'financial-statements', nameAr: 'القوائم المالية', path: '/accounting/financial-statements' },
          { id: 'expenses-by-period', nameAr: 'المصروفات بالمدة الزمنية', path: '/accounting/expenses-by-period' },
          { id: 'advanced-reports', nameAr: 'التقارير المحاسبية', path: '/accounting/advanced-reports' },
          { id: 'bank-reconciliation', nameAr: 'التسوية البنكية', path: '/accounting/bank-reconciliation' },
          { id: 'recurring-entries', nameAr: 'القيود المتكررة', path: '/accounting/recurring-entries' },
        ],
      },
      {
        id: 'sales-reports',
        nameAr: 'تقارير المبيعات',
        items: [
          { id: 'daily-sales', nameAr: 'تقرير المبيعات اليومي', path: '/sales/daily-sales' },
          { id: 'monthly-sales', nameAr: 'تقرير المبيعات الشهري', path: '/sales/monthly-sales' },
          { id: 'product-profits', nameAr: 'أرباح مبيعات الأصناف', path: '/sales/product-profits' },
        ],
      },
      {
        id: 'purchases-reports',
        nameAr: 'تقارير المشتريات',
        items: [
          { id: 'supplier-statements', nameAr: 'كشف حساب المورد', path: '/purchases/supplier-statements' },
          { id: 'purchase-reports', nameAr: 'تقارير المشتريات', path: '/purchases/reports' },
        ],
      },
      {
        id: 'inventory-reports',
        nameAr: 'تقارير المخزون',
        items: [
          { id: 'stock-levels', nameAr: 'مستويات المخزون', path: '/inventory/stock-levels' },
          { id: 'inventory-reports', nameAr: 'تقارير المخزون', path: '/inventory/reports' },
        ],
      },
      {
        id: 'hr-reports',
        nameAr: 'تقارير الموارد البشرية',
        items: [
          { id: 'attendance-summary', nameAr: 'ملخص الحضور', path: '/hr/attendance-summary' },
          { id: 'hr-reports', nameAr: 'تقارير الموارد البشرية', path: '/hr/reports' },
        ],
      },
      {
        id: 'pos-reports',
        nameAr: 'تقارير نقاط البيع',
        items: [
          { id: 'pos-reports', nameAr: 'تقارير نقاط البيع', path: '/pos/reports' },
        ],
      },
    ],
  },
];

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  Draft: { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'مسودة' },
  Submitted: { bg: 'bg-primary', text: 'text-primary-foreground', label: 'مُقدّم' },
  Cancelled: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'ملغي' },
  Approved: { bg: 'bg-success', text: 'text-success-foreground', label: 'مُوافق' },
  Rejected: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'مرفوض' },
  Open: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'مفتوح' },
  Active: { bg: 'bg-success', text: 'text-success-foreground', label: 'نشط' },
  Inactive: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'غير نشط' },
  Paid: { bg: 'bg-success', text: 'text-success-foreground', label: 'مدفوع' },
  Unpaid: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'غير مدفوع' },
  Overdue: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'متأخر' },
  'Partly Paid': { bg: 'bg-info', text: 'text-info-foreground', label: 'مدفوع جزئياً' },
  Present: { bg: 'bg-success', text: 'text-success-foreground', label: 'حاضر' },
  Absent: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'غائب' },
  'On Leave': { bg: 'bg-info', text: 'text-info-foreground', label: 'في إجازة' },
  'Half Day': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'نصف يوم' },
  Left: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'مغادر' },
  'In Process': { bg: 'bg-info', text: 'text-info-foreground', label: 'قيد التنفيذ' },
  Completed: { bg: 'bg-success', text: 'text-success-foreground', label: 'مكتمل' },
  Stopped: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'متوقف' },
  'Not Started': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'لم يبدأ' },
  Ordered: { bg: 'bg-info', text: 'text-info-foreground', label: 'تم الطلب' },
  Expired: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'منتهي' },
  Lost: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'مفقود' },
  'To Deliver and Bill': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'تسليم وفوترة' },
  'To Deliver': { bg: 'bg-info', text: 'text-info-foreground', label: 'بانتظار التسليم' },
  'To Bill': { bg: 'bg-info', text: 'text-info-foreground', label: 'بانتظار الفوترة' },
  'To Receive and Bill': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'استلام وفوترة' },
  'To Receive': { bg: 'bg-info', text: 'text-info-foreground', label: 'بانتظار الاستلام' },
  Issued: { bg: 'bg-info', text: 'text-info-foreground', label: 'مصدر' },
  Received: { bg: 'bg-success', text: 'text-success-foreground', label: 'مستلم' },
  Cleared: { bg: 'bg-success', text: 'text-success-foreground', label: 'مقاص' },
  Bounced: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'مرتجع' },
  Sent: { bg: 'bg-info', text: 'text-info-foreground', label: 'مُرسل' },
  Accepted: { bg: 'bg-success', text: 'text-success-foreground', label: 'مقبول' },
  'Return': { bg: 'bg-info', text: 'text-info-foreground', label: 'مرتجع' },
  'Credit Note': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'إشعار دائن' },
  'Debit Note': { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'إشعار مدين' },
  'Internal Transfer': { bg: 'bg-info', text: 'text-info-foreground', label: 'تحويل داخلي' },
  'Receive': { bg: 'bg-success', text: 'text-success-foreground', label: 'استلام' },
  'Pay': { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'صرف' },
  High: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'عالي' },
  Medium: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'متوسط' },
  Low: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'منخفض' },
  'ساري': { bg: 'bg-success', text: 'text-success-foreground', label: 'ساري' },
  'منتهي': { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'منتهي' },
  'قيد التجديد': { bg: 'bg-warning', text: 'text-warning-foreground', label: 'قيد التجديد' },
  Terminated: { bg: 'bg-destructive', text: 'text-destructive-foreground', label: 'منهي' },
  Sold: { bg: 'bg-info', text: 'text-info-foreground', label: 'مباع' },
  Scrapped: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'مستهلك' },
  Unsigned: { bg: 'bg-warning', text: 'text-warning-foreground', label: 'غير موقّع' },
  Signed: { bg: 'bg-success', text: 'text-success-foreground', label: 'موقّع' },
  Disabled: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'معطّل' },
};

export function getDocStatusLabel(docstatus: number): string {
  switch (docstatus) {
    case 0: return 'مسودة';
    case 1: return 'مُقدّم';
    case 2: return 'ملغي';
    default: return 'غير معروف';
  }
}

export function getDocStatusColor(docstatus: number): { bg: string; text: string } {
  switch (docstatus) {
    case 0: return { bg: 'bg-secondary', text: 'text-secondary-foreground' };
    case 1: return { bg: 'bg-success', text: 'text-success-foreground' };
    case 2: return { bg: 'bg-destructive', text: 'text-destructive-foreground' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground' };
  }
}

/** أول مسار لوحة تحكم يطابق DocType (للانتقال من إشعار Notification Log). */
export function getDashboardPathForDocType(doctype: string | null | undefined): string | null {
  const dt = doctype?.trim();
  if (!dt) return null;
  for (const mod of SYSTEM_MODULES) {
    for (const sub of mod.subModules) {
      if (sub.doctype === dt) return sub.path;
    }
  }
  return null;
}

/**
 * تحويل الأرقام العربية-الهندية (٠-٩) والفواصل العشرية العربية إلى أرقام إنجليزية
 * ERPNext قد يرجع قيماً منسقة بالأرقام العربية-الهندية مثل: ٥٬٠٠٠٫٠٠
 * هذه الدالة تحولها إلى: 5,000.00
 */
export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str == null) return '';
  const s = String(str);
  return s
    // تحويل الأرقام العربية-الهندية (٠-٩) إلى إنجليزية
    .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    // تحويل الأرقام الفارسية/الأردية (۰-۹) إلى إنجليزية
    .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    // تحويل الفاصلة العشرية العربية (٫) إلى نقطة
    .replace(/٫/g, '.')
    // تحويل فاصل الآلاف العربي (٬) إلى فاصلة إنجليزية
    .replace(/٬/g, ',')
    // إزالة أي أحرف تحكم عربية مخفية
    .replace(/[\u200E\u200F\u066A\u0609\u060A]/g, '');
}

/**
 * تحويل قيمة رقمية من ERPNext (قد تكون نصاً بأرقام عربية) إلى رقم إنجليزي
 */
export function parseErpNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (val == null) return 0;
  const englishStr = toEnglishDigits(String(val));
  // إزالة فواصل الآلاف ثم التحويل لرقم
  const cleaned = englishStr.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'YER'): string {
  // تحويل القيمة لرقم (قد تأتي من ERPNext كنص بأرقام عربية)
  const numAmount = parseErpNumber(amount);
  // استخدام تنسيق إنجليزي للأرقام (أرقام لاتينية + نقطة عشرية)
  // مع إضافة رمز العملة يدوياً لتجنب الأرقام العربية
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
  // رموز العملات العربية
  const currencySymbols: Record<string, string> = {
    YER: 'ر.ي',
    SAR: 'ر.س',
    AED: 'د.إ',
    KWD: 'د.ك',
    EGP: 'ج.م',
    JOD: 'د.أ',
    QAR: 'ر.ق',
    BHD: 'د.ب',
    OMR: 'ر.ع',
    USD: '$',
    EUR: '€',
  };
  const symbol = currencySymbols[currency] || currency;
  return `${formatted} ${symbol}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  // استخدام تنسيق ميلادي بأرقام: dd/mm/yyyy
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatNumber(num: number | string | null | undefined): string {
  // تحويل القيمة لرقم (قد تأتي من ERPNext كنص بأرقام عربية)
  const n = parseErpNumber(num);
  // استخدام تنسيق إنجليزي للأرقام (أرقام لاتينية + نقطة عشرية)
  return new Intl.NumberFormat('en-US').format(n);
}

/** Palette for Recharts — references theme --chart-1..5 tokens via HSL */
export const CHART_PALETTE = {
  primary: 'hsl(var(--chart-1))',
  secondary: 'hsl(var(--chart-2))',
  tertiary: 'hsl(var(--chart-3))',
  quaternary: 'hsl(var(--chart-4))',
  quinary: 'hsl(var(--chart-5))',
  /** Array convenience for Recharts dataKey fills */
  series: [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ],
  /** Pie/donut palette */
  pie: [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ],
}
