/**
 * فلاتر تقارير ERPNext / HRMS لمسارات المبيعات والمشتريات والموارد البشرية.
 * المفاتيح من ملفات *.js الرسمية للتقارير في frappe/erpnext و frappe/hrms.
 */

export type SalesAnalyticsTree = 'Customer' | 'Item';

export function buildSalesAnalyticsFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
  treeType: SalesAnalyticsTree;
  /** افتراض ERPNext: Sales Invoice */
  docType?: string;
  range?: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  valueQuantity?: 'Value' | 'Quantity';
  curves?: 'select' | 'all' | 'non-zeros' | 'total';
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    tree_type: params.treeType,
    doc_type: params.docType ?? 'Sales Invoice',
    range: params.range ?? 'Monthly',
    value_quantity: params.valueQuantity ?? 'Value',
    curves: params.curves ?? 'select',
  };
}

export type PurchaseAnalyticsTree = 'Supplier' | 'Item';

export function buildPurchaseAnalyticsFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
  treeType: PurchaseAnalyticsTree;
  docType?: string;
  range?: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  valueQuantity?: 'Value' | 'Quantity';
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    tree_type: params.treeType,
    doc_type: params.docType ?? 'Purchase Invoice',
    range: params.range ?? 'Monthly',
    value_quantity: params.valueQuantity ?? 'Value',
  };
}

export function buildSalesPersonWiseSummaryFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
  docType?: 'Sales Order' | 'Delivery Note' | 'Sales Invoice';
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    doc_type: params.docType ?? 'Sales Invoice',
  };
}

/** Payment Ledger — يستخدم period_start_date / period_end_date وليس from_date */
export function buildPaymentLedgerFilters(params: {
  company: string;
  periodStart: string;
  periodEnd: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    period_start_date: params.periodStart,
    period_end_date: params.periodEnd,
  };
}

export function buildPOSRegisterFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
  };
}

export function buildPurchaseOrderAnalysisFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
  };
}

/** Monthly Attendance Sheet — نطاق ≤ 90 يوماً عند اختيار «Date Range». */
export function buildMonthlyAttendanceSheetFilters(params: {
  company: string;
  startDate: string;
  endDate: string;
  /** يفعّل عرض HRMS «Summarized View» (ملخص حضور). */
  summarizedView?: boolean;
}): Record<string, unknown> {
  return {
    company: params.company,
    filter_based_on: 'Date Range',
    start_date: params.startDate,
    end_date: params.endDate,
    include_company_descendants: 1,
    summarized_view: params.summarizedView ? 1 : 0,
  };
}

export type EmployeeAnalyticsParameter =
  | 'Branch'
  | 'Grade'
  | 'Department'
  | 'Designation'
  | 'Employment Type';

/** Employee Analytics — توزيع الموظفين حسب فرع/قسم/… */
export function buildEmployeeAnalyticsFilters(params: {
  company: string;
  parameter?: EmployeeAnalyticsParameter;
}): Record<string, unknown> {
  return {
    company: params.company,
    parameter: params.parameter ?? 'Department',
  };
}

export function buildShiftAttendanceFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    consider_grace_period: 1,
  };
}

export function buildSalaryRegisterFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    docstatus: 'Submitted',
  };
}

export function buildEmployeeLeaveBalanceFilters(params: {
  company: string;
  fromDate: string;
  toDate: string;
}): Record<string, unknown> {
  return {
    company: params.company,
    from_date: params.fromDate,
    to_date: params.toDate,
    employee_status: 'Active',
    consolidate_leave_types: 1,
  };
}

/** Report Builder — غالباً شركة فقط */
export function buildEmployeeInformationFilters(params: { company: string }): Record<string, unknown> {
  return { company: params.company };
}
