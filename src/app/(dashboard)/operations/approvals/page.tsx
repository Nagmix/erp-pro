'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatDate } from '@/lib/app-format';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, User,
  Shield, Loader2, RefreshCw, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ──────────────── Types ──────────────── */

type ApprovalDecision = 'موافق' | 'مرفوض' | 'معلومات إضافية' | 'بانتظار';

interface ToDoItem {
  name: string;
  description: string;
  status: string;
  priority: string;
  allocated_to: string;
  date: string;
  reference_type: string;
  reference_name: string;
}

interface WorkflowDoc {
  name: string;
  document_type: string;
  is_active: number;
  workflow_state_field: string;
}

interface AuthRule {
  name: string;
  based_on: string;
  transaction_type: string;
  value: string;
  system_role: string;
  system_user: string;
  to_role: string;
  to_user: string;
}

interface ApprovalRequest {
  id: string;
  doctype: string;
  docname: string;
  requestedBy: string;
  requestedAt: string;
  priority: 'عاجل' | 'مهم' | 'عادي';
  decision: ApprovalDecision;
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
}

/* ──────────────── Helpers ──────────────── */

const priorityColors: Record<string, string> = {
  'عاجل': 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/30',
  'مهم': 'bg-chart-2/10 text-chart-2 ring-1 ring-inset ring-chart-2/30',
  'عادي': 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 ring-1 ring-inset ring-slate-300',
};

const decisionColors: Record<string, string> = {
  'موافق': 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/30',
  'مرفوض': 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/30',
  'معلومات إضافية': 'bg-chart-2/10 text-chart-2 ring-1 ring-inset ring-chart-2/30',
  'بانتظار': 'bg-chart-1/10 text-chart-1 ring-1 ring-inset ring-chart-1/30',
};

const doctypeIcons: Record<string, string> = {
  'Sales Invoice': '🧾', 'Purchase Invoice': '📋', 'Purchase Order': '🛒',
  'Payment Entry': '💸', 'Leave Application': '🏖️',
  'فاتورة مبيعات': '🧾', 'فاتورة مشتريات': '📋', 'طلب شراء': '🛒',
  'سند صرف': '💸', 'طلب إجازة': '🏖️',
};

function mapPriority(p: string): 'عاجل' | 'مهم' | 'عادي' {
  if (p === 'High') return 'عاجل';
  if (p === 'Medium') return 'مهم';
  return 'عادي';
}

function mapToDoToRequest(todo: ToDoItem): ApprovalRequest {
  return {
    id: todo.name,
    doctype: todo.reference_type || '—',
    docname: todo.description || todo.reference_name || todo.name,
    requestedBy: todo.allocated_to || '—',
    requestedAt: todo.date || new Date().toISOString(),
    priority: mapPriority(todo.priority),
    decision: todo.status === 'Closed' ? 'موافق' : 'بانتظار',
  };
}

