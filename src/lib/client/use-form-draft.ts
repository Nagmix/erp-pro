"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseFormDraftOptions<T> {
  key: string;
  enabled?: boolean;
  initialValue: T;
  delayMs?: number;
}

/** حفظ تلقائي للمسودات في localStorage مع debounce (fixsystem phase 2.10). */
export function useFormDraft<T>({
  key,
  enabled = true,
  initialValue,
  delayMs = 500,
}: UseFormDraftOptions<T>) {
  const storageKey = useMemo(() => `erp:draft:${key}`, [key]);
  const [hydrated, setHydrated] = useState(false);
  const timerRef = useRef<number | null>(null);

  const readDraft = useCallback((): T | null => {
    if (!enabled || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [enabled, storageKey]);

  useEffect(() => {
    queueMicrotask(() => setHydrated(true));
  }, []);

  const saveDraft = useCallback(
    (value: T) => {
      if (!enabled || typeof window === "undefined" || !hydrated) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
          // تجاهل أخطاء السعة أو منع التخزين.
        }
      }, delayMs);
    },
    [enabled, hydrated, storageKey, delayMs]
  );

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  return {
    readDraft,
    saveDraft,
    clearDraft,
    hydrated,
    initialValue,
  };
}
