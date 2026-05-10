'use client';

import { useNamingSeriesForDoctype } from '@/lib/client/naming-series-hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Hash, Loader2 } from 'lucide-react';

/**
 * مكون اختيار التسلسل المتسلسل — يُستخدم في نماذج إنشاء المستندات
 * مثل آلية دفترة: يعرض خيارات التسلسل المتاحة لنوع المستند
 *
 * @param doctype - نوع المستند (مثال: 'Sales Invoice', 'Journal Entry')
 * @param value - التسلسل المختار حالياً
 * @param onChange - دالة تغيير القيمة
 * @param defaultSeries - التسلسل الافتراضي إذا لم تكن هناك خيارات من الخادم
 * @param className - CSS classes إضافية
 */
export function NamingSeriesSelect({
  doctype,
  value,
  onChange,
  defaultSeries,
  className,
}: {
  doctype: string;
  value: string;
  onChange: (value: string) => void;
  defaultSeries?: string;
  className?: string;
}) {
  const { data, isLoading } = useNamingSeriesForDoctype(doctype);

  // إذا لم تكن هناك خيارات من الخادم، استخدم الافتراضي
  const seriesOptions = data?.seriesOptions?.length
    ? data.seriesOptions
    : defaultSeries
      ? [defaultSeries]
      : [];

  // إذا كان هناك خيار واحد فقط، اعرضه كـ badge بدل select
  if (seriesOptions.length === 1) {
    return (
      <Badge
        variant="outline"
        className={`font-mono text-[10px] border-0 bg-muted/50 ${className || ''}`}
        dir="ltr"
      >
        {seriesOptions[0]}
      </Badge>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className || ''}`}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">تحميل…</span>
      </div>
    );
  }

  if (seriesOptions.length === 0) {
    return null;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-8 text-xs w-auto min-w-[160px] ${className || ''}`}>
        <Hash className="h-3 w-3 ms-1 text-muted-foreground" />
        <SelectValue placeholder="اختر التسلسل" />
      </SelectTrigger>
      <SelectContent>
        {seriesOptions.map((opt) => (
          <SelectItem key={opt} value={opt} className="font-mono text-xs">
            {opt}
            {opt === data?.defaultPrefix && (
              <span className="ms-1 text-[9px] text-muted-foreground">(افتراضي)</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
