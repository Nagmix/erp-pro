'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDocList } from '@/lib/client/hooks';
import { useAuthStore } from '@/stores/auth-store';

// ============================================================
// Real-time Event Types
// ============================================================

export type RealtimeEvent = {
  doctype?: string;
  name?: string;
  action?: 'create' | 'update' | 'delete' | 'submit' | 'cancel';
  data?: Record<string, unknown>;
};

export type RealtimeConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export type UseRealtimeOptions = {
  /** ERPNext doctype to listen for changes */
  doctype?: string;
  /** Called when a doc of the watched doctype is created/updated/deleted */
  onDocUpdate?: (event: RealtimeEvent) => void;
  /** Called when a notification is received */
  onNotification?: (data: unknown) => void;
  /** Whether to connect (default: true if user is authenticated) */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  pollInterval?: number | false;
};

// ============================================================
// Notification Log Row Type
// ============================================================

type NotificationLogRow = {
  name: string;
  subject?: string;
  document_type?: string;
  document_name?: string;
  read?: number | boolean;
  creation?: string;
};

// ============================================================
// Real-time Store (singleton pattern for cross-component state)
// ============================================================

type RealtimeState = {
  status: RealtimeConnectionStatus;
  lastPollAt: number | null;
  lastErrorAt: number | null;
  consecutiveErrors: number;
};

type RealtimeListener = (state: RealtimeState) => void;

const realtimeState: RealtimeState = {
  status: 'disconnected',
  lastPollAt: null,
  lastErrorAt: null,
  consecutiveErrors: 0,
};

const realtimeListeners = new Set<RealtimeListener>();

function setRealtimeStatus(status: RealtimeConnectionStatus) {
  realtimeState.status = status;
  realtimeListeners.forEach((listener) => listener({ ...realtimeState }));
}

function updateRealtimeState(partial: Partial<RealtimeState>) {
  Object.assign(realtimeState, partial);
  realtimeListeners.forEach((listener) => listener({ ...realtimeState }));
}

/**
 * Subscribe to real-time connection state changes.
 * Returns an unsubscribe function.
 */
function subscribeRealtimeState(listener: RealtimeListener): () => void {
  realtimeListeners.add(listener);
  return () => {
    realtimeListeners.delete(listener);
  };
}

// ============================================================
// Main useRealtime Hook
// ============================================================

