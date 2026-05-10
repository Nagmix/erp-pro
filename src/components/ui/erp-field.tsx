'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type ErpFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/**
 * حقل نموذج بأسلوب دفترة: تسمية + حدود حمراء عند الخطأ أو الحقل الإلزامي الفارغ (المرحلة 12.1 / 12.4).
 */
export function ErpField({ label, htmlFor, required, error, hint, children, className }: ErpFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive font-bold" aria-hidden>*</span>}
      </Label>
      <div
        className={cn(
          'rounded-md transition-[box-shadow,border-color]',
          error && 'ring-2 ring-destructive/50 border border-destructive/60'
        )}
        data-invalid={error ? 'true' : undefined}
      >
        {children}
      </div>
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
    </div>
  );
}
