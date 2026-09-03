'use client';

/**
 * QUA-03 (تدقيق 2026-09): مؤشرات لوحات التحكم من الخادم مباشرة.
 *
 * قبل الإصلاح كانت اللوحات تحسب "مبيعات هذا الشهر" إلخ من آخر 100 مستند
 * فقط (limit: 100) — بمجرد تجاوز عدد مستندات الشهر 100 تنهار دقة المؤشر بصمت.
 * المسار `/api/dashboard/kpis` يحسبها خادمياً من حتى 4000 مستند + get_count.
 */
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_DASHBOARD_KPIS, type DashboardKPIs } from './dashboard-kpis.shared';

export function useServerKPIs(enabled = true) {
  return useQuery<DashboardKPIs>({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/kpis');
      const json = (await res.json()) as { success: boolean; error?: string; data?: Partial<DashboardKPIs> };
      if (!json.success) throw new Error(json.error || 'فشل تحميل المؤشرات');
      return { ...DEFAULT_DASHBOARD_KPIS, ...(json.data || {}) } as DashboardKPIs;
    },
    enabled,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}

/** مفتاح الشهر الحالي بصيغة YYYY-MM (متزامن مع lastNCalendarMonthKeys في الخادم). */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** إيراد الشهر الحالي من السلسلة الشهرية الخادمية. */
export function currentMonthRevenue(kpis: DashboardKPIs | undefined): number {
  const key = currentMonthKey();
  return kpis?.monthlyRevenueExpenses?.find((m) => m.month === key)?.revenue ?? 0;
}

/** مصروف الشهر الحالي من السلسلة الشهرية الخادمية. */
export function currentMonthExpenses(kpis: DashboardKPIs | undefined): number {
  const key = currentMonthKey();
  return kpis?.monthlyRevenueExpenses?.find((m) => m.month === key)?.expenses ?? 0;
}
