'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useUpdateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, Clock, Shield, AlertCircle, User,
  Loader2, RefreshCw, ExternalLink, Plus, Workflow, FileText,
  ArrowRight, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────── Types ──────────────── */

type ToDoItem = {
  name: string;
  description: string;
  status: string;
  priority: string;
  allocated_to: string;
  date: string;
  reference_type: string;
  reference_name: string;
  owner?: string;
};

type WorkflowDoc = {
  name: string;
  document_type: string;
  is_active: number;
  workflow_state_field: string;
};

type WorkflowState = {
  name: string;
  parent: string;
  state: string;
  update_field?: string;
  update_value?: string;
  allow_edit?: string;
};

type AuthRule = {
  name: string;
  based_on: string;
  transaction_type: string;
  value: string;
  system_role: string;
  system_user: string;
  to_role: string;
  to_user: string;
};

type CommentDoc = {
  name: string;
  comment_type: string;
  reference_doctype: string;
  reference_name: string;
  content: string;
  owner: string;
  creation: string;
};

type ApprovalDecision = 'موافق' | 'مرفوض' | 'معلومات إضافية';

/* ──────────────── Helpers ──────────────── */

const priorityColors: Record<string, string> = {
  High: 'bg-destructive/10 text-rose-700 dark:bg-destructive/10 dark:text-rose-300 ring-1 ring-inset ring-rose-300',
  Medium: 'bg-chart-2/10 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300 ring-1 ring-inset ring-amber-300',
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 ring-1 ring-inset ring-slate-300',
};

const priorityAr: Record<string, string> = {
  High: 'عاجل',
  Medium: 'مهم',
  Low: 'عادي',
};

const doctypeIcons: Record<string, string> = {
  'Sales Invoice': '🧾',
  'Purchase Invoice': '📋',
  'Purchase Order': '🛒',
  'Payment Entry': '💸',
  'Leave Application': '🏖️',
  'Expense Claim': '💰',
  'Journal Entry': '📒',
  'Material Request': '📦',
  'Stock Entry': '🔄',
};

function mapPriority(p: string): string {
  return priorityAr[p] || p;
}

