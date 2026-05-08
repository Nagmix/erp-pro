'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type ErpTabDef = {
  value: string;
  label: string;
  icon?: ReactNode;
  errorCount?: number;
  content: ReactNode;
};

type Props = {
  tabs: ErpTabDef[];
  defaultValue?: string;
  className?: string;
};

/** تبويب للنماذج الطويلة مع أيقونات ومؤشر أخطاء (fixsystem phase 2.7). */
export function ErpTabbedForm({ tabs, defaultValue, className }: Props) {
  const first = tabs[0]?.value ?? '';
  return (
    <Tabs defaultValue={defaultValue ?? first} dir="rtl" className={cn('space-y-4', className)}>
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 w-full justify-start">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn(
              'text-xs data-[state=active]:bg-background flex items-center gap-1.5',
              t.errorCount && t.errorCount > 0 && 'text-destructive data-[state=active]:text-destructive'
            )}
          >
            {t.icon ? <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{t.icon}</span> : null}
            <span>{t.label}</span>
            {t.errorCount && t.errorCount > 0 ? (
              <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[10px] font-semibold">
                {t.errorCount}
              </span>
            ) : null}
            {t.errorCount && t.errorCount > 0 ? <CircleAlert className="h-3 w-3" /> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-0 focus-visible:outline-none">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
