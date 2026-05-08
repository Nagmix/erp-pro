'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { PanelRightClose } from 'lucide-react';

type PanelState = { title: string; content: ReactNode } | null;

type ContextRailValue = {
  openPanel: (title: string, content: ReactNode) => void;
  closePanel: () => void;
  isOpen: boolean;
};

const ContextRailContext = createContext<ContextRailValue | null>(null);

export function useContextRail(): ContextRailValue {
  const ctx = useContext(ContextRailContext);
  if (!ctx) {
    return {
      openPanel: () => {},
      closePanel: () => {},
      isOpen: false,
    };
  }
  return ctx;
}

/**
 * شريط جانبي سياقي ثانٍ (بجانب التنقل الرئيسي) — المرحلة 12.1.
 * استدعِ `useContextRail().openPanel('عنوان', <محتوى />)` من أي صفحة.
 */
export function ContextRailProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<PanelState>(null);

  const openPanel = useCallback((title: string, content: ReactNode) => {
    setPanel({ title, content });
  }, []);

  const closePanel = useCallback(() => setPanel(null), []);

  const value = useMemo(
    () => ({
      openPanel,
      closePanel,
      isOpen: panel != null,
    }),
    [openPanel, closePanel, panel]
  );

  return (
    <ContextRailContext.Provider value={value}>
      <div className="flex flex-col lg:flex-row gap-0 min-h-0">
        <div className="flex-1 min-w-0">{children}</div>
        {panel && (
          <aside
            className="hidden lg:flex lg:flex-col w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-s border-border bg-card/95 backdrop-blur-sm shadow-sm animate-in slide-in-from-bottom-2 lg:slide-in-from-right-4 duration-200"
            dir="rtl"
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
              <h2 className="text-sm font-semibold truncate">{panel.title}</h2>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={closePanel}>
                <PanelRightClose className="h-4 w-4" />
                <span className="sr-only">إغلاق اللوحة</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 text-sm">{panel.content}</div>
          </aside>
        )}
      </div>
    </ContextRailContext.Provider>
  );
}
