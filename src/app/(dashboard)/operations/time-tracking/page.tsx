'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Plus, Clock, Timer, Play, Square, TimerReset, CalendarClock, BarChart3, Loader2, Filter } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useToast } from '@/hooks/use-toast';
import { useDocList, useCreateDoc, useUpdateDoc, useSubmitDoc } from '@/lib/client/hooks';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildTimesheetCreate, buildTimesheetUpdate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';

// ============================================
// Types
// ============================================

interface EmployeeRow {
  name: string;
  employee_name: string;
  department?: string;
  status?: string;
}

interface ProjectRow {
  name: string;
  project_name: string;
  status?: string;
}

interface TimesheetRow {
  name: string;
  employee: string;
  employee_name?: string;
  status: string;
  total_hours: number;
  start_date?: string;
  end_date?: string;
  docstatus: number;
  time_logs?: TimesheetDetailRow[];
}

interface TimesheetDetailRow {
  from_time?: string;
  to_time?: string;
  hours?: number;
  project?: string;
  activity_type?: string;
  task?: string;
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-amber-500/10 text-amber-600',
  'Submitted': 'bg-green-500/10 text-green-600',
  'Cancelled': 'bg-red-500/10 text-red-600',
};

const statusLabelAr: Record<string, string> = {
  'Draft': 'مسودة',
  'Submitted': 'مُرحّل',
  'Cancelled': 'ملغى',
};

const columns: Column<TimesheetRow>[] = [
  {
    key: 'name',
    header: 'الرقم',
    sortable: true,
    width: 'w-28',
    render: (v) => <span className="font-mono text-xs text-primary">{String(v)}</span>,
  },
  {
    key: 'employee_name',
    header: 'الموظف',
    sortable: true,
    render: (v, row) => <span className="font-medium text-sm">{String(v || row.employee || '')}</span>,
  },
  {
    key: 'start_date',
    header: 'التاريخ',
    sortable: true,
    render: (v) => <span className="text-xs">{String(v || '')}</span>,
  },
  {
    key: 'total_hours',
    header: 'الساعات',
    sortable: true,
    width: 'w-20',
    render: (v) => <span className="tabular-nums font-semibold text-sm">{Number(v || 0).toFixed(1)} ساعة</span>,
  },
  {
    key: 'status',
    header: 'الحالة',
    sortable: true,
    width: 'w-28',
    render: (v) => {
      const s = String(v);
      const label = statusLabelAr[s] || s;
      return <Badge variant="outline" className={`text-[10px] border-0 ${statusColors[s] || 'bg-secondary'}`}>{label}</Badge>;
    },
  },
];

// ============================================
// Main Component
// ============================================

