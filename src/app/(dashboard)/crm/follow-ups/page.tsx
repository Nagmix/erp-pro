'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  RefreshCw,
  Filter,
  X,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ListChecks,
  Clock,
  ChevronDown,
  User,
  CalendarDays,
  Link2,
  Flag,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildToDoCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/* ───────────────────────────── Types & Constants ───────────────────────────── */

type Row = {
  name: string;
  description?: string;
  date?: string;
  priority?: string;
  status?: string;
  reference_type?: string;
  reference_name?: string;
  allocated_to?: string;
};

type PriorityType = 'High' | 'Medium' | 'Low';

const PRIORITY_AR: Record<string, string> = {
  High: 'عالية',
  Medium: 'متوسطة',
  Low: 'منخفضة',
};

const PRIORITY_COLORS: Record<string, string> = {
  High: 'border-destructive/30 bg-destructive/5 text-destructive',
  Medium: 'border-chart-2/30 bg-chart-2/5 text-chart-2',
  Low: 'border-primary/30 bg-primary/5 text-primary',
};

const STATUS_AR: Record<string, string> = {
  Open: 'مفتوحة',
  Closed: 'مغلقة',
  Cancelled: 'ملغاة',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'border-primary/30 bg-primary/5 text-primary',
  Closed: 'border-primary/30 bg-primary/5 text-primary',
  Cancelled: 'border-muted/30 bg-muted/10 text-muted-foreground line-through',
};

const CRM_DOCTYPE_AR: Record<string, string> = {
  'Lead': 'عميل محتمل',
  'Customer': 'عميل',
  'Opportunity': 'فرصة',
  'Quotation': 'عرض سعر',
  'Contact': 'جهة اتصال',
};

const REF_TYPE_OPTIONS = [
  { value: 'Lead', label: 'عميل محتمل' },
  { value: 'Customer', label: 'عميل حالي' },
  { value: 'Opportunity', label: 'فرصة' },
];

