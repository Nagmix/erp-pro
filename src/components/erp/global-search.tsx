'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { ArrowLeft } from 'lucide-react';
import { getNavigationSearchItems, type NavigationSearchItem } from '@/lib/ui/navigation-search-items';

const RECENT_SEARCHES_KEY = 'erp_recent_nav_searches_v2';

function loadRecentIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) return JSON.parse(stored) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveRecentIds(ids: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(ids.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

const ALL_ITEMS = getNavigationSearchItems();
const BY_ID = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i])) as Record<string, NavigationSearchItem>;

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const recentItems = useMemo(() => {
    const ids = loadRecentIds();
    return ids.map((id) => BY_ID[id]).filter(Boolean) as NavigationSearchItem[];
  }, [open, refreshKey]);

  const addToRecent = useCallback((item: NavigationSearchItem) => {
    const ids = loadRecentIds();
    const next = [item.id, ...ids.filter((x) => x !== item.id)];
    saveRecentIds(next);
  }, []);

  const handleSelect = useCallback(
    (item: NavigationSearchItem) => {
      addToRecent(item);
      onOpenChange(false);
      setRefreshKey((k) => k + 1);
      router.push(item.path);
    },
    [addToRecent, onOpenChange, router]
  );

  const groups = useMemo(() => {
    const g = new Map<string, NavigationSearchItem[]>();
    for (const item of ALL_ITEMS) {
      const list = g.get(item.group) ?? [];
      list.push(item);
      g.set(item.group, list);
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b, 'ar'));
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="البحث والانتقال السريع"
      description="انتقل إلى أي صفحة في النظام — اكتب اسم الشاشة أو المسار أو نوع المستند"
    >
      <CommandInput placeholder="ابحث عن شاشة، تقرير، إعداد…" />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center text-sm space-y-1">
            <p>لم يتم العثور على نتائج</p>
            <p className="text-xs text-muted-foreground">جرّب كلمات مثل «فاتورة»، «مخزون»، أو «موظف»</p>
          </div>
        </CommandEmpty>

        {recentItems.length > 0 && (
          <>
            <CommandGroup heading="آخر ما تم فتحه" className="text-xs">
              {recentItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.searchValue} recent`}
                    onSelect={() => handleSelect(item)}
                    className="text-xs"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0 text-start">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground me-1">— {item.description}</span>
                    </div>
                    <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group} className="text-xs">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.searchValue}
                  onSelect={() => handleSelect(item)}
                  className="text-xs"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 text-start">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground me-1">— {item.description}</span>
                  </div>
                  <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
