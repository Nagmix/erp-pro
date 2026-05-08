'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS, getDocStatusColor, getDocStatusLabel } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

function softPalette(bg: string): string {
  if (bg.includes('success')) return 'bg-success/12 text-success ring-1 ring-inset ring-success/25';
  if (bg.includes('destructive')) return 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25';
  if (bg.includes('warning')) return 'bg-warning/15 text-warning-foreground/90 ring-1 ring-inset ring-warning/30';
  if (bg.includes('info')) return 'bg-info/12 text-info ring-1 ring-inset ring-info/25';
  if (bg.includes('primary')) return 'bg-primary/12 text-primary ring-1 ring-inset ring-primary/25';
  if (bg.includes('secondary')) return 'bg-secondary text-secondary-foreground ring-1 ring-inset ring-border/40';
  if (bg.includes('muted')) return 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/40';
  return 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/40';
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusInfo = STATUS_COLORS[status];

  if (statusInfo) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-0 text-xs font-semibold px-2 py-0.5',
          softPalette(statusInfo.bg),
          className
        )}
      >
        {statusInfo.label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('text-xs font-semibold px-2 py-0.5', className)}>
      {status}
    </Badge>
  );
}

interface DocStatusBadgeProps {
  docstatus: number;
  className?: string;
}

export function DocStatusBadge({ docstatus, className }: DocStatusBadgeProps) {
  const color = getDocStatusColor(docstatus);
  const label = getDocStatusLabel(docstatus);

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-0 text-xs font-semibold px-2 py-0.5',
        softPalette(color.bg),
        className
      )}
    >
      {label}
    </Badge>
  );
}
