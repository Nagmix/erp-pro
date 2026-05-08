'use client';

import { cn } from '@/lib/utils';
import { ModernIcon } from '@/components/ui/modern-icon';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export { KpiCard } from '@/components/erp/kpi-card';

export interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  iconify?: string;
  badge?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'purple' | 'amber';
}

const accentRing: Record<NonNullable<PageHeaderProps['accent']>, string> = {
  primary:
    'text-primary bg-primary/10 ring-primary/20 border-primary/20',
  success:
    'text-success bg-success/10 ring-success/20 border-success/20',
  warning:
    'text-warning bg-warning/10 ring-warning/25 border-warning/25',
  info:
    'text-info bg-info/10 ring-info/20 border-info/20',
  destructive:
    'text-destructive bg-destructive/10 ring-destructive/25 border-destructive/25',
  purple:
    'text-purple-600 bg-purple-50 ring-purple-200 border-purple-200',
  amber:
    'text-amber-600 bg-amber-50 ring-amber-200 border-amber-200',
};

export function PageHeader({
  title,
  description,
  iconify,
  badge,
  breadcrumbs,
  actions,
  className,
  accent = 'primary',
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'relative mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between',
        'rounded-xl border border-border/40 bg-card px-4 lg:px-5 py-3 lg:py-4 hover:border-border/60',
        'transition-colors duration-150',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 start-0 w-[2px] bg-primary/40 rounded-e-xl" aria-hidden />

      <div className="relative flex items-start gap-3 min-w-0">
        {iconify && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md-ui)] border ring-1',
              accentRing[accent]
            )}
          >
            <ModernIcon iconify={iconify} className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 space-y-1.5">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-1">
                  {b.href ? (
                    <Link href={b.href} className="hover:text-primary transition-colors">
                      {b.label}
                    </Link>
                  ) : (
                    <span>{b.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <ChevronLeft className="h-3 w-3 opacity-60" />}
                </span>
              ))}
            </nav>
          )}
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs lg:text-[13px] leading-relaxed text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="relative flex items-center flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * KPI Strip wrapper to keep consistent gap and grid across pages.
 */
export function KpiStrip({
  children,
  className,
  cols = 4,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3 | 4 | 5;
}) {
  const colClasses: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };
  return (
    <div className={cn('grid gap-3 lg:gap-4 mb-5', colClasses[cols], className)}>
      {children}
    </div>
  );
}

/**
 * Page content shell — consistent surface card around list/forms.
 */
export function PageShell({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/40 bg-card shadow-sm hover:border-border/60',
        padded && 'p-4 lg:p-5',
        className
      )}
    >
      {children}
    </div>
  );
}
