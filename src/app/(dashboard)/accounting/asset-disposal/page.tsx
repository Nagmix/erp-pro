'use client';

import { useState, useMemo, useEffect } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import { apiUpdateDoc, apiCreateDoc, apiCallMethod } from '@/lib/client/api';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { HandCoins, TrendingDown, PackageCheck, DollarSign } from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface AssetRow {
  name: string;
  asset_name: string;
  asset_category?: string;
  company: string;
  gross_purchase_amount?: number;
  status: string;
  disposal_date?: string;
  available_for_use_date?: string;
}

// ============================================================
// Zod Schemas
// ============================================================

const saleSchema = z.object({
  asset: z.string().min(1, 'الأصل مطلوب'),
  sale_date: z.string().min(1, 'تاريخ البيع مطلوب'),
  sale_amount: z.coerce.number().min(1, 'قيمة البيع مطلوبة'),
  customer: z.string().min(1, 'العميل مطلوب'),
  gain_loss_account: z.string(),
});

const scrapSchema = z.object({
  asset: z.string().min(1, 'الأصل مطلوب'),
  scrap_date: z.string().min(1, 'تاريخ الاستهلاك مطلوب'),
  scrap_reason: z.string(),
});

type SaleFormInput = z.input<typeof saleSchema>;
type SaleFormOutput = z.output<typeof saleSchema>;
type ScrapFormInput = z.input<typeof scrapSchema>;
type ScrapFormOutput = z.output<typeof scrapSchema>;

// ============================================================
// Main Component
// ============================================================

