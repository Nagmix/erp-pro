import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius-lg-ui)] border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {Icon ? (
        <div className="mb-3 rounded-full border border-border/40 bg-[color:var(--surface)] p-3 text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" size="sm" className="mt-4 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
