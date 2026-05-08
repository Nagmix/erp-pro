'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? 'خطأ غير معروف');
}

export function ListQueryAlert({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  if (error == null) return null;
  return (
    <Alert variant="destructive" className="mb-4 border-destructive/35 bg-destructive/5">
      <AlertTitle>فشل تحميل البيانات</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2 gap-y-2">
        <span>{messageFromUnknown(error)}</span>
        <Button type="button" variant="outline" size="sm" className="border-border/40" onClick={() => onRetry()}>
          إعادة المحاولة
        </Button>
      </AlertDescription>
    </Alert>
  );
}
