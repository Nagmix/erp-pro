'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';

export type PosSellHeaderProps = {
  /** معرف محلي للمسودة الحالية (عرض للكاشير). */
  draftId: string;
  /** ملف نقطة البيع المختار — يظهر في الشريط عند التحديد (§3.2). */
  posProfileLabel?: string;
  cashierLabel: string;
  /** اسم مستند POS Opening Entry للوردية الحالية عند وجودها */
  shiftDocName?: string;
  hasOpenShift: boolean;
  canCloseShift: boolean;
  onOpenShift: () => void;
  onCloseShift: () => void;
};

export function PosSellHeader({
  draftId,
  posProfileLabel,
  cashierLabel,
  shiftDocName,
  hasOpenShift,
  canCloseShift,
  onOpenShift,
  onCloseShift,
}: PosSellHeaderProps) {
  return (
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b bg-card/80 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs min-w-0">
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">
          طلب <span className="text-foreground font-semibold">{draftId}</span>
        </span>
        {posProfileLabel ? (
          <>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <span className="truncate max-w-[10rem] sm:max-w-[14rem] text-[10px] text-muted-foreground">
              ملف: <span className="font-medium text-foreground">{posProfileLabel}</span>
            </span>
          </>
        ) : null}
        <span className="text-muted-foreground hidden sm:inline">|</span>
        <span className="truncate max-w-[12rem] sm:max-w-none">
          <span className="text-muted-foreground">كاشير:</span>{' '}
          <span className="font-medium text-foreground">{cashierLabel}</span>
        </span>
        {shiftDocName ? (
          <>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <Badge variant="secondary" className="text-[10px] font-normal gap-1 max-w-[min(100%,14rem)]">
              وردية:
              <Link
                href={`/pos/sessions/${encodeURIComponent(shiftDocName)}`}
                className="underline-offset-2 hover:underline truncate font-mono"
              >
                {shiftDocName}
              </Link>
            </Badge>
          </>
        ) : hasOpenShift ? (
          <Badge variant="outline" className="text-[10px]">
            وردية مفتوحة
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            لا وردية
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] gap-1" onClick={onOpenShift}>
          <LogIn className="h-3 w-3" />
          فتح وردية
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-[10px] gap-1"
          disabled={!canCloseShift}
          onClick={onCloseShift}
        >
          <LogOut className="h-3 w-3" />
          إغلاق وردية
        </Button>
      </div>
    </header>
  );
}
