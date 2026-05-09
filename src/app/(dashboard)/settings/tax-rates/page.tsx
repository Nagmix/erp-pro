'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSetupTaxPackage } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useDeleteDoc, useDocList } from '@/lib/client/hooks';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Percent, Plus } from 'lucide-react';
import type { SetupTaxPackageData } from '@/lib/client/api';
import { toast } from 'sonner';

type TemplateKind = 'مبيعات' | 'مشتريات';

type TemplateRow = {
  name: string;
  title?: string;
  company?: string;
  kind: TemplateKind;
  doctype: string;
};

export default function TaxRatesPage() {
  const qc = useQueryClient();
  const { company: defaultCompany } = useDefaultCompanyName();
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [rate, setRate] = useState('15');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TemplateRow | null>(null);
  const [lastSetup, setLastSetup] = useState<SetupTaxPackageData | null>(null);

  const effectiveCompany = company || defaultCompany || '';

  useEffect(() => {
    if (defaultCompany && !company) queueMicrotask(() => setCompany(defaultCompany));
  }, [defaultCompany, company]);

  const companyFilter = effectiveCompany ? [['company', '=', effectiveCompany] as [string, string, string]] : undefined;

  const { data: salesTemplates = [], isLoading: loadSales } = useDocList<Record<string, unknown>>(
    'Sales Taxes and Charges Template',
    {
      fields: ['name', 'title', 'company'],
      filters: companyFilter,
      limit: 500,
      enabled: Boolean(effectiveCompany),
    }
  );

  const { data: purchaseTemplates = [], isLoading: loadPurch } = useDocList<Record<string, unknown>>(
    'Purchase Taxes and Charges Template',
    {
      fields: ['name', 'title', 'company'],
      filters: companyFilter,
      limit: 500,
      enabled: Boolean(effectiveCompany),
    }
  );

  const templateRows: TemplateRow[] = useMemo(() => {
    const s = salesTemplates.map((r) => ({
      name: String(r.name ?? ''),
      title: typeof r.title === 'string' ? r.title : undefined,
      company: typeof r.company === 'string' ? r.company : undefined,
      kind: 'مبيعات' as const,
      doctype: 'Sales Taxes and Charges Template',
    }));
    const p = purchaseTemplates.map((r) => ({
      name: String(r.name ?? ''),
      title: typeof r.title === 'string' ? r.title : undefined,
      company: typeof r.company === 'string' ? r.company : undefined,
      kind: 'مشتريات' as const,
      doctype: 'Purchase Taxes and Charges Template',
    }));
    return [...s, ...p];
  }, [salesTemplates, purchaseTemplates]);

  const { data: companies = [] } = useDocList<Record<string, unknown>>('Company', {
    fields: ['name'],
    limit: 50,
  });
  const companyNames = useMemo(
    () => new Set(companies.map((c) => String(c.name ?? '')).filter(Boolean)),
    [companies]
  );

  const setupMutation = useMutation({
    mutationFn: () =>
      apiSetupTaxPackage({
        company: effectiveCompany,
        title: title.trim(),
        rate: Number(rate),
      }),
    onSuccess: (data) => {
      setLastSetup(data);
      const reusedBits: string[] = [];
      if (data.reused?.salesTemplate) reusedBits.push('قالب مبيعات موجود');
      if (data.reused?.purchaseTemplate) reusedBits.push('قالب مشتريات موجود');
      if (data.reused?.accounts?.some(Boolean)) reusedBits.push('حسابات موجودة مسبقاً');
      toast.success('تم إعداد الضريبة بالكامل');
      qc.invalidateQueries({ queryKey: ['docList', 'Sales Taxes and Charges Template'] });
      qc.invalidateQueries({ queryKey: ['docList', 'Purchase Taxes and Charges Template'] });
      qc.invalidateQueries({ queryKey: ['docList', 'Account'] });
      setTitle('');
      setRate('15');
    },
    onError: (e: Error) => {
      toast.error('فشل الإعداد', { description: e.message });
    },
  });

  const deleteSales = useDeleteDoc('Sales Taxes and Charges Template');
  const deletePurchase = useDeleteDoc('Purchase Taxes and Charges Template');

  const runDelete = async () => {
    if (!toDelete) return;
    try {
      if (toDelete.kind === 'مبيعات') await deleteSales.mutateAsync(toDelete.name);
      else await deletePurchase.mutateAsync(toDelete.name);
      toast.success('تم الحذف', { description: toDelete.title || toDelete.name });
    } catch (e) {
      toast.error('تعذر الحذف', { description: e instanceof Error ? e.message : 'خطأ' });
    }
    setDeleteOpen(false);
    setToDelete(null);
  };

  const columns: Column<TemplateRow>[] = [
    {
      key: 'kind',
      header: 'النوع',
      width: 'w-24',
      render: (_, row) => (
        <span className="text-xs font-medium">{row.kind}</span>
      ),
    },
    {
      key: 'title',
      header: 'عنوان القالب',
      sortable: true,
      render: (_, row) => <span className="font-medium">{row.title || row.name}</span>,
    },
    { key: 'company', header: 'الشركة', render: (v) => <span className="text-xs">{String(v ?? '—')}</span> },
    {
      key: 'name',
      header: 'المعرّف',
      render: (v) => <span className="font-mono text-[10px] text-muted-foreground">{String(v)}</span>,
    },
  ];

  const loadingList = loadSales || loadPurch;

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">الضرائب والقوالب</h1>
          <p className="text-sm text-muted-foreground mt-1">
            إنشاء حسابات GL وقوالب المبيعات والمشتريات بالكامل من هنا — يتم اختيار مجموعات دليل الحسابات تلقائياً.
          </p>
        </div>
      </div>

      <Card className="border-primary/25 bg-primary/[0.04]">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded-lg bg-primary/15 p-2">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">إعداد ضريبة جديدة (حسابات + قوالب)</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                يحدّد النظام مجموعات المطلوبات والأصول المناسبة (أو ينشئ مجموعات «ERP Pro» تحت المطلوبات/الأصول المتداولة)،
                ثم ينشئ ثلاثة حسابات ضريبة، ثم قالب مبيعات وقالب مشتريات مرتبطين بهما.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">الشركة</Label>
              <Select value={effectiveCompany} onValueChange={setCompany} disabled>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="اختر الشركة" />
                </SelectTrigger>
                <SelectContent>
                  {defaultCompany && !companyNames.has(defaultCompany) && (
                    <SelectItem value={defaultCompany}>{defaultCompany}</SelectItem>
                  )}
                  {companies.map((c) => (
                    <SelectItem key={String(c.name)} value={String(c.name)}>
                      {String(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">اسم الضريبة (يظهر في الحسابات والقوالب)</Label>
              <Input
                className="h-9"
                placeholder="مثال: ضريبة القيمة المضافة 15٪"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">النسبة %</Label>
              <Input
                className="h-9"
                type="number"
                step="0.01"
                min={0}
                max={100}
                dir="ltr"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="button"
            disabled={setupMutation.isPending || !effectiveCompany || !title.trim()}
            onClick={() => setupMutation.mutate()}
          >
            {setupMutation.isPending ? 'جاري الإعداد…' : 'إنشاء الحسابات والقوالب'}
          </Button>
        </CardContent>
      </Card>

      {lastSetup && (
        <Card className="border-border/60 bg-muted/20">
          <CardContent className="p-4 space-y-3 text-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">آخر عملية إعداد</h2>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setLastSetup(null)}>
                إخفاء
              </Button>
            </div>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">مجموعة المطلوبات (ضرائب)</dt>
                <dd className="font-mono text-[11px] break-all">{lastSetup.liabilityParent}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">مجموعة الأصول (مدخلات)</dt>
                <dd className="font-mono text-[11px] break-all">{lastSetup.assetParent}</dd>
              </div>
            </dl>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">حسابات GL (ثلاثة)</p>
              <ul className="space-y-1 font-mono text-[11px]">
                {lastSetup.accounts.map((a, i) => (
                  <li key={a.name} className="flex flex-wrap items-baseline gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">
                      {a.role === 'output' ? 'مخرجات' : a.role === 'input' ? 'مدخلات' : a.role === 'net' ? 'صافي' : a.role}
                    </span>
                    <span className="break-all">{a.name}</span>
                    {lastSetup.reused?.accounts?.[i] && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300">موجود مسبقاً</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">قالب المبيعات</dt>
                <dd className="font-mono text-[11px] break-all">
                  {lastSetup.salesTaxTemplateName ?? '—'}{' '}
                  {lastSetup.reused?.salesTemplate && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">(موجود)</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">قالب المشتريات</dt>
                <dd className="font-mono text-[11px] break-all">
                  {lastSetup.purchaseTaxTemplateName ?? '—'}{' '}
                  {lastSetup.reused?.purchaseTemplate && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">(موجود)</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">قوالب المبيعات</p>
              <p className="text-sm font-bold mt-0.5">{salesTemplates.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Percent className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">قوالب المشتريات</p>
              <p className="text-sm font-bold mt-0.5">{purchaseTemplates.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">إجمالي القوالب المعروضة</p>
              <p className="text-sm font-bold mt-0.5">{templateRows.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">قوالب الضريبة</h2>
        {loadingList && <p className="text-xs text-muted-foreground">جاري التحميل…</p>}
        {!effectiveCompany && (
          <p className="text-xs text-amber-700 dark:text-amber-400">اختر شركة لعرض القوالب.</p>
        )}
        {effectiveCompany && !loadingList && templateRows.length === 0 && (
          <p className="text-xs text-muted-foreground">لا توجد قوالب لهذه الشركة بعد.</p>
        )}
        <DataTable
          data={templateRows}
          columns={columns}
          searchable
          onDelete={(row) => {
            setToDelete(row);
            setDeleteOpen(true);
          }}
        />
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
            <AlertDialogDescription>
              حذف «{toDelete?.title || toDelete?.name}»؟ لن يُحذف حساب GL المرتبط تلقائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
