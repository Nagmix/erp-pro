'use client';

import { useQuery } from '@tanstack/react-query';
import { GitCommitHorizontal, Clock, User, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGetVersionHistory, type DocVersion, type VersionChange } from '@/lib/client/api';
import { cn } from '@/lib/utils';

// ============================================================
// Props
// ============================================================

type VersionHistoryProps = {
  doctype: string;
  docname: string;
  className?: string;
};

// ============================================================
// Field label translation map
// ============================================================

const FIELD_LABELS: Record<string, string> = {
  docstatus: 'الحالة',
  customer: 'العميل',
  supplier: 'المورد',
  grand_total: 'الإجمالي',
  status: 'الحالة',
  posting_date: 'تاريخ الترحيل',
  due_date: 'تاريخ الاستحقاق',
  title: 'العنوان',
  remark: 'ملاحظات',
  remarks: 'ملاحظات',
  user_remark: 'ملاحظات المستخدم',
  terms: 'الشروط',
  outstanding_amount: 'المبلغ المستحق',
  paid_amount: 'المبلغ المدفوع',
  reference_no: 'رقم المرجع',
  reference_date: 'تاريخ المرجع',
  total_qty: 'الكمية الإجمالية',
  total_net_weight: 'الوزن الصافي',
  base_grand_total: 'الإجمالي (بالعملة الأساسية)',
  base_total: 'المجموع (بالعملة الأساسية)',
  base_net_total: 'صافي المجموع (بالعملة الأساسية)',
  total_taxes_and_charges: 'إجمالي الضرائب',
  discount_amount: 'مبلغ الخصم',
  currency: 'العملة',
  conversion_rate: 'سعر التحويل',
  company: 'الشركة',
  cost_center: 'مركز التكلفة',
  project: 'المشروع',
  party_type: 'نوع الطرف',
  party: 'الطرف',
  party_name: 'اسم الطرف',
  paid_from: 'المدفوع من',
  paid_to: 'المدفوع إلى',
  paid_from_account_currency: 'عملة حساب الدفع',
  paid_to_account_currency: 'عملة حساب الاستلام',
  source_exchange_rate: 'سعر صرف المصدر',
  target_exchange_rate: 'سعر صرف الهدف',
  received_amount: 'المبلغ المستلم',
  paid_amount_after_tax: 'المبلغ المدفوع بعد الضريبة',
  mode_of_payment: 'طريقة الدفع',
  transaction_date: 'تاريخ المعاملة',
  delivery_date: 'تاريخ التسليم',
  supplier_name: 'اسم المورد',
  customer_name: 'اسم العميل',
  contact_person: 'شخص الاتصال',
  contact_email: 'بريد الاتصال',
  contact_phone: 'هاتف الاتصال',
  shipping_address: 'عنوان الشحن',
  billing_address: 'عنوان الفوترة',
  order_type: 'نوع الطلب',
  naming_series: 'سلسلة التسمية',
  amended_from: 'معدّل من',
  is_return: 'إرجاع',
  return_against: 'إرجاع مقابل',
  against_income_account: 'حساب الإيرادات المقابل',
  against_expense_account: 'حساب المصروفات المقابل',
  write_off_amount: 'مبلغ الشطب',
  write_off_account: 'حساب الشطب',
  advance_amount: 'مبلغ السلفة',
  allocate_payment_amount: 'تخصيص مبلغ الدفع',
  letter_head: 'الرأسية',
  select_print_heading: 'اختيار رأسية الطباعة',
  taxes_and_charges: 'الضرائب والرسوم',
  apply_discount_on: 'تطبيق الخصم على',
  additional_discount_percentage: 'نسبة الخصم الإضافي',
  internal_remarks: 'ملاحظات داخلية',
  scan_barcode: 'مسح الباركود',
  ignore_pricing_rule: 'تجاهل قاعدة التسعير',
  disable_rounded_total: 'تعطيل الإجمالي المقرّب',
  rounded_total: 'الإجمالي المقرّب',
  base_rounded_total: 'الإجمالي المقرّب (بالعملة الأساسية)',
  in_words: 'كتابةً',
  base_in_words: 'كتابةً (بالعملة الأساسية)',
  payment_terms_template: 'قالب شروط الدفع',
  payment_schedule: 'جدول الدفع',
  price_list_currency: 'عملة قائمة الأسعار',
  plc_conversion_rate: 'سعر تحويل قائمة الأسعار',
  ignore_default_payment_terms_template: 'تجاهل قالب شروط الدفع الافتراضي',
  is_subcontracted: 'مقاول من الباطن',
  transportation: 'النقل',
  letter_head_date: 'تاريخ الرأسية',
};

// ============================================================
// Helpers
// ============================================================

function fieldLabel(fieldname: string): string {
  return FIELD_LABELS[fieldname] ?? fieldname;
}

/**
 * Parse the `data` field from ERPNext Version doctype.
 * The data may be:
 *  - An object with `changed` array: { changed: [[fieldname, old, new], ...] }
 *  - An object with `changed` as objects: { changed: [{fieldname, old_value, new_value}, ...] }
 *  - A raw array of changes
 */
