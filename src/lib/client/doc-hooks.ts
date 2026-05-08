'use client';

/**
 * Named DocType list hooks (DEVELOPMENT_PLAN 1.2) — thin wrappers over useDocList.
 * Row type defaults to Record<string, unknown> unless you pass a generic.
 */

import { useDocList } from '@/lib/client/hooks';

type ListOpts = {
  fields?: string[];
  filters?: Record<string, unknown> | string[][];
  or_filters?: Record<string, unknown> | string[][];
  order_by?: string;
  limit?: number;
  offset?: number;
};

// ============================================================
// المحاسبة (Accounting)
// ============================================================

export function useAccounts<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Account', options);
}

export function useSalesInvoices<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Sales Invoice', options);
}

export function usePurchaseInvoices<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Purchase Invoice', options);
}

export function useJournalEntries<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Journal Entry', options);
}

export function usePaymentEntries<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Payment Entry', options);
}

export function useCostCenters<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Cost Center', options);
}

export function useFiscalYears<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Fiscal Year', options);
}

export function useCompanies<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Company', options);
}

export function useAssets<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Asset', options);
}

// ============================================================
// المبيعات (Sales)
// ============================================================

export function useCustomers<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Customer', options);
}

export function useSalesOrders<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Sales Order', options);
}

export function useQuotations<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Quotation', options);
}

export function useDeliveryNotes<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Delivery Note', options);
}

// ============================================================
// المشتريات (Purchases)
// ============================================================

export function useSuppliers<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Supplier', options);
}

export function usePurchaseOrders<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Purchase Order', options);
}

export function usePurchaseReceipts<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Purchase Receipt', options);
}

export function useMaterialRequests<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Material Request', options);
}

export function useRequestForQuotations<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Request for Quotation', options);
}

export function useSupplierQuotations<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Supplier Quotation', options);
}

// ============================================================
// المخزون (Inventory)
// ============================================================

export function useItems<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Item', options);
}

export function useWarehouses<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Warehouse', options);
}

export function useStockEntries<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Stock Entry', options);
}

export function useBatches<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Batch', options);
}

export function useSerialNumbers<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Serial No', options);
}

export function usePriceLists<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Price List', options);
}

// ============================================================
// الموارد البشرية (HR)
// ============================================================

export function useEmployees<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Employee', options);
}

export function useAttendance<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Attendance', options);
}

export function useLeaves<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Leave Application', options);
}

export function useSalarySlips<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Salary Slip', options);
}

export function useSalaryStructures<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Salary Structure', options);
}

export function usePayrollEntries<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Payroll Entry', options);
}

export function useExpenseClaims<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Expense Claim', options);
}

export function useContracts<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Contract', options);
}

// ============================================================
// التصنيع (Manufacturing)
// ============================================================

export function useBOMs<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('BOM', options);
}

export function useWorkOrders<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Work Order', options);
}

export function useProductionPlans<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Production Plan', options);
}

export function useWorkstations<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Workstation', options);
}

// ============================================================
// CRM
// ============================================================

export function useLeads<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Lead', options);
}

export function useOpportunities<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Opportunity', options);
}
