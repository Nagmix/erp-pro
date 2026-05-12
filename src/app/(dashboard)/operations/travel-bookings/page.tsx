'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ConfirmationDialog } from '@/components/erp/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useSubmitDoc,
  useCancelDoc,
} from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatDate, formatCurrency } from '@/lib/core/helpers';
import { toast } from 'sonner';
import {
  Plane,
  Plus,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Loader2,
  MapPin,
  CalendarDays,
  DollarSign,
} from 'lucide-react';

/* ────────────────────────────────────────────
   ERPNext Travel Request Type
──────────────────────────────────────────── */
interface TravelRequestRow {
  name: string;
  employee?: string;
  employee_name?: string;
  purpose?: string;
  from_date?: string;
  to_date?: string;
  travel_type?: string;
  destination?: string;
  advance_amount?: number;
  costing?: number;
  status?: string;
  docstatus?: number;
  approver?: string;
  description?: string;
  creation?: string;
}

/* ────────────────────────────────────────────
   Status Mapping: ERPNext → Arabic
──────────────────────────────────────────── */
const TRAVEL_STATUS_MAP: Record<string, string> = {
  Draft: 'مسودة',
  Submitted: 'مُقدّم',
  Approved: 'مُعتمد',
  Rejected: 'مرفوض',
  Cancelled: 'ملغي',
};

const TRAVEL_TYPE_MAP: Record<string, string> = {
  'Local Travel': 'سفر محلي',
  'International Travel': 'سفر دولي',
  Local: 'سفر محلي',
  International: 'سفر دولي',
};

