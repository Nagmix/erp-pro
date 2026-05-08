'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type ChequeBookRow = {
  name: string;
  bank_account?: string;
  from_no?: string | number;
  to_no?: string | number;
  docstatus?: number;
};

/** دفاتر الشيكات — Cheque Book في ERPNext (M-30). */
export default function ChequeBooksPage() {
  const { toast } = useToast();
  const { company: defaultCo } = useDefaultCompanyName();
  const [q, setQ] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [fromNo, setFromNo] = useState('1');
  const [toNo, setToNo] = useState('100');

  const { data, isLoading, isError, error, refetch } = useDocList<ChequeBookRow>('Cheque Book', {
    fields: ['name', 'bank_account', 'from_no', 'to_no', 'docstatus'],
    order_by: 'modified desc',
    limit: 200,
  });

  // إذا كان DocType غير متوفر، اعرض رسالة ودية
  if (isError) {
    return (
      <div className="erp-page-enter space-y-5" dir="rtl">
        <PageHeader
          title="دفاتر الشيكات"
          description="إدارة دفاتر الشيكات المرتبطة بالحسابات البنكية"
          iconify="solar:notebook-bold-duotone"
          accent="info"
        />
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-3">دفاتر الشيكات غير متوفرة حالياً في النظام الخلفي</p>
            <p className="text-xs text-muted-foreground">قد يحتاج DocType &quot;Cheque Book&quot; إلى التثبيت أو التفعيل في ERPNext</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const createMutation = useCreateDoc('Cheque Book');

  const rows = useMemo(() => {
    const list = data || [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (r) =>
        String(r.name).toLowerCase().includes(s) || String(r.bank_account || '').toLowerCase().includes(s)
    );
  }, [data, q]);

  const columns: Column<ChequeBookRow>[] = useMemo(
    () => [
      { key: 'name', header: 'المرجع', sortable: true },
      { key: 'bank_account', header: 'حساب بنكي', render: (v) => String(v || '—') },
      {
        key: 'from_no',
        header: 'من رقم',
        render: (_v, row) => (
          <span className="tabular-nums" dir="ltr">
            {row.from_no ?? '—'} — {row.to_no ?? '—'}
          </span>
        ),
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
    if (!defaultCo) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (!bankAccount.trim()) {
      toast({ title: 'اختر حساباً بنكياً', variant: 'destructive' });
      return;
    }
    const f = Number(fromNo);
    const t = Number(toNo);
    if (!Number.isFinite(f) || !Number.isFinite(t) || t < f) {
      toast({ title: 'أرقام غير صالحة', variant: 'destructive' });
      return;
    }
    createMutation.mutate(
      {
        doctype: 'Cheque Book',
        company: defaultCo,
        bank_account: bankAccount,
        from_no: f,
        to_no: t,
      },
      {
        onSuccess: () => {
          toast({ title: 'تم إنشاء دفتر الشيكات' });
          setDialogOpen(false);
          setBankAccount('');
          void refetch();
        },
        onError: () =>
          toast({
            title: 'فشل الإنشاء عبر الواجهة — تحقق من الصلاحيات وإعدادات الخادم',
            variant: 'destructive',
          }),
      }
    );
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="دفاتر الشيكات"
        description="تعريف نطاق أرقام الشيكات؛ الاستخدام الفعلي من مدفوعات الشيك."
        iconify="solar:document-text-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المحاسبة', href: '/accounting' }, { label: 'دفاتر الشيكات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            دفتر جديد
          </Button>
        }
      />

      <div className="flex max-w-md gap-2">
        <input
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
          placeholder="بحث…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchable={false}
        loading={isLoading}
        tableId="accounting-cheque-books"
        exportFileName="cheque-books.csv"
        printTitle="دفاتر الشيكات"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>دفتر شيكات جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">الحساب البنكي *</Label>
              <ErpLinkCombobox doctype="Bank Account" value={bankAccount} onChange={setBankAccount} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">من رقم</Label>
                <Input dir="ltr" value={fromNo} onChange={(e) => setFromNo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى رقم</Label>
                <Input dir="ltr" value={toNo} onChange={(e) => setToNo(e.target.value)} />
              </div>
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
