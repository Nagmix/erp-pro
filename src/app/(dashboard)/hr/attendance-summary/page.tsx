'use client';

import { useMemo, useState, useCallback } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';
import {
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  FileText,
  BarChart3,
  PieChart,
  Filter,
  ChevronDown,
  ChevronUp,
  Activity,
  Timer,
  Briefcase,
  Heart,
  Plane,
  Stethoscope,
  Baby,
  GraduationCap,
  Moon,
  Star,
} from 'lucide-react';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

/* ─── Types ─── */
interface AttendanceRecord {
  name: string;
  employee?: string;
  employee_name?: string;
  attendance_date?: string;
  status?: string;
  in_time?: string;
  out_time?: string;
  late_entry?: number | boolean;
  early_exit?: number | boolean;
  working_hours?: number;
  department?: string;
  leave_type?: string;
  shift?: string;
}

interface Department {
  name: string;
  department_name?: string;
}

interface Employee {
  name: string;
  employee_name?: string;
  department?: string;
}

/* ─── Leave Type Icons ─── */
const LEAVE_TYPE_MAP: Record<string, { label: string; icon: typeof Heart; color: string }> = {
  'Sick Leave': { label: 'إجازة مرضية', icon: Stethoscope, color: 'text-destructive bg-destructive/10 border-destructive/20' },
  'Annual Leave': { label: 'إجازة سنوية', icon: Plane, color: 'text-chart-1 bg-chart-1/10 border-chart-1/20' },
  'Casual Leave': { label: 'إجازة عرضية', icon: Clock, color: 'text-chart-2 bg-chart-2/10 border-chart-2/20' },
  'Maternity Leave': { label: 'إجازة أمومة', icon: Baby, color: 'text-chart-5 bg-chart-5/10 border-chart-5/20' },
  'Study Leave': { label: 'إجازة دراسية', icon: GraduationCap, color: 'text-chart-5 bg-chart-5/10 border-chart-5/20' },
  'Compensatory Off': { label: 'إجازة تعويضية', icon: Moon, color: 'text-chart-1 bg-chart-1/10 border-chart-1/20' },
  'Leave Without Pay': { label: 'إجازة بدون راتب', icon: Star, color: 'text-gray-500 bg-gray-50 border-gray-200' },
};

function getLeaveTypeInfo(leaveType: string) {
  return LEAVE_TYPE_MAP[leaveType] || { label: leaveType || 'أخرى', icon: Clock, color: 'text-muted-foreground bg-muted border-border' };
}

/* ─── Month Names in Arabic ─── */
const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/* ─── Helper: Get days in month ─── */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/* ─── Helper: Format hours ─── */
function formatHours(hours: number): string {
  if (!hours || hours === 0) return '٠';
  return hours.toFixed(1);
}

