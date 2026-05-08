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
} from 'lucide-react';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
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
  High: 'border-rose-400/40 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
  Medium: 'border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  Low: 'border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
};

const STATUS_AR: Record<string, string> = {
  Open: 'مفتوحة',
  Closed: 'مغلقة',
  Cancelled: 'ملغاة',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'border-primary/30 bg-primary/5 text-primary',
  Closed: 'border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
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
      <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 gap-1 border-rose-400/40 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<PriorityType>('Medium');
  const [refType, setRefType] = useState('');
  const [refName, setRefName] = useState('');
  const [allocatedTo, setAllocatedTo] = useState('');

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
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 text-success hover:text-success hover:bg-success/10"
            onClick={() => handleCloseTask(r)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            إغلاق
          </Button>
        );
      },
    },
  ], []);

  /* ── Handlers ── */
  const resetForm = () => {
    setDesc('');
    setDate('');
    setPriority('Medium');
    setRefType('');
    setRefName('');
    setAllocatedTo('');
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
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'المتابعة' }]}
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

      {/* ─── KPI Strip ─── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المهام"
          value={totalTasks}
          icon={ListChecks}
          accent="primary"
          description="جميع مهام المتابعة"
        />
        <KpiCard
          title="مفتوحة"
          value={openTasks}
          icon={Circle}
          accent="info"
          description="مهام بانتظار التنفيذ"
        />
        <KpiCard
          title="مكتملة"
          value={closedTasks}
          icon={CheckCircle2}
          accent="success"
          description="مهام منتهية"
        />
        <KpiCard
          title="متأخرة"
          value={overdueTasks}
          icon={AlertTriangle}
          accent="destructive"
          description={overdueTasks > 0 ? 'تحتاج اهتمام فوري' : 'لا توجد مهام متأخرة'}
        />
      </KpiStrip>

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
            <Badge variant="outline" className="text-[11px] h-7 px-2.5 rounded-lg border-border/40 bg-muted/30 text-muted-foreground">
              {filteredData.length} من {totalTasks}
            </Badge>
          </div>
        </div>

        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">الأولوية</Label>
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
              <Label className="text-[11px] font-semibold text-muted-foreground">الحالة</Label>
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
              <Label className="text-[11px] font-semibold text-muted-foreground">المسؤول</Label>
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
          onDelete={(r) => deleteMutation.mutate(r.name, { onSuccess: () => toast.success('تم حذف المهمة') })}
          onEdit={(row) => {
            if (row.status === 'Open') handleCloseTask(row);
          }}
          tableId="crm-follow-ups"
          exportFileName="crm-follow-ups.csv"
          printTitle="مهام المتابعة"
        />
      </PageShell>

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
                  <Label className="text-[13px] font-semibold">الوصف <span className="text-destructive text-xs">*</span></Label>
                  <Textarea placeholder="ماذا تريد أن تتابعه؟" value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[80px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">تاريخ الاستحقاق</Label>
                    <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">الأولوية</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as PriorityType)}>
                      <SelectTrigger className="h-10 text-sm">
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
                  <Label className="text-[13px] font-semibold">تعيين إلى</Label>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">نوع المرجع</Label>
                    <Select value={refType || '_none'} onValueChange={(v) => { setRefType(v === '_none' ? '' : v); setRefName(''); }}>
                      <SelectTrigger className="h-10 text-sm">
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
                      <Label className="text-[13px] font-semibold">اسم المرجع</Label>
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
    </div>
  );
}
