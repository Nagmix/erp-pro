'use client';

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocList } from '@/lib/client/hooks';
import { apiUpdateDoc } from '@/lib/client/api';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/core/helpers';
import { useAuthStore } from '@/stores/auth-store';

type NotificationLogRow = {
  name: string;
  subject?: string;
  document_type?: string;
  document_name?: string;
  read?: number | boolean;
  creation?: string;
};

export type HeaderNotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'info' | 'warning' | 'error';
  unread: boolean;
  document_type?: string;
  document_name?: string;
};

function typeFromSubject(subject: string): 'info' | 'warning' | 'error' {
  const s = subject.toLowerCase();
  if (s.includes('خطأ') || s.includes('error') || s.includes('فشل')) return 'error';
  if (s.includes('تنبيه') || s.includes('warning') || s.includes('موافقة')) return 'warning';
  return 'info';
}

export function useHeaderNotifications() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const forUser = user?.name?.trim() ?? '';

  const { data, isError, isLoading, refetch } = useDocList<NotificationLogRow>('Notification Log', {
    fields: ['name', 'subject', 'document_type', 'document_name', 'read', 'creation'],
    ...(forUser ? { filters: [['for_user', '=', forUser]] as string[][] } : {}),
    order_by: 'creation desc',
    limit: 20,
    enabled: Boolean(isAuthenticated && forUser),
    refetchInterval: 90_000,
    refetchOnWindowFocus: true,
  });

  const items: HeaderNotificationItem[] = useMemo(() => {
    if (isError || !data?.length) return [];
    return data.map((row) => {
      const title = (row.subject || row.document_type || 'إشعار').trim();
      const bodyParts = [row.document_type, row.document_name].filter(Boolean);
      const body = bodyParts.join(' · ') || row.name;
      const unread = row.read === 0 || row.read === false;
      return {
        id: row.name,
        title,
        body,
        time: row.creation ? formatDate(String(row.creation).split(' ')[0] || '') : '',
        type: typeFromSubject(title),
        unread,
        document_type: row.document_type,
        document_name: row.document_name,
      };
    });
  }, [data, isError]);

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);

  return { items, unreadCount, isError, isLoading, refetch, forUserReady: Boolean(forUser) };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiUpdateDoc('Notification Log', name, { read: 1 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['docList', 'Notification Log'] });
    },
  });
}

export function notificationToneClass(type: 'info' | 'warning' | 'error') {
  return cn(
    'mt-1 h-2 w-2 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-card',
    type === 'info' && 'bg-info ring-info/25',
    type === 'warning' && 'bg-warning ring-warning/25',
    type === 'error' && 'bg-destructive ring-destructive/25'
  );
}
