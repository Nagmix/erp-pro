/** مسارات عرض تفصيلي لأهم المستندات (مرحلة 4.8) */

export const ERP_DOC_SLUG_TO_TYPE: Record<string, string> = {
  // المحاسبة
  'sales-invoice': 'Sales Invoice',
  'purchase-invoice': 'Purchase Invoice',
  'journal-entry': 'Journal Entry',
  'payment-entry': 'Payment Entry',
  // المبيعات
  'sales-order': 'Sales Order',
  'quotation': 'Quotation',
  'delivery-note': 'Delivery Note',
  'customer': 'Customer',
  // المشتريات
  'purchase-order': 'Purchase Order',
  'purchase-receipt': 'Purchase Receipt',
  'material-request': 'Material Request',
  'request-for-quotation': 'Request for Quotation',
  'supplier-quotation': 'Supplier Quotation',
  'supplier': 'Supplier',
  // المخزون
  'item': 'Item',
  'stock-entry': 'Stock Entry',
  'warehouse': 'Warehouse',
  'batch': 'Batch',
  'serial-no': 'Serial No',
  // الموارد البشرية
  'employee': 'Employee',
  'attendance': 'Attendance',
  'leave-application': 'Leave Application',
  'salary-slip': 'Salary Slip',
  'salary-structure': 'Salary Structure',
  'payroll-entry': 'Payroll Entry',
  'expense-claim': 'Expense Claim',
  // التصنيع
  'work-order': 'Work Order',
  'bom': 'BOM',
  // CRM
  'lead': 'Lead',
  'opportunity': 'Opportunity',
  // أخرى
  'contract': 'Contract',
  'company': 'Company',
  'cost-center': 'Cost Center',
  'fiscal-year': 'Fiscal Year',
  'project': 'Project',
  'task': 'Task',
};

export const ERP_DOC_TYPE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(ERP_DOC_SLUG_TO_TYPE).map(([slug, dt]) => [dt, slug])
);

export function docDetailPath(doctype: string, name: string): string | null {
  const slug = ERP_DOC_TYPE_TO_SLUG[doctype];
  if (!slug || !name) return null;
  return `/doc/${slug}/${encodeURIComponent(name)}`;
}

export function docTypeFromSlug(slug: string): string | null {
  return ERP_DOC_SLUG_TO_TYPE[slug] ?? null;
}
