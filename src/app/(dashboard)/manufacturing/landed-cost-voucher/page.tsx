'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Send, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useSubmitDoc, useCancelDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildLandedCostVoucher } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LCVRow {
  name: string;
  posting_date: string;
  docstatus: number;
}

export default function LandedCostVoucherPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [prName, setPrName] = useState('');
  const [applicable, setApplicable] = useState('');
  const [expenseAccount, setExpenseAccount] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [distribute, setDistribute] = useState<'Amount' | 'Quantity'>('Amount');

  const { data, isLoading, isError, error, refetch } = useDocList<LCVRow>('Landed Cost Voucher', {
    fields: ['name', 'posting_date', 'docstatus'],
    order_by: 'posting_date desc',
    limit: 200,
  });
  const createMutation = useCreateDoc<LCVRow>('Landed Cost Voucher');
  const submitMutation = useSubmitDoc<LCVRow>('Landed Cost Voucher');
  const cancelMutation = useCancelDoc<LCVRow>('Landed Cost Voucher');
  const deleteMutation = useDeleteDoc('Landed Cost Voucher');

  const rows = data || [];

  const columns: Column<LCVRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
      { key: 'posting_date', header: 'التاريخ', sortable: true, render: (v) => formatDate(String(v)) },
      { key: 'docstatus', header: 'مستند', render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} /> },
      {
        key: '_a',
        header: 'ترحيل',
        width: 'w-28',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <Button dir="rtl"
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => { toast({ title: 'تم الترحيل' }); void refetch(); },
                    onError: () => toast({ title: 'تعذر الترحيل', variant: 'destructive' }),
                  })
                }
              >
                <Send className="h-3 w-3" />
                ترحيل
              </Button>
            );
          }
          if (ds === 1) {
            return (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[10px] gap-1"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => { toast({ title: 'أُلغي' }); void refetch(); },
                    onError: () => toast({ title: 'تعذر', variant: 'destructive' }),
                  })
                }
              >
                <Undo2 className="h-3 w-3" />
                إلغاء
              </Button>
            );
          }
          return '—';
        },
      },
    ],
    [submitMutation, cancelMutation, toast, refetch]
  );

  const handleCreate = () => {
    if (!company || !prName || !expenseAccount) {
      toast({ title: 'الشركة وإيصال الاستلام وحساب المصروف مطلوبة', variant: 'destructive' });
      return;
    }
    const amt = Number(chargeAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'أدخل مبلغ تكلفة إضافية صالحاً', variant: 'destructive' });
      return;
    }
    const doc = buildLandedCostVoucher({
      company,
      posting_date: postingDate,
      distribute_charges_based_on: distribute,
      expense_account: expenseAccount,
      charge_amount: amt,
      description: 'تكلفة إضافية من الواجهة',
      purchase_receipts: [{ receipt_document: prName, applicable_charges: amt }],
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء مستند التكلفة الإضافية' });
        setDialogOpen(false);
        setPrName('');
        setChargeAmount('');
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ — راجع صلاحيات الحساب وإيصال الاستلام', variant: 'destructive' }),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="تكاليف إضافية"
        description="إدارة مستندات التكاليف الإضافية وتوزيعها على إيصالات الاستلام"
        iconify="solar:tag-price-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'التكاليف الإضافية' }]}
        actions={
          <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            مستند جديد
          </Button>
        }
      />
      <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDeleteName(r.name)} />
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستند؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast({ title: 'تم الحذف' }); setDeleteName(null); void refetch(); },
                  onError: () => toast({ title: 'تعذر الحذف', variant: 'destructive' }),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مستند التكلفة الإضافية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">تاريخ</Label>
              <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">إيصال استلام *</Label>
              <ErpLinkCombobox doctype="Purchase Receipt" value={prName} onChange={setPrName} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">حساب المصروف / التكلفة *</Label>
              <ErpLinkCombobox doctype="Account" value={expenseAccount} onChange={setExpenseAccount} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">مبلغ التكلفة الإضافية *</Label>
              <Input type="number" dir="ltr" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">توزيع حسب</Label>
              <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={distribute} onChange={(e) => setDistribute(e.target.value as 'Amount' | 'Quantity')}>
                <option value="Amount">المبلغ</option>
                <option value="Quantity">الكمية</option>
              </select>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '...' : 'حفظ مسودة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
