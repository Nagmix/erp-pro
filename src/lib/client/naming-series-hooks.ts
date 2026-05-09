'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * نوع مستند واحد مع خيارات التسلسل
 */
export type NamingSeriesOption = {
  doctype: string;
  label: string;
  defaultPrefix: string;
  seriesOptions: string[];
  counterInfo: Record<string, number>;
  hasNamingSeries?: boolean;
};

/**
 * جلب جميع بيانات الترقيم المتسلسل
 */
export function useNamingSeries() {
  return useQuery<NamingSeriesOption[]>({
    queryKey: ['namingSeries'],
    queryFn: async () => {
      const res = await fetch('/api/settings/naming-series');
      const j = await res.json();
      if (j?.success && Array.isArray(j.data)) return j.data;
      return [];
    },
    staleTime: 60_000,
  });
}

/**
 * جلب خيارات التسلسل لنوع مستند محدد
 */
export function useNamingSeriesForDoctype(doctype: string, enabled: boolean = true) {
  return useQuery<NamingSeriesOption>({
    queryKey: ['namingSeries', doctype],
    queryFn: async () => {
      const res = await fetch(`/api/settings/naming-series?doctype=${encodeURIComponent(doctype)}`);
      const j = await res.json();
      if (j?.success) return j.data;
      return {
        doctype,
        label: doctype,
        defaultPrefix: '',
        seriesOptions: [],
        counterInfo: {},
      };
    },
    enabled: Boolean(doctype) && enabled,
    staleTime: 60_000,
  });
}