function hoursWaiting(requestedAt: string): string {
  const diff = Date.now() - new Date(requestedAt).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'أقل من ساعة';
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

/* ──────────────── Main Page Component ──────────────── */

export default function ApprovalsPage() {
  // ── Data State ──
  const [pendingTodos, setPendingTodos] = useState<ToDoItem[]>([]);
  const [closedTodos, setClosedTodos] = useState<ToDoItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDoc[]>([]);
  const [authRules, setAuthRules] = useState<AuthRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);

  // ── UI State ──
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
  const [notesDialog, setNotesDialog] = useState<{ id: string; decision: ApprovalDecision } | null>(null);
  const [notesText, setNotesText] = useState('');
  const [logFilter, setLogFilter] = useState<string>('الكل');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Fetch Functions ──
  const fetchPending = useCallback(async () => {
    try {
      const url = '/api/data/ToDo?fields=["name","description","status","priority","allocated_to","date","reference_type","reference_name"]&filters=[["status","=","Open"],["reference_type","!=",""]]&limit_page_length=100';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setPendingTodos(json.data || []);
    } catch {
      toast.error('فشل تحميل الطلبات المعلقة');
    }
  }, [toast]);

  const fetchClosed = useCallback(async () => {
    try {
      const url = '/api/data/ToDo?fields=["name","description","status","priority","allocated_to","date","reference_type","reference_name"]&filters=[["status","=","Closed"],["reference_type","!=",""]]&limit_page_length=100';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setClosedTodos(json.data || []);
    } catch {
      toast.error('فشل تحميل سجل الموافقات');
    }
  }, [toast]);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const [wfRes, arRes] = await Promise.all([
        fetch('/api/data/Workflow?fields=["name","document_type","is_active","workflow_state_field"]&limit_page_length=50'),
        fetch('/api/data/Authorization Rule?fields=["name","based_on","transaction_type","value","system_role","system_user","to_role","to_user"]&limit_page_length=50'),
      ]);
      const wfJson = await wfRes.json();
      const arJson = await arRes.json();
      if (wfJson.success) setWorkflows(wfJson.data || []);
      if (arJson.success) setAuthRules(arJson.data || []);
    } catch {
      toast.error('فشل تحميل قواعد الموافقة');
    } finally {
      setRulesLoading(false);
    }
  }, [toast]);

  const fetchAll = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    await Promise.all([fetchPending(), fetchClosed()]);
    setLoading(false);
  }, [fetchPending, fetchClosed]);

  // ── Initial fetch on mount ──
  useEffect(() => {
    queueMicrotask(() => { fetchAll(false); fetchRules(); });
  }, [fetchAll, fetchRules]);

  // ── Derived Data ──
  const pendingRequests = useMemo(() => pendingTodos.map(mapToDoToRequest), [pendingTodos]);
  const logEntries = useMemo(() => closedTodos.map(mapToDoToRequest), [closedTodos]);

  const kpiAwaiting = pendingRequests.length;
  const kpiToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return logEntries.filter((r) => r.decidedAt && r.decidedAt.slice(0, 10) === today).length;
  }, [logEntries]);
  const kpiRejected = logEntries.filter((r) => r.decision === 'مرفوض').length;

  // ── Actions ──
  const handleDecision = useCallback(async (id: string, decision: ApprovalDecision, notes?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/data/ToDo/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed', description: notes || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(decision === 'موافق' ? 'تمت الموافقة' : decision === 'مرفوض' ? 'تم الرفض' : 'تم طلب معلومات إضافية');
        setSelectedPending((prev) => { const n = new Set(prev); n.delete(id); return n; });
        await fetchAll();
      } else {
        toast.error('فشل تنفيذ القرار');
      }
    } catch {
      toast.error('خطأ في الاتصال');
    } finally {
      setActionLoading(null);
    }
  }, [fetchAll, toast]);

  const handleBatchDecision = useCallback(async (decision: ApprovalDecision) => {
    const ids = Array.from(selectedPending);
    for (const id of ids) {
      await fetch(`/api/data/ToDo/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed' }),
      });
    }
    toast.success(`تم تنفيذ القرار "${decision}" على ${ids.length} طلب`);
    setSelectedPending(new Set());
    await fetchAll();
  }, [selectedPending, fetchAll, toast]);

  const togglePendingSelect = useCallback((id: string) => {
    setSelectedPending((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedPending.size === pendingRequests.length) setSelectedPending(new Set());
    else setSelectedPending(new Set(pendingRequests.map((r) => r.id)));
  }, [selectedPending, pendingRequests]);

  // ── Log Table Columns ──
  const logColumns: Column<ApprovalRequest>[] = useMemo(() => [
    { key: 'docname', header: 'المستند', sortable: true, render: (v) => <span className="font-medium text-primary">{String(v)}</span> },
    { key: 'doctype', header: 'نوع المستند', sortable: true, render: (v) => (
      <span className="flex items-center gap-1.5 text-xs"><span>{doctypeIcons[String(v)] || '📄'}</span>{String(v)}</span>
    )},
    { key: 'requestedBy', header: 'المعتمد', sortable: true, render: (v) => (
      <span className="flex items-center gap-1 text-xs"><User className="h-3 w-3 text-muted-foreground" />{String(v)}</span>
    )},
    { key: 'requestedAt', header: 'التاريخ', sortable: true, render: (v) => (
      <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span>
    )},
    { key: 'decision', header: 'القرار', render: (v) => (
      <Badge variant="outline" className={cn('text-[10px] font-semibold border-0 px-2 py-0.5', decisionColors[String(v) as string])}>{String(v)}</Badge>
    )},
    { key: 'notes', header: 'ملاحظات', render: (v) => (
      <span className="text-xs text-muted-foreground max-w-[180px] truncate block">{v ? String(v) : '—'}</span>
    )},
  ], []);

  const filteredLog = useMemo(() => {
    if (logFilter === 'الكل') return logEntries;
    return logEntries.filter((r) => r.decision === logFilter);
  }, [logEntries, logFilter]);

  const submitNotes = useCallback(() => {
    if (notesDialog) { handleDecision(notesDialog.id, notesDialog.decision, notesText || undefined); setNotesDialog(null); setNotesText(''); }
  }, [notesDialog, notesText, handleDecision]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="سير الموافقات"
        description="إدارة طلبات الموافقة وتفويض الصلاحيات وقواعد الاعتماد"
        iconify="solar:check-circle-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'سير الموافقات' }]}
      />

      <KpiStrip>
        <KpiCard title="بانتظار موافقتي" value={kpiAwaiting} icon={Clock} accent="warning" compact change={kpiAwaiting > 5 ? 12 : -5} changeType={kpiAwaiting > 5 ? 'negative' : 'positive'} />
        <KpiCard title="موافقات اليوم" value={kpiToday} icon={CheckCircle2} accent="success" compact />
        <KpiCard title="مرفوضات" value={kpiRejected} icon={XCircle} accent="destructive" compact />
        <KpiCard title="إجمالي المعالجة" value={logEntries.length} icon={AlertCircle} accent="info" compact />
      </KpiStrip>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="flex flex-wrap gap-1 w-full">
          <TabsTrigger value="pending" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" /> بانتظار الموافقة
            {kpiAwaiting > 0 && <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px] tabular-nums">{kpiAwaiting}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> سجل الموافقات</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> قواعد الموافقة</TabsTrigger>
          <TabsTrigger value="delegation" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> تفويض الصلاحيات</TabsTrigger>
        </TabsList>

        {/* ────── Tab 1: Pending Approvals ────── */}
        <TabsContent value="pending" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => fetchAll()}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> تحديث
            </Button>
          </div>

          {selectedPending.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              <span className="font-semibold">محدد: {selectedPending.size}</span>
              <Button type="button" size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={() => handleBatchDecision('موافق')}>
                <CheckCircle2 className="h-3.5 w-3.5" /> موافقة جماعية
              </Button>
              <Button type="button" size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => handleBatchDecision('مرفوض')}>
                <XCircle className="h-3.5 w-3.5" /> رفض جماعي
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox checked={selectedPending.size === pendingRequests.length && pendingRequests.length > 0} onCheckedChange={toggleSelectAll} aria-label="تحديد الكل" />
            <span className="text-xs text-muted-foreground">تحديد الكل</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
              <p className="text-sm text-muted-foreground">لا توجد طلبات بانتظار الموافقة</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {pendingRequests.map((req) => (
                <Card key={req.id} className={cn('rounded-xl border border-border/40 bg-card shadow-none transition-all duration-200 hover:border-border hover:shadow-sm', selectedPending.has(req.id) && 'ring-2 ring-primary/40 border-primary/30')}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox checked={selectedPending.has(req.id)} onCheckedChange={() => togglePendingSelect(req.id)} aria-label="تحديد الطلب" />
                        <span className="text-lg leading-none">{doctypeIcons[req.doctype] || '📄'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{req.docname}</p>
                          <p className="text-[11px] text-muted-foreground">{req.doctype}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] font-semibold border-0 px-1.5 py-0', priorityColors[req.priority])}>{req.priority}</Badge>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">المعتمد</span>
                        <span className="font-medium">{req.requestedBy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">وقت الانتظار</span>
                        <span className="flex items-center gap-1 text-chart-2 dark:text-amber-400 font-medium">
                          <Clock className="h-3 w-3" />{hoursWaiting(req.requestedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                      <Button type="button" size="sm" variant="outline" disabled={actionLoading === req.id} className="flex-1 h-8 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5" onClick={() => { setNotesDialog({ id: req.id, decision: 'موافق' }); setNotesText(''); }}>
                        {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} موافقة
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={actionLoading === req.id} className="flex-1 h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => { setNotesDialog({ id: req.id, decision: 'مرفوض' }); setNotesText(''); }}>
                        <XCircle className="h-3.5 w-3.5" /> رفض
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={actionLoading === req.id} className="flex-1 h-8 text-xs gap-1 text-chart-2 border-chart-2/30 hover:bg-chart-2/5" onClick={() => { setNotesDialog({ id: req.id, decision: 'معلومات إضافية' }); setNotesText(''); }}>
                        <AlertCircle className="h-3.5 w-3.5" /> طلب معلومات
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ────── Tab 2: Approval Log ────── */}
        <TabsContent value="log" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">تصفية القرار:</span>
            {['الكل', 'موافق', 'مرفوض', 'معلومات إضافية'].map((f) => (
              <Button key={f} type="button" size="sm" variant={logFilter === f ? 'default' : 'outline'} className={cn('h-8 text-xs', logFilter === f && f === 'موافق' && 'bg-chart-3 hover:bg-chart-3', logFilter === f && f === 'مرفوض' && 'bg-destructive hover:bg-destructive', logFilter === f && f === 'معلومات إضافية' && 'bg-chart-2 hover:bg-chart-2')} onClick={() => setLogFilter(f)}>
                {f}
              </Button>
            ))}
          </div>
          <DataTable data={filteredLog} columns={logColumns} searchable tableId="approvals-log" exportFileName="approvals-log" pageSize={10} loading={loading} onRetry={() => fetchAll()} />
        </TabsContent>

        {/* ────── Tab 3: Approval Rules ────── */}
        <TabsContent value="rules" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">قواعد الموافقة معرّفة في ERPNext (Workflow & Authorization Rule)</p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={fetchRules}>
              <RefreshCw className={cn('h-3.5 w-3.5', rulesLoading && 'animate-spin')} /> تحديث
            </Button>
          </div>

          {rulesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : (
            <>
              {/* Workflows */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> سير العمل (Workflows)
                </h3>
                {workflows.length === 0 ? (
                  <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
                    <p className="text-sm text-muted-foreground">لا توجد سير عمل</p>
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {workflows.map((wf) => (
                      <Card key={wf.name} className={cn('rounded-xl border border-border/40 bg-card shadow-none', !wf.is_active && 'opacity-60')}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-foreground truncate">{wf.name}</h4>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <span>{doctypeIcons[wf.document_type] || '📄'}</span>{wf.document_type}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={!!wf.is_active} disabled aria-label="حالة سير العمل" />
                              <Badge variant="outline" className={cn('text-[10px] border-0', wf.is_active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400')}>
                                {wf.is_active ? 'نشط' : 'غير نشط'}
                              </Badge>
                            </div>
                          </div>
                          {wf.workflow_state_field && (
                            <p className="text-[11px] text-muted-foreground">حالة سير العمل: <span className="font-mono text-primary">{wf.workflow_state_field}</span></p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Authorization Rules */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" /> قواعد التخويل (Authorization Rules)
                </h3>
                {authRules.length === 0 ? (
                  <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10">
                    <p className="text-sm text-muted-foreground">لا توجد قواعد تخويل</p>
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {authRules.map((ar) => (
                      <Card key={ar.name} className="rounded-xl border border-border/40 bg-card shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-foreground truncate">{ar.name}</h4>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <span>{doctypeIcons[ar.transaction_type] || '📄'}</span>{ar.transaction_type || '—'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            {ar.based_on && <p><span className="text-muted-foreground">بناءً على: </span><span className="font-medium">{ar.based_on}</span>{ar.value ? ` = ${ar.value}` : ''}</p>}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-muted-foreground">الموافقة إلى:</span>
                              {ar.to_user && <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5"><User className="h-3 w-3" />{ar.to_user}</Badge>}
                              {ar.to_role && <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 bg-primary/5 ">{ar.to_role}</Badge>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ────── Tab 4: Delegation ────── */}
        <TabsContent value="delegation" className="mt-4 space-y-4">
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 px-6 text-center">
            <div className="mb-4 rounded-full border border-primary/20 bg-primary/10 p-4 text-primary">
              <User className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">تفويض الصلاحيات</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              يتم إدارة تفويض صلاحيات الموافقة من خلال إعدادات المستخدم في ERPNext.
              يمكنك تفويض صلاحياتك لمستخدم آخر لفترة محددة عبر واجهة ERPNext.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="/api/method/frappe.desk.form.assign_to.add" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <ExternalLink className="h-3.5 w-3.5" /> فتح إعدادات التفويض في ERPNext
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground max-w-sm">
              عند تفعيل التفويض، ستظهر طلبات الموافقة للمستخدم المفوض بدلاً منك خلال الفترة المحددة.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ────── Notes Dialog ────── */}
      <Dialog open={notesDialog !== null} onOpenChange={(open) => { if (!open) { setNotesDialog(null); setNotesText(''); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {notesDialog?.decision === 'موافق' && <CheckCircle2 className="h-4.5 w-4.5 text-primary" />}
              {notesDialog?.decision === 'مرفوض' && <XCircle className="h-4.5 w-4.5 text-destructive" />}
              {notesDialog?.decision === 'معلومات إضافية' && <AlertCircle className="h-4.5 w-4.5 text-chart-2" />}
              {notesDialog?.decision === 'موافق' && 'تأكيد الموافقة'}
              {notesDialog?.decision === 'مرفوض' && 'تأكيد الرفض'}
              {notesDialog?.decision === 'معلومات إضافية' && 'طلب معلومات إضافية'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">ملاحظات</Label>
              <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="أدخل ملاحظاتك هنا (اختياري)..." rows={3} className="text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => { setNotesDialog(null); setNotesText(''); }} className="text-muted-foreground">إلغاء</Button>
            <Button type="button" onClick={submitNotes} className={cn('gap-1.5', notesDialog?.decision === 'موافق' && 'bg-chart-3 hover:bg-chart-3', notesDialog?.decision === 'مرفوض' && 'bg-destructive hover:bg-destructive', notesDialog?.decision === 'معلومات إضافية' && 'bg-chart-2 hover:bg-chart-2')}>
              {notesDialog?.decision === 'موافق' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {notesDialog?.decision === 'مرفوض' && <XCircle className="h-3.5 w-3.5" />}
              {notesDialog?.decision === 'معلومات إضافية' && <AlertCircle className="h-3.5 w-3.5" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
