'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useDocList } from '@/lib/client/hooks';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2, Plus, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getErpDocCreateShortcut } from '@/lib/erp/erp-link-create-route';
import { Command as CommandPrimitive } from 'cmdk';

type Row = { name: string; label: string };

type Props = {
  doctype: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Extra field to show in list (e.g. customer_name on Customer) */
  displayKey?: string;
  limit?: number;
  /** إظهار زر «إضافة» أسفل القائمة عند توفر شاشة إنشاء لهذا النوع (افتراضي: true) */
  showCreateShortcut?: boolean;
  /** فلاتر إضافية لتمريرها إلى useDocList (مثلاً [['account_type', '=', 'Cash']]) */
  filters?: Record<string, unknown> | string[][];
  /** استبعاد السجلات التي حقل is_group فيها = 1 (مثل All Customer Groups) */
  excludeGroups?: boolean;
};

/**
 * قائمة اختيار مرتبطة بسجل من الخلفية، مع إمكانية فتح شاشة الإضافة وتحديث القائمة عند العودة.
 */
export function ErpLinkCombobox({
  doctype,
  value,
  onChange,
  placeholder = 'اختر...',
  disabled,
  className,
  displayKey,
  limit = 2000,
  showCreateShortcut = true,
  filters,
  excludeGroups = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const queryClient = useQueryClient();
  const createShortcut = showCreateShortcut ? getErpDocCreateShortcut(doctype) : null;
  const searchTerm = debouncedSearch.trim();

  // إذا excludeGroups مفعّل، أضف فلتر is_group = 0 تلقائياً
  const groupFilter = excludeGroups ? [['is_group', '=', 0] as string[]] : [];

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => window.clearTimeout(id);
  }, [search]);

  const fields = useMemo(
    () => (displayKey ? (['name', displayKey, ...(excludeGroups ? ['is_group'] : [])] as string[]) : (excludeGroups ? ['name', 'is_group'] : ['name'])),
    [displayKey, excludeGroups]
  );

  // Build dynamic filters: merge static filters with search-based filters
  const listFilters = useMemo(() => {
    const base: string[][] = [];
    // Add group filter automatically
    for (const gf of groupFilter) {
      base.push(gf);
    }
    // Add static filters
    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        if (Array.isArray(f) && f.length >= 3) base.push(f as string[]);
      }
    }
    // Add search filters
    if (searchTerm) {
      // When displayKey is set, we use or_filters for search instead
      // So base filters go in filters, search goes in or_filters
    }
    return base.length > 0 ? base : undefined;
  }, [filters, searchTerm, groupFilter]);

  const listOrFilters = useMemo(() => {
    if (!searchTerm) return undefined;
    if (displayKey) {
      return [['name', 'like', `%${searchTerm}%`], [displayKey, 'like', `%${searchTerm}%`]] as string[][];
    }
    return [['name', 'like', `%${searchTerm}%`]] as string[][];
  }, [searchTerm, displayKey]);

  // When no static filters and no search, use original behavior for name-only search
  const finalFilters = useMemo(() => {
    if (!filters && !excludeGroups && searchTerm && !displayKey) {
      return [['name', 'like', `%${searchTerm}%`]] as string[][];
    }
    return listFilters;
  }, [filters, excludeGroups, searchTerm, displayKey, listFilters]);

  const finalOrFilters = useMemo(() => {
    if (!filters && !excludeGroups && searchTerm && !displayKey) return undefined;
    return listOrFilters;
  }, [filters, excludeGroups, searchTerm, displayKey, listOrFilters]);

  const { data = [], isLoading, isFetching } = useDocList<Record<string, unknown>>(doctype, {
    fields,
    filters: finalFilters,
    or_filters: finalOrFilters,
    limit,
  });
  const options: Row[] = useMemo(
    () =>
      data
        // فلترة إضافية: استبعاد السجلات التي is_group = 1 حتى لو لم يعمل فلتر الخادم
        .filter((r) => {
          if (excludeGroups) {
            const ig = r.is_group;
            return ig !== 1 && ig !== true && ig !== '1';
          }
          return true;
        })
        .map((r) => {
          const name = typeof r.name === 'string' ? r.name : String(r.name ?? '');
          const raw = displayKey ? r[displayKey] : r.name;
          const label = typeof raw === 'string' && raw ? raw : name;
          return name ? { name, label } : null;
        })
        .filter((x): x is Row => x !== null),
    [data, displayKey, excludeGroups]
  );

  const displayValue = useMemo(() => {
    if (!value) return '';
    const row = options.find((o) => o.name === value);
    return row?.label || value;
  }, [value, options]);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [open, doctype, queryClient]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void queryClient.invalidateQueries({ queryKey: ['docList', doctype] });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || isLoading}
          className={cn(
            'h-9 w-full justify-between border-border/40 bg-background text-sm font-normal hover:border-border/60 hover:bg-muted/30',
            className
          )}
          dir="rtl"
        >
          <span className={cn('truncate', !displayValue && 'text-muted-foreground')}>{displayValue || placeholder}</span>
          {isFetching ? <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-60" /> : <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[280px] max-w-[90vw] p-0 rounded-[var(--radius-md-ui)] border border-border/40 bg-popover shadow-[var(--shadow-sm-ui)]"
        align="start"
        dir="rtl"
        sideOffset={4}
        collisionPadding={16}
        avoidCollisions={true}
        side="bottom"
        sticky="always"
        onOpenAutoFocus={(e) => {
          // منع التركيز التلقائي على مدخل البحث لمنع قفز الصفحة على الجوال
          e.preventDefault();
        }}
      >
        <Command shouldFilter={false}>
          <div className="flex h-9 items-center gap-2 border-b px-3 shrink-0">
            <SearchIcon className="size-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              data-slot="command-input"
              className="placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-right text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="بحث حي بالاسم..."
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <div
            className="max-h-[min(280px,60vh)] overflow-y-auto overscroll-behavior-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            onPointerDown={(e) => {
              // منع اختفاء القائمة عند اللمس على الجوال
              e.stopPropagation();
            }}
          >
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {isLoading || isFetching ? 'جارٍ التحميل...' : searchTerm ? 'لا نتائج مطابقة' : 'لا نتائج'}
            </CommandEmpty>
            <CommandGroup className="p-1">
              {options.map((o) => (
                <CommandItem
                  key={o.name}
                  value={`${o.label} ${o.name}`}
                  className="rounded-lg text-[13px] aria-selected:bg-primary/10"
                  onSelect={() => {
                    onChange(o.name);
                    setOpen(false);
                  }}
                  onPointerDown={(e) => {
                    // منع فقدان التركيز من مربع البحث عند اللمس
                    e.preventDefault();
                  }}
                >
                  <Check className={cn('h-4 w-4 shrink-0 text-primary', value === o.name ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate flex-1">{o.label}</span>
                  {o.label !== o.name && (
                    <span className="me-1 shrink-0 font-mono text-[10px] text-muted-foreground" dir="ltr">
                      {o.name}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
          {createShortcut && (
            <div className="border-t border-border/40 bg-muted/40 p-2">
              <Button variant="secondary" size="sm" className="w-full h-9 gap-2 text-[12px] font-semibold" asChild>
                <Link
                  href={createShortcut.href}
                  onClick={() => setOpen(false)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {createShortcut.label}
                </Link>
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
