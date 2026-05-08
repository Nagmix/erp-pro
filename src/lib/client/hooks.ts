'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetList,
  apiGetDoc,
  apiCreateDoc,
  apiUpdateDoc,
  apiDeleteDoc,
  apiSubmitDoc,
  apiCancelDoc,
  apiAmendDoc,
  apiGetDashboardKPIs,
  apiCallMethod,
  apiRunReport,
  apiGetDocComments,
  apiAddDocComment,
  apiGetReportSchedules,
  apiCreateReportSchedule,
  apiToggleReportSchedule,
  apiDeleteReportSchedule,
  apiGetBackups,
  apiCreateBackup,
  apiDeleteBackup,
  apiUpdateBackupSettings,
  type DocComment,
  type ReportSchedule,
  type BackupRecord,
  type BackupSettings,
  type BackupListResponse,
} from '@/lib/client/api';
import { type DashboardKPIs, DEFAULT_DASHBOARD_KPIS } from '@/lib/client/dashboard-kpis.shared';

export type { DashboardKPIs };

// ============================================================
// Generic DocType Hooks (API-only — no embedded demo rows)
// ============================================================

export function useDocList<T>(
  doctype: string,
  options?: {
    fields?: string[];
    filters?: Record<string, unknown> | string[][];
    /** شروط أو (OR) — يستخدمها Frappe كمعامل `or_filters` مستقل */
    or_filters?: Record<string, unknown> | string[][];
    order_by?: string;
    limit?: number;
    offset?: number;
    /** عند `false` لا يُنفَّذ الطلب (مثلاً حتى يختار المستخدم سجل أباً) */
    enabled?: boolean;
    /** تكرار جلب القائمة (مثلاً للإشعارات) — يُمرَّر إلى React Query */
    refetchInterval?: number | false;
    /** عند `true` يُعاد الجلب عند عودة التركيز للنافذة (مفيد للإشعارات) */
    refetchOnWindowFocus?: boolean;
  }
) {
  const { enabled = true, refetchInterval, refetchOnWindowFocus, ...listOptions } = options ?? {};
  return useQuery<T[]>({
    queryKey: ['docList', doctype, listOptions],
    queryFn: () => apiGetList<T>(doctype, listOptions),
    enabled,
    refetchInterval,
    refetchOnWindowFocus,
  });
}

export function useDoc<T>(doctype: string, name: string, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  return useQuery<T | null>({
    queryKey: ['doc', doctype, name],
    queryFn: async (): Promise<T | null> => {
      if (!name) return null;
      return apiGetDoc<T>(doctype, name);
    },
    enabled: Boolean(doctype) && Boolean(name) && enabled,
  });
}

export function useCreateDoc<T>(doctype: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doc: Record<string, unknown>) => apiCreateDoc<T>(doctype, doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
    },
  });
}

export function useUpdateDoc<T>(doctype: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, doc }: { name: string; doc: Record<string, unknown> }) =>
      apiUpdateDoc<T>(doctype, name, doc),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
      queryClient.invalidateQueries({ queryKey: ['doc', doctype, name] });
    },
  });
}

export function useDeleteDoc(doctype: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiDeleteDoc(doctype, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
    },
  });
}

export function useSubmitDoc<T>(doctype: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiSubmitDoc<T>(doctype, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
    },
  });
}

export function useCancelDoc<T>(doctype: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiCancelDoc<T>(doctype, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
    },
  });
}

export function useAmendDoc<T>(doctype: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiAmendDoc<T>(doctype, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
    },
  });
}

/** استدعاء whitelisted method في ERPNext/Frappe (يزيد عن invalidation اختياري) */
export function useErpMethodCall<T = unknown>(invalidateDoctypes: string[] = []) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: { method: string; args?: Record<string, unknown> }) =>
      apiCallMethod<T>(p.method, p.args),
    onSuccess: () => {
      for (const d of invalidateDoctypes) {
        queryClient.invalidateQueries({ queryKey: ['docList', d] });
      }
    },
  });
}

// ============================================================
// Dashboard Hook
// ============================================================

export function useDashboardKPIs() {
  return useQuery<DashboardKPIs>({
    queryKey: ['dashboardKPIs'],
    queryFn: async (): Promise<DashboardKPIs> => {
      const result = await apiGetDashboardKPIs();
      return { ...DEFAULT_DASHBOARD_KPIS, ...result };
    },
  });
}

export function useRunReport<T = unknown>(
  reportId: string,
  filters?: Record<string, unknown>,
  enabled: boolean = true
) {
  return useQuery<T | null>({
    queryKey: ['report', reportId, filters],
    queryFn: () => apiRunReport<T>(reportId, filters),
    enabled: enabled && Boolean(reportId),
    staleTime: 60_000,
  });
}

// ============================================================
// Document Comments Hooks
// ============================================================

export function useDocComments(
  doctype: string,
  docname: string,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  return useQuery<DocComment[]>({
    queryKey: ['docComments', doctype, docname],
    queryFn: () => apiGetDocComments(doctype, docname),
    enabled: Boolean(doctype) && Boolean(docname) && enabled,
  });
}

export function useAddDocComment(doctype: string, docname: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => apiAddDocComment(doctype, docname, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docComments', doctype, docname] });
    },
  });
}

// ============================================================
// Report Scheduler Hooks
// ============================================================

export function useReportSchedules() {
  return useQuery<ReportSchedule[]>({
    queryKey: ['reportSchedules'],
    queryFn: () => apiGetReportSchedules(),
  });
}

export function useCreateReportSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (schedule: Omit<ReportSchedule, 'id'>) => apiCreateReportSchedule(schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportSchedules'] });
    },
  });
}

export function useToggleReportSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiToggleReportSchedule(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportSchedules'] });
    },
  });
}

export function useDeleteReportSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteReportSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportSchedules'] });
    },
  });
}

// ============================================================
// Auto Backup Hooks
// ============================================================

export function useBackups() {
  return useQuery<BackupListResponse>({
    queryKey: ['backups'],
    queryFn: () => apiGetBackups(),
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: 'database' | 'files' | 'full') => apiCreateBackup(type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDeleteBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useUpdateBackupSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<BackupSettings>) => apiUpdateBackupSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}