function hoursWaiting(requestedAt: string): string {
  if (!requestedAt) return '—';
  const diff = Date.now() - new Date(requestedAt).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'أقل من ساعة';
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

/* ──────────────── Main Component ──────────────── */

export default function ApprovalWorkflowPage() {
  // ── UI State ──
  const [activeTab, setActiveTab] = useState('my-approvals');
  const [notesDialog, setNotesDialog] = useState<{ id: string; decision: ApprovalDecision } | null>(null);
  const [notesText, setNotesText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Workflow rule dialog
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    doctype: '',
    currentState: '',
    nextState: '',
    approverRole: '',
    approverUser: '',
  });

  // History filters
  const [historyFilter, setHistoryFilter] = useState<string>('الكل');
  const [historyDoctypeFilter, setHistoryDoctypeFilter] = useState<string>('');

  // ── Data Fetching ──
  const {
    data: pendingTodos,
    isLoading: loadingPending,
    isError: isErrorPending,
    error: errorPending,
    refetch: refetchPending,
  } = useDocList<ToDoItem>('ToDo', {
    fields: ['name', 'description', 'status', 'priority', 'allocated_to', 'date', 'reference_type', 'reference_name', 'owner'],
    filters: [['status', '=', 'Open'], ['reference_type', '!=', '']],
    limit: 200,
    order_by: 'date asc',
  });

  const {
    data: closedTodos,
    isLoading: loadingClosed,
    refetch: refetchClosed,
  } = useDocList<ToDoItem>('ToDo', {
    fields: ['name', 'description', 'status', 'priority', 'allocated_to', 'date', 'reference_type', 'reference_name', 'owner'],
    filters: [['status', '=', 'Closed'], ['reference_type', '!=', '']],
    limit: 200,
    order_by: 'date desc',
  });

  const {
    data: workflows,
    isLoading: loadingWorkflows,
    refetch: refetchWorkflows,
  } = useDocList<WorkflowDoc>('Workflow', {
    fields: ['name', 'document_type', 'is_active', 'workflow_state_field'],
    limit: 100,
  });

  const {
    data: authRules,
    isLoading: loadingRules,
    refetch: refetchRules,
  } = useDocList<AuthRule>('Authorization Rule', {
    fields: ['name', 'based_on', 'transaction_type', 'value', 'system_role', 'system_user', 'to_role', 'to_user'],
    limit: 100,
  });

  const {
    data: comments,
    isLoading: loadingComments,
    refetch: refetchComments,
  } = useDocList<CommentDoc>('Comment', {
    fields: ['name', 'comment_type', 'reference_doctype', 'reference_name', 'content', 'owner', 'creation'],
    filters: [['comment_type', 'in', ['Approved', 'Rejected', 'Info']]] as unknown as string[][],
    limit: 200,
    order_by: 'creation desc',
  });

  const updateTodoMutation = useUpdateDoc('ToDo');
  const createWorkflowMutation = useCreateDoc('Workflow');

  // ── Derived Data ──
  const pendingItems = pendingTodos || [];
  const closedItems = closedTodos || [];
  const workflowList = workflows || [];
  const ruleList = authRules || [];
  const commentList = comments || [];

  const today = new Date().toISOString().slice(0, 10);
  const approvedToday = useMemo(() =>
    closedItems.filter(r => r.date && r.date.slice(0, 10) === today).length,
    [closedItems, today]
  );
  const rejectedToday = useMemo(() => {
    // Use comments for rejected count
    return commentList.filter(c =>
      c.comment_type === 'Rejected' &&
      c.creation?.slice(0, 10) === today
    ).length;
  }, [commentList, today]);

  const totalActiveWorkflows = useMemo(() =>
    workflowList.filter(w => w.is_active).length,
    [workflowList]
  );

  // ── Approval Actions ──
  const handleDecision = useCallback(async (id: string, decision: ApprovalDecision, notes?: string) => {
    setActionLoading(id);
    try {
      const doc: Record<string, unknown> = { status: 'Closed' };
      if (notes) doc.description = notes;

      await new Promise<void>((resolve, reject) => {
        updateTodoMutation.mutate(
          { name: id, doc },
          {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          }
        );
      });

      toast.success(decision === 'موافق' ? 'تمت الموافقة' : decision === 'مرفوض' ? 'تم الرفض' : 'تم طلب معلومات إضافية');
      void refetchPending();
      void refetchClosed();
      void refetchComments();
    } catch {
      toast.error('فشل تنفيذ القرار');
    } finally {
      setActionLoading(null);
    }
  }, [updateTodoMutation, toast, refetchPending, refetchClosed, refetchComments]);

  const submitNotes = useCallback(() => {
    if (notesDialog) {
      handleDecision(notesDialog.id, notesDialog.decision, notesText || undefined);
      setNotesDialog(null);
      setNotesText('');
    }
  }, [notesDialog, notesText, handleDecision]);

  // ── Create Workflow Rule ──
  const handleCreateRule = useCallback(() => {
    if (!ruleForm.doctype || !ruleForm.currentState || !ruleForm.nextState) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const doc: Record<string, unknown> = {
      doctype: 'Authorization Rule',
      transaction_type: ruleForm.doctype,
      based_on: 'Document Type',
      value: ruleForm.doctype,
      system_role: ruleForm.approverRole || undefined,
      system_user: ruleForm.approverUser || undefined,
      to_role: ruleForm.approverRole || undefined,
      to_user: ruleForm.approverUser || undefined,
    };
    createWorkflowMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء قاعدة الموافقة بنجاح');
        setRuleDialogOpen(false);
        setRuleForm({ doctype: '', currentState: '', nextState: '', approverRole: '', approverUser: '' });
        void refetchRules();
      },
      onError: () => {
        toast.error('فشل إنشاء قاعدة الموافقة');
      },
    });
  }, [ruleForm, createWorkflowMutation, toast, refetchRules]);

  // ── Approval History ──
  const historyEntries = useMemo(() => {
    let items = commentList.map(c => ({
      id: c.name,
      doctype: c.reference_doctype,
      docname: c.reference_name,
      action: c.comment_type === 'Approved' ? 'موافق' : c.comment_type === 'Rejected' ? 'مرفوض' : 'معلومات إضافية',
      user: c.owner,
      date: c.creation,
      notes: c.content,
    }));
    if (historyFilter !== 'الكل') {
      items = items.filter(i => i.action === historyFilter);
    }
    if (historyDoctypeFilter) {
      items = items.filter(i => i.doctype === historyDoctypeFilter);
    }
    return items;
  }, [commentList, historyFilter, historyDoctypeFilter]);

  const historyColumns: Column<typeof historyEntries[0]>[] = useMemo(() => [
    {
      key: 'docname',
      header: 'المستند',
      sortable: true,
      render: (v) => <span className="font-medium text-primary">{String(v)}</span>,
    },
    {
      key: 'doctype',
      header: 'نوع المستند',
      sortable: true,
      render: (v) => (
        <span className="flex items-center gap-1.5 text-xs">
          <span>{doctypeIcons[String(v)] || '📄'}</span>{String(v)}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'القرار',
      render: (v) => {
        const action = String(v);
        const color = action === 'موافق'
          ? 'bg-primary/10 text-emerald-700 dark:bg-primary/10 dark:text-emerald-300'
          : action === 'مرفوض'
            ? 'bg-destructive/10 text-rose-700 dark:bg-destructive/10 dark:text-rose-300'
            : 'bg-chart-2/10 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300';
        return (
          <Badge variant="outline" className={cn('text-[10px] font-semibold border-0 px-2 py-0.5', color)}>
            {action}
          </Badge>
        );
      },
    },
    {
      key: 'user',
      header: 'بواسطة',
      sortable: true,
      render: (v) => (
        <span className="flex items-center gap-1 text-xs">
          <User className="h-3 w-3 text-muted-foreground" />{String(v)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      sortable: true,
      render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span>,
    },
    {
      key: 'notes',
      header: 'ملاحظات',
      render: (v) => (
        <span className="text-xs text-muted-foreground max-w-[180px] truncate block">{v ? String(v) : '—'}</span>
      ),
    },
  ], []);

  // ── Workflow columns ──
  const workflowColumns: Column<WorkflowDoc>[] = useMemo(() => [
    {
      key: 'name',
      header: 'اسم سير العمل',
      sortable: true,
      render: (v) => (
        <span className="flex items-center gap-2 font-medium">
          <Workflow className="h-3.5 w-3.5 text-primary" />
          {String(v)}
        </span>
      ),
    },
    {
      key: 'document_type',
      header: 'نوع المستند',
      sortable: true,
      render: (v) => (
        <span className="flex items-center gap-1.5 text-xs">
          <span>{doctypeIcons[String(v)] || '📄'}</span>{String(v)}
        </span>
      ),
    },
    {
      key: 'workflow_state_field',
      header: 'حالة سير العمل',
      render: (v) => <span className="text-xs font-mono text-primary">{String(v || '—')}</span>,
    },
    {
      key: 'is_active',
      header: 'نشط',
      width: 'w-24',
      render: (v) => (
        <Badge variant="outline" className={cn(
          'text-[10px] border-0',
          Number(v) === 1
            ? 'bg-primary/10 text-emerald-700 dark:bg-primary/10 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400'
        )}>
          {Number(v) === 1 ? 'نشط' : 'غير نشط'}
        </Badge>
      ),
    },
  ], []);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="سير الموافقات المتقدم"
        description="إدارة موافقات متعددة المستويات وقواعد سير العمل وتفويض الصلاحيات"
        iconify="solar:check-circle-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'سير الموافقات المتقدم' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRuleDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              قاعدة جديدة
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => {
              // Navigate to workflow studio
              window.open('/operations/workflow-studio', '_blank');
            }}>
              <Workflow className="h-3.5 w-3.5" />
              إنشاء سير عمل
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="flex flex-wrap gap-1 w-full">
          <TabsTrigger value="my-approvals" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> موافقاتي
            {pendingItems.length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] tabular-nums">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5 text-xs">
            <Workflow className="h-3.5 w-3.5" /> سير العمل
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> قواعد الموافقة
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> سجل الموافقات
          </TabsTrigger>
        </TabsList>

        {/* ────── Tab 1: My Approvals ────── */}
        <TabsContent value="my-approvals" className="mt-4 space-y-4">
          <ListQueryAlert error={isErrorPending ? errorPending : null} onRetry={() => refetchPending()} />

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { refetchPending(); refetchClosed(); }}>
              <RefreshCw className={cn('h-3.5 w-3.5', loadingPending && 'animate-spin')} /> تحديث
            </Button>
          </div>

          {loadingPending ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
              <div className="text-center space-y-2">
                <CheckCircle2 className="h-9 w-10 text-success mx-auto" />
                <p className="text-sm font-semibold text-foreground">لا توجد طلبات بانتظار الموافقة</p>
                <p className="text-xs text-muted-foreground">جميع الطلبات تمت معالجتها</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {pendingItems.map((todo) => (
                <Card key={todo.name} className="rounded-xl border border-border/40 bg-card shadow-none transition-all duration-200 hover:border-border hover:shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg leading-none">{doctypeIcons[todo.reference_type] || '📄'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {todo.reference_name || todo.description}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {todo.reference_type || '—'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-semibold border-0 px-1.5 py-0', priorityColors[todo.priority] || priorityColors.Low)}>
                        {mapPriority(todo.priority)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">المعتمد</span>
                        <span className="font-medium">{todo.allocated_to || '—'}</span>
                      </div>
                      {todo.owner && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">مقدم الطلب</span>
                          <span className="font-medium">{todo.owner}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">التاريخ</span>
                        <span className="text-xs">{todo.date ? formatDate(todo.date) : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">وقت الانتظار</span>
                        <span className="flex items-center gap-1 text-chart-2 dark:text-amber-400 font-medium">
                          <Clock className="h-3 w-3" />{hoursWaiting(todo.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === todo.name}
                        className="flex-1 h-8 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                        onClick={() => { setNotesDialog({ id: todo.name, decision: 'موافق' }); setNotesText(''); }}
                      >
                        {actionLoading === todo.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        موافقة
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === todo.name}
                        className="flex-1 h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => { setNotesDialog({ id: todo.name, decision: 'مرفوض' }); setNotesText(''); }}
                      >
                        <XCircle className="h-3.5 w-3.5" /> رفض
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === todo.name}
                        className="flex-1 h-8 text-xs gap-1 text-chart-2 border-chart-2/30 hover:bg-chart-2/5"
                        onClick={() => { setNotesDialog({ id: todo.name, decision: 'معلومات إضافية' }); setNotesText(''); }}
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> معلومات
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ────── Tab 2: All Workflows ────── */}
        <TabsContent value="workflows" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">سير العمل المعرف في النظام</p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetchWorkflows()}>
              <RefreshCw className={cn('h-3.5 w-3.5', loadingWorkflows && 'animate-spin')} /> تحديث
            </Button>
          </div>

          {loadingWorkflows ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : workflowList.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
              <div className="text-center space-y-2">
                <Workflow className="h-9 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">لا يوجد سير عمل معرف</p>
                <Button size="sm" className="gap-1.5" onClick={() => window.open('/operations/workflow-studio', '_blank')}>
                  <Plus className="h-3.5 w-3.5" /> إنشاء سير عمل
                </Button>
              </div>
            </div>
          ) : (
            <DataTable
              data={workflowList}
              columns={workflowColumns}
              searchable
              loading={loadingWorkflows}
              tableId="approval-workflows"
              exportFileName="workflows.csv"
              printTitle="سير العمل"
            />
          )}
        </TabsContent>

        {/* ────── Tab 3: Approval Rules ────── */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">قواعد الموافقة والتخويل (Authorization Rules)</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetchRules()}>
                <RefreshCw className={cn('h-3.5 w-3.5', loadingRules && 'animate-spin')} /> تحديث
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setRuleDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> قاعدة جديدة
              </Button>
            </div>
          </div>

          {loadingRules ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : ruleList.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
              <div className="text-center space-y-2">
                <Shield className="h-9 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">لا توجد قواعد تخويل</p>
                <Button size="sm" className="gap-1.5" onClick={() => setRuleDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> إنشاء قاعدة
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {ruleList.map((rule) => (
                <Card key={rule.name} className="rounded-xl border border-border/40 bg-card shadow-none">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">{rule.name}</h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{doctypeIcons[rule.transaction_type] || '📄'}</span>{rule.transaction_type || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      {rule.based_on && (
                        <p>
                          <span className="text-muted-foreground">بناءً على: </span>
                          <span className="font-medium">{rule.based_on}</span>
                          {rule.value ? ` = ${rule.value}` : ''}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-muted-foreground">الموافقة إلى:</span>
                        {rule.to_user && (
                          <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5">
                            <User className="h-3 w-3" />{rule.to_user}
                          </Badge>
                        )}
                        {rule.to_role && (
                          <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5">
                            <Shield className="h-3 w-3" />{rule.to_role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* State transition visual */}
                    {rule.based_on && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/20">
                        <span className="text-[10px] font-medium text-muted-foreground">{rule.value || 'الحالي'}</span>
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-medium text-primary">الموافقة</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ────── Tab 4: Approval History ────── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="h-3 w-3" /> تصفية القرار:
            </span>
            {['الكل', 'موافق', 'مرفوض', 'معلومات إضافية'].map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={historyFilter === f ? 'default' : 'outline'}
                className={cn(
                  'h-8 text-xs',
                  historyFilter === f && f === 'موافق' && 'bg-chart-3 hover:bg-chart-3',
                  historyFilter === f && f === 'مرفوض' && 'bg-destructive hover:bg-destructive',
                  historyFilter === f && f === 'معلومات إضافية' && 'bg-chart-2 hover:bg-chart-2',
                )}
                onClick={() => setHistoryFilter(f)}
              >
                {f}
              </Button>
            ))}
            <Select dir="rtl" value={historyDoctypeFilter} onValueChange={setHistoryDoctypeFilter}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="نوع المستند" /></SelectTrigger>
              <SelectContent dir="rtl" align="start">
                <SelectItem value="">الكل</SelectItem>
                <SelectItem value="Sales Invoice">فاتورة مبيعات</SelectItem>
                <SelectItem value="Purchase Invoice">فاتورة مشتريات</SelectItem>
                <SelectItem value="Payment Entry">سند دفع</SelectItem>
                <SelectItem value="Leave Application">طلب إجازة</SelectItem>
                <SelectItem value="Expense Claim">مطالبة مصروفات</SelectItem>
                <SelectItem value="Journal Entry">قيد يومية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={historyEntries}
            columns={historyColumns}
            searchable
            tableId="approval-history"
            exportFileName="approval-history.csv"
            pageSize={10}
            loading={loadingComments}
          />
        </TabsContent>
      </Tabs>

      {/* ────── Notes/Decision Dialog ────── */}
      <Dialog open={notesDialog !== null} onOpenChange={(open) => { if (!open) { setNotesDialog(null); setNotesText(''); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {notesDialog?.decision === 'موافق' && <CheckCircle2 className="h-5 w-5 text-primary" />}
              {notesDialog?.decision === 'مرفوض' && <XCircle className="h-5 w-5 text-destructive" />}
              {notesDialog?.decision === 'معلومات إضافية' && <AlertCircle className="h-5 w-5 text-chart-2" />}
              {notesDialog?.decision === 'موافق' && 'تأكيد الموافقة'}
              {notesDialog?.decision === 'مرفوض' && 'تأكيد الرفض'}
              {notesDialog?.decision === 'معلومات إضافية' && 'طلب معلومات إضافية'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="أدخل ملاحظاتك هنا (اختياري)..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => { setNotesDialog(null); setNotesText(''); }} className="text-muted-foreground">
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={submitNotes}
              className={cn(
                'gap-1.5',
                notesDialog?.decision === 'موافق' && 'bg-chart-3 hover:bg-chart-3',
                notesDialog?.decision === 'مرفوض' && 'bg-destructive hover:bg-destructive',
                notesDialog?.decision === 'معلومات إضافية' && 'bg-chart-2 hover:bg-chart-2',
              )}
            >
              {notesDialog?.decision === 'موافق' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {notesDialog?.decision === 'مرفوض' && <XCircle className="h-3.5 w-3.5" />}
              {notesDialog?.decision === 'معلومات إضافية' && <AlertCircle className="h-3.5 w-3.5" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────── Create Rule Dialog ────── */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <span>قاعدة موافقة جديدة</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعريف قاعدة موافقة للمستندات</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">نوع المستند <span className="text-destructive text-xs">*</span></Label>
              <Select dir="rtl" value={ruleForm.doctype} onValueChange={(val) => setRuleForm(prev => ({ ...prev, doctype: val }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر نوع المستند..." /></SelectTrigger>
                <SelectContent dir="rtl" align="start">
                  <SelectItem value="Sales Invoice">فاتورة مبيعات</SelectItem>
                  <SelectItem value="Purchase Invoice">فاتورة مشتريات</SelectItem>
                  <SelectItem value="Payment Entry">سند دفع</SelectItem>
                  <SelectItem value="Leave Application">طلب إجازة</SelectItem>
                  <SelectItem value="Expense Claim">مطالبة مصروفات</SelectItem>
                  <SelectItem value="Journal Entry">قيد يومية</SelectItem>
                  <SelectItem value="Material Request">طلب مواد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الحالة الحالية <span className="text-destructive text-xs">*</span></Label>
                <Input
                  placeholder="مثال: مسودة"
                  value={ruleForm.currentState}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, currentState: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الحالة التالية <span className="text-destructive text-xs">*</span></Label>
                <Input
                  placeholder="مثال: موافق عليه"
                  value={ruleForm.nextState}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, nextState: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">دور الموافق</Label>
                <ErpLinkCombobox
                  doctype="Role"
                  value={ruleForm.approverRole}
                  onChange={(v) => setRuleForm(prev => ({ ...prev, approverRole: v }))}
                  placeholder="اختر الدور..."
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">مستخدم الموافق</Label>
                <ErpLinkCombobox
                  doctype="User"
                  value={ruleForm.approverUser}
                  onChange={(v) => setRuleForm(prev => ({ ...prev, approverUser: v }))}
                  displayKey="full_name"
                  placeholder="اختر المستخدم..."
                  className="h-9"
                />
              </div>
            </div>

            {/* State transition preview */}
            {ruleForm.currentState && ruleForm.nextState && (
              <div className="rounded-xl border border-border/40 p-4 space-y-2">
                <h5 className="text-xs font-semibold flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  معاينة انتقال الحالة
                </h5>
                <div className="flex items-center gap-3 justify-center py-2">
                  <div className="rounded-lg bg-muted/30 border border-border/40 px-4 py-2 text-sm font-medium">
                    {ruleForm.currentState}
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary" />
                  <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 text-sm font-medium text-primary">
                    {ruleForm.nextState}
                  </div>
                </div>
                {(ruleForm.approverRole || ruleForm.approverUser) && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    بواسطة: {ruleForm.approverUser || ruleForm.approverRole}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setRuleDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button
              onClick={handleCreateRule}
              disabled={createWorkflowMutation.isPending}
              className="gap-1.5 min-w-[130px]"
            >
              {createWorkflowMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ القاعدة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
