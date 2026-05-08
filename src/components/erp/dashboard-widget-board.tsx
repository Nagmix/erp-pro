'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GripVertical, Inbox, LayoutGrid, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/erp/empty-state';

const STORAGE_KEY = 'erp_dashboard_widget_order_v1';
const STORAGE_HIDDEN_KEY = 'erp_dashboard_widget_hidden_v1';

function loadOrder(defaultOrder: string[]): string[] {
  if (typeof window === 'undefined') return defaultOrder;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultOrder;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return defaultOrder;
    const merged = [...parsed];
    for (const id of defaultOrder) {
      if (!merged.includes(id)) merged.push(id);
    }
    return merged.filter((id) => defaultOrder.includes(id));
  } catch {
    return defaultOrder;
  }
}

function loadHidden(defaultOrder: string[]): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_HIDDEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => defaultOrder.includes(id)));
  } catch {
    return new Set();
  }
}

function saveHidden(hidden: Set<string>) {
  try {
    localStorage.setItem(STORAGE_HIDDEN_KEY, JSON.stringify([...hidden]));
  } catch {
    /* ignore */
  }
}

function SortableWidget({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-[var(--radius-md-ui)] border border-border/45 bg-card/50 shadow-sm shadow-black/[0.02]',
        isDragging && 'z-10 opacity-90 ring-2 ring-primary/30'
      )}
    >
      <div className="absolute end-2 top-2 z-[1] flex gap-1 opacity-60 hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-7 w-7 cursor-grab active:cursor-grabbing touch-manipulation"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
          <span className="sr-only">سحب لإعادة ترتيب</span>
        </Button>
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

type Props = {
  widgets: Record<string, ReactNode>;
  defaultOrder: string[];
  /** عناوين عربية لقائمة إظهار/إخفاء الأقسام (القسم 7.2) */
  widgetLabels?: Record<string, string>;
};

/**
 * لوحة تحكم قابلة لإعادة الترتيب بالسحب والإفلات مع حفظ محلي (المرحلة 12.3).
 */
export function DashboardWidgetBoard({ widgets, defaultOrder, widgetLabels }: Props) {
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    queueMicrotask(() => {
      setOrder(loadOrder(defaultOrder));
      setHidden(loadHidden(defaultOrder));
    });
  }, [defaultOrder]);

  const persist = useCallback((next: string[]) => {
    setOrder(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(
    () => order.filter((id) => widgets[id] != null && !hidden.has(id)),
    [order, widgets, hidden]
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fullOrder = order.filter((id) => widgets[id] != null);
    const visibleIds = fullOrder.filter((id) => !hidden.has(id));
    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextVisible = arrayMove(visibleIds, oldIndex, newIndex);
    let vi = 0;
    const nextFull = fullOrder.map((id) => {
      if (hidden.has(id)) return id;
      return nextVisible[vi++]!;
    });
    persist(nextFull);
  };

  const resetLayout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_HIDDEN_KEY);
    } catch {
      /* ignore */
    }
    setOrder([...defaultOrder]);
    setHidden(new Set());
  };

  const toggleHidden = (id: string, show: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (show) next.delete(id);
      else next.add(id);
      saveHidden(next);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          اسحب المقابض لإعادة ترتيب أقسام لوحة التحكم. يُحفظ الترتيب على هذا الجهاز.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1">
                <LayoutGrid className="h-3.5 w-3.5" />
                تخصيص الأقسام
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3 border-border/40" dir="rtl">
              <p className="text-xs font-semibold mb-2">إظهار وإخفاء</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {defaultOrder.map((id) => {
                  const label = widgetLabels?.[id] ?? id;
                  const visible = !hidden.has(id);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={visible}
                        onCheckedChange={(c) => toggleHidden(id, c === true)}
                        aria-label={`إظهار قسم ${label}`}
                      />
                      <span className="flex-1 text-start">{label}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={resetLayout}>
            <RotateCcw className="h-3.5 w-3.5" />
            استعادة الافتراضي
          </Button>
        </div>
      </div>
      {ids.length === 0 ? (
        <EmptyState
          title="لا توجد أقسام ظاهرة"
          description="فعّل قسماً واحداً على الأقل من «تخصيص الأقسام»."
          icon={Inbox}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {ids.map((id) => (
                <SortableWidget key={id} id={id}>
                  {widgets[id]}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
