'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRealtime, type RealtimeConnectionStatus, type RealtimeEvent } from '@/hooks/use-realtime';
import { useAuthStore } from '@/stores/auth-store';

// ============================================================
// Types
// ============================================================

type RealtimeContextValue = {
  /** Current connection/polling status */
  status: RealtimeConnectionStatus;
  /** Timestamp of the last successful poll */
  lastPollAt: number | null;
  /** Force-invalidate all cached queries */
  invalidateAll: () => void;
  /** Register a doctype for real-time invalidation */
  watchDoctype: (doctype: string) => void;
  /** Unregister a doctype from real-time invalidation */
  unwatchDoctype: (doctype: string) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [watchedDoctypes, setWatchedDoctypes] = useState<Set<string>>(new Set());
  const toastShownRef = useRef<Set<string>>(new Set());

  const handleDocUpdate = useCallback(
    (event: RealtimeEvent) => {
      if (!event.doctype) return;

      // Invalidate the doc list and specific doc queries
      queryClient.invalidateQueries({ queryKey: ['docList', event.doctype] });
      if (event.name) {
        queryClient.invalidateQueries({ queryKey: ['doc', event.doctype, event.name] });
      }

      // Invalidate dashboard KPIs for financial changes
      const financialDoctypes = [
        'Sales Invoice',
        'Purchase Invoice',
        'Payment Entry',
        'Journal Entry',
        'Stock Entry',
      ];
      if (financialDoctypes.includes(event.doctype)) {
        queryClient.invalidateQueries({ queryKey: ['dashboardKPIs'] });
      }

      // Show toast for important actions (but throttle — no more than 1 toast per doctype per 10s)
      const toastKey = `${event.doctype}-${event.action}`;
      if (!toastShownRef.current.has(toastKey)) {
        toastShownRef.current.add(toastKey);
        setTimeout(() => toastShownRef.current.delete(toastKey), 10_000);

        const actionLabel: Record<string, string> = {
          create: 'إنشاء',
          update: 'تحديث',
          delete: 'حذف',
          submit: 'ترحيل',
          cancel: 'إلغاء',
        };
        const action = actionLabel[event.action ?? 'update'] ?? 'تحديث';

        toast.message(`تحديث: ${event.doctype}`, {
          description: `تم ${action} السجل${event.name ? ` ${event.name}` : ''}`,
          duration: 4000,
        });
      }
    },
    [queryClient]
  );

  const handleNotification = useCallback(
    (data: unknown) => {
      // Invalidate notification queries
      queryClient.invalidateQueries({ queryKey: ['docList', 'Notification Log'] });

      // Parse notification data for toast
      const notif = data as { subject?: string; document_type?: string; document_name?: string };
      if (notif.subject) {
        toast.message(notif.subject, {
          description: [notif.document_type, notif.document_name].filter(Boolean).join(' · '),
          duration: 5000,
        });
      }
    },
    [queryClient]
  );

  const { status, lastPollAt, invalidateAll } = useRealtime({
    enabled: isAuthenticated,
    onDocUpdate: handleDocUpdate,
    onNotification: handleNotification,
    pollInterval: 30_000,
  });

  // ── Watch/unwatch doctypes ────────────────────────────────────
  const watchDoctype = useCallback((doctype: string) => {
    setWatchedDoctypes((prev) => {
      const next = new Set(prev);
      next.add(doctype);
      return next;
    });
  }, []);

  const unwatchDoctype = useCallback((doctype: string) => {
    setWatchedDoctypes((prev) => {
      const next = new Set(prev);
      next.delete(doctype);
      return next;
    });
  }, []);

  // ── Periodic full invalidation for watched doctypes (60s) ─────
  useEffect(() => {
    if (!isAuthenticated || watchedDoctypes.size === 0) return;

    const interval = setInterval(() => {
      for (const dt of watchedDoctypes) {
        queryClient.invalidateQueries({ queryKey: ['docList', dt] });
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isAuthenticated, watchedDoctypes, queryClient]);

  // ── Provide context value ─────────────────────────────────────
  const value: RealtimeContextValue = {
    status,
    lastPollAt,
    invalidateAll,
    watchDoctype,
    unwatchDoctype,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

// ============================================================
// Hooks
// ============================================================

/**
 * Access the real-time context from any component inside RealtimeProvider.
 */
export function useRealtimeContext(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    // Return a safe fallback when used outside the provider
    return {
      status: 'disconnected',
      lastPollAt: null,
      invalidateAll: () => {},
      watchDoctype: () => {},
      unwatchDoctype: () => {},
    };
  }
  return ctx;
}

/**
 * Hook to register a doctype for automatic query invalidation.
 * Use this in list pages to ensure data stays fresh.
 *
 * @example
 * ```tsx
 * function SalesInvoicesPage() {
 *   useRealtimeInvalidation('Sales Invoice');
 *   // ... list rendering
 * }
 * ```
 */
export function useRealtimeInvalidation(doctype: string, enabled = true) {
  const { watchDoctype, unwatchDoctype, status } = useRealtimeContext();

  useEffect(() => {
    if (!enabled || !doctype) return;
    watchDoctype(doctype);
    return () => unwatchDoctype(doctype);
  }, [doctype, enabled, watchDoctype, unwatchDoctype]);

  return { status };
}