/* ───────────────────────────── Helpers ───────────────────────────── */

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isOverdue(dateStr: string | undefined, status: string | undefined): boolean {
  if (!dateStr || status === 'Closed' || status === 'Cancelled') return false;
  const dueDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function getPriorityBadge(priority: string | undefined) {
  if (!priority) return <Badge variant="outline" className="text-[9px] text-muted-foreground">—</Badge>;
  return (
    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0.5 gap-1', PRIORITY_COLORS[priority] || '')}>
      <Flag className="h-3 w-3" />
      {PRIORITY_AR[priority] || priority}
    </Badge>
  );
}

function getStatusBadge(status: string | undefined, date?: string) {
  if (!status) return <Badge variant="outline" className="text-[9px]">—</Badge>;
  const overdue = isOverdue(date, status);
  if (overdue && status === 'Open') {
    return (
      <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 gap-1 border-destructive/30 bg-destructive/5 text-destructive">
        <AlertTriangle className="h-3 w-3" />
        متأخرة
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0.5 gap-1', STATUS_COLORS[status] || '')}>
      {status === 'Open' && <Circle className="h-3 w-3" />}
      {status === 'Closed' && <CheckCircle2 className="h-3 w-3" />}
      {STATUS_AR[status] || status}
    </Badge>
  );
}

/* ───────────────────────────── Main Page ───────────────────────────── */

export default function FollowUpsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Row | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  // Form state
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<PriorityType>('Medium');
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');
  const [allocatedTo, setAllocatedTo] = useState('');

  // Edit form state
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPriority, setEditPriority] = useState<PriorityType>('Medium');
  const [editStatus, setEditStatus] = useState<string>('Open');
  const [editRefType, setEditRefType] = useState('');
  const [editRefName, setEditRefName] = useState('');
  const [editAllocatedTo, setEditAllocatedTo] = useState('');

  // Filter state
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAllocated, setFilterAllocated] = useState<string>('');

  /* ── Data ── */
  const { data, isLoading, isError, error, refetch } = useDocList<Row>('ToDo', {
    fields: ['name', 'description', 'date', 'priority', 'status', 'reference_type', 'reference_name', 'allocated_to'],
    filters: [['status', '!=', 'Cancelled']],
    limit: 500,
    order_by: 'date asc',
  });

  const createMutation = useCreateDoc('ToDo');
  const deleteMutation = useDeleteDoc('ToDo');
  const updateMutation = useUpdateDoc('ToDo');

  const tasks = data || [];

  /* ── Filtered data ── */
  const filteredData = useMemo(() => {
    let result = tasks;
    if (filterPriority !== 'all') result = result.filter((r) => r.priority === filterPriority);
    if (filterStatus !== 'all') result = result.filter((r) => r.status === filterStatus);
    if (filterAllocated) result = result.filter((r) => r.allocated_to === filterAllocated);
    return result;
  }, [tasks, filterPriority, filterStatus, filterAllocated]);

  /* ── KPI calculations ── */
  const totalTasks = tasks.length;
  const openTasks = tasks.filter((r) => r.status === 'Open').length;
  const closedTasks = tasks.filter((r) => r.status === 'Closed').length;
  const overdueTasks = tasks.filter((r) => isOverdue(r.date, r.status)).length;

  /* ── Columns ── */
  const columns: Column<Row>[] = useMemo(() => [
    {
      key: 'description',
      header: 'المهمة',
      sortable: true,
      render: (v) => {
        const text = stripHtml(String(v || ''));
        return (
          <div className="flex items-center gap-2 max-w-[260px]">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{text || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'الاستحقاق',
      sortable: true,
      render: (v, r) => (
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className={cn('text-xs', isOverdue(r.date, r.status) && 'text-rose-600 font-semibold')}>
            {String(v || '—')}
          </span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'الأولوية',
      width: 'w-28',
      render: (v) => getPriorityBadge(v as string | undefined),
    },
    {
      key: 'status',
      header: 'الحالة',
      width: 'w-28',
      render: (_, r) => getStatusBadge(r.status, r.date),
    },
    {
      key: 'reference_type',
      header: 'المرجع',
      render: (_, r) => {
        if (!r.reference_type || !r.reference_name) return <span className="text-xs text-muted-foreground">—</span>;
        const arLabel = CRM_DOCTYPE_AR[r.reference_type] || r.reference_type;
        return (
          <div className="flex items-center gap-1">
            <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs">
              <span className="text-muted-foreground">{arLabel}:</span>{' '}
              <span className="text-primary font-medium">{r.reference_name}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'allocated_to',
      header: 'المسؤول',
      render: (v) => (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{String(v || '—')}</span>
        </div>
      ),
    },
    {
      key: '_close_action',
      header: 'إجراء',
      width: 'w-20',
      render: (_, r) => {
        if (r.status !== 'Open') return null;
        const isClosing = updateMutation.isPending;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 text-success hover:text-success hover:bg-success/10"
            disabled={isClosing}
            onClick={() => handleCloseTask(r)}
          >
            {isClosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            إغلاق
          </Button>
        );
      },
    },
  ], [updateMutation.isPending]);

  /* ── Handlers ── */
  const resetForm = () => {
    setDesc('');
    setDate('');
    setPriority('Medium');
    setRefType('');
    setRefName('');
    setAllocatedTo('');
  };

  const openEditDialog = (row: Row) => {
    setSelectedTask(row);
    setEditDesc(stripHtml(row.description || ''));
    setEditDate(row.date || '');
    setEditPriority((row.priority as PriorityType) || 'Medium');
    setEditStatus(row.status || 'Open');
    setEditRefType(row.reference_type || '');
    setEditRefName(row.reference_name || '');
    setEditAllocatedTo(row.allocated_to || '');
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTask) return;
    if (!editDesc.trim()) { toast.error('وصف المهمة مطلوب'); return; }
    const doc: Record<string, unknown> = {
      description: editDesc,
      date: editDate || undefined,
      priority: editPriority,
      status: editStatus,
      allocated_to: editAllocatedTo || undefined,
    };
    if (editRefType) {
      doc.reference_type = editRefType;
      doc.reference_name = editRefName || undefined;
    }
    updateMutation.mutate(
      { name: selectedTask.name, doc },
      {
        onSuccess: () => { toast.success('تم تحديث مهمة المتابعة'); setEditDialogOpen(false); setSelectedTask(null); },
        onError: () => toast.error('فشل تحديث المهمة'),
      },
    );
  };

  const handleCreate = () => {
    if (!desc.trim()) { toast.error('وصف المهمة مطلوب'); return; }
    const mapped = buildToDoCreate({
      description: desc,
      date: date || undefined,
      priority,
      reference_type: refType || undefined,
      reference_name: refName || undefined,
      allocated_to: allocatedTo || undefined,
    });
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم إنشاء مهمة المتابعة'); setDialogOpen(false); resetForm(); },
      onError: () => toast.error('فشل إنشاء المهمة'),
    });
  };

  const handleCloseTask = (row: Row) => {
    updateMutation.mutate(
      { name: row.name, doc: { status: 'Closed' } },
      {
        onSuccess: () => toast.success('تم إغلاق المهمة'),
        onError: () => toast.error('فشل إغلاق المهمة'),
      },
    );
  };

  const clearFilters = () => {
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterAllocated('');
  };

  const hasActiveFilters = filterPriority !== 'all' || filterStatus !== 'all' || filterAllocated !== '';

  /* ── Render ── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="المتابعة"
        description="مهام متابعة مرتبطة بعملاء محتملين أو حاليين أو فرص — تتبع وإدارة كل المهام العالقة"
        iconify="solar:checklist-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'إدارة العملاء', href: '/crm' }, { label: 'المتابعة' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              متابعة جديدة
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      {/* ─── Filters ─── */}
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            variant={filtersOpen ? 'secondary' : 'outline'}
            className="h-8 gap-1.5 text-xs"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            فلاتر
            {hasActiveFilters && (
              <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">!</Badge>
            )}
            <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
          </Button>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3 me-1" />
              مسح الفلاتر
            </Button>
          )}

          <div className="ms-auto">
            <Badge variant="outline" className="text-xs h-7 px-2.5 rounded-lg border-border/40 bg-muted/30 text-muted-foreground">
              {filteredData.length} من {totalTasks}
            </Badge>
          </div>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">الأولوية</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="High">عالية</SelectItem>
                  <SelectItem value="Medium">متوسطة</SelectItem>
                  <SelectItem value="Low">منخفضة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">الحالة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Open">مفتوحة</SelectItem>
                  <SelectItem value="Closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">المسؤول</Label>
              <ErpLinkCombobox
                doctype="User"
                value={filterAllocated}
                onChange={setFilterAllocated}
                placeholder="الكل"
                displayKey="full_name"
                showCreateShortcut={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Data Table ─── */}
      <PageShell padded={false}>
        <DataTable
          data={filteredData}
          columns={columns}
          searchable
          loading={isLoading}
          onDelete={(r) => { setToDelete(r); setDeleteDialogOpen(true); }}
          onEdit={(row) => openEditDialog(row)}
          tableId="crm-follow-ups"
          exportFileName="crm-follow-ups.csv"
          printTitle="مهام المتابعة"
        />
      </PageShell>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل مهمة المتابعة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل: {selectedTask ? stripHtml(selectedTask.description || '').slice(0, 40) : ''}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                    <ListChecks className="h-3 w-3 text-info" />
                  </span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف <span className="text-destructive text-xs">*</span></Label>
                  <Textarea placeholder="ماذا تريد أن تتابعه؟" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[80px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ الاستحقاق</Label>
                    <Input type="date" dir="ltr" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الأولوية</Label>
                    <Select value={editPriority} onValueChange={(v) => setEditPriority(v as PriorityType)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">عالية</SelectItem>
                        <SelectItem value="Medium">متوسطة</SelectItem>
                        <SelectItem value="Low">منخفضة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الحالة</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">مفتوحة</SelectItem>
                        <SelectItem value="Closed">مغلقة</SelectItem>
                        <SelectItem value="Cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تعيين إلى</Label>
                    <ErpLinkCombobox
                      doctype="User"
                      value={editAllocatedTo}
                      onChange={setEditAllocatedTo}
                      displayKey="full_name"
                      placeholder="اختر المستخدم المسؤول..."
                      showCreateShortcut={false}
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-success" />
                  </span>
                  الارتباط (اختياري)
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع المرجع</Label>
                    <Select value={editRefType || '_none'} onValueChange={(v) => { setEditRefType(v === '_none' ? '' : v); setEditRefName(''); }}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="بدون مرجع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">بدون مرجع</SelectItem>
                        {REF_TYPE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editRefType && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">اسم المرجع</Label>
                      <ErpLinkCombobox
                        doctype={editRefType}
                        value={editRefName}
                        onChange={setEditRefName}
                        displayKey={editRefType === 'Customer' ? 'customer_name' : undefined}
                        placeholder="اختر السجل..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            {selectedTask && selectedTask.status === 'Open' && (
              <Button variant="outline" onClick={() => { handleCloseTask(selectedTask); setEditDialogOpen(false); }} disabled={updateMutation.isPending} className="gap-1.5 text-success hover:text-success">
                {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                إغلاق المهمة
              </Button>
            )}
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>مهمة متابعة جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أنشئ مهمة تتبع ومتابعة</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Basic Info */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center">
                    <ListChecks className="h-3 w-3 text-warning" />
                  </span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الوصف <span className="text-destructive text-xs">*</span></Label>
                  <Textarea placeholder="ماذا تريد أن تتابعه؟" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[80px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">تاريخ الاستحقاق</Label>
                    <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الأولوية</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as PriorityType)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">عالية</SelectItem>
                        <SelectItem value="Medium">متوسطة</SelectItem>
                        <SelectItem value="Low">منخفضة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">تعيين إلى</Label>
                  <ErpLinkCombobox
                    doctype="User"
                    value={allocatedTo}
                    onChange={setAllocatedTo}
                    displayKey="full_name"
                    placeholder="اختر المستخدم المسؤول..."
                    showCreateShortcut={false}
                  />
                </div>
              </div>
            </fieldset>

            {/* Reference Info */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                    <Link2 className="h-3 w-3 text-success" />
                  </span>
                  الارتباط (اختياري)
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع المرجع</Label>
                    <Select value={refType || '_none'} onValueChange={(v) => { setRefType(v === '_none' ? '' : v); setRefName(''); }}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="بدون مرجع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">بدون مرجع</SelectItem>
                        {REF_TYPE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {refType && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">اسم المرجع</Label>
                      <ErpLinkCombobox
                        doctype={refType}
                        value={refName}
                        onChange={setRefName}
                        displayKey={refType === 'Customer' ? 'customer_name' : undefined}
                        placeholder="اختر السجل..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </fieldset>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المهمة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مهمة المتابعة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المهمة &quot;{toDelete ? stripHtml(toDelete.description || '').slice(0, 40) : ''}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!toDelete) return;
                deleteMutation.mutate(toDelete.name, {
                  onSuccess: () => { toast.success('تم حذف المهمة'); setDeleteDialogOpen(false); setToDelete(null); },
                  onError: () => toast.error('فشل حذف المهمة'),
                });
              }}
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحذف...</span>
              ) : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
