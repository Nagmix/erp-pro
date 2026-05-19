'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  type LucideProps,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  useComponentHealth,
  type HealthAction,
} from '@/hooks/use-component-health';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISMISS_KEY = 'component_health_dismissed';
const DISMISS_TTL = 24 * 60 * 60 * 1000; // 24 ساعة

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_TTL;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // تجاهل
  }
}

function priorityVariant(
  priority: HealthAction['priority']
): 'destructive' | 'warning' | 'info' {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
  }
}

function priorityLabel(priority: HealthAction['priority']): string {
  switch (priority) {
    case 'high':
      return 'عاجل';
    case 'medium':
      return 'متوسط';
    case 'low':
      return 'منخفض';
  }
}

/* ------------------------------------------------------------------ */
/*  PriorityIcon — component for priority icons (avoids render-time    */
/*  component creation that triggers react-hooks/static-components)    */
/* ------------------------------------------------------------------ */

function PriorityIcon({
  priority,
  ...props
}: { priority: HealthAction['priority'] } & LucideProps) {
  switch (priority) {
    case 'high':
      return <XCircle {...props} />;
    case 'medium':
      return <AlertTriangle {...props} />;
    case 'low':
      return <CheckCircle2 {...props} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Action Chip                                                        */
/* ------------------------------------------------------------------ */

function ActionChip({ action }: { action: HealthAction }) {
  return (
    <Link
      href={action.route}
      className="group inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-100/60 dark:border-amber-700/40 dark:bg-amber-900/30 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-200/70 dark:hover:bg-amber-800/40 transition-colors"
    >
      <PriorityIcon priority={action.priority} className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[140px] sm:max-w-none">{action.label}</span>
      <Badge
        variant={priorityVariant(action.priority)}
        className="h-4 min-w-[2rem] px-1 text-[9px] leading-none"
      >
        {priorityLabel(action.priority)}
      </Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Expanded Action Row                                                */
/* ------------------------------------------------------------------ */

function ExpandedActionRow({
  action,
  onNavigate,
}: {
  action: HealthAction;
  onNavigate: (route: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 rounded-xl border border-amber-200/50 dark:border-amber-700/30 bg-white/60 dark:bg-amber-950/20 p-3"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
        <PriorityIcon priority={action.priority} className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-200 truncate">
            {action.label}
          </span>
          <Badge
            variant={priorityVariant(action.priority)}
            className="h-4 min-w-[2rem] px-1 text-[9px] leading-none"
          >
            {priorityLabel(action.priority)}
          </Badge>
        </div>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/70 leading-relaxed">
          {action.description}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-[11px] shrink-0 border-amber-300/60 text-amber-800 hover:bg-amber-100 dark:border-amber-700/40 dark:text-amber-300 dark:hover:bg-amber-900/40"
        onClick={() => onNavigate(action.route)}
      >
        <Settings className="h-3 w-3" />
        إعداد
        <ArrowLeft className="h-2.5 w-2.5" />
      </Button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ComponentHealthCheck() {
  const { health, loading, error, refetch } = useComponentHealth();
  const [dismissed, setDismissedState] = useState(isDismissed());
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const hasIssues = useMemo(
    () => health && !health.healthy && health.actions.length > 0,
    [health]
  );

  const handleDismiss = () => {
    setDismissed();
    setDismissedState(true);
    toast.info('تم إخفاء التنبيه. سيظهر مرة أخرى بعد 24 ساعة.');
  };

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  const handleRefetch = () => {
    refetch();
    setDismissedState(false);
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // تجاهل
    }
  };

  // لا نعرض شيئاً في الحالات التالية:
  // 1. جاري التحميل
  // 2. لا توجد مشاكل
  // 3. تم الإخفاء
  // 4. حدث خطأ (نعرض بصمت)
  if (loading) return null;
  if (!hasIssues || !health) return null;
  if (dismissed) return null;
  if (error) return null;

  const highPriorityCount = health.actions.filter((a) => a.priority === 'high').length;
  const otherCount = health.actions.length - highPriorityCount;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, maxHeight: 0 }}
        animate={{ opacity: 1, y: 0, maxHeight: 800 }}
        exit={{ opacity: 0, y: -12, maxHeight: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <Alert
          className="relative overflow-visible border-amber-300/60 dark:border-amber-700/40"
          style={{
            background:
              'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.18) 50%, rgba(251,191,36,0.10) 100%)',
          }}
        >
          {/* Warning Icon */}
          <div className="flex h-5 w-5 items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Title */}
          <AlertTitle className="text-amber-900 dark:text-amber-200 text-sm font-bold">
            يحتاج النظام إلى إعداد إضافي
          </AlertTitle>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 left-2 h-6 w-6 text-amber-600/60 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-400/60 dark:hover:text-amber-300 dark:hover:bg-amber-800/40"
            onClick={handleDismiss}
            aria-label="إخفاء التنبيه"
          >
            <X className="h-3.5 w-3.5" />
          </Button>

          {/* Description area */}
          <AlertDescription className="space-y-3">
            {/* Summary line */}
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
              يوجد{' '}
              <span className="font-semibold text-amber-900 dark:text-amber-200">
                {health.actions.length}
              </span>{' '}
              عناصر تحتاج اهتمامك
              {highPriorityCount > 0 && (
                <>
                  {' '}—{' '}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {highPriorityCount} عاجل
                  </span>
                  {otherCount > 0 && <span> و {otherCount} أخرى</span>}
                </>
              )}
            </p>

            {/* Compact chips row */}
            <div className="flex flex-wrap gap-1.5">
              {health.actions.map((action) => (
                <ActionChip key={action.id} action={action} />
              ))}
            </div>

            {/* Expand / Collapse for details */}
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-[11px] text-amber-800 hover:text-amber-900 hover:bg-amber-200/50 dark:text-amber-300 dark:hover:text-amber-200 dark:hover:bg-amber-800/30"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        إخفاء التفاصيل
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        عرض التفاصيل
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="mt-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {health.actions.map((action) => (
                      <ExpandedActionRow
                        key={action.id}
                        action={action}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </AnimatePresence>

                  {/* Warnings list if any */}
                  {health.warnings.length > 0 && (
                    <div className="mt-2 rounded-xl border border-amber-200/40 dark:border-amber-700/20 bg-amber-50/40 dark:bg-amber-950/10 p-3">
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
                        تحذيرات إضافية:
                      </p>
                      <ul className="space-y-1">
                        {health.warnings.map((w, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-amber-700/70 dark:text-amber-400/60 flex items-start gap-1.5"
                          >
                            <span className="mt-1 h-1 w-1 rounded-full bg-amber-500/60 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Footer actions */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-200/40 dark:border-amber-700/20">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[11px] border-amber-300/50 text-amber-800 hover:bg-amber-100 dark:border-amber-700/30 dark:text-amber-300 dark:hover:bg-amber-900/30"
                onClick={handleDismiss}
              >
                <X className="h-3 w-3" />
                إخفاء
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-amber-700/70 hover:text-amber-900 hover:bg-amber-200/40 dark:text-amber-400/60 dark:hover:text-amber-300 dark:hover:bg-amber-800/20"
                onClick={handleRefetch}
              >
                إعادة الفحص
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
