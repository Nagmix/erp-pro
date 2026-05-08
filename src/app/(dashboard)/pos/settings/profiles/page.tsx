'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, Plus, Store } from 'lucide-react';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildMinimalPosProfile } from '@/lib/erp/erpnext-payloads';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { useToast } from '@/hooks/use-toast';

type PosProfileRow = {
  name: string;
  company?: string;
  warehouse?: string;
  selling_price_list?: string;
  currency?: string;
  disabled?: number;
};

const columns: Column<PosProfileRow>[] = [
  {
    key: 'name',
    header: 'اسم الملف',
    sortable: true,
    render: (_, row) => (
      <Link
        href={`/pos/settings/profiles/${encodeURIComponent(row.name)}`}
        className="font-medium text-primary hover:underline"
      >
        {row.name}
      </Link>
    ),
  },
  { key: 'company', header: 'الشركة', render: (v) => String(v ?? '—') },
  { key: 'warehouse', header: 'المستودع', render: (v) => String(v ?? '—') },
  { key: 'selling_price_list', header: 'قائمة الأسعار', render: (v) => String(v ?? '—') },
  {
    key: 'currency',
    header: 'العملة',
    width: 'w-24',
    render: (v) => <span dir="ltr">{String(v ?? '—')}</span>,
  },
  {
    key: 'disabled',
    header: 'الحالة',
    width: 'w-24',
    render: (v) =>
      v === 1 || v === true ? (
        <Badge variant="destructive" className="text-[10px]">
          معطّل
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-[10px] font-normal">
          نشط
        </Badge>
      ),
  },
];

export default function PosProfilesSettingsPage() {
  const { toast } = useToast();
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();
  const [createOpen, setCreateOpen] = useState(false);
  const [warehouse, setWarehouse] = useState('');
  const [priceList, setPriceList] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [payMode, setPayMode] = useState('Cash');

  const { data = [], isLoading, isError, error, refetch } = useDocList<PosProfileRow>('POS Profile', {
    fields: ['name', 'company', 'warehouse', 'selling_price_list', 'currency', 'disabled'],
    limit: 500,
    order_by: 'modified desc',
  });

  const createMut = useCreateDoc<{ name?: string }>('POS Profile');

  useEffect(() => {
    consumeCreateQueryParam(() => setCreateOpen(true));
  }, []);

  const resetForm = () => {
    setWarehouse('');
    setPriceList('');
    setCurrency('YER');
    setPayMode('Cash');
  };

  const handleCreate = async () => {
    const co = defaultCompany?.trim();
    if (!co) {
      toast({ title: 'اضبط الشركة الافتراضية من الإعدادات', variant: 'destructive' });
      return;
    }
    if (!warehouse.trim() || !priceList.trim()) {
      toast({ title: 'المستودع وقائمة الأسعار مطلوبان', variant: 'destructive' });
      return;
    }
    if (!payMode.trim()) {
      toast({ title: 'اختر وسيلة دفع افتراضية', variant: 'destructive' });
      return;
    }
    try {
      const doc = buildMinimalPosProfile({
        company: co,
        warehouse: warehouse.trim(),
        selling_price_list: priceList.trim(),
        currency: currency.trim() || 'YER',
        payments: [{ mode_of_payment: payMode.trim() }],
      });
      const created = await createMut.mutateAsync(doc);
      const name =
        created && typeof created === 'object' && created !== null && 'name' in created
          ? String((created as { name?: string }).name ?? '').trim()
          : '';
      toast({
        title: 'تم إنشاء ملف نقطة البيع',
        description: name || undefined,
      });
      setCreateOpen(false);
      resetForm();
      void refetch();
    } catch (e) {
      toast({
        title: 'فشل الإنشاء',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="ملفات نقطة البيع"
        description={
          <>
            <span>إنشاء ملفات جديدة لربط المستودع وقائمة الأسعار ووسائل الدفع؛ وتعديل السلوك من صفحة كل ملف.</span>
            <span className="block text-xs mt-1">
              الشركة الافتراضية للإنشاء:{' '}
              {coLoading ? (
                <Loader2 className="inline h-3 w-3 animate-spin" />
              ) : defaultCompany ? (
                <Badge variant="secondary" className="font-normal">
                  {defaultCompany}
                </Badge>
              ) : (
                <span className="text-destructive">غير معروفة — من الإعدادات العامة</span>
              )}
            </span>
          </>
        }
        iconify="solar:users-group-rounded-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الإعدادات', href: '/pos/settings' }, { label: 'الملفات' }]}
        actions={
          <Button type="button" className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            ملف جديد
          </Button>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <DataTable data={data} columns={columns} searchable loading={isLoading} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء ملف نقطة بيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">المستودع *</Label>
              <ErpLinkCombobox doctype="Warehouse" value={warehouse} onChange={setWarehouse} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">قائمة أسعار البيع *</Label>
              <ErpLinkCombobox doctype="Price List" value={priceList} onChange={setPriceList} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">العملة</Label>
              <Input
                dir="ltr"
                className="h-9 text-sm"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="YER"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">وسيلة دفع ضمن الملف *</Label>
              <ErpLinkCombobox doctype="Mode of Payment" value={payMode} onChange={setPayMode} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" disabled={createMut.isPending} onClick={() => void handleCreate()}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
