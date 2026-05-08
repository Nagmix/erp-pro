'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { formatDate } from '@/lib/core/helpers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AutoRepeatRow = {
  name: string;
  reference_doctype?: string;
  reference_document?: string;
  next_schedule_date?: string;
  docstatus?: number;
};

const REF_DOCTYPES = ['Journal Entry', 'Purchase Invoice', 'Sales Invoice', 'Payment Entry', 'Expense Claim'] as const;

const DOCTYPE_AR: Record<string, string> = {
  'Journal Entry': 'قيد يومية',
  'Purchase Invoice': 'فاتورة مشتريات',
  'Sales Invoice': 'فاتورة مبيعات',
  'Payment Entry': 'سند دفع',
  'Expense Claim': 'مطالبة مصروفات',
  'Auto Repeat': 'تكرار تلقائي',
};

/** جدولة التكرار التلقائي — Auto Repeat في ERPNext (M-24). */
export default function AutoRepeatPage() {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refDoctype, setRefDoctype] = useState<string>('Journal Entry');
  const [frequency, setFrequency] = useState('Monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]!);

  const { data, isLoading, isError, error, refetch } = useDocList<AutoRepeatRow>('Auto Repeat', {
    fields: ['name', 'reference_doctype', 'reference_document', 'next_schedule_date', 'docstatus'],
    order_by: 'modified desc',
    limit: 300,
  });

  const createMutation = useCreateDoc('Auto Repeat');

  const rows = useMemo(() => {
    const list = data || [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (r) =>
        String(r.name).toLowerCase().includes(s) ||
        String(r.reference_doctype || '').toLowerCase().includes(s) ||
        String(r.reference_document || '').toLowerCase().includes(s)
    );
  }, [data, q]);

  const columns: Column<AutoRepeatRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الاسم', sortable: true, filterable: true },
      { key: 'reference_doctype', header: 'نوع المستند', render: (v) => DOCTYPE_AR[String(v)] || String(v || '—') },
      { key: 'reference_document', header: 'مرجع', render: (v) => String(v || '—'), filterable: true },
      {
        key: 'next_schedule_date',
        header: 'التالي',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'docstatus',
        header: 'الحالة',
        render: (v) => <DocStatusBadge docstatus={Number(v ?? 0) as 0 | 1 | 2} />,
      },
    ],
    []
  );

  const handleCreate = () => {
    createMutation.mutate(
      {
        doctype: 'Auto Repeat',
        reference_doctype: refDoctype,
        frequency,
        start_date: startDate,
        next_schedule_date: startDate,
      },
      {
        onSuccess: () => {
          toast({ title: 'تم إنشاء جدول تكرار' });
          setDialogOpen(false);
          void refetch();
        },
        onError: () =>
          toast({
            title: 'فشل الإنشاء — قد يتطلب النظام حقولاً إضافية أو مرجع مستند',
            variant: 'destructive',
          }),
      }
    );
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="التكرار التلقائي"
        description="عرض وإنشاء جداول التكرار التلقائي؛ القيود المتكررة تظهر أيضاً ضمن المحاسبة."
        iconify="solar:refresh-circle-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'التكرار التلقائي' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            جدول جديد
          </Button>
        }
      />

      <div className="flex max-w-md gap-2">
        <input
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
          placeholder="بحث بالاسم أو النوع…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchable={false}
        loading={isLoading}
        tableId="operations-auto-repeat"
        exportFileName="auto-repeat.csv"
        printTitle="التكرار التلقائي"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>جدول تكرار جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">نوع المستند المرجعي</Label>
              <Select value={refDoctype} onValueChange={setRefDoctype}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REF_DOCTYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">أو اختر نوع المستند</Label>
              <ErpLinkCombobox doctype="DocType" value={refDoctype} onChange={setRefDoctype} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">التكرار</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">يومي</SelectItem>
                  <SelectItem value="Weekly">أسبوعي</SelectItem>
                  <SelectItem value="Monthly">شهري</SelectItem>
                  <SelectItem value="Yearly">سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">تاريخ البدء / الجولة القادمة</Label>
              <Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '…' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
