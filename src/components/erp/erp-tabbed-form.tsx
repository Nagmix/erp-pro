'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  /** Controlled mode — pass value + onValueChange for external tab control */
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
};

/** تبويب احترافي للنماذج الطويلة مع أيقونات ومؤشر أخطاء.
 * تصميم محسّن: تدرج لوني، حدود سفلية مؤشرة، أيقونات ملونة مميزة،
 * تأثيرات تفاعلية سلسة، وشارة أخطاء نابضة. */
export function ErpTabbedForm({ tabs, defaultValue, value, onValueChange, className }: Props) {
  const first = tabs[0]?.value ?? '';
  const isControlled = value !== undefined;
  return (
    <Tabs
      {...(isControlled ? { value, onValueChange } : { defaultValue: defaultValue ?? first })}
      dir="rtl"
      className={cn('space-y-4', className)}
    >
      <TabsList className="flex flex-wrap h-auto gap-1.5 bg-muted/30 p-1.5 w-full justify-start rounded-xl border border-border/20">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className={cn(
              // Base styles
              'text-xs rounded-lg px-3 py-2.5 transition-all duration-250 ease-out',
              'flex items-center gap-2 font-medium relative',
              // Inactive state
              'text-muted-foreground hover:text-foreground',
              'hover:bg-background/60 hover:shadow-sm',
              // Active state - gradient background + bottom indicator
              'data-[state=active]:bg-gradient-to-b data-[state=active]:from-background data-[state=active]:to-muted/40',
              'data-[state=active]:shadow-md data-[state=active]:shadow-primary/5',
              'data-[state=active]:text-foreground data-[state=active]:font-semibold',
              // Bottom border indicator via after pseudo-element
              'after:absolute after:bottom-0 after:start-2 after:end-2 after:h-[2.5px] after:rounded-full',
              'after:bg-transparent after:transition-all after:duration-250',
              'data-[state=active]:after:bg-primary',
              // Error styling
              t.errorCount && t.errorCount > 0 && [
                'text-destructive/80',
                'data-[state=active]:text-destructive',
                'data-[state=active]:from-destructive/5 data-[state=active]:to-background',
                'data-[state=active]:shadow-destructive/5',
                'data-[state=active]:after:bg-destructive',
              ]
            )}
          >
            {t.icon ? (
              <span className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0 transition-all duration-250',
                'bg-muted/50 text-muted-foreground',
                'data-[state=active]:bg-primary/15 data-[state=active]:text-primary',
                'data-[state=active]:shadow-sm data-[state=active]:shadow-primary/10',
                t.errorCount && t.errorCount > 0 && [
                  'bg-destructive/10 text-destructive/70',
                  'data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive',
                  'data-[state=active]:shadow-destructive/10',
                ]
              )}>
                {t.icon}
              </span>
            ) : null}
            <span>{t.label}</span>
            {t.errorCount && t.errorCount > 0 ? (
              <span className={cn(
                'ms-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full',
                'bg-destructive/15 px-1 text-[10px] font-bold text-destructive',
                'animate-pulse'
              )}>
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
