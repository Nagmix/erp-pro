'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiPosCheckOpening,
  apiPosCheckReadiness,
  apiPosCloseShift,
  apiPosCreateInvoice,
  apiPosCustomerInfo,
  apiPosOpenShift,
  apiPosPastOrders,
  apiPosProfileData,
  apiPosSessionSummary,
  apiPosSetCustomerInfo,
  apiPosSubmitDraftInvoice,
} from '@/lib/client/api';
import type {
  POSCheckOpeningResponse,
  POSCustomerInfoResponse,
  POSPastOrderRow,
  POSReadinessResponse,
  POSSessionSummaryResponse,
} from '@/lib/core/types';

/**
 * طبقة hooks لنقاط البيع — مواءمة §14 من المواصفات:
 * وردية، جاهزية، فتح/إغلاق، فاتورة ومسودة، عميل، ملخص جلسة، طلبات سابقة، ملف POS (`usePOSProfileData`).
 */

export const posQueryKeys = {
  shift: ['pos', 'check-opening'] as const,
  readiness: (company: string) => ['pos', 'readiness', company] as const,
};

export function usePOSShift(enabled = true) {
  return useQuery({
    queryKey: posQueryKeys.shift,
    queryFn: () => apiPosCheckOpening(),
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

export function usePOSReadiness(company: string | undefined, enabled = true) {
  return useQuery({
    queryKey: posQueryKeys.readiness(company ?? ''),
    queryFn: () => apiPosCheckReadiness(company!),
    enabled: Boolean(company?.trim()) && enabled,
    staleTime: 60_000,
  });
}

export function useOpenPOSShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiPosOpenShift,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posQueryKeys.shift });
      void qc.invalidateQueries({ queryKey: ['docList', 'POS Opening Entry'] });
      void qc.invalidateQueries({ queryKey: ['pos', 'session-summary'] });
    },
  });
}

export function useClosePOSShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiPosCloseShift,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: posQueryKeys.shift });
      void qc.invalidateQueries({ queryKey: ['docList', 'POS Opening Entry'] });
      void qc.invalidateQueries({ queryKey: ['pos', 'session-summary'] });
      void qc.invalidateQueries({ queryKey: ['pos', 'past-orders'] });
    },
  });
}

export function useCreatePosInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { doc: Record<string, unknown>; submit?: boolean }) => apiPosCreateInvoice(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['docList', 'POS Invoice'] });
      void qc.invalidateQueries({ queryKey: ['pos', 'customer-info'] });
      void qc.invalidateQueries({ queryKey: ['pos', 'session-summary'] });
    },
  });
}

export function useSubmitDraftPosInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiPosSubmitDraftInvoice,
    onSuccess: (_d, variables) => {
      void qc.invalidateQueries({ queryKey: ['docList', 'POS Invoice'] });
      void qc.invalidateQueries({ queryKey: ['doc', 'POS Invoice', variables.name] });
    },
  });
}

export function usePOSCustomerInfo(customerName: string | undefined) {
  return useQuery({
    queryKey: ['pos', 'customer-info', customerName ?? ''],
    queryFn: () => apiPosCustomerInfo(customerName!),
    enabled: Boolean(customerName?.trim()),
    staleTime: 20_000,
  });
}

export type PosSetCustomerInfoField = {
  customer: string;
  fieldname: string;
  value: string;
};

/** تحديث حقول عميل عبر `set_customer_info` ثم إبطال `customer-info` تلقائيًا. */
export function usePosSetCustomerInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: PosSetCustomerInfoField[]) => {
      for (const u of updates) {
        await apiPosSetCustomerInfo(u);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pos', 'customer-info'] });
    },
  });
}

/** ملخص الوردية المفتوحة لصفحة الجلسة أو الشاشة؛ `posOpeningEntry` مطلوب عند التفعيل. */
export function usePOSSessionSummary(posOpeningEntry: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['pos', 'session-summary', posOpeningEntry ?? ''],
    queryFn: () => apiPosSessionSummary(posOpeningEntry),
    enabled: Boolean(posOpeningEntry?.trim()) && enabled,
    staleTime: 15_000,
    refetchInterval: enabled && Boolean(posOpeningEntry?.trim()) ? 45_000 : false,
  });
}

export function usePOSPastOrders(
  opts: { pos_profile?: string; company?: string; limit?: number } | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: ['pos', 'past-orders', opts?.pos_profile ?? '', opts?.company ?? '', opts?.limit ?? ''],
    queryFn: () => apiPosPastOrders(opts),
    enabled,
    staleTime: 30_000,
  });
}

/** مستند ملف نقطة البيع للكتالوج — يُفضَّل تمرير الاسم من ملف محمّل أو من `/api/pos/profile-data`. */
export function usePOSProfileData(posProfile: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['pos', 'profile-data', posProfile ?? ''],
    queryFn: () => apiPosProfileData(posProfile!),
    enabled: Boolean(posProfile?.trim()) && enabled,
    staleTime: 45_000,
  });
}

export type {
  POSCheckOpeningResponse,
  POSCustomerInfoResponse,
  POSPastOrderRow,
  POSReadinessResponse,
  POSSessionSummaryResponse,
};
