'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Calendar, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';

export type ErpStatusTab = { value: string; label: string; icon?: ReactNode };

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

/** شريط موحّد: نطاق تاريخ + تبويبات حالة — للقوائم الرئيسية (M-17). 
 * يدعم الطي التلقائي على الجوال مع تصميم احترافي. */
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
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const hasActiveFilters = dateFrom || dateTo || statusValue !== 'all';

  return (
    <div
      className={cn(
        'rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-xs-ui)] overflow-hidden',
        className
      )}
      dir="rtl"
    >
      {/* ── Desktop: Full layout ── */}
      <div className="hidden sm:flex sm:flex-row sm:flex-wrap sm:items-end gap-3 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              من تاريخ
            </Label>
            <DatePicker value={dateFrom} onChange={onDateFromChange} className="h-9 w-[150px] text-xs rounded-lg" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              إلى تاريخ
            </Label>
            <DatePicker value={dateTo} onChange={onDateToChange} className="h-9 w-[150px] text-xs rounded-lg" />
          </div>
          {(dateFrom || dateTo) && (
            <Button type="button" variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { onDateFromChange(''); onDateToChange(''); }}>
              <X className="h-3 w-3" />
              مسح التواريخ
            </Button>
          )}
          {extraFilters}
        </div>
        <div className="flex min-h-[36px] flex-1 flex-wrap items-center gap-1 rounded-lg bg-muted/35 p-1">
          {statusTabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onStatusChange(t.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                statusValue === t.value
                  ? 'bg-primary/15 font-semibold text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              )}
            >
              {t.icon && <span className="inline-flex h-3.5 w-3.5 items-center justify-center shrink-0">{t.icon}</span>}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile: Collapsible layout ── */}
      <div className="sm:hidden">
        {/* Header row - always visible */}
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:bg-muted/30'
          )}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span>الفلاتر والتصفية</span>
            {hasActiveFilters && (
              <span className="h-5 min-w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center px-1.5">
                فعّال
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Show active status tab name */}
            {statusValue !== 'all' && (
              <span className="text-[11px] text-primary font-semibold">
                {statusTabs.find(t => t.value === statusValue)?.label}
              </span>
            )}
            {mobileExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {mobileExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-border/30">
            {/* Date range */}
            <div className="flex items-center gap-2 pt-3">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">من تاريخ</Label>
                <DatePicker value={dateFrom} onChange={onDateFromChange} className="h-9 text-xs rounded-lg w-full" />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">إلى تاريخ</Label>
                <DatePicker value={dateTo} onChange={onDateToChange} className="h-9 text-xs rounded-lg w-full" />
              </div>
            </div>

            {(dateFrom || dateTo) && (
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs gap-1 w-full" onClick={() => { onDateFromChange(''); onDateToChange(''); }}>
                <X className="h-3 w-3" />
                مسح التواريخ
              </Button>
            )}

            {/* Status tabs - scrollable horizontally */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/35 p-1 overflow-x-auto">
              {statusTabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onStatusChange(t.value)}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0',
                    statusValue === t.value
                      ? 'bg-primary/15 font-semibold text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  )}
                >
                  {t.icon && <span className="inline-flex h-3.5 w-3.5 items-center justify-center shrink-0">{t.icon}</span>}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Extra filters */}
            {extraFilters && (
              <div className="space-y-2">
                {extraFilters}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
