'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef } from 'react';

type Options = {
  debounceMs?: number;
  enabled?: boolean;
};

/**
 * حفظ تلقائي للمسودات في localStorage (المرحلة 12.2 / 12.4).
 * استدعِ `clearDraft()` بعد حفظ ناجح للمستند.
 */
export function useFormDraft<T extends Record<string, unknown>>(
  storageKey: string,
  values: T,
  setValues: Dispatch<SetStateAction<T>>,
  { debounceMs = 600, enabled = true }: Options = {}
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullKey = `erp_draft_${storageKey}`;

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
    } catch {
      /* ignore */
    }
  }, [fullKey]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<T>;
      if (parsed && typeof parsed === 'object') {
        queueMicrotask(() => setValues((prev) => ({ ...prev, ...parsed })));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(fullKey, JSON.stringify(values));
      } catch {
        /* ignore */
      }
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, fullKey, debounceMs, enabled]);

  return { clearDraft, draftKey: fullKey };
}
