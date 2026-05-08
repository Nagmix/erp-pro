/**
 * فلاتر موحّدة لمركز `/reports` حسب معرف التقرير في `REPORTS_CATALOG`.
 */

import {
  buildGeneralLedgerFilters,
  buildGrossProfitReportFilters,
  buildItemWiseSalesRegisterFilters,
  buildPurchaseRegisterFilters,
  buildReceivablePayableFilters,
  buildSalesRegisterFilters,
} from '@/lib/reports/accounting-advanced-filters';
import {
  buildItemShortageFilters,
  buildStockAccountValueComparisonFilters,
  buildStockBalanceFilters,
  buildStockLedgerFilters,
  buildWorkOrderSummaryFilters,
} from '@/lib/reports/inventory-filters';
import {
  buildEmployeeAnalyticsFilters,
  buildEmployeeInformationFilters,
  buildEmployeeLeaveBalanceFilters,
  buildMonthlyAttendanceSheetFilters,
  buildPaymentLedgerFilters,
  buildPOSRegisterFilters,
  buildPurchaseAnalyticsFilters,
  buildPurchaseOrderAnalysisFilters,
  buildSalaryRegisterFilters,
  buildSalesAnalyticsFilters,
  buildSalesPersonWiseSummaryFilters,
  buildShiftAttendanceFilters,
  type PurchaseAnalyticsTree,
} from '@/lib/reports/sales-purchase-hr-filters';

export type HubFilterContext = {
  company: string;
  dateFrom: string;
  dateTo: string;
};

/** تقارير «دفتر المدفوعات» في ERPNext — فترة ترحيل */
export const PAYMENT_LEDGER_CATALOG_IDS = new Set([
  'payment-splits',
  'purchase-payments-period',
  'crm-credits',
  'crm-subscriptions-installments',
  'crm-rental-installments',
]);

const RECEIVABLE_PAYABLE_SINGLE_DATE_IDS = new Set([
  'accounts-receivable',
  'accounts-payable',
  'sales-invoice-status',
  'overdue-invoices',
  'crm-customer-statement',
  'crm-overdue-customers',
]);

/**
 * يُرجع كائن فلاتر جاهزاً لتمريره إلى `/api/reports/[catalogId]`،
 * أو `null` إذا لم تكتمل المعطيات المطلوبة لهذا التقرير.
 */
export function buildHubReportFilters(
  catalogId: string,
  ctx: HubFilterContext
): Record<string, unknown> | null {
  const { company, dateFrom, dateTo } = ctx;
  if (!company) return null;

  if (PAYMENT_LEDGER_CATALOG_IDS.has(catalogId)) {
    if (!dateFrom || !dateTo) return null;
    return buildPaymentLedgerFilters({
      company,
      periodStart: dateFrom,
      periodEnd: dateTo,
    });
  }

  if (RECEIVABLE_PAYABLE_SINGLE_DATE_IDS.has(catalogId)) {
    const reportDate = dateTo || dateFrom;
    if (!reportDate) return null;
    return buildReceivablePayableFilters({ company, reportDate });
  }

  if (catalogId === 'hr-employee-info') {
    return buildEmployeeInformationFilters({ company });
  }

  if (catalogId === 'hr-employee-analytics') {
    return buildEmployeeAnalyticsFilters({ company, parameter: 'Department' });
  }

  if (catalogId === 'low-stock') {
    return buildItemShortageFilters({ company });
  }

  if (catalogId === 'crm-loyalty') {
    return { company };
  }

  if (catalogId === 'stock-reconciliation') {
    const asOn = dateTo || dateFrom;
    if (!asOn) return null;
    return buildStockAccountValueComparisonFilters({ company, asOnDate: asOn });
  }

  if (!dateFrom || !dateTo) return null;

  switch (catalogId) {
    case 'general-ledger':
      return buildGeneralLedgerFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'sales-profit':
      return buildGrossProfitReportFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'sales-register':
      return buildSalesRegisterFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'item-wise-sales-register':
      return buildItemWiseSalesRegisterFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'purchase-register':
      return buildPurchaseRegisterFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'sales-by-customer':
      return buildSalesAnalyticsFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
        treeType: 'Customer',
      });
    case 'sales-by-product':
      return buildSalesAnalyticsFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
        treeType: 'Item',
      });
    case 'sales-by-rep':
      return buildSalesPersonWiseSummaryFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
        docType: 'Sales Invoice',
      });
    case 'pos-transactions':
      return buildPOSRegisterFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'purchases-by-supplier':
      return buildPurchaseAnalyticsFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
        treeType: 'Supplier' as PurchaseAnalyticsTree,
      });
    case 'purchases-by-product':
      return buildPurchaseAnalyticsFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
        treeType: 'Item' as PurchaseAnalyticsTree,
      });
    case 'purchase-followup':
      return buildPurchaseOrderAnalysisFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'stock-balance':
      return buildStockBalanceFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'stock-ledger':
      return buildStockLedgerFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'work-order-summary':
      return buildWorkOrderSummaryFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'hr-attendance':
      return buildMonthlyAttendanceSheetFilters({
        company,
        startDate: dateFrom,
        endDate: dateTo,
      });
    case 'hr-attendance-summary':
      return buildShiftAttendanceFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'hr-salary-register':
      return buildSalaryRegisterFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    case 'hr-leave-balance':
      return buildEmployeeLeaveBalanceFilters({
        company,
        fromDate: dateFrom,
        toDate: dateTo,
      });
    default:
      return {
        company,
        from_date: dateFrom,
        to_date: dateTo,
      };
  }
}
