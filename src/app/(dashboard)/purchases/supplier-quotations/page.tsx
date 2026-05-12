'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge, DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Send,
  Undo2,
  Filter,
  ChevronDown,
  X,
  FileText,
  ShoppingCart,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/core/helpers';
import {
  useDocList,
  useCreateDoc,
  useSubmitDoc,
  useCancelDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildSupplierQuotation } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { cn } from '@/lib/utils';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SQRow {
  name: string;
  supplier_name: string;
  transaction_date: string;
  valid_till: string;
  base_grand_total: number;
  status?: string;
  docstatus: number;
}

interface Line {
  item_code: string;
  qty: number;
  rate: number;
  warehouse: string;
}

const emptyLine = (): Line => ({
  item_code: '',
  qty: 1,
  rate: 0,
  warehouse: '',
});

export default function SupplierQuotationsPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
    () => new Date().toISOString().split('T')[0]!
  );
  const [validTill, setValidTill] = useState(
    () => new Date().toISOString().split('T')[0]!
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<SQRow>('Supplier Quotation', {
    fields: [
      'name',
      'supplier_name',
      'transaction_date',
      'valid_till',
      'base_grand_total',
      'status',
      'docstatus',
    ],
    order_by: 'transaction_date desc',
    limit: 500,
  });
  const createMutation = useCreateDoc<SQRow>('Supplier Quotation');
  const submitMutation = useSubmitDoc<SQRow>('Supplier Quotation');
  const cancelMutation = useCancelDoc<SQRow>('Supplier Quotation');
  const deleteMutation = useDeleteDoc('Supplier Quotation');

  const rows = data || [];

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const handleCreate = () => {
    if (!company || !supplier) {
      toast.error('الشركة والمورد مطلوبان');
      return;
    }
    if (lines.every((l) => !l.item_code)) {
      toast.error('أضف بنوداً');
      return;
    }
    const doc = buildSupplierQuotation({
      company,
      supplier,
      transaction_date: transactionDate,
      valid_till: validTill,
      items: lines
        .filter((l) => l.item_code)
        .map((l) => ({
          item_code: l.item_code,
          qty: l.qty,
          rate: l.rate,
          warehouse: l.warehouse || undefined,
        })),
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء عرض السعر');
        setDialogOpen(false);
        setSupplier('');
        setLines([emptyLine()]);
        void refetch();
      },
      onError: () =>
        toast.error('تعذر الحفظ'),
    });
  };

  const totalCount = rows.length;
  const draftCount = rows.filter((r) => Number(r.docstatus) === 0).length;
  const submittedCount = rows.filter((r) => Number(r.docstatus) === 1).length;

  const columns: Column<SQRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        render: (v) => (
          <span className="font-medium text-primary">{String(v)}</span>
        ),
      },
      {
        key: 'supplier_name',
        header: 'المورد',
        sortable: true,
      },
      {
        key: 'transaction_date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => formatDate(String(v)),
      },
      {
        key: 'valid_till',
        header: 'صالح حتى',
        render: (v) => formatDate(String(v)),
      },
      {
        key: 'base_grand_total',
        header: 'الإجمالي',
        sortable: true,
        render: (v) => (
          <span className="tabular-nums font-semibold">
            {formatCurrency(Number(v))}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => <StatusBadge status={String(v ?? '')} />,
      },
      {
        key: 'docstatus',
        header: 'مستند',
        render: (v) => <DocStatusBadge docstatus={Number(v) as 0 | 1 | 2} />,
      },
      {
        key: '_a',
        header: 'ترحيل',
        width: 'w-28',
        render: (_v, row) => {
          const ds = Number(row.docstatus);
          if (ds === 0) {
            return (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-xs gap-1"
                onClick={() =>
                  submitMutation.mutate(row.name, {
                    onSuccess: () => {
                      toast.success('تم الترحيل');
                      void refetch();
                    },
                    onError: () =>
                      toast.error('تعذر الترحيل'),
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
                className="h-7 text-xs gap-1"
                onClick={() =>
                  cancelMutation.mutate(row.name, {
                    onSuccess: () => {
                      toast.success('أُلغي');
                      void refetch();
                    },
                    onError: () =>
                      toast.error('تعذر'),
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

  const hasActiveFilters = dateFrom || dateTo || statusFilter !== 'all' || search;

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert
        error={isError ? error : null}
        onRetry={() => void refetch()}
      />
      <PageHeader
        title="عروض أسعار الموردين"
        description="تسجيل عروض الموردين ومتابعة صلاحيتها وإجمالي أسعار البنود مع دورة الاعتماد"
        iconify="solar:document-text-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'المشتريات', href: '/purchases' },
          { label: 'عروض الموردين' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={coLoading}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            عرض جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث بالرقم أو المورد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    filtersOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-xs">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="0">مسودة</SelectItem>
                    <SelectItem value="1">مرحّل</SelectItem>
                    <SelectItem value="2">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <PageShell padded={false}>
        <DataTable
          data={rows}
          columns={columns}
          searchable
          loading={isLoading}
          onDelete={(r) => setDeleteName(r.name)}
        />
      </PageShell>

      <AlertDialog
        open={!!deleteName}
        onOpenChange={() => setDeleteName(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عرض السعر؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => {
                    toast.success('تم الحذف');
                    setDeleteName(null);
                    void refetch();
                  },
                  onError: () =>
                    toast.error('تعذر الحذف'),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>عرض سعر مورد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">المورد *</Label>
                <ErpLinkCombobox
                  doctype="Supplier"
                  value={supplier}
                  onChange={setSupplier}
                  displayKey="supplier_name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">تاريخ العرض</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">صالح حتى</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                />
              </div>
            </div>
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-3 py-2 flex justify-between">
                <span className="text-xs font-semibold">البنود</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setLines((p) => [...p, emptyLine()])}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">الصنف</TableHead>
                    <TableHead className="text-xs w-20">الكمية</TableHead>
                    <TableHead className="text-xs w-20">السعر</TableHead>
                    <TableHead className="text-xs">مستودع</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <ErpLinkCombobox
                          doctype="Item"
                          value={line.item_code}
                          onChange={(v) =>
                            updateLine(idx, { item_code: v })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(idx, {
                              qty: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 text-xs"
                          value={line.rate}
                          onChange={(e) =>
                            updateLine(idx, {
                              rate: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ErpLinkCombobox
                          doctype="Warehouse"
                          value={line.warehouse}
                          onChange={(v) =>
                            updateLine(idx, { warehouse: v })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7"
                          onClick={() =>
                            lines.length > 1 &&
                            setLines((p) => p.filter((_, j) => j !== idx))
                          }
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
