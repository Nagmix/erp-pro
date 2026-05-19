/**
 * useComponentHealth — فحص صحة مكونات النظام
 *
 * يجلب بيانات فحص الصحة من `/api/setup/component-health` مع تخزين مؤقت لمدة 5 دقائق.
 * يُعيد: { health, loading, error, refetch }
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HealthAction {
  id: string;
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  route: string;
}

export interface ComponentHealth {
  healthy: boolean;
  components: {
    erpnext: {
      reachable: boolean;
      version?: string;
    };
    hrms: {
      installed: boolean;
      setupComplete: boolean;
      missingItems: string[];
    };
    accounts: {
      chartOfAccountsExists: boolean;
      companyDefaultsSet: boolean;
      missingDefaults: string[];
    };
    fiscalYear: {
      exists: boolean;
    };
  };
  warnings: string[];
  actions: HealthAction[];
}

interface UseComponentHealthReturn {
  health: ComponentHealth | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

const CACHE_KEY = '__component_health_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

interface CacheEntry {
  data: ComponentHealth;
  timestamp: number;
}

function readCache(): ComponentHealth | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: ComponentHealth): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // تجاهل أخطاء التخزين
  }
}

function clearCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // تجاهل
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useComponentHealth(): UseComponentHealthReturn {
  const [health, setHealth] = useState<ComponentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async () => {
    // إلغاء أي طلب سابق
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // محاولة القراءة من التخزين المؤقت أولاً
    const cached = readCache();
    if (cached) {
      setHealth(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/setup/component-health', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-store' },
      });

      if (controller.signal.aborted) return;

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: ComponentHealth = await res.json();
      setHealth(data);
      writeCache(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'تعذر فحص صحة النظام';
      setError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchHealth]);

  const refetch = useCallback(() => {
    clearCache();
    fetchHealth();
  }, [fetchHealth]);

  return { health, loading, error, refetch };
}