/**
 * Polling-based real-time hook that periodically checks for updates
 * using React Query's refetchInterval mechanism.
 *
 * This replaces the Socket.IO approach with a reliable polling strategy:
 * - Polls for Notification Log changes every 30 seconds
 * - Detects new notifications by comparing with previous data
 * - Invalidates relevant React Query caches when changes are detected
 * - Tracks connection status based on poll success/failure
 *
 * Since socket.io-client IS available in this project, we also attempt
 * a WebSocket connection to the ERPNext Socket.IO server at port 9000.
 * If the WebSocket connection fails, we gracefully fall back to polling.
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const {
    doctype,
    onDocUpdate,
    onNotification,
    enabled: enabledProp,
    pollInterval = 30_000,
  } = options;

  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const enabled = enabledProp ?? isAuthenticated;

  const [status, setStatus] = useState<RealtimeConnectionStatus>(
    enabled ? 'connected' : 'disconnected'
  );
  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  // QUA-06: refs للـ callbacks — تُبقي معالجات WS محدثة بلا إعادة اتصال
  const onDocUpdateRef = useRef(onDocUpdate);
  const onNotificationRef = useRef(onNotification);
  onDocUpdateRef.current = onDocUpdate;
  onNotificationRef.current = onNotification;

  // Subscribe to global realtime state
  useEffect(() => {
    statusUnsubscribeRef.current = subscribeRealtimeState((state) => {
      setStatus(state.status);
    });
    return () => {
      statusUnsubscribeRef.current?.();
    };
  }, []);

  // ── Notification Polling ──────────────────────────────────────
  const forUser = user?.name?.trim() ?? '';

  const { data: notifications, isError: notificationsError } = useDocList<NotificationLogRow>(
    'Notification Log',
    {
      fields: ['name', 'subject', 'document_type', 'document_name', 'read', 'creation'],
      ...(forUser ? { filters: [['for_user', '=', forUser]] as string[][] } : {}),
      order_by: 'creation desc',
      limit: 30,
      enabled: enabled && Boolean(forUser),
      refetchInterval: pollInterval || false,
      refetchOnWindowFocus: true,
    }
  );

  // ── Process notification changes ──────────────────────────────
  useEffect(() => {
    if (!notifications) return;

    const currentIds = new Set(notifications.map((n) => n.name));
    const prevIds = prevNotificationIdsRef.current;

    // First poll — just store the IDs, don't trigger notifications
    if (prevIds.size === 0) {
      prevNotificationIdsRef.current = currentIds;
      return;
    }

    // Detect new notifications
    const newNotificationIds = [...currentIds].filter((id) => !prevIds.has(id));
    prevNotificationIdsRef.current = currentIds;

    if (newNotificationIds.length > 0) {
      // Find the new notification items
      const newItems = notifications.filter((n) => newNotificationIds.includes(n.name));

      for (const item of newItems) {
        // Call the onNotification callback
        onNotification?.(item);

        // Call the onDocUpdate callback if the doctype matches
        if (doctype && item.document_type === doctype) {
          onDocUpdate?.({
            doctype: item.document_type,
            name: item.document_name,
            action: 'update',
            data: item as unknown as Record<string, unknown>,
          });
        }
      }

      // Invalidate relevant queries for the doctypes in notifications
      const affectedDoctypes = new Set<string>();
      for (const item of newItems) {
        if (item.document_type) {
          affectedDoctypes.add(item.document_type);
        }
      }

      for (const dt of affectedDoctypes) {
        queryClient.invalidateQueries({ queryKey: ['docList', dt] });
      }

      // Always invalidate Notification Log queries
      queryClient.invalidateQueries({ queryKey: ['docList', 'Notification Log'] });
    }
  }, [notifications, doctype, onDocUpdate, onNotification, queryClient]);

  // ── Track connection status based on poll results ─────────────
  useEffect(() => {
    if (!enabled) {
      updateRealtimeState({ status: 'disconnected' });
      return;
    }

    if (notificationsError) {
      const now = Date.now();
      const nextConsecutiveErrors = realtimeState.consecutiveErrors + 1;
      // After 3 consecutive errors, consider disconnected
      if (nextConsecutiveErrors >= 3) {
        updateRealtimeState({
          status: 'disconnected',
          lastErrorAt: now,
          consecutiveErrors: nextConsecutiveErrors,
        });
      } else {
        updateRealtimeState({
          status: 'reconnecting',
          lastErrorAt: now,
          consecutiveErrors: nextConsecutiveErrors,
        });
      }
    } else if (notifications !== undefined) {
      updateRealtimeState({
        status: 'connected',
        lastPollAt: Date.now(),
        consecutiveErrors: 0,
      });
    }
  }, [enabled, notifications, notificationsError]);

  // ── WebSocket Connection (best-effort) ────────────────────────
  // Attempt to connect to ERPNext Socket.IO via native WebSocket.
  // If the connection fails (server not available), we gracefully
  // fall back to the polling mechanism above.
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !forUser) return;

    // QUA-06: العنوان الافتراضي من نافذة المتصفح الحالية بدل ws://localhost:9000
    // (كل متصفح كان سيحاول الاتصال بجهازه نفسه!) — ويمكن تخصيصه عبر NEXT_PUBLIC_ERP_SOCKET_URL
    const socketUrl =
      process.env.NEXT_PUBLIC_ERP_SOCKET_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/socket.io/?EIO=4&transport=websocket`
        : '');
    if (!socketUrl) return;

    let cancelled = false;

    function connectWS() {
      if (cancelled) return;

      try {
        const ws = new WebSocket(socketUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) { ws.close(); return; }
          // WebSocket connected — upgrade status if still polling
          if (realtimeState.status === 'connected') {
            // Already connected via polling, this just confirms it
          }
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          try {
            const raw = typeof event.data === 'string' ? event.data : '';
            // Socket.IO protocol: messages starting with "42" are event messages
            if (raw.startsWith('42')) {
              const jsonStr = raw.slice(2);
              const parsed = JSON.parse(jsonStr) as [string, ...unknown[]];
              const eventName = parsed[0];
              const eventData = parsed[1];

              if (eventName === 'doc_update' || eventName === 'doc_create' || eventName === 'doc_delete') {
                const docData = eventData as { doctype?: string; name?: string };
                if (docData.doctype) {
                  queryClient.invalidateQueries({ queryKey: ['docList', docData.doctype] });
                  if (docData.name) {
                    queryClient.invalidateQueries({ queryKey: ['doc', docData.doctype, docData.name] });
                  }
                }
                onDocUpdateRef.current?.({
                  doctype: docData.doctype,
                  name: docData.name,
                  action: eventName === 'doc_create' ? 'create' : eventName === 'doc_delete' ? 'delete' : 'update',
                });
              } else if (eventName === 'notification') {
                onNotificationRef.current?.(eventData);
                queryClient.invalidateQueries({ queryKey: ['docList', 'Notification Log'] });
              }
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onerror = () => {
          // WebSocket error — polling will take over
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!cancelled) {
            // Reconnect after 30 seconds
            wsReconnectTimerRef.current = setTimeout(connectWS, 30_000);
          }
        };
      } catch {
        // WebSocket not supported or URL invalid — polling fallback is active
      }
    }

    connectWS();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
      if (wsReconnectTimerRef.current) {
        clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
    };
  }, [enabled, forUser, doctype, queryClient]); // QUA-06: callbacks عبر refs — لا اتصال/فصل متكرر

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      prevNotificationIdsRef.current = new Set();
    };
  }, []);

  return {
    /** Current connection status */
    status,
    /** Last successful poll timestamp */
    lastPollAt: realtimeState.lastPollAt,
    /** Number of consecutive poll errors */
    consecutiveErrors: realtimeState.consecutiveErrors,
    /** Manually invalidate all doctype queries */
    invalidateAll: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['docList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardKPIs'] });
    }, [queryClient]),
  };
}

// ============================================================
// Exported getter for reading realtime state outside React
// ============================================================

export function getRealtimeState(): RealtimeState {
  return { ...realtimeState };
}