/* ─── Main Component ─── */
export default function AttendanceSummaryPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="ملخص الحضور"
          description="تقرير شامل لحضور الموظفين"
          iconify="solar:calendar-mark-bold-duotone"
          accent="info"
          breadcrumbs={[{ label: 'الموارد البشرية' }, { label: 'ملخص الحضور' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  /* ─── ERPNext Data Hooks ─── */
  const attendanceList = useDocList<AttendanceRecord>('Attendance', {
    fields: ['name', 'employee', 'employee_name', 'attendance_date', 'status', 'in_time', 'out_time', 'late_entry', 'early_exit', 'working_hours', 'department', 'leave_type', 'shift'],
    limit: 5000,
    order_by: 'attendance_date desc',
  });

  const departmentsList = useDocList<Department>('Department', {
    fields: ['name', 'department_name'],
    limit: 200,
  });

  const employeesList = useDocList<Employee>('Employee', {
    fields: ['name', 'employee_name', 'department'],
    limit: 1000,
  });

  const attendance = attendanceList.data || [];
  const departments = departmentsList.data || [];
  const employees = employeesList.data || [];

  /* ─── Filter attendance by selected month/year ─── */
  const filteredAttendance = useMemo(() => {
    const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return attendance.filter(a => {
      if (!a.attendance_date) return false;
      const matchesDate = a.attendance_date.startsWith(monthStr);
      const matchesDept = departmentFilter === 'all' || a.department === departmentFilter;
      const matchesEmployee = employeeFilter === 'all' || a.employee === employeeFilter;
      return matchesDate && matchesDept && matchesEmployee;
    });
  }, [attendance, selectedYear, selectedMonth, departmentFilter, employeeFilter]);

  /* ─── Compute Employee Summary ─── */
  const employeeSummary = useMemo(() => {
    const empMap = new Map<string, {
      employee: string;
      employee_name: string;
      department: string;
      total_days: number;
      present_days: number;
      absent_days: number;
      late_days: number;
      leave_days: number;
      half_days: number;
      overtime_hours: number;
      working_hours: number;
      leave_types: Record<string, number>;
    }>();

    filteredAttendance.forEach(a => {
      const key = a.employee || 'unknown';
      if (!empMap.has(key)) {
        empMap.set(key, {
          employee: a.employee || '',
          employee_name: a.employee_name || 'غير معروف',
          department: a.department || '',
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          late_days: 0,
          leave_days: 0,
          half_days: 0,
          overtime_hours: 0,
          working_hours: 0,
          leave_types: {},
        });
      }
      const emp = empMap.get(key)!;
      emp.total_days += 1;

      if (a.status === 'Present') {
        emp.present_days += 1;
        if (Number(a.late_entry) === 1 || a.late_entry === true) emp.late_days += 1;
        emp.working_hours += Number(a.working_hours) || 0;
        // Overtime: assume >8 hours is overtime
        const wh = Number(a.working_hours) || 0;
        if (wh > 8) emp.overtime_hours += wh - 8;
      } else if (a.status === 'Absent') {
        emp.absent_days += 1;
      } else if (a.status === 'On Leave') {
        emp.leave_days += 1;
        const lt = a.leave_type || 'Other';
        emp.leave_types[lt] = (emp.leave_types[lt] || 0) + 1;
      } else if (a.status === 'Half Day') {
        emp.half_days += 1;
        emp.present_days += 0.5;
        emp.leave_days += 0.5;
      }
    });

    return Array.from(empMap.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name, 'ar'));
  }, [filteredAttendance]);

  /* ─── Compute Department Summary ─── */
  const departmentSummary = useMemo(() => {
    const deptMap = new Map<string, {
      department: string;
      employee_count: number;
      avg_attendance_rate: number;
      total_present: number;
      total_absent: number;
      total_late: number;
      total_leave: number;
    }>();

    employeeSummary.forEach(emp => {
      const dept = emp.department || 'بدون قسم';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          employee_count: 0,
          avg_attendance_rate: 0,
          total_present: 0,
          total_absent: 0,
          total_late: 0,
          total_leave: 0,
        });
      }
      const d = deptMap.get(dept)!;
      d.employee_count += 1;
      d.total_present += emp.present_days;
      d.total_absent += emp.absent_days;
      d.total_late += emp.late_days;
      d.total_leave += emp.leave_days;
    });

    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    deptMap.forEach(d => {
      const totalPossibleDays = d.employee_count * daysInMonth;
      d.avg_attendance_rate = totalPossibleDays > 0 ? Math.round((d.total_present / totalPossibleDays) * 100) : 0;
    });

    return Array.from(deptMap.values()).sort((a, b) => b.avg_attendance_rate - a.avg_attendance_rate);
  }, [employeeSummary, selectedYear, selectedMonth]);

  /* ─── KPI Stats ─── */
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const totalEmployees = employeeSummary.length;
  const avgAttendanceRate = useMemo(() => {
    if (employeeSummary.length === 0) return 0;
    const total = employeeSummary.reduce((sum, e) => {
      const rate = e.total_days > 0 ? (e.present_days / e.total_days) * 100 : 0;
      return sum + rate;
    }, 0);
    return Math.round(total / employeeSummary.length);
  }, [employeeSummary]);

  const perfectAttendance = employeeSummary.filter(e => e.absent_days === 0 && e.late_days === 0 && e.total_days > 0).length;
  const chronicAbsentees = employeeSummary.filter(e => {
    if (e.total_days === 0) return false;
    return (e.absent_days / e.total_days) > 0.2;
  }).length;

  /* ─── Leave Type Breakdown ─── */
  const leaveBreakdown = useMemo(() => {
    const leaveMap = new Map<string, number>();
    employeeSummary.forEach(emp => {
      Object.entries(emp.leave_types).forEach(([type, count]) => {
        leaveMap.set(type, (leaveMap.get(type) || 0) + count);
      });
    });
    return Array.from(leaveMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [employeeSummary]);

  /* ─── Late Arrivals Breakdown ─── */
  const lateArrivals = useMemo(() => {
    return employeeSummary
      .filter(e => e.late_days > 0)
      .sort((a, b) => b.late_days - a.late_days)
      .slice(0, 10);
  }, [employeeSummary]);

  /* ─── Table Columns ─── */
  const summaryColumns: Column<typeof employeeSummary[number]>[] = useMemo(
    () => [
      {
        key: 'employee_name',
        header: 'الموظف',
        sortable: true,
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
              {String(v || '?').charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{String(v)}</p>
              <p className="text-[10px] text-muted-foreground">{row.department || '—'}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'total_days',
        header: 'أيام العمل',
        sortable: true,
        render: (v) => <span className="text-xs font-medium tabular-nums">{String(v)}</span>,
      },
      {
        key: 'present_days',
        header: 'أيام الحضور',
        sortable: true,
        render: (v) => (
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5 tabular-nums">
            {String(v)}
          </Badge>
        ),
      },
      {
        key: 'absent_days',
        header: 'أيام الغياب',
        sortable: true,
        render: (v) => Number(v) > 0 ? (
          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/5 tabular-nums">
            {String(v)}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground tabular-nums">{String(v)}</span>
        ),
      },
      {
        key: 'late_days',
        header: 'أيام التأخير',
        sortable: true,
        render: (v) => Number(v) > 0 ? (
          <Badge variant="outline" className="text-[10px] border-chart-2/30 text-chart-2 bg-chart-2/5 tabular-nums">
            {String(v)}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground tabular-nums">{String(v)}</span>
        ),
      },
      {
        key: 'leave_days',
        header: 'أيام الإجازة',
        sortable: true,
        render: (v) => Number(v) > 0 ? (
          <Badge variant="outline" className="text-[10px] border-chart-1/30 text-chart-1 bg-chart-1/5 tabular-nums">
            {String(v)}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground tabular-nums">{String(v)}</span>
        ),
      },
      {
        key: 'overtime_hours',
        header: 'ساعات إضافية',
        sortable: true,
        render: (v) => Number(v) > 0 ? (
          <span className="text-xs text-violet-600 font-medium tabular-nums">{formatHours(Number(v))}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        ),
      },
      {
        key: 'working_hours',
        header: 'ساعات العمل',
        sortable: true,
        render: (v) => <span className="text-xs tabular-nums">{formatHours(Number(v))}</span>,
      },
      {
        key: '_rate',
        header: 'نسبة الحضور',
        render: (_v, row) => {
          const rate = row.total_days > 0 ? Math.round((row.present_days / row.total_days) * 100) : 0;
          return (
            <div className="flex items-center gap-2 min-w-[100px]">
              <Progress value={rate} className="h-1.5 flex-1" />
              <span className={`text-[10px] font-semibold tabular-nums ${
                rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {rate}%
              </span>
            </div>
          );
        },
      },
    ],
    []
  );

  /* ─── Export Handlers ─── */
  const handleExportCSV = useCallback(() => {
    const headers = ['الموظف', 'القسم', 'أيام العمل', 'الحضور', 'الغياب', 'التأخير', 'الإجازة', 'ساعات إضافية', 'ساعات العمل', 'نسبة الحضور'];
    const rows = employeeSummary.map(e => {
      const rate = e.total_days > 0 ? Math.round((e.present_days / e.total_days) * 100) : 0;
      return [e.employee_name, e.department, e.total_days, e.present_days, e.absent_days, e.late_days, e.leave_days, formatHours(e.overtime_hours), formatHours(e.working_hours), `${rate}%`];
    });
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ملخص-الحضور-${MONTH_NAMES_AR[selectedMonth - 1]}-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('تم تصدير التقرير بنجاح');
  }, [employeeSummary, selectedMonth, selectedYear]);

  const handleExportPDF = useCallback(() => {
    toast.info('جارٍ تجهيز التقرير للطباعة...');
    window.print();
  }, []);

  /* ─── Year options ─── */
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="ملخص الحضور"
        description={`تقرير شامل لحضور الموظفين — ${MONTH_NAMES_AR[selectedMonth - 1]} ${selectedYear}`}
        iconify="solar:calendar-mark-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية' }, { label: 'ملخص الحضور' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              تصدير CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportPDF}>
              <FileText className="h-3.5 w-3.5" />
              طباعة
            </Button>
          </div>
        }
      />

      {/* ─── KPI Cards ─── */}
      {/* ─── Filters ─── */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الشهر</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES_AR.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">السنة</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="h-9 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">القسم</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="جميع الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.department_name || d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الموظف</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="h-9 w-48">
                  <SelectValue placeholder="جميع الموظفين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الموظفين</SelectItem>
                  {employees
                    .filter(e => departmentFilter === 'all' || e.department === departmentFilter)
                    .map(e => (
                      <SelectItem key={e.name} value={e.name}>
                        {e.employee_name || e.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            ملخص الموظفين
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5 text-xs">
            <Briefcase className="h-3.5 w-3.5" />
            ملخص الأقسام
          </TabsTrigger>
          <TabsTrigger value="late" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            التأخيرات
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            تفصيل الإجازات
          </TabsTrigger>
        </TabsList>

        {/* ─── Employee Summary Tab ─── */}
        <TabsContent value="summary" className="space-y-4">
          <ListQueryAlert error={attendanceList.isError ? attendanceList.error : null} onRetry={() => attendanceList.refetch()} />
          <DataTable
            data={employeeSummary}
            columns={summaryColumns}
            tableId="attendance-summary"
            searchable
            loading={attendanceList.isLoading}
            exportFileName={`ملخص-الحضور-${MONTH_NAMES_AR[selectedMonth - 1]}-${selectedYear}`}
            pageSize={15}
          />
        </TabsContent>

        {/* ─── Department Summary Tab ─── */}
        <TabsContent value="departments" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                ملخص الحضور حسب القسم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentSummary.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  لا توجد بيانات حضور للفترة المحددة
                </div>
              ) : (
                <div className="space-y-3">
                  {departmentSummary.map(dept => (
                    <div key={dept.department} className="rounded-xl border border-border/40 overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                        onClick={() => setExpandedDept(expandedDept === dept.department ? null : dept.department)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <div className="text-start">
                            <p className="text-sm font-semibold">{dept.department}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {dept.employee_count} موظف • {dept.total_present} يوم حضور • {dept.total_absent} يوم غياب
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={dept.avg_attendance_rate} className="h-2 flex-1" />
                            <span className={`text-xs font-bold tabular-nums ${
                              dept.avg_attendance_rate >= 85 ? 'text-emerald-600' : dept.avg_attendance_rate >= 70 ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {dept.avg_attendance_rate}%
                            </span>
                          </div>
                          {expandedDept === dept.department ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {expandedDept === dept.department && (
                        <div className="border-t border-border/30 p-4 bg-muted/10">
                          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div className="rounded-lg border border-border/30 bg-background p-2.5 text-center">
                              <p className="text-[10px] text-muted-foreground">أيام الحضور</p>
                              <p className="text-lg font-bold text-emerald-600 tabular-nums">{dept.total_present}</p>
                            </div>
                            <div className="rounded-lg border border-border/30 bg-background p-2.5 text-center">
                              <p className="text-[10px] text-muted-foreground">أيام الغياب</p>
                              <p className="text-lg font-bold text-rose-600 tabular-nums">{dept.total_absent}</p>
                            </div>
                            <div className="rounded-lg border border-border/30 bg-background p-2.5 text-center">
                              <p className="text-[10px] text-muted-foreground">التأخيرات</p>
                              <p className="text-lg font-bold text-amber-600 tabular-nums">{dept.total_late}</p>
                            </div>
                            <div className="rounded-lg border border-border/30 bg-background p-2.5 text-center">
                              <p className="text-[10px] text-muted-foreground">الإجازات</p>
                              <p className="text-lg font-bold text-sky-600 tabular-nums">{dept.total_leave}</p>
                            </div>
                          </div>
                          {/* Employee list for this department */}
                          <div className="space-y-1">
                            {employeeSummary
                              .filter(e => e.department === dept.department)
                              .map(e => {
                                const rate = e.total_days > 0 ? Math.round((e.present_days / e.total_days) * 100) : 0;
                                return (
                                  <div key={e.employee} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/20">
                                    <span className="text-xs font-medium">{e.employee_name}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-muted-foreground">حضور: <span className="text-emerald-600 font-medium">{e.present_days}</span></span>
                                      <span className="text-[10px] text-muted-foreground">غياب: <span className="text-rose-600 font-medium">{e.absent_days}</span></span>
                                      <span className={`text-[10px] font-semibold ${rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{rate}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Late Arrivals Tab ─── */}
        <TabsContent value="late" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                تفصيل التأخيرات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lateArrivals.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-9 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-600">لا توجد تأخيرات في هذه الفترة</p>
                  <p className="text-[10px] text-muted-foreground">جميع الموظفين حضروا في الوقت المحدد</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lateArrivals.map((emp, idx) => (
                    <div key={emp.employee} className="flex items-center justify-between rounded-lg border border-border/30 p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-chart-2/5 flex items-center justify-center text-xs font-bold text-amber-600">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{emp.employee_name}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-amber-600 tabular-nums">{emp.late_days}</p>
                          <p className="text-[9px] text-muted-foreground">يوم تأخير</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-medium tabular-nums">{emp.present_days}</p>
                          <p className="text-[9px] text-muted-foreground">يوم حضور</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${
                          emp.late_days > 5 ? 'border-destructive/30 text-destructive bg-destructive/5' :
                          emp.late_days > 2 ? 'border-chart-2/30 text-chart-2 bg-chart-2/5' :
                          'border-chart-1/30 text-chart-1 bg-chart-1/5'
                        }`}>
                          {emp.late_days > 5 ? 'تأخير متكرر' : emp.late_days > 2 ? 'تأخير متوسط' : 'تأخير خفيف'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Leave Breakdown Tab ─── */}
        <TabsContent value="leaves" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Leave Type Breakdown */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sky-500" />
                  تفصيل الإجازات حسب النوع
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaveBreakdown.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    لا توجد إجازات في هذه الفترة
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaveBreakdown.map(({ type, count }) => {
                      const info = getLeaveTypeInfo(type);
                      const InfoIcon = info.icon;
                      const totalLeaves = leaveBreakdown.reduce((s, l) => s + l.count, 0);
                      const pct = totalLeaves > 0 ? Math.round((count / totalLeaves) * 100) : 0;
                      return (
                        <div key={type} className="flex items-center gap-3 rounded-lg border border-border/30 p-3 hover:bg-muted/20 transition-colors">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border ${info.color}`}>
                            <InfoIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold">{info.label}</p>
                              <span className="text-xs font-bold tabular-nums">{count}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employee Leave Details */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  الموظفون في إجازة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  {employeeSummary.filter(e => e.leave_days > 0).length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      لا يوجد موظفون في إجازة
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {employeeSummary
                        .filter(e => e.leave_days > 0)
                        .sort((a, b) => b.leave_days - a.leave_days)
                        .map(emp => (
                          <div key={emp.employee} className="flex items-center justify-between rounded-lg border border-border/30 p-3">
                            <div>
                              <p className="text-xs font-semibold">{emp.employee_name}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.department}</p>
                            </div>
                            <div className="text-start">
                              <p className="text-sm font-bold text-sky-600 tabular-nums">{emp.leave_days}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(emp.leave_types).map(([type, count]) => {
                                  const info = getLeaveTypeInfo(type);
                                  return (
                                    <Badge key={type} variant="outline" className={`text-[8px] border ${info.color}`}>
                                      {info.label}: {count}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
