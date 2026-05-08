'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Filter, ChevronDown, X, Hash, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useSubmitDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SerialRow = {
  name: string;
  item_code?: string;
  item_name?: string;
  warehouse?: string;
  status?: string;
  purchase_date?: string;
  warranty_expiry_date?: string;
  docstatus?: number;
};

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  Active: { label: 'نشط', className: 'bg-success/12 text-success ring-1 ring-inset ring-success/25' },
  Inactive: { label: 'غير نشط', className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/40' },
  Delivered: { label: 'تم التسليم', className: 'bg-info/12 text-info ring-1 ring-inset ring-info/25' },
  Expired: { label: 'منتهي', className: 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25' },
};

function SerialStatusBadge({ status }: { status?: string }) {
  const info = STATUS_MAP[status ?? ''];
  if (info) {
    return (
      <Badge variant="outline" className={cn('border-0 text-xs font-semibold px-2 py-0.5', info.className)}>
        {info.label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
      {status || '—'}
    </Badge>
  );
}

export default function SerialNumbersPage() {
  const [deleteDialog, setDeleteDialog] = useState<SerialRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Create dialog fields
  const [itemCode, setItemCode] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');

  const { data, isLoading, isError, error, refetch } = useDocList<SerialRow>('Serial No', {
    fields: ['name', 'item_code', 'item_name', 'warehouse', 'status', 'purchase_date', 'warranty_expiry_date', 'docstatus'],
    limit: 500,
    order_by: 'modified desc',
  });

  const createMutation = useCreateDoc('Serial No');
  const deleteMutation = useDeleteDoc('Serial No');
  const submitMut = useSubmitDoc('Serial No');

  const serials = data || [];

  const clearFilters = () => {
    setStatusFilter('all');
    setSearch('');
    setFiltersOpen(false);
  };

  // Filter serials by status
  const filtered = useMemo(() => {
    let result = serials;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result;
  }, [serials, statusFilter]);

  // KPI calculations
  const totalCount = serials.length;
  const activeCount = serials.filter((s) => s.status === 'Active').length;
  const expiredWarrantyCount = serials.filter((s) => {
    if (!s.warranty_expiry_date) return false;
    return new Date(s.warranty_expiry_date) < new Date();
  }).length;

  const columns: Column<SerialRow>[] = useMemo(
    () => [
      { key: 'name', header: 'الرقم التسلسلي', sortable: true, render: (value) => <span className="font-medium text-primary">{String(value)}</span> },
      { key: 'item_code', header: 'الصنف', sortable: true, render: (value) => <span className="text-xs">{String(value || '—')}</span> },
      { key: 'item_name', header: 'اسم الصنف', render: (value) => <span className="text-xs">{String(value || '—')}</span> },
      { key: 'warehouse', header: 'المستودع', render: (value) => <span className="text-xs">{String(value || '—')}</span> },
      { key: 'status', header: 'الحالة', render: (_value, row) => <SerialStatusBadge status={row.status} /> },
      { key: 'purchase_date', header: 'تاريخ الشراء', sortable: true, render: (value) => <span className="text-xs">{value ? formatDate(String(value)) : '—'}</span> },
      { key: 'warranty_expiry_date', header: 'انتهاء الضمان', sortable: true, render: (value) => {
        if (!value) return <span className="text-xs">—</span>;
        const isExpired = new Date(String(value)) < new Date();
        return <span className={cn('text-xs', isExpired && 'text-destructive font-medium')}>{formatDate(String(value))}</span>;
      }},
      { key: 'docstatus', header: 'مستند', render: (value) => <DocStatusBadge docstatus={Number(value ?? 0) as 0 | 1 | 2} /> },
    ],
    []
  );

  const resetCreateForm = () => {
    setItemCode('');
    setSerialNo('');
    setWarehouse('');
    setPurchaseDate('');
    setWarrantyExpiry('');
  };

  const handleCreate = () => {
    if (!itemCode.trim() || !serialNo.trim()) {
      toast.error('الصنف والرقم التسلسلي مطلوبان');
      return;
    }
    createMutation.mutate(
      {
        item_code: itemCode.trim(),
        serial_no: serialNo.trim(),
        warehouse: warehouse || undefined,
        purchase_date: purchaseDate || undefined,
        warranty_expiry_date: warrantyExpiry || undefined,
      },
      {
        onSuccess: (created) => {
          const docName = (created as { name?: string })?.name;
          if (docName) {
            submitMut.mutate(docName, {
              onSuccess: () => {
                toast.success('تم إنشاء الرقم التسلسلي وترحيله');
                setDialogOpen(false);
                resetCreateForm();
              },
              onError: () => {
                toast.success('تم إنشاء الرقم التسلسلي (مسودة)');
                setDialogOpen(false);
                resetCreateForm();
              },
            });
          } else {
            toast.success('تم إنشاء الرقم التسلسلي');
            setDialogOpen(false);
            resetCreateForm();
          }
        },
        onError: () => toast.error('تعذر إنشاء الرقم التسلسلي'),
      }
    );
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الأرقام التسلسلية"
        description="إدارة وتتبع الأرقام التسلسلية للأصناف مع حالة الضمان والمستودع"
        iconify="solar:hashtag-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'الأرقام التسلسلية' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            رقم تسلسلي جديد
          </Button>
        }
      />

      <KpiStrip cols={3}>
        <KpiCard title="إجمالي الأرقام التسلسلية" value={totalCount} icon={Hash} accent="info" description="كل سجلات الأرقام التسلسلية" />
        <KpiCard title="نشطة" value={activeCount} icon={CheckCircle} accent="success" description="أرقام تسلسلية نشطة" />
        <KpiCard title="ضمان منتهي" value={expiredWarrantyCount} icon={AlertTriangle} accent="destructive" description="انتهت فترة الضمان" />
      </KpiStrip>

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالرقم التسلسلي أو الصنف..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(statusFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-[10px]">الحالة</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Active">نشط</SelectItem>
                    <SelectItem value="Inactive">غير نشط</SelectItem>
                    <SelectItem value="Delivered">تم التسليم</SelectItem>
                    <SelectItem value="Expired">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        onDelete={(row) => Number(row.docstatus) === 0 && setDeleteDialog(row)}
        onEdit={(row) => {
          if (Number(row.docstatus) !== 0) return;
          submitMut.mutate(row.name, {
            onSuccess: () => toast.success('تم الترحيل'),
            onError: () => toast.error('فشل الترحيل'),
          });
        }}
      />
      <p className="text-[10px] text-muted-foreground">للمسودات: من القائمة «تعديل» لترحيل السجل، أو «حذف» لإزالة المسودة.</p>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرقم التسلسلي؟</AlertDialogTitle>
            <AlertDialogDescription>{deleteDialog?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.name, {
              onSuccess: () => { toast.success('تم الحذف'); setDeleteDialog(null); },
              onError: () => toast.error('تعذر الحذف'),
            })}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>رقم تسلسلي جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">الصنف *</Label>
              <ErpLinkCombobox doctype="Item" value={itemCode} onChange={setItemCode} placeholder="اختر الصنف..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الرقم التسلسلي *</Label>
              <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} placeholder="أدخل الرقم التسلسلي" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">المستودع</Label>
              <ErpLinkCombobox doctype="Warehouse" value={warehouse} onChange={setWarehouse} placeholder="اختر المستودع..." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">تاريخ الشراء</Label>
                <Input type="date" dir="ltr" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">انتهاء الضمان</Label>
                <Input type="date" dir="ltr" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending || submitMut.isPending}>
              {(createMutation.isPending || submitMut.isPending) ? '...' : 'حفظ وترحيل'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
