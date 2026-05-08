'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useUpdateDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Route } from 'lucide-react';

/** حقول ربط شائعة على مستند Company في ERPNext (توجيه تلقائي للعمليات) */
const COMPANY_ACCOUNT_FIELDS = [
  { field: 'default_receivable_account', label: 'الذمم المدينة (عملاء)' },
  { field: 'default_payable_account', label: 'الذمم الدائنة (موردين)' },
  { field: 'default_expense_account', label: 'مصروف افتراضي' },
  { field: 'default_income_account', label: 'إيراد افتراضي' },
  { field: 'round_off_account', label: 'حساب التقريب' },
  { field: 'write_off_account', label: 'حساب الإعدام' },
  { field: 'accumulated_depreciation_account', label: 'مجمع الإهلاك' },
  { field: 'depreciation_expense_account', label: 'مصروف الإهلاك' },
  { field: 'stock_adjustment_account', label: 'تسوية المخزون' },
  { field: 'exchange_gain_loss_account', label: 'أرباح/خسائر فروق عملة' },
] as const;

export default function AccountRoutingPage() {
  const { toast } = useToast();
  const { company: coName, isLoading: coLoading } = useDefaultCompanyName();
  const doc = useDoc<Record<string, unknown>>('Company', coName, { enabled: Boolean(coName) });
  const updateMut = useUpdateDoc('Company');

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const d = doc.data;
    if (!d) return;
    const next: Record<string, string> = {};
    for (const { field } of COMPANY_ACCOUNT_FIELDS) {
      const v = d[field];
      next[field] = typeof v === 'string' ? v : '';
    }
    queueMicrotask(() => setValues(next));
  }, [doc.data]);

  const dirty = useMemo(() => {
    const d = doc.data;
    if (!d) return false;
    return COMPANY_ACCOUNT_FIELDS.some(({ field }) => {
      const cur = typeof d[field] === 'string' ? (d[field] as string) : '';
      return (values[field] ?? '') !== cur;
    });
  }, [doc.data, values]);

  const handleSave = () => {
    if (!coName) return;
    const patch: Record<string, string> = {};
    const d = doc.data;
    if (!d) return;
    for (const { field } of COMPANY_ACCOUNT_FIELDS) {
      const cur = typeof d[field] === 'string' ? (d[field] as string) : '';
      const v = values[field] ?? '';
      if (v !== cur) patch[field] = v;
    }
    if (!Object.keys(patch).length) {
      toast({ title: 'لا تغييرات' });
      return;
    }
    updateMut.mutate(
      { name: coName, doc: patch },
      {
        onSuccess: () => {
          toast({ title: 'تم حفظ توجيه الحسابات' });
          void doc.refetch();
        },
        onError: (e) =>
          toast({
            title: 'تعذر الحفظ',
            description: (e as Error).message,
            variant: 'destructive',
          }),
      }
    );
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="توجيه الحسابات"
        description="ربط حسابات دفتر الأستاذ الافتراضية للشركة — أساس الترحيل التلقائي للعمليات"
        iconify="solar:graph-new-up-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'توجيه الحسابات' }]}
      />

      <ListQueryAlert error={doc.isError ? (doc.error as Error) : null} onRetry={() => void doc.refetch()} />

      {coLoading || doc.isLoading ? (
        <p className="text-sm text-muted-foreground">جاري تحميل بيانات الشركة…</p>
      ) : !coName ? (
        <p className="text-sm text-destructive">لا شركة مسجلة — أضف شركة أولاً.</p>
      ) : (
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-base">الشركة: {coName}</CardTitle>
                <CardDescription className="text-xs">
                  الحقول تُحفظ على مستند Company. إن رفض الخادم حقلاً، تحقق من إعدادات النظام أو أخفِ الحقل من القائمة.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {COMPANY_ACCOUNT_FIELDS.map(({ field, label }) => (
              <div key={field} className="space-y-2">
                <Label className="text-xs font-medium">{label}</Label>
                <ErpLinkCombobox
                  doctype="Account"
                  value={values[field] ?? ''}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field]: v }))}
                  placeholder="—"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                  {field}
                </p>
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-end pt-2">
              <Button type="button" disabled={!dirty || updateMut.isPending} onClick={handleSave}>
                {updateMut.isPending ? 'جاري الحفظ…' : 'حفظ التوجيه'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
