'use client';

import { useCallback, useState } from 'react';
import { isBranchesEnabled } from '@/lib/core/setup-config';

const KEY = 'erp_scope_branch';

/**
 * تصفية اختيارية حسب الفرع (P2) — تُدمج مع `filters` في useDocList عند وجود قيمة.
 */
export function useBranchScope(): {
  branch: string;
  setBranch: (v: string) => void;
  branchFilters: string[][] | undefined;
  branchesEnabled: boolean;
} {
  const [branch, setBranchState] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(KEY) || '';
    } catch {
      return '';
    }
  });

  const setBranch = useCallback((v: string) => {
    const t = v.trim();
    try {
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setBranchState(t);
  }, []);

  const enabled = isBranchesEnabled();
  const branchFilters = (enabled && branch) ? ([['branch', '=', branch]] as string[][]) : undefined;
  return { branch, setBranch, branchFilters, branchesEnabled: enabled };
}
