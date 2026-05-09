'use client';

import { useState, useCallback, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useDocComments,
  useAddDocComment,
} from '@/lib/client/hooks';
import { toast } from 'sonner';
import { formatDate } from '@/lib/app-format';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Clock,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Paperclip,
  MessageSquare,
  ArrowRightLeft,
  ChevronDown,
  RefreshCw,
  FileBadge,
  StickyNote,
  Send,
  CalendarDays,
  UserCircle,
  Tag,
  CircleDot,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────

type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface WorkOrderRow {
  name: string;
  subject: string;
  description?: string;
  status: string;
  priority?: string;
  _assign?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  creation?: string;
  project?: string;
  type?: string;
  category?: string;
  docstatus: number;
}

interface EmployeeRow {
  name: string;
  employee_name: string;
  designation?: string;
}

// ─── Constants & Mappers ─────────────────────────────────────────────────

const ERP_STATUS_MAP: Record<string, WorkOrderStatus> = {
  Open: 'pending',
  Working: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Overdue: 'pending',
};

const TO_ERP_STATUS: Record<WorkOrderStatus, string> = {
  pending: 'Open',
  in_progress: 'Working',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  pending:
    'bg-chart-2/10 text-chart-2 ring-1 ring-inset ring-chart-2/30',
  in_progress:
    'bg-chart-1/10 text-chart-1',
  completed:
    'bg-primary/10 text-primary',
  cancelled:
    'bg-destructive/10 text-destructive',
};

const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-chart-1/10 text-chart-1',
  high: 'bg-chart-4/10 text-chart-4',
  urgent: 'bg-destructive/10 text-destructive',
};

const STATUS_ICONS: Record<WorkOrderStatus, React.ElementType> = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const PRIORITY_ICONS: Record<WorkOrderPriority, React.ElementType> = {
  low: CircleDot,
  medium: Tag,
  high: AlertTriangle,
  urgent: AlertTriangle,
};

const TASK_FIELDS = [
  'name',
  'subject',
  'status',
  'priority',
  '_assign',
  'exp_start_date',
  'exp_end_date',
  'description',
  'project',
  'type',
  'creation',
  'docstatus',
];

const EMPLOYEE_FIELDS = ['name', 'employee_name', 'designation'];

// ─── Helpers ─────────────────────────────────────────────────────────────

function parseAssign(raw: unknown): string {
  try {
    const a = JSON.parse(String(raw || '[]'));
    return Array.isArray(a) && a.length > 0 ? a[0] : '';
  } catch {
    return '';
  }
}

