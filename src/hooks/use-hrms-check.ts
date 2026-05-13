/**
 * تحقق من توفر تطبيق HRMS
 *
 * يُستخدم في صفحات HR لعرض رسالة مناسبة إذا لم يكن تطبيق HRMS مثبتاً.
 * بدلاً من منع الوصول تماماً، نعرض تحذيراً مع تعليمات التثبيت.
 */
'use client';

import { useInstalledAppsStore } from '@/stores/installed-apps-store';
import { useEffect } from 'react';

export function useHrmsCheck() {
  const { isAppInstalled, fetchInstalledApps, loaded } = useInstalledAppsStore();

  useEffect(() => {
    if (!loaded) {
      fetchInstalledApps();
    }
  }, [loaded, fetchInstalledApps]);

  const hrmsInstalled = isAppInstalled('hrms');

  return { hrmsInstalled, loaded };
}