/* ────────────────────────────────────────────
   DataTable Columns
──────────────────────────────────────────── */
const columns: Column<TravelRequestRow>[] = [
  {
    key: 'name',
    header: 'الرقم',
    sortable: true,
    width: 'w-28',
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: 'employee_name',
    header: 'الموظف',
    sortable: true,
    render: (_, row) => (
      <span className="font-medium">
        {row.employee_name || row.employee || '—'}
      </span>
    ),
  },
  {
    key: 'travel_type',
    header: 'نوع السفر',
    sortable: true,
    width: 'w-[120px]',
    render: (value) => {
      const label = TRAVEL_TYPE_MAP[String(value || '')] || String(value || '—');
      return (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {label}
        </span>
      );
    },
  },
  {
    key: 'destination',
    header: 'الوجهة',
    sortable: true,
    render: (value) => String(value || '—'),
  },
  {
    key: 'from_date',
    header: 'من تاريخ',
    sortable: true,
    width: 'w-[120px]',
    render: (value) => (value ? formatDate(String(value)) : '—'),
  },
  {
    key: 'to_date',
    header: 'إلى تاريخ',
    sortable: true,
    width: 'w-[120px]',
    render: (value) => (value ? formatDate(String(value)) : '—'),
  },
  {
    key: 'advance_amount',
    header: 'السلفة',
    sortable: true,
    width: 'w-[110px]',
    render: (value) => (
      <span className="tabular-nums font-semibold">
        {Number(value) ? formatCurrency(Number(value)) : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'الحالة',
    sortable: true,
    width: 'w-[110px]',
    render: (value) => <StatusBadge status={String(value || 'Draft')} />,
  },
];

/* ────────────────────────────────────────────
   Initial Form Data
──────────────────────────────────────────── */
const INITIAL_FORM = {
  employee: '',
  purpose: '',
  from_date: '',
  to_date: '',
  travel_type: '',
  destination: '',
  advance_amount: 0,
  description: '',
};

/* ────────────────────────────────────────────
   Page Component
──────────────────────────────────────────── */
export default function TravelBookingsPage() {
  /* ── State ── */
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<TravelRequestRow | null>(null);
  const [cancelDialog, setCancelDialog] = useState<TravelRequestRow | null>(null);
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [editingDoc, setEditingDoc] = useState<TravelRequestRow | null>(null);

  /* ── React Query: Fetch Travel Requests ── */
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<TravelRequestRow>('Travel Request', {
    fields: [
      'name',
      'employee',
      'employee_name',
      'purpose',
      'from_date',
      'to_date',
      'travel_type',
      'destination',
      'advance_amount',
      'costing',
      'status',
      'docstatus',
      'approver',
      'description',
      'creation',
    ],
    order_by: 'modified desc',
    limit: 500,
  });

  const travelRequests = rawData ?? [];

  /* ── React Query: Mutations ── */
  const createMutation = useCreateDoc('Travel Request');
  const updateMutation = useUpdateDoc('Travel Request');
  const deleteMutation = useDeleteDoc('Travel Request');
  const submitMutation = useSubmitDoc('Travel Request');
  const cancelMutation = useCancelDoc('Travel Request');

  /* ── KPI Calculations ── */
  const kpis = useMemo(() => {
    const total = travelRequests.length;
    const drafts = travelRequests.filter(
      (r) => Number(r.docstatus) === 0
    ).length;
    const submitted = travelRequests.filter(
      (r) => String(r.status) === 'Submitted' || Number(r.docstatus) === 1
    ).length;
    const approved = travelRequests.filter(
      (r) => String(r.status) === 'Approved'
    ).length;
    const totalAdvance = travelRequests.reduce(
      (sum, r) => sum + (Number(r.advance_amount) || 0),
      0
    );
    return { total, drafts, submitted, approved, totalAdvance };
  }, [travelRequests]);

  /* ── Filtered list based on tab ── */
  const filtered = useMemo(() => {
    if (filter === 'all') return travelRequests;
    if (filter === 'draft') return travelRequests.filter((r) => Number(r.docstatus) === 0);
    if (filter === 'submitted') return travelRequests.filter((r) => String(r.status) === 'Submitted' || Number(r.docstatus) === 1);
    if (filter === 'approved') return travelRequests.filter((r) => String(r.status) === 'Approved');
    if (filter === 'rejected') return travelRequests.filter((r) => String(r.status) === 'Rejected');
    if (filter === 'cancelled') return travelRequests.filter((r) => Number(r.docstatus) === 2);
    return travelRequests;
  }, [travelRequests, filter]);

  /* ── Open Create Dialog ── */
  const openCreateDialog = useCallback(() => {
    setEditingDoc(null);
    setFormData({ ...INITIAL_FORM });
    setDialogOpen(true);
  }, []);

  /* ── Open Edit Dialog ── */
  const openEditDialog = useCallback((row: TravelRequestRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.error('لا يمكن تعديل مستند معتمد أو مُرحّل');
      return;
    }
    setEditingDoc(row);
    setFormData({
      employee: row.employee || '',
      purpose: row.purpose || '',
      from_date: row.from_date || '',
      to_date: row.to_date || '',
      travel_type: row.travel_type || '',
      destination: row.destination || '',
      advance_amount: Number(row.advance_amount) || 0,
      description: row.description || '',
    });
    setDialogOpen(true);
  }, []);

  /* ── Handle Save (Create / Update) ── */
  const handleSave = useCallback(() => {
    if (!formData.employee) {
      toast.error('يرجى اختيار الموظف');
      return;
    }
    if (!formData.from_date || !formData.to_date) {
      toast.error('يرجى تحديد تاريخ السفر');
      return;
    }

    const body: Record<string, unknown> = {
      employee: formData.employee,
      purpose: formData.purpose || undefined,
      from_date: formData.from_date,
      to_date: formData.to_date,
      travel_type: formData.travel_type || undefined,
      destination: formData.destination || undefined,
      advance_amount: formData.advance_amount || undefined,
      description: formData.description || undefined,
    };

    if (editingDoc) {
      updateMutation.mutate(
        { name: editingDoc.name, doc: body },
        {
          onSuccess: () => {
            toast.success('تم تعديل طلب السفر');
            setDialogOpen(false);
            setEditingDoc(null);
          },
          onError: () => toast.error('فشل تعديل طلب السفر'),
        }
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success('تم إنشاء طلب السفر');
          setDialogOpen(false);
          setFormData({ ...INITIAL_FORM });
        },
        onError: () => toast.error('فشل إنشاء طلب السفر'),
      });
    }
  }, [formData, editingDoc, createMutation, updateMutation]);

  /* ── Handle Delete ── */
  const handleDelete = useCallback(() => {
    if (!deleteDialog) return;
    deleteMutation.mutate(deleteDialog.name, {
      onSuccess: () => {
        toast.success('تم حذف طلب السفر');
        setDeleteDialog(null);
      },
      onError: () => toast.error('فشل الحذف — يمكن حذف المسودات فقط'),
    });
  }, [deleteDialog, deleteMutation]);

  /* ── Handle Submit (for approval) ── */
  const handleSubmit = useCallback(
    (row: TravelRequestRow) => {
      if (Number(row.docstatus) !== 0) {
        toast.message('الطلب ليس بمسودة');
        return;
      }
      submitMutation.mutate(row.name, {
        onSuccess: () => toast.success('تم ترحيل طلب السفر'),
        onError: () => toast.error('فشل ترحيل الطلب'),
      });
    },
    [submitMutation]
  );

  /* ── Handle Cancel ── */
  const handleCancel = useCallback(() => {
    if (!cancelDialog) return;
    cancelMutation.mutate(cancelDialog.name, {
      onSuccess: () => {
        toast.success('تم إلغاء طلب السفر');
        setCancelDialog(null);
      },
      onError: () => toast.error('فشل إلغاء الطلب'),
    });
  }, [cancelDialog, cancelMutation]);

  /* ── Handle Dialog Close ── */
  const handleDialogClose = useCallback((openVal: boolean) => {
    setDialogOpen(openVal);
    if (!openVal) {
      setEditingDoc(null);
      setFormData({ ...INITIAL_FORM });
    }
  }, []);

  /* ── Saving state ── */
  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  /* ── Loading spinner ── */
  if (isLoading) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="حجوزات السفر"
          description="إدارة طلبات السفر والموافقات وسلف السفر"
          iconify="solar:earth-bold-duotone"
          accent="primary"
          breadcrumbs={[
            { label: 'التشغيل', href: '/operations' },
            { label: 'حجوزات السفر' },
          ]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      {/* ── Page Header ── */}
      <PageHeader
        title="حجوزات السفر"
        description="إدارة طلبات السفر والموافقات وسلف السفر عبر نظام ERPNext"
        iconify="solar:earth-bold-duotone"
        accent="primary"
        breadcrumbs={[
          { label: 'التشغيل', href: '/operations' },
          { label: 'حجوزات السفر' },
        ]}
        actions={
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            طلب سفر جديد
          </Button>
        }
      />

      {/* ── Error Alert ── */}
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ── KPI Strip ── */}
      {/* ── Status Tabs ── */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-muted/35">
          <TabsTrigger value="all" className="text-xs">
            الكل ({kpis.total})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">
            مسودة ({kpis.drafts})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="text-xs">
            مُقدّم ({kpis.submitted})
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs">
            مُعتمد ({kpis.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            مرفوض
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            ملغي
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Data Table ── */}
      <DataTable<TravelRequestRow>
        data={filtered}
        columns={columns}
        tableId="travel-bookings"
        searchable
        loading={isLoading}
        addLabel="طلب سفر جديد"
        onAdd={openCreateDialog}
        onEdit={openEditDialog}
        onDelete={(row) => {
          if (Number(row.docstatus) !== 0) {
            toast.error('يمكن حذف المسودات فقط');
            return;
          }
          setDeleteDialog(row);
        }}
        onView={(row) => {
          /* Navigate to doc detail */
          window.open(`/doc/Travel Request/${row.name}`, '_blank');
        }}
        exportFileName="travel-requests"
        printTitle="حجوزات السفر"
      />

      {/* ── Quick Actions: Submit drafts for approval ── */}
      {filter === 'draft' && filtered.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
          <div className="bg-muted/35 px-4 py-2 text-xs font-semibold flex items-center gap-2">
            <Send className="h-3.5 w-3.5" />
            مسودات — ترحيل للموافقة
          </div>
          {filtered.map((row) => (
            <div
              key={row.name}
              className="px-4 py-3 flex items-center justify-between border-b border-border/30 last:border-b-0 hover:bg-muted/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {row.employee_name || row.employee}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    — {row.destination || 'بدون وجهة'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {row.from_date ? formatDate(row.from_date) : '—'} →{' '}
                    {row.to_date ? formatDate(row.to_date) : '—'}
                  </span>
                  {row.travel_type && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {TRAVEL_TYPE_MAP[row.travel_type] || row.travel_type}
                    </span>
                  )}
                  {Number(row.advance_amount) > 0 && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(Number(row.advance_amount))}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 me-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => handleSubmit(row)}
                  disabled={submitMutation.isPending}
                >
                  <Send className="h-3 w-3" />
                  ترحيل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive"
                  onClick={() => setDeleteDialog(row)}
                >
                  <XCircle className="h-3 w-3" />
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Actions: Cancel submitted docs ── */}
      {filter === 'submitted' && filtered.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
          <div className="bg-muted/35 px-4 py-2 text-xs font-semibold flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5" />
            طلبات مُقدّمة — إمكانية الإلغاء
          </div>
          {filtered.map((row) => (
            <div
              key={row.name}
              className="px-4 py-3 flex items-center justify-between border-b border-border/30 last:border-b-0 hover:bg-muted/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {row.employee_name || row.employee}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    — {row.destination || 'بدون وجهة'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                  <span>{row.from_date ? formatDate(row.from_date) : '—'} → {row.to_date ? formatDate(row.to_date) : '—'}</span>
                  {row.purpose && <span>{row.purpose}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-destructive gap-1 me-2"
                onClick={() => setCancelDialog(row)}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-3 w-3" />
                إلغاء الطلب
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plane className="h-5 w-5" />
              </div>
              <div>
                <span>
                  {editingDoc
                    ? `تعديل طلب السفر — ${editingDoc.name}`
                    : 'إنشاء طلب سفر'}
                </span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  أدخل بيانات طلب السفر
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Employee */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                الموظف <span className="text-destructive text-xs">*</span>
              </Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={formData.employee}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, employee: v }))
                }
                displayKey="employee_name"
                disabled={!!editingDoc}
                className="h-9"
              />
            </div>

            {/* Travel Type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">نوع السفر</Label>
              <Select
                value={formData.travel_type}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, travel_type: v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="اختر نوع السفر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local Travel">سفر محلي</SelectItem>
                  <SelectItem value="International Travel">
                    سفر دولي
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الوجهة</Label>
              <Input
                value={formData.destination}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    destination: e.target.value,
                  }))
                }
                placeholder="مثال: الرياض، جدة..."
                className="h-9"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.from_date}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      from_date: e.target.value,
                    }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.to_date}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      to_date: e.target.value,
                    }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الغرض</Label>
              <Input
                value={formData.purpose}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, purpose: e.target.value }))
                }
                placeholder="غرض السفر..."
                className="h-9"
              />
            </div>

            {/* Advance Amount */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">مبلغ السلفة</Label>
              <Input
                type="number"
                dir="ltr"
                value={formData.advance_amount || ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    advance_amount: Number(e.target.value || 0),
                  }))
                }
                placeholder="0.00"
                className="h-9"
              />
            </div>

            {/* Description / Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Textarea
                placeholder="ملاحظات إضافية..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-muted-foreground"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5 min-w-[130px]"
              >
                {isSaving
                  ? 'جاري الحفظ...'
                  : editingDoc
                  ? 'حفظ التعديل'
                  : 'إنشاء الطلب'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmationDialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
        title="تأكيد الحذف"
        description={`هل أنت متأكد من حذف طلب السفر "${deleteDialog?.name}"؟ يمكن حذف المسودات فقط.`}
        confirmLabel="حذف"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      {/* ── Cancel Confirmation Dialog ── */}
      <ConfirmationDialog
        open={!!cancelDialog}
        onOpenChange={(open) => {
          if (!open) setCancelDialog(null);
        }}
        title="تأكيد الإلغاء"
        description={`هل أنت متأكد من إلغاء طلب السفر "${cancelDialog?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="إلغاء الطلب"
        variant="destructive"
        isLoading={cancelMutation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}
