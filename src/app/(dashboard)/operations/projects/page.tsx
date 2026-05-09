'use client';

import { useState, useCallback, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/app-format';
import {
  useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc,
} from '@/lib/client/hooks';
import {
  FolderKanban, Plus, Calendar, DollarSign, Play, CheckCircle2,
  AlertTriangle, Clock, Loader2, LayoutGrid, List, GanttChart, Receipt,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────

type ProjectStatus = 'لم يبدأ' | 'جاري' | 'مكتمل' | 'متوقف';

type ProjectPhase = {
  id: string; name: string; startDate: string; endDate: string;
  progress: number; status: ProjectStatus; assignedTo: string;
};

type Project = {
  id: string; name: string; customer: string; manager: string;
  startDate: string; endDate: string; budget: number; spent: number;
  progress: number; status: ProjectStatus; phases: ProjectPhase[];
  createdAt: string;
};

// ─── ERPNext ↔ Display Status Mapping ───────────────────────────────────

const ERP_STATUS_MAP: Record<string, ProjectStatus> = {
  Open: 'جاري', Completed: 'مكتمل', Cancelled: 'متوقف',
};
const TO_ERP_STATUS: Record<ProjectStatus, string> = {
  'لم يبدأ': 'Open', 'جاري': 'Open', 'مكتمل': 'Completed', 'متوقف': 'Cancelled',
};
const ERP_TASK_STATUS_MAP: Record<string, ProjectStatus> = {
  Open: 'لم يبدأ', Working: 'جاري', Completed: 'مكتمل',
  Cancelled: 'متوقف', Overdue: 'متوقف',
};
const TO_ERP_TASK_STATUS: Record<ProjectStatus, string> = {
  'لم يبدأ': 'Open', 'جاري': 'Working', 'مكتمل': 'Completed', 'متوقف': 'Cancelled',
};

// ─── ERPNext Field Mappers ───────────────────────────────────────────────

const PROJECT_FIELDS = [
  'name', 'project_name', 'status', 'customer', 'expected_start_date',
  'expected_end_date', 'percent_complete', 'estimated_costing',
  'total_expense_claim', 'priority', 'department', 'notes', 'creation', '_assign',
];
const TASK_FIELDS = [
  'name', 'subject', 'project', 'status', 'exp_start_date',
  'exp_end_date', 'progress', '_assign', 'description',
];

function parseAssign(raw: unknown): string {
  try {
    const a = JSON.parse(String(raw || '[]'));
    return Array.isArray(a) && a.length > 0 ? a[0] : '';
  } catch { return ''; }
}

function mapERPProject(raw: Record<string, unknown>): Project {
  const erpStatus = String(raw.status || 'Open');
  return {
    id: String(raw.name),
    name: String(raw.project_name || raw.name),
    customer: String(raw.customer || ''),
    manager: parseAssign(raw._assign),
    startDate: String(raw.expected_start_date || '').split(' ')[0],
    endDate: String(raw.expected_end_date || '').split(' ')[0],
    budget: Number(raw.estimated_costing) || 0,
    spent: Number(raw.total_expense_claim) || 0,
    progress: Math.round(Number(raw.percent_complete) || 0),
    status: ERP_STATUS_MAP[erpStatus] || 'جاري',
    phases: [],
    createdAt: String(raw.creation || '').split(' ')[0],
  };
}

function mapERPTask(raw: Record<string, unknown>): ProjectPhase {
  const erpStatus = String(raw.status || 'Open');
  return {
    id: String(raw.name),
    name: String(raw.subject || raw.name),
    startDate: String(raw.exp_start_date || '').split(' ')[0],
    endDate: String(raw.exp_end_date || '').split(' ')[0],
    progress: Math.round(Number(raw.progress) || 0),
    status: ERP_TASK_STATUS_MAP[erpStatus] || 'لم يبدأ',
    assignedTo: parseAssign(raw._assign),
  };
}

// ─── UI Constants ────────────────────────────────────────────────────────

const STATUS_MAP: Record<ProjectStatus, { color: string; icon: React.ElementType }> = {
  'لم يبدأ': { color: 'bg-muted text-muted-foreground', icon: Clock },
  'جاري': { color: 'bg-info/12 text-info ring-1 ring-inset ring-info/25', icon: Play },
  'مكتمل': { color: 'bg-success/12 text-success ring-1 ring-inset ring-success/25', icon: CheckCircle2 },
  'متوقف': { color: 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25', icon: AlertTriangle },
};
const KANBAN_COLUMNS: ProjectStatus[] = ['لم يبدأ', 'جاري', 'مكتمل', 'متوقف'];
const KANBAN_HEADER_COLORS: Record<ProjectStatus, string> = {
  'لم يبدأ': 'bg-muted/60 text-muted-foreground', 'جاري': 'bg-info/15 text-info',
  'مكتمل': 'bg-success/15 text-success', 'متوقف': 'bg-destructive/15 text-destructive',
};

// ─── Sub-components ──────────────────────────────────────────────────────

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const info = STATUS_MAP[status];
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${info.color}`}>
      <Icon className="h-3 w-3" />{status}
    </span>
  );
}

function AvatarGroup({ names, max = 3 }: { names: string[]; max?: number }) {
  const display = names.slice(0, max);
  const extra = names.length - max;
  const colors = ['bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-rose-500', 'bg-violet-500'];
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {display.map((name, i) => (
        <div key={i} className={`h-7 w-7 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background`} title={name}>
          {name.charAt(0)}
        </div>
      ))}
      {extra > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground ring-2 ring-background">+{extra}</div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function ProjectsManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // ── React Query: fetch projects
  const projectsQuery = useDocList<Record<string, unknown>>('Project', {
    fields: PROJECT_FIELDS, limit: 100,
  });
  const projects: Project[] = useMemo(
    () => (projectsQuery.data ?? []).map(mapERPProject),
    [projectsQuery.data],
  );
  const loading = projectsQuery.isLoading;

  // ── React Query: fetch tasks for selected project
  const tasksQuery = useDocList<Record<string, unknown>>('Task', {
    fields: TASK_FIELDS,
    filters: selectedProjectId ? [['project', '=', selectedProjectId]] : [],
    limit: 200,
    enabled: !!selectedProjectId,
  });
  const tasks: ProjectPhase[] = useMemo(
    () => (tasksQuery.data ?? []).map(mapERPTask),
    [tasksQuery.data],
  );

  // ── React Query: mutations
  const createProject = useCreateDoc('Project');
  const updateProject = useUpdateDoc('Project');
  const deleteProject = useDeleteDoc('Project');
  const createTask = useCreateDoc('Task');
  const updateTask = useUpdateDoc('Task');
  const deleteTask = useDeleteDoc('Task');

  // ── Selected project (combines project + tasks)
  const selectedProject = useMemo((): (Project & { phases: ProjectPhase[] }) | null => {
    const proj = projects.find(p => p.id === selectedProjectId);
    if (!proj) return null;
    return { ...proj, phases: tasks };
  }, [projects, selectedProjectId, tasks]);

  // ── Dialog states
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);

  // ── Form states
  const [projectForm, setProjectForm] = useState({
    name: '', customer: '', manager: '', startDate: '', endDate: '', budget: '',
    status: 'لم يبدأ' as ProjectStatus,
  });
  const [phaseForm, setPhaseForm] = useState({
    name: '', startDate: '', endDate: '', progress: '0',
    status: 'لم يبدأ' as ProjectStatus, assignedTo: '',
  });

  // ── Project CRUD
  const openProjectDialog = useCallback((project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name, customer: project.customer, manager: project.manager,
        startDate: project.startDate, endDate: project.endDate,
        budget: String(project.budget), status: project.status,
      });
    } else {
      setEditingProject(null);
      setProjectForm({ name: '', customer: '', manager: '', startDate: '', endDate: '', budget: '', status: 'لم يبدأ' });
    }
    setProjectDialogOpen(true);
  }, []);

  const handleSaveProject = useCallback(async () => {
    if (!projectForm.name) {
      toast.error('خطأ', { description: 'يرجى إدخال اسم المشروع' });
      return;
    }
    try {
      const erpStatus = TO_ERP_STATUS[projectForm.status];
      const budget = Number(projectForm.budget) || 0;
      const body: Record<string, unknown> = {
        project_name: projectForm.name,
        status: erpStatus,
        customer: projectForm.customer || undefined,
        expected_start_date: projectForm.startDate || undefined,
        expected_end_date: projectForm.endDate || undefined,
        estimated_costing: budget || undefined,
      };
      if (projectForm.manager) body._assign = JSON.stringify([projectForm.manager]);

      if (editingProject) {
        await updateProject.mutateAsync({ name: editingProject.id, doc: body });
      } else {
        await createProject.mutateAsync(body);
      }
      toast.success('تم الحفظ', { description: editingProject ? 'تم تحديث المشروع بنجاح' : 'تم إنشاء المشروع بنجاح' });
      setProjectDialogOpen(false);
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل الحفظ' });
    }
  }, [projectForm, editingProject, toast, createProject, updateProject]);

  const handleDeleteProject = useCallback(async (project: Project) => {
    try {
      await deleteProject.mutateAsync(project.id);
      if (selectedProjectId === project.id) setSelectedProjectId('');
      toast.success('تم الحذف', { description: `تم حذف المشروع "${project.name}"` });
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل الحذف' });
    }
  }, [selectedProjectId, toast, deleteProject]);

  // ── Phase (Task) CRUD
  const openPhaseDialog = useCallback((phase?: ProjectPhase) => {
    if (!selectedProjectId) {
      toast.error('تنبيه', { description: 'يرجى اختيار مشروع أولاً' });
      return;
    }
    if (phase) {
      setEditingPhase(phase);
      setPhaseForm({
        name: phase.name, startDate: phase.startDate, endDate: phase.endDate,
        progress: String(phase.progress), status: phase.status, assignedTo: phase.assignedTo,
      });
    } else {
      setEditingPhase(null);
      setPhaseForm({ name: '', startDate: '', endDate: '', progress: '0', status: 'لم يبدأ', assignedTo: '' });
    }
    setPhaseDialogOpen(true);
  }, [selectedProjectId, toast]);

  const handleSavePhase = useCallback(async () => {
    if (!phaseForm.name || !selectedProjectId) return;
    try {
      const progress = Math.min(100, Math.max(0, Number(phaseForm.progress) || 0));
      const erpStatus = TO_ERP_TASK_STATUS[phaseForm.status];
      const body: Record<string, unknown> = {
        subject: phaseForm.name, project: selectedProjectId, status: erpStatus,
        exp_start_date: phaseForm.startDate || undefined,
        exp_end_date: phaseForm.endDate || undefined,
        progress,
      };
      if (phaseForm.assignedTo) body._assign = JSON.stringify([phaseForm.assignedTo]);

      if (editingPhase) {
        await updateTask.mutateAsync({ name: editingPhase.id, doc: body });
      } else {
        await createTask.mutateAsync(body);
      }
      toast.success('تم الحفظ', { description: editingPhase ? 'تم تحديث المرحلة' : 'تم إضافة المرحلة' });
      setPhaseDialogOpen(false);
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل الحفظ' });
    }
  }, [phaseForm, editingPhase, selectedProjectId, toast, createTask, updateTask]);

  const handleDeletePhase = useCallback(async (phaseId: string) => {
    try {
      await deleteTask.mutateAsync(phaseId);
      toast.success('تم الحذف', { description: 'تم حذف المرحلة' });
    } catch (err) {
      toast.error('خطأ', { description: err instanceof Error ? err.message : 'فشل الحذف' });
    }
  }, [toast, deleteTask]);

  // ── KPI computations
  const kpis = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter(p => p.status === 'جاري').length;
    const completed = projects.filter(p => p.status === 'مكتمل').length;
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    return { total, inProgress, completed, totalBudget };
  }, [projects]);

  // ── DataTable columns
  const columns: Column<Project>[] = useMemo(() => [
    { key: 'name', header: 'اسم المشروع', sortable: true, render: (_v, row) => <span className="font-semibold text-primary">{row.name}</span> },
    { key: 'customer', header: 'العميل', sortable: true },
    { key: 'manager', header: 'مدير المشروع', sortable: true },
    { key: 'startDate', header: 'تاريخ البدء', sortable: true, render: v => <span className="text-xs">{formatDate(String(v))}</span> },
    { key: 'endDate', header: 'تاريخ الانتهاء', sortable: true, render: v => <span className="text-xs">{formatDate(String(v))}</span> },
    { key: 'budget', header: 'الميزانية', sortable: true, render: v => <span className="text-xs font-medium tabular-nums">{formatCurrency(Number(v))}</span> },
    { key: 'progress', header: 'الإنجاز%', sortable: true, render: (_v, row) => (
      <div className="flex items-center gap-2 min-w-[100px]">
        <Progress value={row.progress} className="h-2 flex-1" />
        <span className="text-xs font-semibold tabular-nums w-8 text-end">{row.progress}%</span>
      </div>
    )},
    { key: 'status', header: 'الحالة', sortable: true, render: (_v, row) => <ProjectStatusBadge status={row.status} /> },
  ], []);

  // ── Gantt helpers
  const ganttMinDate = useMemo(() => {
    if (!selectedProject?.phases.length) return null;
    return new Date(Math.min(...selectedProject.phases.map(p => new Date(p.startDate).getTime())));
  }, [selectedProject]);
  const ganttMaxDate = useMemo(() => {
    if (!selectedProject?.phases.length) return null;
    return new Date(Math.max(...selectedProject.phases.map(p => new Date(p.endDate).getTime())));
  }, [selectedProject]);
  const ganttRange = useMemo(() => {
    if (!ganttMinDate || !ganttMaxDate) return 1;
    return Math.max(1, ganttMaxDate.getTime() - ganttMinDate.getTime());
  }, [ganttMinDate, ganttMaxDate]);
  function ganttOffset(dateStr: string) {
    if (!ganttMinDate) return 0;
    return ((new Date(dateStr).getTime() - ganttMinDate.getTime()) / ganttRange) * 100;
  }
  function ganttWidth(s: string, e: string) {
    return Math.max(2, ((new Date(e).getTime() - new Date(s).getTime()) / ganttRange) * 100);
  }

  // ── Cost analysis (from project-level financial data)
  const costAnalysis = useMemo(() => {
    if (!selectedProject) return { budget: 0, spent: 0, variance: 0 };
    const { budget, spent } = selectedProject;
    return { budget, spent, variance: budget - spent };
  }, [selectedProject]);

  // ── Phase columns for DataTable
  const phaseColumns: Column<ProjectPhase>[] = useMemo(() => [
    { key: 'name', header: 'اسم المرحلة', sortable: true, render: (_v, row) => <span className="font-medium">{row.name}</span> },
    { key: 'status', header: 'الحالة', sortable: true, render: (_v, row) => <ProjectStatusBadge status={row.status} /> },
    { key: 'startDate', header: 'تاريخ البدء', sortable: true, render: v => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span> },
    { key: 'endDate', header: 'تاريخ الانتهاء', sortable: true, render: v => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span> },
    { key: 'progress', header: 'الإنجاز%', sortable: true, render: (_v, row) => (
      <div className="flex items-center gap-2 min-w-[80px]">
        <Progress value={row.progress} className="h-1.5 flex-1" />
        <span className="text-xs font-semibold tabular-nums">{row.progress}%</span>
      </div>
    )},
    { key: 'assignedTo', header: 'المسؤول', sortable: true, render: v => <span className="text-xs">{String(v || '—')}</span> },
  ], []);

  const saving = createProject.isPending || updateProject.isPending || createTask.isPending || updateTask.isPending;

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) return <div dir="rtl" className="erp-page-enter"><Spinner /></div>;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إدارة المشاريع" description="تخطيط ومتابعة المشاريع والمراحل والتكاليف"
        iconify="solar:clipboard-list-bold-duotone" accent="warning"
        breadcrumbs={[{ label: 'التشغيل' }, { label: 'إدارة المشاريع' }]}
        actions={<Button size="sm" className="gap-1.5" onClick={() => openProjectDialog()}><Plus className="h-3.5 w-3.5" />مشروع جديد</Button>}
      />

      <KpiStrip cols={4}>
        <KpiCard title="إجمالي المشاريع" value={kpis.total} icon={FolderKanban} accent="primary" change={12} changeType="positive" />
        <KpiCard title="مشاريع جارية" value={kpis.inProgress} icon={Play} accent="info" description="المشاريع قيد التنفيذ حالياً" />
        <KpiCard title="المشاريع المكتملة" value={kpis.completed} icon={CheckCircle2} accent="success" change={8} changeType="positive" />
        <KpiCard title="إجمالي ميزانية المشاريع" value={formatCurrency(kpis.totalBudget)} icon={DollarSign} accent="warning" description="إجمالي الميزانيات المعتمدة" />
      </KpiStrip>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutGrid className="h-3.5 w-3.5" />نظرة عامة</TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5 text-xs"><List className="h-3.5 w-3.5" />قائمة المشاريع</TabsTrigger>
          <TabsTrigger value="phases" className="gap-1.5 text-xs"><GanttChart className="h-3.5 w-3.5" />مراحل المشروع</TabsTrigger>
          <TabsTrigger value="costs" className="gap-1.5 text-xs"><Receipt className="h-3.5 w-3.5" />تكاليف المشروع</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview (Kanban) ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map(status => {
              const items = projects.filter(p => p.status === status);
              const HeaderIcon = STATUS_MAP[status].icon;
              return (
                <div key={status} className="space-y-3">
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${KANBAN_HEADER_COLORS[status]}`}>
                    <HeaderIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{status}</span>
                    <span className="ms-auto text-xs font-bold bg-background/60 rounded-md px-1.5 py-0.5">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[120px]">
                    {items.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-xs text-muted-foreground">لا توجد مشاريع</div>
                    )}
                    {items.map(project => {
                      const teamNames = project.manager ? [project.manager] : [];
                      return (
                        <Card key={project.id} className="group cursor-pointer transition-all hover:shadow-md hover:border-border/80 border-border/40"
                          onClick={() => { setSelectedProjectId(project.id); setActiveTab('phases'); }}>
                          <CardContent className="p-3 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold leading-snug line-clamp-2">{project.name}</h4>
                              <ProjectStatusBadge status={project.status} />
                            </div>
                            <p className="text-[11px] text-muted-foreground">{project.customer}</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-muted-foreground">الإنجاز</span>
                                <span className="font-semibold tabular-nums">{project.progress}%</span>
                              </div>
                              <Progress value={project.progress} className="h-1.5" />
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">الميزانية</span>
                              <span className="font-semibold tabular-nums">{formatCurrency(project.budget)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-border/30">
                              {teamNames.length > 0 ? <AvatarGroup names={teamNames} max={3} /> : <span className="text-[10px] text-muted-foreground">—</span>}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />{project.endDate ? formatDate(project.endDate) : '—'}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tab 2: Project List (DataTable) ── */}
        <TabsContent value="list" className="space-y-4">
          <DataTable<Project> data={projects} columns={columns} tableId="projects-list"
            searchable pageSize={10} onAdd={() => openProjectDialog()} addLabel="مشروع جديد"
            onEdit={row => openProjectDialog(row)} onDelete={handleDeleteProject} exportFileName="المشاريع" />
        </TabsContent>

        {/* ── Tab 3: Project Phases (Gantt) ── */}
        <TabsContent value="phases" className="space-y-4">
          <Card className="border-border/40">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Label className="text-xs font-medium shrink-0">اختر المشروع:</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-9 w-full sm:w-72 text-xs">
                    <SelectValue placeholder="اختر مشروعاً لعرض مراحله..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openPhaseDialog()}>
                    <Plus className="h-3.5 w-3.5" />إضافة مرحلة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedProjectId && tasksQuery.isLoading && <Spinner />}

          {selectedProject && !tasksQuery.isLoading && selectedProject.phases.length > 0 && (
            <Card className="border-border/40">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <GanttChart className="h-4 w-4 text-primary" />مراحل: {selectedProject.name}
                  </h3>
                  <ProjectStatusBadge status={selectedProject.status} />
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {ganttMinDate && ganttMaxDate && (
                      <div className="relative h-8 mb-2 border-b border-border/30">
                        {(() => {
                          const markers: React.ReactNode[] = [];
                          const current = new Date(ganttMinDate.getFullYear(), ganttMinDate.getMonth(), 1);
                          while (current <= ganttMaxDate) {
                            const offset = ganttOffset(current.toISOString());
                            markers.push(
                              <span key={current.toISOString()} className="absolute text-[10px] text-muted-foreground top-1" style={{ insetInlineEnd: `${offset}%` }}>
                                {current.toLocaleDateString('ar-YE', { month: 'short' })}
                              </span>
                            );
                            current.setMonth(current.getMonth() + 1);
                          }
                          return markers;
                        })()}
                      </div>
                    )}
                    <div className="space-y-2">
                      {selectedProject.phases.map(phase => {
                        const barOffset = ganttOffset(phase.startDate);
                        const barWidth = ganttWidth(phase.startDate, phase.endDate);
                        const statusColor: Record<ProjectStatus, string> = { 'لم يبدأ': 'bg-muted/60', 'جاري': 'bg-info/70', 'مكتمل': 'bg-success/70', 'متوقف': 'bg-destructive/60' };
                        const progressColor: Record<ProjectStatus, string> = { 'لم يبدأ': 'bg-muted', 'جاري': 'bg-info', 'مكتمل': 'bg-success', 'متوقف': 'bg-destructive' };
                        return (
                          <div key={phase.id} className="flex items-center gap-3">
                            <div className="w-36 shrink-0">
                              <p className="text-xs font-medium truncate">{phase.name}</p>
                              <p className="text-[10px] text-muted-foreground">{phase.assignedTo || '—'}</p>
                            </div>
                            <div className="flex-1 relative h-7 bg-muted/20 rounded">
                              <div className={`absolute top-0 h-full rounded ${statusColor[phase.status]}`} style={{ insetInlineEnd: `${barOffset}%`, width: `${barWidth}%` }}>
                                <div className={`h-full rounded ${progressColor[phase.status]} opacity-60`} style={{ width: `${phase.progress}%` }} />
                              </div>
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">{phase.progress}%</span>
                            </div>
                            <div className="w-16 shrink-0 text-end"><ProjectStatusBadge status={phase.status} /></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <DataTable<ProjectPhase> data={selectedProject.phases} columns={phaseColumns} tableId="project-phases"
                  pageSize={10} onAdd={() => openPhaseDialog()} addLabel="إضافة مرحلة"
                  onEdit={row => openPhaseDialog(row)} onDelete={row => handleDeletePhase(row.id)} />
              </CardContent>
            </Card>
          )}

          {selectedProject && !tasksQuery.isLoading && selectedProject.phases.length === 0 && (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center space-y-3">
                <GanttChart className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">لا توجد مراحل لهذا المشروع</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openPhaseDialog()}>
                  <Plus className="h-3.5 w-3.5" />إضافة مرحلة
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 4: Cost Analysis ── */}
        <TabsContent value="costs" className="space-y-4">
          <Card className="border-border/40">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Label className="text-xs font-medium shrink-0">اختر المشروع:</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-9 w-full sm:w-72 text-xs">
                    <SelectValue placeholder="اختر مشروعاً لعرض تكاليفه..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedProject && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-4 w-4" />الميزانية التقديرية</div>
                  <p className="text-xl font-bold tabular-nums">{formatCurrency(costAnalysis.budget)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Receipt className="h-4 w-4" />المصروفات الفعلية</div>
                  <p className="text-xl font-bold tabular-nums">{formatCurrency(costAnalysis.spent)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-4 w-4" />الانحراف</div>
                  <p className={`text-xl font-bold tabular-nums ${costAnalysis.variance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {costAnalysis.variance >= 0 ? '+' : ''}{formatCurrency(costAnalysis.variance)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedProject && (
            <Card className="border-border/40">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold">تحليل التكاليف — {selectedProject.name}</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>نسبة الصرف من الميزانية</span>
                    <span className="font-semibold tabular-nums">
                      {costAnalysis.budget > 0 ? Math.round((costAnalysis.spent / costAnalysis.budget) * 100) : 0}%
                    </span>
                  </div>
                  <Progress value={costAnalysis.budget > 0 ? Math.min(100, (costAnalysis.spent / costAnalysis.budget) * 100) : 0} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border/40 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">الميزانية التقديرية</p>
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(costAnalysis.budget)}</p>
                    <div className="h-2 bg-info/20 rounded-full"><div className="h-full bg-info rounded-full" style={{ width: '100%' }} /></div>
                  </div>
                  <div className="rounded-lg border border-border/40 p-4 space-y-2">
                    <p className="text-xs text-muted-foreground">المصروفات الفعلية</p>
                    <p className="text-lg font-bold tabular-nums">{formatCurrency(costAnalysis.spent)}</p>
                    <div className="h-2 bg-warning/20 rounded-full">
                      <div className={`h-full rounded-full ${costAnalysis.spent > costAnalysis.budget ? 'bg-destructive' : 'bg-warning'}`}
                        style={{ width: `${costAnalysis.budget > 0 ? Math.min(100, (costAnalysis.spent / costAnalysis.budget) * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>
                {selectedProject.phases.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">تفاصيل المراحل</h4>
                    <div className="space-y-1.5">
                      {selectedProject.phases.map(phase => (
                        <div key={phase.id} className="flex items-center gap-3 text-xs p-2 rounded bg-muted/30">
                          <span className="font-medium w-40 truncate">{phase.name}</span>
                          <div className="flex-1"><Progress value={phase.progress} className="h-1.5" /></div>
                          <span className="tabular-nums w-10 text-end">{phase.progress}%</span>
                          <ProjectStatusBadge status={phase.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedProject && (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">اختر مشروعاً لعرض تحليل التكاليف</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Project Dialog ── */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProject ? 'تعديل مشروع' : 'مشروع جديد'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم المشروع *</Label>
              <Input className="h-9 text-sm" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} placeholder="أدخل اسم المشروع" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">العميل</Label>
                <Input className="h-9 text-sm" value={projectForm.customer} onChange={e => setProjectForm(f => ({ ...f, customer: e.target.value }))} placeholder="اسم العميل" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">المسؤول</Label>
                <Input className="h-9 text-sm" value={projectForm.manager} onChange={e => setProjectForm(f => ({ ...f, manager: e.target.value }))} placeholder="اسم المسؤول" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ البدء</Label>
                <Input type="date" className="h-9 text-sm" value={projectForm.startDate} onChange={e => setProjectForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ الانتهاء</Label>
                <Input type="date" className="h-9 text-sm" value={projectForm.endDate} onChange={e => setProjectForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الميزانية التقديرية</Label>
                <Input type="number" className="h-9 text-sm" value={projectForm.budget} onChange={e => setProjectForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الحالة</Label>
                <Select value={projectForm.status} onValueChange={v => setProjectForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="لم يبدأ">لم يبدأ</SelectItem>
                    <SelectItem value="جاري">جاري</SelectItem>
                    <SelectItem value="مكتمل">مكتمل</SelectItem>
                    <SelectItem value="متوقف">متوقف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSaveProject} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Phase (Task) Dialog ── */}
      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPhase ? 'تعديل مرحلة' : 'مرحلة جديدة'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم المرحلة *</Label>
              <Input className="h-9 text-sm" value={phaseForm.name} onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))} placeholder="أدخل اسم المرحلة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ البدء</Label>
                <Input type="date" className="h-9 text-sm" value={phaseForm.startDate} onChange={e => setPhaseForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">تاريخ الانتهاء</Label>
                <Input type="date" className="h-9 text-sm" value={phaseForm.endDate} onChange={e => setPhaseForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">نسبة الإنجاز</Label>
                <Input type="number" min={0} max={100} className="h-9 text-sm" value={phaseForm.progress} onChange={e => setPhaseForm(f => ({ ...f, progress: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الحالة</Label>
                <Select value={phaseForm.status} onValueChange={v => setPhaseForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="لم يبدأ">لم يبدأ</SelectItem>
                    <SelectItem value="جاري">جاري</SelectItem>
                    <SelectItem value="مكتمل">مكتمل</SelectItem>
                    <SelectItem value="متوقف">متوقف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">المسؤول</Label>
                <Input className="h-9 text-sm" value={phaseForm.assignedTo} onChange={e => setPhaseForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="اسم المسؤول" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhaseDialogOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={handleSavePhase} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
