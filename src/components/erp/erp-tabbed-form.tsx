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

/** تبويب احترافي للنماذج الطويلة مع أيقونات ومؤشر أخطاء.
 * تصميم محسّن: أيقونات ملونة، حدود، ظلال، وتفاعلية أفضل. */
export function ErpTabbedForm({ tabs, defaultValue, className }: Props) {
  const first = tabs[0]?.value ?? '';
  return (
    <Tabs defaultValue={defaultValue ?? first} dir="rtl" className={cn('space-y-4', className)}>
      <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1.5 w-full justify-start rounded-xl border border-border/30">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn(
              'text-xs rounded-lg px-3 py-2 transition-all duration-200',
              'data-[state=active]:bg-background data-[state=active]:shadow-sm',
              'data-[state=active]:border data-[state=active]:border-border/40',
              'flex items-center gap-2 font-medium',
              t.errorCount && t.errorCount > 0 && 'text-destructive data-[state=active]:text-destructive data-[state=active]:border-destructive/30 data-[state=active]:bg-destructive/5'
            )}
          >
            {t.icon ? (
              <span className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded-md shrink-0',
                'data-[state=active]:bg-primary/10',
                t.errorCount && t.errorCount > 0 ? 'bg-destructive/10' : 'bg-muted/60'
              )}>
                {t.icon}
              </span>
            ) : null}
            <span>{t.label}</span>
            {t.errorCount && t.errorCount > 0 ? (
              <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/15 px-1 text-[10px] font-bold text-destructive">
                {t.errorCount}
              </span>
            ) : null}
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