function mapERPToWorkOrder(raw: Record<string, unknown>): WorkOrderRow {
  const erpStatus = String(raw.status || 'Open');
  return {
    name: String(raw.name),
    subject: String(raw.subject || raw.name),
    description: String(raw.description || ''),
    status: ERP_STATUS_MAP[erpStatus] || 'pending',
    priority: String(raw.priority || 'medium').toLowerCase(),
    _assign: parseAssign(raw._assign),
    exp_start_date: String(raw.exp_start_date || '').split(' ')[0],
    exp_end_date: String(raw.exp_end_date || '').split(' ')[0],
    creation: String(raw.creation || '').split(' ')[0],
    project: String(raw.project || ''),
    type: String(raw.type || ''),
    category: String(raw.type || ''),
    docstatus: Number(raw.docstatus) || 0,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────

function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
        STATUS_COLORS[status]
      )}
    >
      <Icon className="h-3 w-3" />
      {STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const Icon = PRIORITY_ICONS[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
        PRIORITY_COLORS[priority]
      )}
    >
      <Icon className="h-3 w-3" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  description?: string;
}) {
  return (
    <Card className="border-border/40 transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              color
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function WorkOrdersOpsPage() {
  // ── State ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrderRow | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailOrder, setDetailOrder] = useState<WorkOrderRow | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingOrder, setConvertingOrder] = useState<WorkOrderRow | null>(null);

  // ── Form State ──
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formPriority, setFormPriority] = useState<WorkOrderPriority>('medium');
  const [formStatus, setFormStatus] = useState<WorkOrderStatus>('pending');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategory, setFormCategory] = useState('');

  // ── Data Queries ──
  const {
    data: rawData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<Record<string, unknown>>('Task', {
    fields: TASK_FIELDS,
    order_by: 'creation desc',
    limit: 500,
  });

  const { data: employeesRaw } = useDocList<Record<string, unknown>>('Employee', {
    fields: EMPLOYEE_FIELDS,
    limit: 200,
  });

  const createMutation = useCreateDoc('Task');
  const updateMutation = useUpdateDoc('Task');
  const deleteMutation = useDeleteDoc('Task');

  // ── Mapped Data ──
  const workOrders: WorkOrderRow[] = useMemo(
    () => (rawData || []).map(mapERPToWorkOrder),
    [rawData]
  );

  const employees: EmployeeRow[] = useMemo(
    () =>
      (employeesRaw || []).map((e) => ({
        name: String(e.name),
        employee_name: String(e.employee_name || e.name),
        designation: String(e.designation || ''),
      })),
    [employeesRaw]
  );

  // ── Filtered Data ──
  const filteredOrders = useMemo(() => {
    let result = workOrders;

    if (filterStatus !== 'all') {
      result = result.filter((o) => o.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      result = result.filter((o) => o.priority === filterPriority);
    }
    if (filterEmployee !== 'all') {
      result = result.filter((o) => o._assign === filterEmployee);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.subject.toLowerCase().includes(q) ||
          o.name.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [workOrders, filterStatus, filterPriority, filterEmployee, searchQuery]);

  // ── KPI Stats ──
  const stats = useMemo(() => {
    const total = workOrders.length;
    const pending = workOrders.filter((o) => o.status === 'pending').length;
    const inProgress = workOrders.filter((o) => o.status === 'in_progress').length;
    const completed = workOrders.filter((o) => o.status === 'completed').length;
    const cancelled = workOrders.filter((o) => o.status === 'cancelled').length;
    const urgent = workOrders.filter((o) => o.priority === 'urgent').length;
    return { total, pending, inProgress, completed, cancelled, urgent };
  }, [workOrders]);

  // ── Dialog Helpers ──
  const openCreateDialog = useCallback(() => {
    setEditingOrder(null);
    setFormSubject('');
    setFormDescription('');
    setFormAssignedTo('');
    setFormPriority('medium');
    setFormStatus('pending');
    setFormDueDate('');
    setFormCategory('');
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((order: WorkOrderRow) => {
    setEditingOrder(order);
    setFormSubject(order.subject);
    setFormDescription(order.description || '');
    setFormAssignedTo(order._assign || '');
    setFormPriority((order.priority as WorkOrderPriority) || 'medium');
    setFormStatus(order.status as WorkOrderStatus);
    setFormDueDate(order.exp_end_date || '');
    setFormCategory(order.category || '');
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formSubject.trim()) {
      toast.error('يرجى إدخال موضوع أمر الشغل');
      return;
    }

    const erpStatus = TO_ERP_STATUS[formStatus];
    const body: Record<string, unknown> = {
      subject: formSubject.trim(),
      status: erpStatus,
      priority: formPriority,
      exp_end_date: formDueDate || undefined,
      description: formDescription.trim() || undefined,
      type: formCategory.trim() || undefined,
    };

    if (formAssignedTo) {
      body._assign = JSON.stringify([formAssignedTo]);
    }

    try {
      if (editingOrder) {
        await updateMutation.mutateAsync({ name: editingOrder.name, doc: body });
        toast.success('تم تحديث أمر الشغل بنجاح');
      } else {
        await createMutation.mutateAsync(body);
        toast.success('تم إنشاء أمر الشغل بنجاح');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل حفظ أمر الشغل');
    }
  }, [
    formSubject,
    formDescription,
    formAssignedTo,
    formPriority,
    formStatus,
    formDueDate,
    formCategory,
    editingOrder,
    createMutation,
    updateMutation,
  ]);

  const handleDelete = useCallback(
    async (name: string) => {
      try {
        await deleteMutation.mutateAsync(name);
        toast.success('تم حذف أمر الشغل');
        setDeleteName(null);
        if (detailOrder?.name === name) {
          setDetailDialogOpen(false);
          setDetailOrder(null);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'فشل حذف أمر الشغل');
      }
    },
    [deleteMutation, detailOrder]
  );

  // ── One-Click Status Change ──
  const changeStatus = useCallback(
    async (order: WorkOrderRow, newStatus: WorkOrderStatus) => {
      const erpStatus = TO_ERP_STATUS[newStatus];
      try {
        await updateMutation.mutateAsync({
          name: order.name,
          doc: { status: erpStatus },
        });
        toast.success(`تم تغيير الحالة إلى "${STATUS_LABELS[newStatus]}"`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'فشل تغيير الحالة');
      }
    },
    [updateMutation]
  );

  // ── Convert to Sales Invoice ──
  const handleConvertToInvoice = useCallback(
    async (order: WorkOrderRow) => {
      setConvertingOrder(order);
      setConvertDialogOpen(true);
    },
    []
  );

  const confirmConvertToInvoice = useCallback(async () => {
    if (!convertingOrder) return;
    try {
      const body: Record<string, unknown> = {
        doctype: 'Sales Invoice',
        customer: 'Walk In Customer',
        due_date: new Date().toISOString().split('T')[0],
        posting_date: new Date().toISOString().split('T')[0],
        items: [
          {
            item_code: 'Service Item',
            description: convertingOrder.subject,
            qty: 1,
            rate: 0,
            amount: 0,
          },
        ],
        remarks: `تم التحويل من أمر شغل: ${convertingOrder.name} - ${convertingOrder.subject}`,
      };
      await createMutation.mutateAsync(body);
      toast.success('تم إنشاء فاتورة مبيعات من أمر الشغل');
      setConvertDialogOpen(false);
      setConvertingOrder(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل التحويل إلى فاتورة');
    }
  }, [convertingOrder, createMutation]);

  // ── View Detail ──
  const openDetail = useCallback((order: WorkOrderRow) => {
    setDetailOrder(order);
    setDetailDialogOpen(true);
    setNoteText('');
  }, []);

  // ── Notes ──
  const addCommentMutation = useAddDocComment('Task', detailOrder?.name || '');

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim() || !detailOrder) return;
    try {
      await addCommentMutation.mutateAsync(noteText.trim());
      setNoteText('');
      toast.success('تم إضافة الملاحظة');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل إضافة الملاحظة');
    }
  }, [noteText, detailOrder, addCommentMutation]);

  const { data: comments } = useDocComments('Task', detailOrder?.name || '', {
    enabled: !!detailOrder?.name && detailDialogOpen,
  });

  // ── DataTable Columns ──
  const columns: Column<WorkOrderRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الرقم',
        sortable: true,
        render: (v) => (
          <span className="font-medium text-primary cursor-pointer hover:underline" onClick={() => {
            const order = workOrders.find(o => o.name === String(v));
            if (order) openDetail(order);
          }}>
            {String(v)}
          </span>
        ),
      },
      {
        key: 'subject',
        header: 'الموضوع',
        sortable: true,
        render: (v, row) => (
          <div className="max-w-[220px]">
            <p className="font-medium text-sm truncate">{String(v)}</p>
            {row.category && (
              <p className="text-[10px] text-muted-foreground truncate">{row.category}</p>
            )}
          </div>
        ),
      },
      {
        key: '_assign',
        header: 'المسؤول',
        sortable: true,
        render: (v) => {
          const name = String(v || '');
          const emp = employees.find((e) => e.name === name);
          return (
            <span className="text-xs">
              {emp ? emp.employee_name : name || '—'}
            </span>
          );
        },
      },
      {
        key: 'priority',
        header: 'الأولوية',
        sortable: true,
        render: (v) => <PriorityBadge priority={String(v) as WorkOrderPriority} />,
      },
      {
        key: 'status',
        header: 'الحالة',
        sortable: true,
        render: (v) => <WorkOrderStatusBadge status={String(v) as WorkOrderStatus} />,
      },
      {
        key: 'exp_end_date',
        header: 'تاريخ الاستحقاق',
        sortable: true,
        render: (v) => (
          <span className="text-xs">
            {v ? formatDate(String(v)) : '—'}
          </span>
        ),
      },
      {
        key: 'creation',
        header: 'تاريخ الإنشاء',
        sortable: true,
        render: (v) => (
          <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span>
        ),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-36',
        render: (_v, row) => (
          <div className="flex items-center gap-1">
            {/* One-click status buttons */}
            {row.status !== 'in_progress' && row.status !== 'completed' && row.status !== 'cancelled' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-chart-1 hover:text-chart-1 hover:bg-chart-1/5"
                title="بدء التنفيذ"
                onClick={() => changeStatus(row, 'in_progress')}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            {row.status === 'in_progress' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/5"
                title="إكمال"
                onClick={() => changeStatus(row, 'completed')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {row.status !== 'cancelled' && row.status !== 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/5"
                title="إلغاء"
                onClick={() => changeStatus(row, 'cancelled')}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => openDetail(row)}>
                  <FileText className="me-2 h-3.5 w-3.5" />
                  عرض التفاصيل
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditDialog(row)}>
                  <Edit className="me-2 h-3.5 w-3.5" />
                  تعديل
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleConvertToInvoice(row)}>
                  <ArrowRightLeft className="me-2 h-3.5 w-3.5" />
                  تحويل إلى فاتورة مبيعات
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteName(row.name)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="me-2 h-3.5 w-3.5" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [workOrders, employees, changeStatus, openEditDialog, openDetail, handleConvertToInvoice]
  );

  const saving = createMutation.isPending || updateMutation.isPending;

  // ─── Render ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div dir="rtl" className="erp-page-enter">
        <Spinner />
      </div>
    );
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {/* ── Header ── */}
      <PageHeader
        title="أوامر الشغل"
        description="إدارة وتتبع أوامر الشغل والتكليفات التشغيلية — إنشاء، تعيين، متابعة وتحويل"
        iconify="solar:clipboard-list-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'أوامر الشغل' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
              <Plus className="h-3.5 w-3.5" />
              أمر شغل جديد
            </Button>
          </div>
        }
      />

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="إجمالي أوامر الشغل"
          value={stats.total}
          icon={ClipboardList}
          color="bg-chart-2/10 text-chart-2"
          description="جميع الأوامر"
        />
        <StatCard
          title="قيد الانتظار"
          value={stats.pending}
          icon={Clock}
          color="bg-chart-2/10 text-chart-2"
          description="بانتظار البدء"
        />
        <StatCard
          title="قيد التنفيذ"
          value={stats.inProgress}
          icon={Play}
          color="bg-chart-1/10 text-chart-1"
          description="يتم العمل عليها حالياً"
        />
        <StatCard
          title="مكتملة"
          value={stats.completed}
          icon={CheckCircle2}
          color="bg-primary/10 text-primary"
          description="تم إنجازها"
        />
      </div>

      {/* ── Filters Bar ── */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
              <Filter className="h-3.5 w-3.5" />
              تصفية:
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالرقم، الموضوع، أو الوصف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pe-8 text-xs"
                />
              </div>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-40 text-xs">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأولويات</SelectItem>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>

              {/* Employee Filter */}
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="h-9 w-44 text-xs">
                  <SelectValue placeholder="الموظف المسؤول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الموظفين</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.name} value={emp.name}>
                      {emp.employee_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(filterStatus !== 'all' ||
                filterPriority !== 'all' ||
                filterEmployee !== 'all' ||
                searchQuery) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 text-xs gap-1"
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setFilterEmployee('all');
                    setSearchQuery('');
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
          {/* Active filter summary */}
          {(filterStatus !== 'all' ||
            filterPriority !== 'all' ||
            filterEmployee !== 'all' ||
            searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
              <span className="text-[10px] text-muted-foreground">عرض:</span>
              <Badge variant="secondary" className="text-[10px] gap-1">
                {filteredOrders.length} من {workOrders.length}
              </Badge>
              {filterStatus !== 'all' && (
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABELS[filterStatus as WorkOrderStatus]}
                </Badge>
              )}
              {filterPriority !== 'all' && (
                <Badge variant="outline" className="text-[10px]">
                  {PRIORITY_LABELS[filterPriority as WorkOrderPriority]}
                </Badge>
              )}
              {filterEmployee !== 'all' && (
                <Badge variant="outline" className="text-[10px]">
                  {employees.find((e) => e.name === filterEmployee)?.employee_name || filterEmployee}
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="outline" className="text-[10px]">
                  بحث: {searchQuery}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Data Table ── */}
      <DataTable<WorkOrderRow>
        data={filteredOrders}
        columns={columns}
        tableId="work-orders-ops-list"
        searchable={false}
        pageSize={15}
        onAdd={openCreateDialog}
        addLabel="أمر شغل جديد"
        onEdit={openEditDialog}
        onDelete={(row) => setDeleteName(row.name)}
        onView={openDetail}
        exportFileName="أوامر_الشغل"
        loading={isLoading}
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف أمر الشغل؟</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من حذف أمر الشغل &quot;{deleteName}&quot;؟ لا يمكن التراجع عن هذا
              الإجراء.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteName) void handleDelete(deleteName);
              }}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? 'تعديل أمر الشغل' : 'أمر شغل جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                الموضوع <span className="text-destructive">*</span>
              </Label>
              <Input
                className="h-9 text-sm"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="أدخل موضوع أمر الشغل"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">الوصف</Label>
              <Textarea
                className="text-sm min-h-[80px]"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="أدخل وصف تفصيلي لأمر الشغل..."
                rows={3}
              />
            </div>

            {/* Assigned To + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">المسؤول</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.name} value={emp.name}>
                        {emp.employee_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">التصنيف</Label>
                <Input
                  className="h-9 text-sm"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="صيانة، تركيب، فحص..."
                />
              </div>
            </div>

            {/* Priority + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الأولوية</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as WorkOrderPriority)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">الحالة</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as WorkOrderStatus)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">قيد الانتظار</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">تاريخ الاستحقاق</Label>
              <Input
                type="date"
                className="h-9 text-sm"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {editingOrder ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog (Notes & Attachments) ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-warning" />
              تفاصيل أمر الشغل
            </DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <ScrollArea className="max-h-[70vh] pe-1">
              <div className="space-y-5 pb-4">
                {/* Order Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">{detailOrder.subject}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        رقم: {detailOrder.name}
                      </p>
                    </div>
                    <WorkOrderStatusBadge status={detailOrder.status as WorkOrderStatus} />
                  </div>

                  {detailOrder.description && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {detailOrder.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Priority */}
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">الأولوية:</span>
                      <PriorityBadge
                        priority={(detailOrder.priority as WorkOrderPriority) || 'medium'}
                      />
                    </div>
                    {/* Assigned */}
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">المسؤول:</span>
                      <span className="font-medium">
                        {employees.find((e) => e.name === detailOrder._assign)
                          ?.employee_name ||
                          detailOrder._assign ||
                          'غير معين'}
                      </span>
                    </div>
                    {/* Due Date */}
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">الاستحقاق:</span>
                      <span className="font-medium">
                        {detailOrder.exp_end_date
                          ? formatDate(detailOrder.exp_end_date)
                          : 'غير محدد'}
                      </span>
                    </div>
                    {/* Category */}
                    <div className="flex items-center gap-2 text-sm">
                      <FileBadge className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">التصنيف:</span>
                      <span className="font-medium">
                        {detailOrder.category || 'غير مصنف'}
                      </span>
                    </div>
                    {/* Created At */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">الإنشاء:</span>
                      <span className="font-medium">
                        {detailOrder.creation ? formatDate(detailOrder.creation) : '—'}
                      </span>
                    </div>
                    {/* Project */}
                    {detailOrder.project && (
                      <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">المشروع:</span>
                        <span className="font-medium">{detailOrder.project}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Status Change */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    تغيير الحالة سريعاً
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ['pending', 'in_progress', 'completed', 'cancelled'] as WorkOrderStatus[]
                    ).map((s) => {
                      const Icon = STATUS_ICONS[s];
                      const isActive = detailOrder.status === s;
                      return (
                        <Button
                          key={s}
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          className={cn(
                            'h-8 text-xs gap-1.5',
                            !isActive && STATUS_COLORS[s]
                          )}
                          disabled={isActive}
                          onClick={() => {
                            void changeStatus(detailOrder, s);
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {STATUS_LABELS[s]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Convert to Invoice */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      handleConvertToInvoice(detailOrder);
                    }}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    تحويل إلى فاتورة مبيعات
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      openEditDialog(detailOrder);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                </div>

                <Separator />

                {/* Notes / Comments Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    الملاحظات والتعليقات
                  </h4>

                  {/* Add Note */}
                  <div className="flex gap-2">
                    <Textarea
                      className="text-sm min-h-[60px] flex-1"
                      placeholder="أضف ملاحظة أو تعليق..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                    />
                    <Button
                      size="sm"
                      className="self-end gap-1"
                      disabled={!noteText.trim() || addCommentMutation.isPending}
                      onClick={() => void handleAddNote()}
                    >
                      {addCommentMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Existing Notes */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments && comments.length > 0 ? (
                      comments.map((c) => (
                        <div
                          key={c.name}
                          className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="font-medium">
                              {c.comment_by || c.sender || 'مستخدم'}
                            </span>
                            <span>
                              {c.creation
                                ? formatDate(String(c.creation).split(' ')[0])
                                : ''}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{c.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <StickyNote className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground mt-2">
                          لا توجد ملاحظات بعد
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Attachments Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    المرفقات
                  </h4>
                  <div className="text-center py-6">
                    <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground mt-2">
                      لا توجد مرفقات حالياً
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 gap-1.5 text-xs"
                      onClick={() =>
                        toast.info('يمكنك رفع المرفقات من سجل المستند في ERPNext')
                      }
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      إضافة مرفق
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Convert to Sales Invoice Dialog ── */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تحويل إلى فاتورة مبيعات</AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              سيتم إنشاء فاتورة مبيعات جديدة من أمر الشغل
              {convertingOrder ? ` "${convertingOrder.subject}"` : ''}. هل تريد المتابعة؟
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmConvertToInvoice()}>
              <ArrowRightLeft className="h-3.5 w-3.5 me-1.5" />
              تحويل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
