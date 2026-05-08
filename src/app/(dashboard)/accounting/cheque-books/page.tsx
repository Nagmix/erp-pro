'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { KpiCard } from '@/components/erp/kpi-card';
import { EmptyState } from '@/components/erp/empty-state';
import { useCreateDoc, useDeleteDoc, useDocList } from '@/lib/client/hooks';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  Plus,
  Trash2,
  Notebook,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ChequeBookRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useDocList<ChequeBookRow>('Cheque Book', {
    fields: ['name', 'bank_account', 'from_no', 'to_no', 'docstatus'],
    order_by: 'modified desc',
    limit: 200,
  });

  const createMutation = useCreateDoc('Cheque Book');
  const deleteMutation = useDeleteDoc('Cheque Book');

  const rows = data || [];

  // ── KPIs ──
  const totalBooks = rows.length;
  const draftCount = rows.filter(r => Number(r.docstatus) === 0).length;
  const submittedCount = rows.filter(r => Number(r.docstatus) === 1).length;
  const totalCheques = rows.reduce((s, r) => {
    const f = Number(r.from_no) || 0;
    const t = Number(r.to_no) || 0;
    return s + (t >= f ? t - f + 1 : 0);
  }, 0);

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        String(r.name).toLowerCase().includes(s) || String(r.bank_account || '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  // ── Delete handler ──
  const handleDeleteClick = (row: ChequeBookRow) => {
    if (Number(row.docstatus) === 1) {
      toast({ title: 'لا يمكن حذف دفتر مرحّل — ألغِ الترحيل أولاً', variant: 'destructive' });
      return;
    }
    setSelectedRow(row);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;
    deleteMutation.mutate(selectedRow.name, {
      onSuccess: () => {
        toast({ title: 'تم حذف دفتر الشيكات' });
        setDeleteConfirmOpen(false);
        setSelectedRow(null);
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحذف — تحقق من الصلاحيات', variant: 'destructive' }),
    });
  };

  const columns: Column<ChequeBookRow>[] = useMemo(
    () => [
      { key: 'name', header: 'المرجع', sortable: true, render: (v) => <span className="font-mono text-xs text-primary">{String(v)}</span> },
      { key: 'bank_account', header: 'حساب بنكي', render: (v) => String(v || '—') },
      {
        key: 'from_no',
        header: 'نطاق الأرقام',
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
      {
        key: '_actions',
        header: 'إجراءات',
        render: (_, row) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] px-2 gap-1 text-destructive hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => handleDeleteClick(row)}
          >
            <Trash2 className="h-3 w-3" />
            حذف
          </Button>
        ),
      },
    ],
    [deleteMutation.isPending]
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
          setFromNo('1');
          setToNo('100');
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

  // ── Error state: DocType not available ──
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

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard title="إجمالي الدفاتر" value={totalBooks} icon={Notebook} accent="primary" compact />
        <KpiCard title="مسودات" value={draftCount} icon={BookOpen} accent="warning" compact />
        <KpiCard title="مرحّلة" value={submittedCount} icon={Notebook} accent="success" compact />
        <KpiCard title="إجمالي الشيكات" value={totalCheques} icon={BookOpen} accent="info" compact />
      </KpiStrip>

      <div className="flex max-w-md gap-2">
        <input
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
          placeholder="بحث…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {!isLoading && filteredRows.length === 0 ? (
        <EmptyState
          title="لا توجد دفاتر شيكات"
          description="لم يتم إنشاء أي دفاتر شيكات بعد. أنشئ دفتراً جديداً لبدء تتبع أرقام الشيكات."
          icon={Notebook}
          actionLabel="دفتر شيكات جديد"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <DataTable
          data={filteredRows}
          columns={columns}
          searchable={false}
          loading={isLoading}
          tableId="accounting-cheque-books"
          exportFileName="cheque-books.csv"
          printTitle="دفاتر الشيكات"
        />
      )}

      {/* Create Dialog */}
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
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تأكيد حذف دفتر الشيكات
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm leading-relaxed">
              <p>
                هل أنت متأكد من حذف دفتر الشيكات{' '}
                <span className="font-semibold text-foreground">{selectedRow?.name}</span>؟
              </p>
              {selectedRow && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3 text-xs space-y-1">
                  <p>الحساب البنكي: <span className="font-medium">{selectedRow.bank_account || '—'}</span></p>
                  <p>نطاق الأرقام: <span className="font-medium tabular-nums" dir="ltr">{selectedRow.from_no ?? '—'} — {selectedRow.to_no ?? '—'}</span></p>
                </div>
              )}
              <p className="text-xs text-destructive font-medium">⚠️ لا يمكن التراجع عن هذا الإجراء</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