function parseVersionChanges(rawData: unknown): VersionChange[] {
  if (!rawData || typeof rawData !== 'object') return [];

  // Try data.changed first (most common ERPNext format)
  const obj = rawData as Record<string, unknown>;

  if (Array.isArray(obj.changed)) {
    return obj.changed.map((entry: unknown) => {
      if (Array.isArray(entry)) {
        // Format: [fieldname, old_value, new_value]
        return {
          fieldname: String(entry[0] ?? ''),
          old_value: entry[1] != null ? String(entry[1]) : undefined,
          new_value: entry[2] != null ? String(entry[2]) : undefined,
        };
      }
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        return {
          fieldname: String(e.fieldname ?? e[0] ?? ''),
          old_value: e.old_value != null ? String(e.old_value) : (e[1] != null ? String(e[1]) : undefined),
          new_value: e.new_value != null ? String(e.new_value) : (e[2] != null ? String(e[2]) : undefined),
        };
      }
      return { fieldname: String(entry) };
    });
  }

  // If the data itself is an array
  if (Array.isArray(rawData)) {
    return rawData.map((entry: unknown) => {
      if (Array.isArray(entry)) {
        return {
          fieldname: String(entry[0] ?? ''),
          old_value: entry[1] != null ? String(entry[1]) : undefined,
          new_value: entry[2] != null ? String(entry[2]) : undefined,
        };
      }
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        return {
          fieldname: String(e.fieldname ?? ''),
          old_value: e.old_value != null ? String(e.old_value) : undefined,
          new_value: e.new_value != null ? String(e.new_value) : undefined,
        };
      }
      return { fieldname: String(entry) };
    });
  }

  return [];
}

/** Format a creation timestamp to a readable Arabic date/time. */
function formatCreationDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'Z'); // ERPNext dates are UTC
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/** Get a relative time string in Arabic. */
function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'Z');
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    if (diffDay < 30) return `منذ ${diffDay} يوم`;
    if (diffMonth < 12) return `منذ ${diffMonth} شهر`;
    return `منذ ${diffYear} سنة`;
  } catch {
    return '';
  }
}

/** Truncate a value for display. */
function truncateValue(val: string | undefined, maxLen: number = 40): string {
  if (!val) return '—';
  if (val.length <= maxLen) return val;
  return val.slice(0, maxLen) + '…';
}

// ============================================================
// Component
// ============================================================

export function VersionHistory({ doctype, docname, className }: VersionHistoryProps) {
  const {
    data: versions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DocVersion[]>({
    queryKey: ['versionHistory', doctype, docname],
    queryFn: () => apiGetVersionHistory(doctype, docname),
    enabled: Boolean(doctype && docname),
    staleTime: 30_000,
  });

  return (
    <Card className={cn('border-border/40', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCommitHorizontal className="h-4 w-4" />
          سجل التعديلات
          {versions && versions.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {versions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="text-xs text-destructive space-y-1">
            <p>تعذر تحميل سجل التعديلات</p>
            <p className="text-muted-foreground">{(error as Error)?.message}</p>
            <button
              type="button"
              className="text-primary underline text-xs"
              onClick={() => void refetch()}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && (!versions || versions.length === 0) && (
          <div className="text-xs text-muted-foreground text-center py-6">
            <GitCommitHorizontal className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>لا توجد تعديلات مسجلة على هذا المستند</p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && versions && versions.length > 0 && (
          <ScrollArea className="max-h-96 pe-3">
            <div className="relative space-y-0">
              {versions.map((ver, idx) => {
                const changes = parseVersionChanges(ver.data);
                const isFirst = idx === 0;
                const isLast = idx === versions.length - 1;

                return (
                  <div key={ver.name} className="relative flex gap-3 pb-4">
                    {/* Timeline line and dot */}
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      {/* Dot */}
                      <div
                        className={cn(
                          'h-3 w-3 rounded-full border-2 shrink-0 z-10',
                          isFirst
                            ? 'border-primary bg-primary/30'
                            : 'border-muted-foreground/40 bg-background'
                        )}
                      />
                      {/* Line */}
                      {!isLast && (
                        <div className="w-px flex-1 bg-border/40 mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {ver.owner}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relativeTime(ver.creation)}
                        </span>
                      </div>

                      {/* Date */}
                      <p className="text-[10px] text-muted-foreground mb-2" dir="ltr">
                        {formatCreationDate(ver.creation)}
                      </p>

                      {/* Changes */}
                      {changes.length > 0 ? (
                        <div className="space-y-1.5">
                          {changes.map((change, ci) => (
                            <div
                              key={ci}
                              className="rounded-lg bg-muted/30 border border-border/30 px-3 py-2 text-xs"
                            >
                              <div className="font-medium text-muted-foreground mb-1">
                                {fieldLabel(change.fieldname)}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {change.old_value !== undefined && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono max-w-[180px] truncate"
                                    dir="ltr"
                                  >
                                    {truncateValue(change.old_value)}
                                  </Badge>
                                )}
                                <ArrowLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                                {change.new_value !== undefined && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-mono max-w-[180px] truncate"
                                    dir="ltr"
                                  >
                                    {truncateValue(change.new_value)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          تم تعديل المستند
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
