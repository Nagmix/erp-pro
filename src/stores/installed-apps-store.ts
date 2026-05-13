/**
 * مخزن التطبيقات المثبتة
 *
 * يخزن قائمة التطبيقات المثبتة على خادم ERPNext.
 * يُستخدم لتحديد الوحدات المتاحة بناءً على التطبيقات المثبتة.
 * مثال: وحدة HR تتطلب تطبيق HRMS — إذا لم يكن مثبتاً لن تظهر الوحدة.
 */
import { create } from 'zustand';

interface InstalledAppsState {
  /** قائمة أسماء التطبيقات المثبتة (مثل ['frappe', 'erpnext', 'hrms']) */
  installedApps: string[];
  /** هل تم تحميل البيانات */
  loaded: boolean;
  /** هل يتم التحميل حالياً */
  loading: boolean;
  /** وقت آخر تحديث */
  lastFetched: number | null;
  /** جلب التطبيقات المثبتة من الخادم */
  fetchInstalledApps: () => Promise<void>;
  /** فحص هل تطبيق معين مثبت */
  isAppInstalled: (appName: string) => boolean;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export const useInstalledAppsStore = create<InstalledAppsState>((set, get) => ({
  installedApps: [],
  loaded: false,
  loading: false,
  lastFetched: null,

  fetchInstalledApps: async () => {
    const { loading, lastFetched } = get();
    if (loading) return;
    // لا نعيد التحميل إذا لم تمضِ مدة التخزين المؤقت
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL && get().loaded) return;

    set({ loading: true });
    try {
      const res = await fetch('/api/setup/installed-apps');
      const data = await res.json() as { success: boolean; installedApps?: string[] };
      if (data.success && data.installedApps) {
        set({
          installedApps: data.installedApps,
          loaded: true,
          lastFetched: Date.now(),
        });
      } else {
        // إذا فشل الطلب، نفترض أن erpnext مثبت (الحد الأدنى)
        set({
          installedApps: ['erpnext'],
          loaded: true,
          lastFetched: Date.now(),
        });
      }
    } catch {
      // في حالة الخطأ، نحتفظ بالبيانات السابقة إن وُجدت
      if (!get().loaded) {
        set({ installedApps: ['erpnext'], loaded: true, lastFetched: Date.now() });
      }
    } finally {
      set({ loading: false });
    }
  },

  isAppInstalled: (appName: string) => {
    const { installedApps } = get();
    return installedApps.some((ia) => ia.toLowerCase().includes(appName.toLowerCase()));
  },
}));
