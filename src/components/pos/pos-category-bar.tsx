'use client';

export type PosCategoryTab = { id: string; label: string };

export type PosCategoryBarProps = {
  tabs: PosCategoryTab[];
  activeId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
};

/** شريط تصفية مجموعات الأصناف (§7.3) — يمرَّر من ملف نقطة البيع أو من الأصناف المعروضة. */
export function PosCategoryBar({ tabs, activeId, onSelect, compact }: PosCategoryBarProps) {
  const h = compact ? 'h-9' : 'h-8';
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`flex items-center gap-1.5 ${h} px-3 rounded-[var(--radius-md-ui)] text-xs font-medium shrink-0 transition-colors ${
            activeId === t.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/50 text-foreground hover:bg-muted/80'
          }`}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
