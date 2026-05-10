'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  Loader2,
  Server,
  DollarSign,
  Gauge,
  CheckCircle2,
  XCircle,
  Hash,
  Warehouse,
  CalendarDays,
  FileText,
  Wrench,
} from 'lucide-react';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc, useDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildWorkstation } from '@/lib/erp/erpnext-payloads';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

interface WSRow {
  name: string;
  workstation_name?: string;
  workstation_type?: string;
  description?: string;
  warehouse?: string;
  hour_rate?: number;
  production_capacity?: number;
  disabled?: number | boolean;
  holiday_list?: string;
}

interface WSFullDoc {
  name: string;
  workstation_name?: string;
  workstation_type?: string;
  description?: string;
  warehouse?: string;
  hour_rate?: number;
  production_capacity?: number;
  disabled?: number | boolean;
  holiday_list?: string;
  creation?: string;
  modified?: string;
  owner?: string;
}

interface WorkOrderRow {
  name: string;
  production_item?: string;
  qty?: number;
  status?: string;
  planned_start_date?: string;
}

const emptyForm = {
  workstation_name: '',
  workstation_type: '',
  description: '',
  warehouse: '',
  hour_rate: '',
  production_capacity: '',
  holiday_list: '',
};

export default function WorkstationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [selected, setSelected] = useState<WSRow | null>(null);
  const [viewingWS, setViewingWS] = useState<WSRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);

  const { data, isLoading, isError, error, refetch } = useDocList<WSRow>('Workstation', {
    fields: ['name', 'workstation_name', 'workstation_type', 'description', 'warehouse', 'hour_rate', 'production_capacity', 'disabled', 'holiday_list'],
    order_by: 'name asc',
    limit: 300,
  });
  const createMutation = useCreateDoc('Workstation');
  const deleteMutation = useDeleteDoc('Workstation');
  const updateMutation = useUpdateDoc('Workstation');

  // Fetch full document for viewing
  const { data: viewDoc, isLoading: viewDocLoading } = useDoc<WSFullDoc>(
    'Workstation',
    viewingWS?.name || '',
    { enabled: viewDialogOpen && Boolean(viewingWS?.name) }
  );

  // Fetch work orders for the viewing workstation
  const { data: workOrdersData = [] } = useDocList<WorkOrderRow>('Work Order', {
    fields: ['name', 'production_item', 'qty', 'status', 'planned_start_date'],
    filters: viewingWS ? { workstation: viewingWS.name } : {},
    limit: 50,
    enabled: viewDialogOpen && Boolean(viewingWS?.name),
  });

  const rows = data || [];

  // ── KPIs ──
  const totalWorkstations = rows.length;
  const totalCapacity = rows.reduce((s, r) => s + Number(r.production_capacity ?? 0), 0);
  const avgHourRate = totalWorkstations > 0
    ? rows.reduce((s, r) => s + Number(r.hour_rate ?? 0), 0) / totalWorkstations
    : 0;
  const activeWorkstations = rows.filter(r => !r.disabled && Number(r.disabled) !== 1).length;

  // ── Create Handler ──
  const handleCreate = () => {
    if (!formData.workstation_name.trim()) {
      toast.error('اسم المحطة مطلوب');
      return;
    }
    const doc = buildWorkstation({
      workstation_name: formData.workstation_name.trim(),
      warehouse: formData.warehouse || undefined,
      hour_rate: Number(formData.hour_rate) || 0,
      production_capacity: Number(formData.production_capacity) || 0,
    });
    // Add extra fields not in buildWorkstation
    (doc as Record<string, unknown>).workstation_type = formData.workstation_type?.trim() || undefined;
    (doc as Record<string, unknown>).description = formData.description?.trim() || undefined;
    (doc as Record<string, unknown>).holiday_list = formData.holiday_list?.trim() || undefined;
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء محطة العمل');
        setDialogOpen(false);
        setFormData(emptyForm);
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ'),
    });
  };

  // ── Edit Handlers ──
  const openEditDialog = (row: WSRow) => {
    setSelected(row);
    setEditFormData({
      workstation_name: row.workstation_name || row.name || '',
      workstation_type: row.workstation_type || '',
      description: row.description || '',
      warehouse: row.warehouse || '',
      hour_rate: String(row.hour_rate ?? ''),
      production_capacity: String(row.production_capacity ?? ''),
      holiday_list: row.holiday_list || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    if (!editFormData.workstation_name?.trim()) {
      toast.error('اسم المحطة مطلوب');
      return;
    }
    const doc: Record<string, unknown> = {
      workstation_name: editFormData.workstation_name.trim(),
      workstation_type: editFormData.workstation_type?.trim() || undefined,
      description: editFormData.description?.trim() || undefined,
      warehouse: editFormData.warehouse || undefined,
      hour_rate: Number(editFormData.hour_rate) || 0,
      production_capacity: Number(editFormData.production_capacity) || 0,
      holiday_list: editFormData.holiday_list?.trim() || undefined,
    };
    updateMutation.mutate(
      { name: selected.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث محطة العمل');
          setEditDialogOpen(false);
          setSelected(null);
          void refetch();
        },
        onError: () => toast.error('تعذر التحديث'),
      }
    );
  };

  // ── View Handler ──
  const openViewDialog = (row: WSRow) => {
    setViewingWS(row);
    setViewDialogOpen(true);
  };

  // ── Delete Handler ──
  const handleDelete = () => {
    if (!deleteName) return;
    deleteMutation.mutate(deleteName, {
      onSuccess: () => { toast.success('تم الحذف'); setDeleteName(null); void refetch(); },
      onError: () => toast.error('تعذر الحذف'),
    });
  };

  // ── Columns ──
  const columns: Column<WSRow>[] = useMemo(() => [
    { key: 'name', header: 'المعرّف', sortable: true, render: (v) => (
      <span className="font-medium text-primary">{String(v)}</span>
    )},
    { key: 'workstation_type', header: 'النوع', render: (v) => (
      <span className="text-xs text-muted-foreground">{String(v || '—')}</span>
    )},
    { key: 'warehouse', header: 'المستودع', render: (v) => (
      <span className="text-xs text-muted-foreground">{String(v || '—')}</span>
    )},
    { key: 'hour_rate', header: 'سعر الساعة', sortable: true, render: (v) => (
      <span className="tabular-nums text-xs font-medium">{formatCurrency(Number(v ?? 0))}</span>
    )},
    { key: 'production_capacity', header: 'السعة الإنتاجية', sortable: true, render: (v) => (
      <span className="tabular-nums text-xs">{Number(v ?? 0)}</span>
    )},
    { key: 'disabled', header: 'الحالة', width: 'w-28', render: (v) => {
      const isDisabled = Boolean(v) || Number(v) === 1;
      return isDisabled ? (
        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-destructive/10 text-destructive">
          <XCircle className="h-3 w-3 me-1" />
          معطّلة
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-success/10 text-success">
          <CheckCircle2 className="h-3 w-3 me-1" />
          نشطة
        </Badge>
      );
    }},
  ], []);

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />
      <PageHeader
        title="محطات العمل"
        description="إدارة محطات العمل وسعتها الإنتاجية وأسعار الساعات وحالتها التشغيلية"
        iconify="solar:server-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'التصنيع', href: '/manufacturing' }, { label: 'محطات العمل' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            محطة جديدة
          </Button>
        }
      />

      {/* ── شريط مؤشرات الأداء ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المحطات"
          value={totalWorkstations}
          icon={Server}
          accent="primary"
          description="جميع محطات العمل المسجلة"
        />
        <KpiCard
          title="إجمالي السعة الإنتاجية"
          value={totalCapacity}
          icon={Gauge}
          accent="info"
          description="مجموع سعة جميع المحطات"
        />
        <KpiCard
          title="متوسط سعر الساعة"
          value={formatCurrency(avgHourRate)}
          icon={DollarSign}
          accent="warning"
          description="متوسط تكلفة الساعة لجميع المحطات"
        />
        <KpiCard
          title="المحطات النشطة"
          value={activeWorkstations}
          icon={CheckCircle2}
          accent="success"
          description="محطات غير معطّلة"
        />
      </KpiStrip>

      <PageShell className="space-y-4" padded={false}>
        <DataTable
          data={rows}
          columns={columns}
          searchable
          loading={isLoading}
          onView={(row) => openViewDialog(row)}
          onEdit={(row) => openEditDialog(row)}
          onDelete={(row) => setDeleteName(row.name)}
          tableId="manufacturing-workstations"
          exportFileName="workstations.csv"
          printTitle="محطات العمل"
        />
      </PageShell>

      {/* ════════════════════════════════════════════════════════
          Create Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>محطة عمل جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات محطة العمل الجديدة</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Server className="h-3 w-3 text-primary" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم المحطة <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="مثال: ماكينة القص" value={formData.workstation_name} onChange={e => setFormData(prev => ({ ...prev, workstation_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">نوع المحطة</Label>
                  <Input placeholder="مثال: قطع ليزر" value={formData.workstation_type} onChange={e => setFormData(prev => ({ ...prev, workstation_type: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف</Label>
                  <Input placeholder="وصف مختصر للمحطة..." value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Gauge className="h-3 w-3 text-info" /></span>
                  البيانات الإنتاجية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">سعر الساعة</Label>
                    <Input type="number" dir="ltr" placeholder="0" value={formData.hour_rate} onChange={e => setFormData(prev => ({ ...prev, hour_rate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">السعة الإنتاجية</Label>
                    <Input type="number" dir="ltr" placeholder="0" value={formData.production_capacity} onChange={e => setFormData(prev => ({ ...prev, production_capacity: e.target.value }))} />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Warehouse className="h-3 w-3 text-warning" /></span>
                  الارتباطات
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">مستودع افتراضي</Label>
                  <ErpLinkCombobox doctype="Warehouse" value={formData.warehouse} onChange={v => setFormData(prev => ({ ...prev, warehouse: v }))} placeholder="اختر المستودع..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">قائمة العطلات</Label>
                  <ErpLinkCombobox doctype="Holiday List" value={formData.holiday_list} onChange={v => setFormData(prev => ({ ...prev, holiday_list: v }))} placeholder="اختر قائمة العطلات..." className="h-9 text-sm" />
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ المحطة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Edit Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل محطة العمل</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل بيانات: {selected?.workstation_name || selected?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Server className="h-3 w-3 text-info" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">كود المحطة</Label>
                  <Input value={selected?.name || ''} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم المحطة <span className="text-destructive text-xs">*</span></Label>
                  <Input value={editFormData.workstation_name} onChange={e => setEditFormData(prev => ({ ...prev, workstation_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">نوع المحطة</Label>
                  <Input value={editFormData.workstation_type} onChange={e => setEditFormData(prev => ({ ...prev, workstation_type: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف</Label>
                  <Input value={editFormData.description} onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))} />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><Gauge className="h-3 w-3 text-warning" /></span>
                  البيانات الإنتاجية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">سعر الساعة</Label>
                    <Input type="number" dir="ltr" value={editFormData.hour_rate} onChange={e => setEditFormData(prev => ({ ...prev, hour_rate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">السعة الإنتاجية</Label>
                    <Input type="number" dir="ltr" value={editFormData.production_capacity} onChange={e => setEditFormData(prev => ({ ...prev, production_capacity: e.target.value }))} />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Warehouse className="h-3 w-3 text-primary" /></span>
                  الارتباطات
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">مستودع افتراضي</Label>
                  <ErpLinkCombobox doctype="Warehouse" value={editFormData.warehouse} onChange={v => setEditFormData(prev => ({ ...prev, warehouse: v }))} placeholder="اختر المستودع..." className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">قائمة العطلات</Label>
                  <ErpLinkCombobox doctype="Holiday List" value={editFormData.holiday_list} onChange={v => setEditFormData(prev => ({ ...prev, holiday_list: v }))} placeholder="اختر قائمة العطلات..." className="h-9 text-sm" />
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          View Detail Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل محطة العمل</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{viewingWS?.workstation_name || viewingWS?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewDocLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-3 text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          ) : viewDoc ? (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {/* البيانات الأساسية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><Server className="h-3 w-3 text-success" /></span>
                    البيانات الأساسية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <WSDetailField icon={<Hash className="h-3.5 w-3.5" />} label="كود المحطة" value={viewDoc.name} dir="ltr" />
                    <WSDetailField icon={<Server className="h-3.5 w-3.5" />} label="اسم المحطة" value={viewDoc.workstation_name} />
                    <WSDetailField icon={<Wrench className="h-3.5 w-3.5" />} label="نوع المحطة" value={viewDoc.workstation_type} />
                    <WSDetailField icon={<DollarSign className="h-3.5 w-3.5" />} label="سعر الساعة" value={formatCurrency(Number(viewDoc.hour_rate ?? 0))} highlight />
                    <WSDetailField icon={<Gauge className="h-3.5 w-3.5" />} label="السعة الإنتاجية" value={String(Number(viewDoc.production_capacity ?? 0))} />
                    <WSDetailField icon={<Warehouse className="h-3.5 w-3.5" />} label="المستودع" value={viewDoc.warehouse} />
                    <WSDetailField icon={<CalendarDays className="h-3.5 w-3.5" />} label="قائمة العطلات" value={viewDoc.holiday_list} />
                    <WSDetailField
                      icon={viewDoc.disabled ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      label="الحالة"
                      value={viewDoc.disabled ? 'معطّلة' : 'نشطة'}
                      badge
                      badgeClass={viewDoc.disabled ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}
                    />
                  </div>
                  {viewDoc.description && (
                    <div className="pt-2 border-t border-border/20">
                      <p className="text-[11px] text-muted-foreground mb-1">الوصف</p>
                      <p className="text-sm">{viewDoc.description}</p>
                    </div>
                  )}
                </div>
              </fieldset>

              {/* أوامر العمل المرتبطة */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><FileText className="h-3 w-3 text-info" /></span>
                    أوامر العمل المرتبطة ({workOrdersData.length})
                  </h4>
                </div>
                <div className="p-4 bg-card/50">
                  {workOrdersData.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {workOrdersData.map(wo => (
                        <div key={wo.name} className="flex items-center justify-between text-xs border-b border-border/20 pb-2 last:border-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="font-medium font-mono">{wo.name}</p>
                            <p className="text-[10px] text-muted-foreground">{wo.production_item || '—'} • كمية: {wo.qty ?? 0}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-0 shrink-0" style={{
                            backgroundColor: wo.status === 'Completed' ? 'rgba(34,197,94,0.1)' : wo.status === 'In Process' ? 'rgba(59,130,246,0.1)' : 'rgba(156,163,175,0.1)',
                            color: wo.status === 'Completed' ? '#16a34a' : wo.status === 'In Process' ? '#2563eb' : '#6b7280',
                          }}>
                            {wo.status || '—'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">لا توجد أوامر عمل مرتبطة</p>
                  )}
                </div>
              </fieldset>

              {/* معلومات النظام */}
              {viewDoc.creation && (
                <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-gradient-to-l from-muted/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-muted/20 flex items-center justify-center"><Hash className="h-3 w-3 text-muted-foreground" /></span>
                      معلومات النظام
                    </h4>
                  </div>
                  <div className="p-4 space-y-3 bg-card/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <WSDetailField label="تاريخ الإنشاء" value={viewDoc.creation ? new Date(viewDoc.creation).toLocaleDateString('ar-YE') : '—'} />
                      <WSDetailField label="آخر تعديل" value={viewDoc.modified ? new Date(viewDoc.modified).toLocaleDateString('ar-YE') : '—'} />
                      <WSDetailField label="المُنشئ" value={viewDoc.owner || '—'} dir="ltr" />
                    </div>
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              تعذر تحميل بيانات المحطة
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="text-muted-foreground">إغلاق</Button>
            {viewingWS && (
              <Button
                className="gap-1.5"
                onClick={() => {
                  setViewDialogOpen(false);
                  openEditDialog(viewingWS);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Delete Confirmation
          ════════════════════════════════════════════════════════ */}
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف المحطة</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف محطة العمل &quot;{deleteName}&quot;؟ لا يمكن التراجع عن هذا الإجراء. قد تؤثر على أوامر العمل المرتبطة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Reusable Detail Field for View Dialog ─── */
function WSDetailField({
  icon,
  label,
  value,
  dir,
  badge,
  badgeClass,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  dir?: string;
  badge?: boolean;
  badgeClass?: string;
  highlight?: boolean;
}) {
  const displayValue = value || '—';
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {badge ? (
        <Badge variant="outline" className={cn('text-[10px] font-medium px-2 py-0.5 border-0', badgeClass)}>
          {displayValue}
        </Badge>
      ) : (
        <p className={cn(
          'text-sm font-medium',
          highlight && 'font-semibold',
          !value && 'text-muted-foreground',
        )} dir={dir}>
          {displayValue}
        </p>
      )}
    </div>
  );
}
