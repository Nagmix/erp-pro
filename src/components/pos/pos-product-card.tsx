'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

export type PosProductCardProps = {
  title: string;
  subtitle?: string;
  price?: number;
  currency?: string;
  stockQty?: number;
  showStock?: boolean;
  imageUrl?: string | null;
  inCartQty?: number;
  /** قالب له متغيرات — يفتح اختيار متغير بدل الإضافة المباشرة */
  isTemplate?: boolean;
  onClick: () => void;
  compact?: boolean;
};

function safeImageSrc(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return null;
}

export function PosProductCard({
  title,
  subtitle,
  price,
  currency = 'YER',
  stockQty,
  showStock,
  imageUrl,
  inCartQty,
  isTemplate,
  onClick,
  compact,
}: PosProductCardProps) {
  const img = safeImageSrc(imageUrl);
  const minH = compact ? 'min-h-[80px]' : 'min-h-[90px]';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all border select-none rounded-xl',
        inCartQty ? 'border-primary bg-primary/10 shadow-md' : 'border-border/40 hover:border-primary/50 hover:bg-primary/5'
      )}
      onClick={onClick}
    >
      <CardContent className={cn('p-3 flex flex-col items-center text-center gap-1.5 justify-center', minH)}>
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-md bg-muted/40 flex items-center justify-center',
            compact ? 'h-12' : 'h-16'
          )}
        >
          {img ? (
            <img src={img} alt="" className="object-contain max-h-full max-w-full mx-auto" loading="lazy" />
          ) : (
            <Package className={cn('text-muted-foreground/50', compact ? 'h-6 w-6' : 'h-8 w-8')} aria-hidden />
          )}
        </div>
        <span className="text-xs font-bold leading-tight line-clamp-2 w-full">{title}</span>
        {subtitle ? <span className="text-[9px] text-muted-foreground line-clamp-1 w-full">{subtitle}</span> : null}
        {price != null && Number.isFinite(price) && price >= 0 ? (
          <span className="text-[11px] font-semibold tabular-nums text-primary">{formatCurrency(price, currency)}</span>
        ) : null}
        {showStock && stockQty != null && Number.isFinite(stockQty) ? (
          <span className="text-[9px] text-muted-foreground tabular-nums">مخزون ≈ {stockQty}</span>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-1 w-full">
          {isTemplate ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[9px] gap-0.5">
              <Layers className="h-2.5 w-2.5" />
              متغيرات
            </Badge>
          ) : null}
          {inCartQty ? (
            <Badge className="h-5 px-2 text-[10px] bg-primary text-primary-foreground rounded-full">×{inCartQty}</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
