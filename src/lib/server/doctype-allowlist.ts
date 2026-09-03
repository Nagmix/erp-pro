/**
 * SEC-04: قائمة سماح أنواع المستندات (Doctypes) لبروكسي البيانات /api/data/*
 *
 * قبل هذا الملف كان /api/data/[doctype] يقبل أي نوع مستند — ما يسمح بقراءة/
 * كتابة بيانات حساسة (مثل User / Session / Auth) عبر الواجهة.
 * الآن: فقط الأنواع التي تستخدمها واجهة ERP-Pro فعلياً مسموحة.
 *
 * عند إضافة وحدة جديدة للواجهة أضف أنواع مستنداتها هنا.
 */

/** أنواع مستندات معيارية يستخدمها Frappe/ERPNext داخلياً — محظورة على الواجهة دائماً */
const NEVER_ALLOWED = new Set([
  'Session',
  'Session Default',
  'Auth',
  'API Key',
  'OAuth Client',
  'OAuth Bearer Token',
  'OAuth Authorization Code',
  'Access Log',
  'Activity Log',
  'Error Log',
  'Error Snapshot',
  'Scheduled Job Log',
  'Login Log',
  'Login Attempt',
  'Monitor',
  'Request Log',
  'Site Config',
  'Credential',
  'Password Detail',
  'User Permission', // تُدار عبر مسارات إعدادات مخصصة فقط
]);

/**
 * الأنواع المسموحة — مُجمّعة من:
 *  1) كل doctype مرجعي في src/app + src/components + src/stores
 *  2) أنواع مستندات مستخدمة داخل مسارات API (src/app/api/**)
 *  3) أنواع HRMS وأنواع القوائم الرشيقة (GRACEFUL_404 / HRMS_DOTYPES)
 */
const ALLOWED_DOCTYPES = new Set([
  // ─── المحاسبة ───
  'Account',
  'Accounts Settings',
  'Bank',
  'Bank Account',
  'Bank Transaction',
  'Budget',
  'Cost Center',
  'Currency',
  'Currency Exchange',
  'Fiscal Year',
  'GL Entry',
  'Journal Entry',
  'Journal Entry Template',
  'Payment Entry',
  'Payment Gateway',
  'Payment Terms Template',
  'Purchase Taxes and Charges Template',
  'Sales Taxes and Charges Template',
  'Recurring Journal Entry',

  // ─── المبيعات ───
  'Customer',
  'Customer Group',
  'Lead',
  'Opportunity',
  'Quotation',
  'Sales Order',
  'Sales Invoice',
  'Sales Invoice Item',
  'POS Profile',
  'POS Invoice',
  'POS Opening Entry',
  'POS Closing Entry',
  'POS Settings',
  'Coupon Code',
  'Loyalty Point Entry',
  'Subscription Plan',
  'Selling Settings',
  'Sales Person',

  // ─── المشتريات ───
  'Supplier',
  'Supplier Group',
  'Supplier Quotation',
  'Purchase Order',
  'Purchase Invoice',
  'Purchase Receipt',
  'Request for Quotation',
  'Buying Settings',

  // ─── المخزون ───
  'Item',
  'Item Attribute',
  'Item Group',
  'E Commerce Item',
  'Material Request',
  'Stock Entry',
  'Stock Settings',
  'UOM',
  'Warehouse',
  'Warehouse Type',
  'Batch',
  'Serial No',
  'Delivery Note',
  'Purchase Receipt Item',
  'Delivery Note Item',
  'Stock Reconciliation',
  'Landed Cost Voucher',

  // ─── التصنيع ───
  'BOM',
  'Manufacturing Settings',
  'Operation',
  'Workstation',
  'Production Plan',
  'Work Order',

  // ─── الموارد البشرية (HRMS) ───
  'Employee',
  'Employment Type',
  'Department',
  'Branch',
  'Designation',
  'Expense Claim',
  'Expense Claim Account',
  'Expense Claim Type',
  'Employee Advance',
  'Travel Request',
  'Training Event',
  'Training Result',
  'Attendance',
  'Attendance Request',
  'Leave Application',
  'Leave Type',
  'Leave Allocation',
  'Leave Policy',
  'Holiday List',
  'Shift Type',
  'Shift Assignment',
  'Salary Slip',
  'Salary Structure',
  'Salary Component',
  'Payroll Entry',
  'HR Settings',
  'Appraisal',
  'Job Applicant',
  'Job Opening',
  'Loan Type',

  // ─── المشاريع ───
  'Project',
  'Task',
  'Activity Type',
  'Timesheet',
  'Issue',

  // ─── الأصول ───
  'Asset',
  'Asset Category',
  'Asset Movement',
  'Location',

  // ─── CRM / إعدادات عامة ───
  'CRM Settings',
  'Contract',
  'Industry Type',
  'Terms and Conditions',
  'Territory',
  'Campaign',
  'Email Template',
  'Email Account',
  'Email Auto Rule',
  'Notification',
  'Print Format',
  'Letter Head',
  'Auto Repeat',
  'Naming Series',
  'Series',
  'System Settings',
  'Authorization Rule',
  'Custom DocPerm',
  'Pricing Rule',
  'Price List',
  'Mode of Payment',
  'Website Settings',
  'Contact',
  'Address',
  'Communication',
  'Comment',
  'ToDo',
  'Event',
  'File',
  'Version',
  'Report',

  // ─── إدارة النظام (للوحة الإعدادات فقط) ───
  'Company',
  'Country',
  'User',
  'Has Role',
  'Role',
  'DocType',
  'Custom Field',
  'Module Def',
  'Installed Application',
  'Installed Applications',
  'Workflow',
  'Workflow Action Master',
  'Workflow State',
  'Server Script',
  'Webhook',
  'Gender',

  // ─── التكاملات (إعدادات) ───
  'PayPal Settings',
  'Razorpay Settings',
  'Stripe Settings',
  'Shopify Settings',
  'Shopify Log',
  'Shopify Order',
  'WooCommerce Settings',
  'Salla Settings',
  'Zid Settings',
  'SMS Settings',
  'SMS Gateway',
  'SMS Template',
  'SMS Auto Rule',
  'Commission Calculation',
]);

/**
 * هل هذا النوع مسموح مروره عبر بروكسي البيانات؟
 * الأنواع المحظورة دائماً تفوق أي إعداد آخر.
 */
export function isDoctypeAllowed(doctype: string): boolean {
  const name = (doctype || '').trim();
  if (!name) return false;
  if (NEVER_ALLOWED.has(name)) return false;
  return ALLOWED_DOCTYPES.has(name);
}

/** مثل isDoctypeAllowed لكن يرمي خطأ واضحاً — للاستخدام داخل المسارات */
export function assertDoctypeAllowed(doctype: string): void {
  if (!isDoctypeAllowed(doctype)) {
    throw new Error(`نوع المستند "${doctype}" غير مسموح عبر بروكسي البيانات (SEC-04)`);
  }
}
