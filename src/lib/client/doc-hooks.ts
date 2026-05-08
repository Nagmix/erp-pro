'use client';

/**
 * Named DocType list hooks (DEVELOPMENT_PLAN 1.2) — thin wrappers over useDocList.
 * Row type defaults to Record<string, unknown> unless you pass a generic.
 */

import { useDocList } from '@/lib/client/hooks';

type ListOpts = {
  fields?: string[];
  filters?: Record<string, unknown> | string[][];
  order_by?: string;
  limit?: number;
  offset?: number;
};

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

export function useCustomers<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Customer', options);
}

export function useSuppliers<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Supplier', options);
}

export function useItems<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Item', options);
}

export function useWarehouses<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Warehouse', options);
}

export function useStockEntries<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Stock Entry', options);
}

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

export function useBOMs<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('BOM', options);
}

export function useWorkOrders<T = Record<string, unknown>>(options?: ListOpts) {
  return useDocList<T>('Work Order', options);
}