export default function AssetDisposalPage() {
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [scrapDialogOpen, setScrapDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { company: defaultCo } = useDefaultCompanyName();

  // ── Data fetching ──
  const { data: allAssets = [], isLoading, isError, error, refetch } = useDocList<AssetRow>('Asset', {
    fields: [
      'name', 'asset_name', 'asset_category', 'company',
      'gross_purchase_amount', 'status', 'available_for_use_date',
    ],
    limit: 500,
  });

  // Disposed assets: Sold or Scrapped
  const disposedAssets = useMemo(
    () => allAssets.filter(a => a.status === 'Sold' || a.status === 'Scrapped'),
    [allAssets]
  );

  // Active assets for combobox filter
  const activeAssetFilter = useMemo(() => [['status', '=', 'Active']] as string[][], []);

  // ── KPIs ──
  const soldCount = useMemo(() => allAssets.filter(a => a.status === 'Sold').length, [allAssets]);
  const scrappedCount = useMemo(() => allAssets.filter(a => a.status === 'Scrapped').length, [allAssets]);
  const totalDisposalValue = useMemo(
    () => disposedAssets.reduce((s, a) => s + (Number(a.gross_purchase_amount) || 0), 0),
    [disposedAssets]
  );

  // ── Forms ──
  const saleForm = useForm<SaleFormInput, any, SaleFormOutput>({
    resolver: zodResolver(saleSchema),
    defaultValues: { asset: '', sale_date: new Date().toISOString().split('T')[0], sale_amount: 0, customer: '', gain_loss_account: '' },
  });

  const scrapForm = useForm<ScrapFormInput, any, ScrapFormOutput>({
    resolver: zodResolver(scrapSchema),
    defaultValues: { asset: '', scrap_date: new Date().toISOString().split('T')[0], scrap_reason: '' },
  });

  // ── Handlers ──
  const handleSale = async (formData: SaleFormOutput) => {
    setProcessing(true);
    try {
      // Try ERPNext's built-in Asset Capitalization method first
      try {
        await apiCallMethod('erpnext.assets.doctype.asset.asset.sell_asset', {
          asset: formData.asset,
          sale_price: Number(formData.sale_amount) || 0,
          customer: formData.customer || undefined,
          company: defaultCo,
          posting_date: formData.sale_date,
        });
        toast.success('تم بيع الأصل بنجاح عبر ERPNext');
      } catch {
        // Fallback: update status + create journal entry for the sale
        await apiUpdateDoc('Asset', formData.asset, {
          status: 'Sold',
          disposal_date: formData.sale_date,
        });
        if (Number(formData.sale_amount) > 0) {
          await apiCreateDoc('Journal Entry', {
            voucher_type: 'Journal Entry',
            company: defaultCo,
            posting_date: formData.sale_date,
            user_remark: `بيع الأصل ${formData.asset} بمبلغ ${formData.sale_amount}`,
            accounts: [
              { account: formData.customer ? 'Debtors - ' + defaultCo : 'Cash - ' + defaultCo, debit: Number(formData.sale_amount) || 0, credit: 0 },
              { account: 'Fixed Asset - ' + defaultCo, debit: 0, credit: Number(formData.sale_amount) || 0 },
            ],
          });
        }
        toast.success('تم بيع الأصل وإنشاء قيد يومية', { description: `تم تحديث حالة الأصل مع قيد بيع بمبلغ ${formatCurrency(Number(formData.sale_amount) || 0)}` });
      }
      setSaleDialogOpen(false);
      saleForm.reset();
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء بيع الأصل', { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  const handleScrap = async (formData: ScrapFormOutput) => {
    setProcessing(true);
    try {
      // Try ERPNext's built-in scrap method first
      try {
        await apiCallMethod('erpnext.assets.doctype.asset.asset.scrap_asset', {
          asset: formData.asset,
          company: defaultCo,
          posting_date: formData.scrap_date,
        });
        toast.success('تم استهلاك الأصل بنجاح عبر ERPNext');
      } catch {
        // Fallback: update status
        await apiUpdateDoc('Asset', formData.asset, {
          status: 'Scrapped',
          disposal_date: formData.scrap_date,
        });
        toast.success('تم استهلاك الأصل بنجاح', { description: `تم تحديث حالة الأصل إلى «مستهلك» بتاريخ ${formatDate(formData.scrap_date)}` });
      }
      setScrapDialogOpen(false);
      scrapForm.reset();
      void refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('حدث خطأ أثناء استهلاك الأصل', { description: msg });
    } finally {
      setProcessing(false);
    }
  };

  // ── Columns ──
  const columns: Column<AssetRow>[] = [
    { key: 'name', header: 'الرقم', sortable: true, width: 'w-24', render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
    { key: 'asset_name', header: 'اسم الأصل', sortable: true },
    { key: 'asset_category', header: 'الفئة', render: (_, row) => (
      <span className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground">
        {row.asset_category || '—'}
      </span>
    )},
    { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v)} /> },
    { key: 'gross_purchase_amount', header: 'قيمة الشراء', sortable: true, render: (_, row) => (
      <span className="font-semibold tabular-nums" dir="ltr">{formatCurrency(Number(row.gross_purchase_amount ?? 0))}</span>
    )},
    { key: 'available_for_use_date', header: 'تاريخ التصرّف', sortable: true, render: (_, row) => formatDate(String(row.available_for_use_date || '')) },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="التصرف في الأصول"
        description="بيع أو استهلاك الأصول الثابتة وتسجيل الأرباح والخسائر"
        iconify="solar:hand-money-bold-duotone"
        accent="destructive"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'التصرّف في الأصول' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => { saleForm.reset(); setSaleDialogOpen(true); }}>
              <DollarSign className="h-3.5 w-3.5" />
              بيع أصل
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { scrapForm.reset(); setScrapDialogOpen(true); }}>
              <TrendingDown className="h-3.5 w-3.5" />
              استهلاك أصل
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      {/* DataTable */}
      <DataTable
        data={disposedAssets}
        columns={columns}
        searchable
        loading={isLoading}
        title="الأصول المُصرَّف فيها"
        tableId="asset-disposal-table"
        exportFileName="asset-disposal.csv"
      />

      {/* Sale Dialog */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              بيع أصل ثابت
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saleForm.handleSubmit(handleSale)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">الأصل *</Label>
              <ErpLinkCombobox
                doctype="Asset"
                value={saleForm.watch('asset')}
                onChange={(v) => saleForm.setValue('asset', v)}
                placeholder="اختر الأصل النشط..."
                filters={activeAssetFilter}
              />
              {saleForm.formState.errors.asset && (
                <p className="text-[10px] text-destructive">{saleForm.formState.errors.asset.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">تاريخ البيع *</Label>
                <Input type="date" dir="ltr" {...saleForm.register('sale_date')} />
                {saleForm.formState.errors.sale_date && (
                  <p className="text-[10px] text-destructive">{saleForm.formState.errors.sale_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">قيمة البيع *</Label>
                <Input type="number" dir="ltr" placeholder="0.00" {...saleForm.register('sale_amount', { valueAsNumber: true })} />
                {saleForm.formState.errors.sale_amount && (
                  <p className="text-[10px] text-destructive">{saleForm.formState.errors.sale_amount.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">العميل *</Label>
              <ErpLinkCombobox
                doctype="Customer"
                value={saleForm.watch('customer')}
                onChange={(v) => saleForm.setValue('customer', v)}
                placeholder="اختر العميل..."
                displayKey="customer_name"
              />
              {saleForm.formState.errors.customer && (
                <p className="text-[10px] text-destructive">{saleForm.formState.errors.customer.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">حساب الأرباح/الخسائر</Label>
              <ErpLinkCombobox
                doctype="Account"
                value={saleForm.watch('gain_loss_account')}
                onChange={(v) => saleForm.setValue('gain_loss_account', v)}
                placeholder="حساب أرباح أو خسائر التصرف..."
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setSaleDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={processing} className="gap-1.5 min-w-[130px]">
                {processing ? 'جاري المعالجة...' : 'بيع الأصل'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scrap Dialog */}
      <Dialog open={scrapDialogOpen} onOpenChange={setScrapDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              استهلاك أصل ثابت
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={scrapForm.handleSubmit(handleScrap)} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">الأصل *</Label>
              <ErpLinkCombobox
                doctype="Asset"
                value={scrapForm.watch('asset')}
                onChange={(v) => scrapForm.setValue('asset', v)}
                placeholder="اختر الأصل النشط..."
                filters={activeAssetFilter}
              />
              {scrapForm.formState.errors.asset && (
                <p className="text-[10px] text-destructive">{scrapForm.formState.errors.asset.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">تاريخ الاستهلاك *</Label>
              <Input type="date" dir="ltr" {...scrapForm.register('scrap_date')} />
              {scrapForm.formState.errors.scrap_date && (
                <p className="text-[10px] text-destructive">{scrapForm.formState.errors.scrap_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">سبب الاستهلاك</Label>
              <Textarea
                placeholder="اذكر سبب الاستهلاك (اختياري)..."
                {...scrapForm.register('scrap_reason')}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button type="button" variant="ghost" onClick={() => setScrapDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button type="submit" disabled={processing} variant="destructive" className="gap-1.5 min-w-[130px]">
                {processing ? 'جاري المعالجة...' : 'استهلاك الأصل'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
