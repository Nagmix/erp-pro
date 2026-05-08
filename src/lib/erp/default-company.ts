'use client';

import { useEffect, useMemo, useState } from 'react';

import { useDocList } from '@/lib/client/hooks';

/**
 * الشركة الافتراضية:
 * - يقرأ تفضيل الواجهة المحلي `erp_default_company` (من صفحة الإعدادات).
 * - يتحقق من وجود الشركة في ERPNext (قائمة Company).
 * - يسقط إلى أول شركة متاحة عند غياب الإعداد أو عدم تطابق الاسم.
 */
export function useDefaultCompanyName(): { company: string; isLoading: boolean } {
  const { data, isLoading } = useDocList<Record<string, unknown>>('Company', {
    fields: ['name', 'default_currency'],
    limit: 20,
  });

  const [storedCompany, setStoredCompany] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window === 'undefined') return;
      try {
        const raw = window.localStorage.getItem('erp_default_company');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'string') setStoredCompany(parsed);
        }
      } catch {
        setStoredCompany('');
      }
    });
  }, []);

  const company = useMemo(() => {
    const list = (data ?? [])
      .map((row) => (row && typeof row.name === 'string' ? row.name : ''))
      .filter(Boolean);

    // 1) إعداد الواجهة إذا كان موجوداً وموجوداً في ERP
    if (storedCompany && list.includes(storedCompany)) return storedCompany;
    // 2) إعداد الواجهة حتى لو لم نتأكد من وجوده (يفيد في البيئات بدون بيانات شركة بعد)
    if (storedCompany) return storedCompany;
    // 3) أول شركة من ERP
    if (list[0]) return list[0];
    return '';
  }, [data, storedCompany]);

  return { company, isLoading: isLoading && !company };
}
