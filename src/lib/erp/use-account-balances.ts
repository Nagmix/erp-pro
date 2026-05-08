'use client';

import { useQueries } from '@tanstack/react-query';
import { apiCallMethod } from '@/lib/client/api';

/**
 * Best-effort parallel balance per account via ERPNext whitelisted util (if available on site).
 */
export function useAccountBalances(
  accountNames: string[],
  company: string,
  asOfDate: string,
  enabled: boolean
) {
  return useQueries({
    queries: accountNames.map((name) => ({
      queryKey: ['accountBalance', name, company, asOfDate],
      enabled: enabled && Boolean(company && name),
      queryFn: async () => {
        try {
          const n = await apiCallMethod<number | string>(
            'erpnext.accounts.utils.get_balance_on',
            {
              account: name,
              company,
              date: asOfDate,
            } as Record<string, unknown>
          );
          if (n === null || n === undefined) return 0;
          return typeof n === 'number' ? n : parseFloat(String(n)) || 0;
        } catch {
          return 0;
        }
      },
      staleTime: 60_000,
    })),
  });
}

export function balanceMapFromQueries(
  accountNames: string[],
  results: { data?: number }[]
): Record<string, number> {
  const m: Record<string, number> = {};
  accountNames.forEach((name, i) => {
    const d = results[i]?.data;
    if (d !== undefined) m[name] = d;
  });
  return m;
}
