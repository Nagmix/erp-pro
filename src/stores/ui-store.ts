'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { writeStoredDefaultCompanyName, clearStoredDefaultCompany } from '@/lib/erp/default-company-storage';

interface CompanyInfo {
  name: string;
  abbr: string;
  company_name: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  /** الشركة المحددة حالياً */
  currentCompany: CompanyInfo | null;
  /** تحديث الشركة الحالية وحفظها في localStorage */
  setCurrentCompany: (company: CompanyInfo | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      currentCompany: null,
      setCurrentCompany: (company) => {
        if (typeof window !== 'undefined') {
          // QUA-05: صيغة موحدة عبر default-company-storage (اسم فقط)
          if (company) {
            writeStoredDefaultCompanyName(company.name);
          } else {
            clearStoredDefaultCompany();
          }
        }
        set({ currentCompany: company });
      },
    }),
    {
      name: 'erp-ui-state',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        currentCompany: state.currentCompany,
      }),
    }
  )
);
