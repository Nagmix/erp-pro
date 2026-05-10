'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react';

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1e-9);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 18;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 1 - ((v - min) / range) * (h - 2);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('mt-3 w-full max-w-[120px] text-muted-foreground/45', className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        points={pts}
      />
    </svg>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  className?: string;
  accent?: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
  /** سلسلة نقاط لرسم بسيط دون إزعاج بصري */
  sparkline?: number[];
  /** صف ثانٍ من KPIs: حشو وأحجام أصغر */
  compact?: boolean;
}

/** شريط تمييز خفيف فقط — بدون تدرجات أو ظلال ملوّنة */
const accentStripe: Record<NonNullable<KpiCardProps['accent']>, string> = {
  primary: 'border-s-primary/55',
  success: 'border-s-emerald-600/45 dark:border-s-emerald-500/40',
  warning: 'border-s-amber-600/45 dark:border-s-amber-500/40',
  info: 'border-s-sky-600/45 dark:border-s-sky-500/40',
  destructive: 'border-s-rose-600/45 dark:border-s-rose-500/40',
};

const iconSurface: Record<NonNullable<KpiCardProps['accent']>, string> = {
  primary: 'bg-primary/[0.07] text-primary',
  success: 'bg-emerald-500/[0.09] text-emerald-800 dark:text-emerald-300',
  warning: 'bg-amber-500/[0.09] text-amber-900 dark:text-amber-300',
  info: 'bg-sky-500/[0.09] text-sky-900 dark:text-sky-300',
  destructive: 'bg-rose-500/[0.09] text-rose-900 dark:text-rose-300',
};

export function KpiCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor,
  description,
  className,
  accent = 'primary',
  sparkline,
  compact = false,
}: KpiCardProps) {
  const showChange =
    change !== undefined && !(change === 0 && changeType === 'neutral');

  const stripe = accentStripe[accent];
  const iconClass = iconSurface[accent];

  return (
    <div className={cn('relative', className)}>
      <Card
        className={cn(
          'overflow-hidden border border-border/50 bg-card shadow-none transition-colors duration-200',
          'hover:border-border hover:bg-muted/20',
          'border-s-[3px]',
          stripe,
        )}
      >
        <CardContent className={cn('relative', compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p
                className={cn(
                  'font-medium text-muted-foreground',
                  compact ? 'text-[11px] leading-snug' : 'text-xs leading-snug',
                )}
              >
                {title}
              </p>
              <p
                className={cn(
                  'font-semibold tabular-nums tracking-tight text-foreground',
                  compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl',
                )}
              >
                {value}
              </p>
              {showChange && (
                <div className="flex items-center gap-1 pt-0.5">
                  {changeType === 'positive' && <TrendingUp className="h-3 w-3 text-primary" />}
                  {changeType === 'negative' && <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />}
                  {changeType === 'neutral' && <Minus className="h-3 w-3 text-muted-foreground" />}
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      changeType === 'positive' && 'text-primary',
                      changeType === 'negative' && 'text-rose-600 dark:text-rose-400',
                      changeType === 'neutral' && 'text-muted-foreground',
                    )}
                  >
                    {change! > 0 ? '+' : ''}
                    {change}%
                  </span>
                </div>
              )}
              {description && (
                <p
                  className={cn(
                    'text-muted-foreground line-clamp-2 max-w-[22rem] leading-relaxed',
                    compact ? 'text-[10px]' : 'text-[11px]',
                  )}
                >
                  {description}
                </p>
              )}
              {!compact && sparkline && sparkline.length > 1 ? (
                <Sparkline values={sparkline} />
              ) : null}
            </div>
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg transition-colors',
                compact ? 'h-8 w-8' : 'h-10 w-10',
                iconClass,
                iconColor,
              )}
            >
              <Icon className={cn(compact ? 'h-4 w-4' : 'h-[18px] w-[18px]')} strokeWidth={1.75} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
