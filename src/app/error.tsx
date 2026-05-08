'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ERP Pro Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6" dir="rtl">
      <Card className="max-w-md w-full">
        <CardContent className="py-10 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">حدث خطأ غير متوقع</h2>
          <p className="text-muted-foreground text-sm">
            نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
          </p>
          {error?.message && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono" dir="ltr">
              {error.message}
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={reset} className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> إعادة المحاولة
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="gap-1.5">
              <Home className="h-4 w-4" /> الصفحة الرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
