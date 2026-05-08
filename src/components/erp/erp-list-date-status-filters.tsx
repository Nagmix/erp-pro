'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type ErpStatusTab = { value: string; label: string };

type Props = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  statusValue: string;
  onStatusChange: (v: string) => void;
  statusTabs: ErpStatusTab[];
  /** فلاتر إضافية (مثلاً الشركة) — M-17 */
  extraFilters?: ReactNode;
  className?: string;
};

/** شريط موحّد: نطاق تاريخ + تبويبات حالة — للقوائم الرئيسية (M-17). */
export function ErpListDateStatusFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  statusValue,
  onStatusChange,
  statusTabs,
  extraFilters,
  className,
}: Props) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end', className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">من تاريخ</Label>
          <Input type="date" dir="ltr" className="h-9 w-[150px] text-xs" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">إلى تاريخ</Label>
          <Input type="date" dir="ltr" className="h-9 w-[150px] text-xs" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { onDateFromChange(''); onDateToChange(''); }}>
            مسح التواريخ
          </Button>
        )}
        {extraFilters}
      </div>
      <div className="flex min-h-[36px] flex-1 flex-wrap items-center gap-1.5 rounded-lg bg-muted/35 p-1">
        {statusTabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onStatusChange(t.value)}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
              statusValue === t.value ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