export default function TimeTrackingPage() {
  const { toast } = useToast();
  const { company: defaultCo } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filter state
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Fetch employees from ERPNext
  const { data: employees = [], isLoading: empLoading } = useDocList<EmployeeRow>('Employee', {
    fields: ['name', 'employee_name', 'department', 'status'],
    filters: { status: 'Active' },
    limit: 200,
  });

  // Fetch projects from ERPNext
  const { data: projects = [] } = useDocList<ProjectRow>('Project', {
    fields: ['name', 'project_name', 'status'],
    filters: { status: 'Open' },
    limit: 200,
  });

  // Fetch timesheets from ERPNext
  const { data: timesheets, isLoading, isError, error, refetch } = useDocList<TimesheetRow>('Timesheet', {
    fields: ['name', 'employee', 'employee_name', 'status', 'total_hours', 'start_date', 'end_date', 'docstatus', 'time_logs'],
    order_by: 'creation desc',
    limit: 100,
  });

  const createMutation = useCreateDoc('Timesheet');
  const updateMutation = useUpdateDoc('Timesheet');
  const submitMutation = useSubmitDoc('Timesheet');

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerEmployee, setTimerEmployee] = useState('');
  const [timerProject, setTimerProject] = useState('');
  const [timerActivity, setTimerActivity] = useState('');
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
  const [activeTimesheetName, setActiveTimesheetName] = useState<string | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    employee: '',
    project: '',
    activity: '',
    date: '',
    from_time: '',
    to_time: '',
  });

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerRunning]);

  const formatTimerDisplay = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  // Start Tracking: Create a Draft Timesheet in ERPNext with from_time set
  const handleStartTimer = async () => {
    if (!timerEmployee) {
      toast({ title: 'خطأ', description: 'يرجى اختيار الموظف أولاً', variant: 'destructive' });
      return;
    }
    const now = new Date();
    const empName = employees.find(e => e.name === timerEmployee)?.employee_name || timerEmployee;

    try {
      const payload = buildTimesheetCreate({
        employee: timerEmployee,
        company: defaultCo || undefined,
        start_date: now.toISOString().split('T')[0],
        time_logs: [{
          from_time: now.toISOString(),
          activity_type: timerActivity || undefined,
          project: timerProject || undefined,
        }],
      });
      const body = prepareFrappeDocForCreate(payload);
      const result = await createMutation.mutateAsync(body);
      // result should contain the name of the created doc
      const tsName = (result as Record<string, unknown>)?.name as string || null;
      setActiveTimesheetName(tsName);
      setTimerStartTime(now);
      setTimerRunning(true);
      toast({ title: 'بدأ التتبع', description: `تم بدء تتبع الوقت للموظف ${empName} وإنشاء سجل وقت في النظام` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ في بدء التتبع', description: msg, variant: 'destructive' });
    }
  };

  // Stop Tracking: Update the Timesheet with to_time and hours
  const handleStopTimer = async () => {
    if (!timerEmployee || !timerStartTime) return;
    const hours = Math.round((timerSeconds / 3600) * 100) / 100;
    const now = new Date();
    const fromTimeStr = timerStartTime.toISOString();
    const toTimeStr = now.toISOString();

    try {
      if (activeTimesheetName) {
        // Update the existing Timesheet with to_time and hours
        const updatePayload = buildTimesheetUpdate({
          time_logs: [{
            from_time: fromTimeStr,
            to_time: toTimeStr,
            hours,
            activity_type: timerActivity || undefined,
            project: timerProject || undefined,
          }],
        });
        await updateMutation.mutateAsync({ name: activeTimesheetName, doc: updatePayload });
        toast({ title: 'تم إيقاف التتبع', description: `تم تسجيل ${hours.toFixed(1)} ساعة بنجاح في سجل الوقت ${activeTimesheetName}` });
      } else {
        // Fallback: create a new Timesheet with full time log
        const payload = buildTimesheetCreate({
          employee: timerEmployee,
          company: defaultCo || undefined,
          start_date: timerStartTime.toISOString().split('T')[0],
          time_logs: [{
            from_time: fromTimeStr,
            to_time: toTimeStr,
            hours,
            activity_type: timerActivity || undefined,
            project: timerProject || undefined,
          }],
        });
        const body = prepareFrappeDocForCreate(payload);
        await createMutation.mutateAsync(body);
        toast({ title: 'تم إيقاف التتبع', description: `تم تسجيل ${hours.toFixed(1)} ساعة بنجاح في سجل الوقت` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ في حفظ سجل الوقت', description: msg, variant: 'destructive' });
    }

    // Reset timer state
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerEmployee('');
    setTimerProject('');
    setTimerActivity('');
    setTimerStartTime(null);
    setActiveTimesheetName(null);
  };

  // Cancel timer without saving
  const handleCancelTimer = () => {
    // Optionally delete the draft timesheet if one was created
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerEmployee('');
    setTimerProject('');
    setTimerActivity('');
    setTimerStartTime(null);
    setActiveTimesheetName(null);
    toast({ title: 'تم إلغاء التتبع' });
  };

  // Manual entry: Create a full Timesheet
  const handleCreate = async () => {
    if (!formData.employee || !formData.date || !formData.from_time || !formData.to_time) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    const [fromH, fromM] = formData.from_time.split(':').map(Number);
    const [toH, toM] = formData.to_time.split(':').map(Number);
    const hours = Math.round(((toH + toM / 60) - (fromH + fromM / 60)) * 100) / 100;

    if (hours <= 0) {
      toast({ title: 'خطأ', description: 'وقت النهاية يجب أن يكون بعد وقت البداية', variant: 'destructive' });
      return;
    }

    // Build from_time/to_time as full ISO strings for ERPNext
    const fromTimeISO = `${formData.date}T${formData.from_time}:00`;
    const toTimeISO = `${formData.date}T${formData.to_time}:00`;

    try {
      const payload = buildTimesheetCreate({
        employee: formData.employee,
        company: defaultCo || undefined,
        start_date: formData.date,
        time_logs: [{
          from_time: fromTimeISO,
          to_time: toTimeISO,
          hours: hours > 0 ? hours : 0,
          activity_type: formData.activity || undefined,
          project: formData.project || undefined,
        }],
      });
      const body = prepareFrappeDocForCreate(payload);
      await createMutation.mutateAsync(body);
      toast({ title: 'تم الحفظ', description: 'تم تسجيل سجل الوقت بنجاح في النظام' });
      setDialogOpen(false);
      setFormData({ employee: '', project: '', activity: '', date: '', from_time: '', to_time: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  const handleSubmitTimesheet = async (name: string) => {
    try {
      await submitMutation.mutateAsync(name);
      toast({ title: 'تم الترحيل', description: 'تم ترحيل سجل الوقت بنجاح' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ في الترحيل', description: msg, variant: 'destructive' });
    }
  };

  // Filtering logic
  const tsData = timesheets || [];

  const filteredData = useMemo(() => {
    let data = tsData;
    if (filterEmployee !== 'all') {
      data = data.filter(ts => ts.employee === filterEmployee);
    }
    if (filterStatus !== 'all') {
      if (filterStatus === 'Draft') {
        data = data.filter(ts => ts.status === 'Draft' || ts.docstatus === 0);
      } else if (filterStatus === 'Submitted') {
        data = data.filter(ts => ts.status === 'Submitted' || ts.docstatus === 1);
      } else if (filterStatus === 'Cancelled') {
        data = data.filter(ts => ts.status === 'Cancelled' || ts.docstatus === 2);
      }
    }
    if (filterDateFrom) {
      data = data.filter(ts => ts.start_date && ts.start_date >= filterDateFrom);
    }
    if (filterDateTo) {
      data = data.filter(ts => ts.start_date && ts.start_date <= filterDateTo);
    }
    return data;
  }, [tsData, filterEmployee, filterStatus, filterDateFrom, filterDateTo]);

  // Summary stats (from unfiltered data)
  const totalHours = tsData.reduce((sum, ts) => sum + (Number(ts.total_hours) || 0), 0);
  const submittedLogs = tsData.filter(l => l.status === 'Submitted' || l.docstatus === 1).length;
  const draftLogs = tsData.filter(l => l.status === 'Draft' || l.docstatus === 0).length;
  const uniqueProjects = new Set(
    tsData.flatMap(ts => (ts.time_logs || []).map(tl => tl.project).filter(Boolean))
  ).size;

  // Build employee filter options from timesheet data (to include employees with timesheets even if not Active)
  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(e => { if (e.name && e.employee_name) map.set(e.name, e.employee_name); });
    tsData.forEach(ts => {
      if (ts.employee) map.set(ts.employee, ts.employee_name || ts.employee);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [employees, tsData]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="تتبع الوقت"
        description="تسجيل ومتابعة ساعات العمل والمشاريع"
        iconify="solar:clock-circle-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'تتبع الوقت' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              تسجيل وقت جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>تسجيل وقت جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">الموظف <span className="text-destructive">*</span></Label>
                <ErpLinkCombobox
                  doctype="Employee"
                  value={formData.employee}
                  onChange={(v) => setFormData(prev => ({ ...prev, employee: v }))}
                  displayKey="employee_name"
                  placeholder="اختر الموظف..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">المشروع</Label>
                  <ErpLinkCombobox
                    doctype="Project"
                    value={formData.project}
                    onChange={(v) => setFormData(prev => ({ ...prev, project: v }))}
                    displayKey="project_name"
                    placeholder="اختر المشروع..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">النشاط</Label>
                  <ErpLinkCombobox
                    doctype="Activity Type"
                    value={formData.activity}
                    onChange={(v) => setFormData(prev => ({ ...prev, activity: v }))}
                    placeholder="اختر النشاط..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">التاريخ <span className="text-destructive">*</span></Label>
                <Input type="date" dir="ltr" className="h-9 text-sm" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">وقت البداية <span className="text-destructive">*</span></Label>
                  <Input type="time" dir="ltr" className="h-9 text-sm" value={formData.from_time} onChange={e => setFormData(prev => ({ ...prev, from_time: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">وقت النهاية <span className="text-destructive">*</span></Label>
                  <Input type="time" dir="ltr" className="h-9 text-sm" value={formData.to_time} onChange={e => setFormData(prev => ({ ...prev, to_time: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري الحفظ...</> : 'حفظ'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">إجمالي الساعات</p>
              <p className="text-sm font-bold mt-0.5">{totalHours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">سجلات مرحّلة</p>
              <p className="text-sm font-bold text-green-600 mt-0.5">{submittedLogs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">مسودات</p>
              <p className="text-sm font-bold text-amber-600 mt-0.5">{draftLogs}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <CalendarClock className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">المشاريع النشطة</p>
              <p className="text-sm font-bold text-purple-600 mt-0.5">{uniqueProjects}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Timer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl ${timerRunning ? 'bg-red-500/10' : 'bg-rose-500/10'} flex items-center justify-center shrink-0`}>
                <Timer className={`h-6 w-6 ${timerRunning ? 'text-red-600 animate-pulse' : 'text-rose-600'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">مؤقت الوقت الحي</p>
                <p className="text-[10px] text-muted-foreground">
                  {timerRunning
                    ? `جاري التتبع - ${employees.find(e => e.name === timerEmployee)?.employee_name || ''}`
                    : 'ابدأ تتبع الوقت الآن'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <ErpLinkCombobox
                doctype="Employee"
                value={timerEmployee}
                onChange={setTimerEmployee}
                displayKey="employee_name"
                placeholder="الموظف..."
                className="h-9 text-xs"
                disabled={timerRunning}
              />
              <ErpLinkCombobox
                doctype="Project"
                value={timerProject}
                onChange={setTimerProject}
                displayKey="project_name"
                placeholder="المشروع..."
                className="h-9 text-xs"
                disabled={timerRunning}
              />
              <ErpLinkCombobox
                doctype="Activity Type"
                value={timerActivity}
                onChange={setTimerActivity}
                placeholder="النشاط..."
                className="h-9 text-xs"
                disabled={timerRunning}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center min-w-[80px]">
                <p className="text-2xl font-bold tabular-nums" dir="ltr">{formatTimerDisplay(timerSeconds)}</p>
              </div>
              {!timerRunning ? (
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleStartTimer} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  بدء
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="gap-1.5" onClick={handleStopTimer} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                    إيقاف وحفظ
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCancelTimer}>
                    <TimerReset className="h-3.5 w-3.5" />
                    إلغاء
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">تصفية السجلات</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">الموظف</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="كل الموظفين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموظفين</SelectItem>
                  {employeeOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">الحالة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="Draft">مسودة</SelectItem>
                  <SelectItem value="Submitted">مُرحّل</SelectItem>
                  <SelectItem value="Cancelled">ملغى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">من تاريخ</Label>
              <Input
                type="date"
                dir="ltr"
                className="h-8 text-xs"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">إلى تاريخ</Label>
              <Input
                type="date"
                dir="ltr"
                className="h-8 text-xs"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
          {(filterEmployee !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {filteredData.length} من {tsData.length} سجل
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground"
                onClick={() => {
                  setFilterEmployee('all');
                  setFilterStatus('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
              >
                مسح التصفية
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        searchable
        loading={isLoading}
        pageSize={10}
        onEdit={(row) => {
          if (row.docstatus === 0) {
            handleSubmitTimesheet(row.name);
          } else {
            toast({ title: 'لا يمكن التعديل', description: 'هذا السجل مرحّل بالفعل', variant: 'destructive' });
          }
        }}
      />
    </div>
  );
}
