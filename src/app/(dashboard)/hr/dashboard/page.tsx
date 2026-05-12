'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDocList } from '@/lib/client/hooks';
import { PageHeader } from '@/components/erp/page-header';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatDate } from '@/lib/core/helpers';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  DollarSign,
  Clock,
  Calendar,
  FileText,
  ChevronLeft,
  GraduationCap,
  Heart,
  PlaneTakeoff,
  ClipboardCheck,
  Calculator,
  UserCircle,
  TrendingUp,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  { label: 'موظف جديد', href: '/hr/employees?new=1', icon: UserCircle, color: 'bg-chart-5/10 text-chart-5' },
  { label: 'تسجيل حضور', href: '/hr/attendance', icon: ClipboardCheck, color: 'bg-primary/10 text-primary' },
  { label: 'طلب إجازة', href: '/hr/leave-applications?new=1', icon: PlaneTakeoff, color: 'bg-chart-1/10 text-chart-1' },
  { label: 'مسير الرواتب', href: '/hr/payroll-entry', icon: Calculator, color: 'bg-chart-2/10 text-chart-2' },
];

/* ------------------------------------------------------------------ */
/*  Department colors for donut representation                         */
/* ------------------------------------------------------------------ */
const DEPT_COLORS = [
  'bg-chart-5',
  'bg-chart-1',
  'bg-chart-3',
  'bg-chart-2',
  'bg-destructive',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

/* ------------------------------------------------------------------ */
/*  Simple donut representation using divs                             */
/* ------------------------------------------------------------------ */
function SimpleDonut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const safeTotal = Math.max(total, 1);

  // Create conic-gradient for the donut
  let accumulated = 0;
  const gradientParts = segments.map((seg) => {
    const start = (accumulated / safeTotal) * 360;
    accumulated += seg.value;
    const end = (accumulated / safeTotal) * 360;
    const colorClass = seg.color.replace('bg-', '');
    // Map tailwind bg classes to actual colors for inline style
    const colorMap: Record<string, string> = {
      'chart-5': 'hsl(var(--chart-5))',
      'chart-1': 'hsl(var(--chart-1))',
      'chart-3': 'hsl(var(--chart-3))',
      'chart-2': 'hsl(var(--chart-2))',
      'destructive': 'hsl(var(--destructive))',
      'chart-4': 'hsl(var(--chart-4))',
    };
    const color = colorMap[colorClass] || '#6b7280';
    return `${color} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="h-28 w-28 rounded-full shrink-0"
        style={{
          background: segments.length > 0
            ? `conic-gradient(${gradientParts.join(', ')})`
            : '#e5e7eb',
          WebkitMask: 'radial-gradient(circle, transparent 38%, black 40%)',
          mask: 'radial-gradient(circle, transparent 38%, black 40%)',
        }}
      />
      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`h-2.5 w-2.5 rounded-full ${seg.color} shrink-0`} />
              <span className="text-[10px] text-muted-foreground truncate">{seg.label}</span>
            </div>
            <span className="text-[10px] font-semibold shrink-0">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function HrDashboardPage() {
  const { company } = useDefaultCompanyName();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  /* ---------- Fetch data ---------- */
  const { data: employees = [], isLoading: empLoading } = useDocList<Record<string, unknown>>(
    'Employee',
    {
      fields: ['name', 'employee_name', 'department', 'status', 'designation', 'date_of_joining', 'gender'],
      limit: 200,
    }
  );

  const { data: attendance = [], isLoading: attLoading } = useDocList<Record<string, unknown>>(
    'Attendance',
    {
      fields: ['name', 'employee', 'employee_name', 'status', 'attendance_date', 'leave_type', 'docstatus'],
      limit: 200,
      order_by: 'attendance_date desc',
    }
  );

  const { data: leaveApplications = [], isLoading: leaveLoading } = useDocList<Record<string, unknown>>(
    'Leave Application',
    {
      fields: ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'status', 'total_leave_days', 'docstatus'],
      limit: 100,
      order_by: 'modified desc',
    }
  );

  const { data: salarySlips = [], isLoading: salaryLoading } = useDocList<Record<string, unknown>>(
    'Salary Slip',
    {
      fields: ['name', 'employee', 'employee_name', 'gross_pay', 'net_pay', 'total_deduction', 'month', 'year', 'docstatus'],
      limit: 100,
    }
  );

  const { data: holidayLists = [], isLoading: holLoading } = useDocList<Record<string, unknown>>(
    'Holiday List',
    {
      fields: ['name', 'from_date', 'to_date'],
      limit: 10,
    }
  );

  const isLoading = empLoading || attLoading || leaveLoading || salaryLoading || holLoading;

  /* ---------- KPI calculations ---------- */
  const totalEmployees = useMemo(
    () => employees.filter((e) => String(e.status) === 'Active').length,
    [employees]
  );

  const presentToday = useMemo(
    () => attendance.filter((a) => String(a.attendance_date) === today && String(a.status) === 'Present').length,
    [attendance, today]
  );

  const onLeaveToday = useMemo(
    () => attendance.filter((a) => String(a.attendance_date) === today && String(a.status) === 'On Leave').length,
    [attendance, today]
  );

  const openPositions = useMemo(() => {
    // Estimate from employee designations - simple count
    return 0; // Would need Staff Plan or Job Opening doctype
  }, []);

  const payrollThisMonth = useMemo(
    () => {
      const todayDate = new Date();
      return salarySlips
        .filter((ss) => {
          const ssMonth = String(ss.month).padStart(2, '0');
          const ssYear = String(ss.year);
          return ssMonth === String(todayDate.getMonth() + 1).padStart(2, '0') && ssYear === String(todayDate.getFullYear()) && Number(ss.docstatus) === 1;
        })
        .reduce((sum, ss) => sum + Number(ss.net_pay || 0), 0);
    },
    [salarySlips]
  );

  const pendingLeaveRequests = useMemo(
    () => leaveApplications.filter((la) => Number(la.docstatus) === 0).length,
    [leaveApplications]
  );

  const contractsExpiring = useMemo(() => {
    // Would need Contract doctype - return 0 for now
    return 0;
  }, []);

  const avgAttendanceRate = useMemo(() => {
    const todayRecords = attendance.filter((a) => String(a.attendance_date) === today);
    if (todayRecords.length === 0) return 0;
    const presentCount = todayRecords.filter((a) => String(a.status) === 'Present' || String(a.status) === 'Half Day').length;
    return Math.round((presentCount / todayRecords.length) * 100);
  }, [attendance, today]);

  /* ---------- Today's attendance summary ---------- */
  const todayAttendance = useMemo(() => {
    const todayRecords = attendance.filter((a) => String(a.attendance_date) === today);
    return {
      present: todayRecords.filter((a) => String(a.status) === 'Present').length,
      absent: todayRecords.filter((a) => String(a.status) === 'Absent').length,
      onLeave: todayRecords.filter((a) => String(a.status) === 'On Leave').length,
      halfDay: todayRecords.filter((a) => String(a.status) === 'Half Day').length,
    };
  }, [attendance, today]);

  /* ---------- Department distribution ---------- */
  const departmentDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      if (String(emp.status) !== 'Active') continue;
      const dept = String(emp.department || 'غير محدد');
      map.set(dept, (map.get(dept) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([dept, count], i) => ({
        label: dept,
        value: count,
        color: DEPT_COLORS[i % DEPT_COLORS.length],
      }));
  }, [employees]);

  /* ---------- Upcoming holidays ---------- */
  const upcomingHolidays = useMemo(() => {
    // Would need to parse holiday list weekly_off and holidays
    // For now, return empty array as we'd need a more detailed fetch
    return [];
  }, [holidayLists]);

  /* ---------- Pending leave requests list ---------- */
  const pendingLeaveList = useMemo(
    () => leaveApplications
      .filter((la) => Number(la.docstatus) === 0)
      .slice(0, 5)
      .map((la) => ({
        name: String(la.name ?? ''),
        employee: String(la.employee_name ?? ''),
        leaveType: String(la.leave_type ?? ''),
        fromDate: String(la.from_date ?? ''),
        toDate: String(la.to_date ?? ''),
        totalDays: Number(la.total_leave_days ?? 0),
      })),
    [leaveApplications]
  );

  /* ---------- Recent employee activities ---------- */
  const recentActivities = useMemo(() => {
    const items: { description: string; detail: string; date: string; type: string }[] = [];
    for (const la of leaveApplications.slice(0, 3)) {
      items.push({
        description: String(la.employee_name ?? ''),
        detail: `طلب إجازة ${String(la.leave_type ?? '')} — ${String(la.total_leave_days ?? 0)} يوم`,
        date: String(la.from_date ?? ''),
        type: 'إجازة',
      });
    }
    for (const ss of salarySlips.slice(0, 2)) {
      items.push({
        description: String(ss.employee_name ?? ''),
        detail: `كشف راتب — صافي ${formatCurrency(Number(ss.net_pay ?? 0))}`,
        date: `${String(ss.year ?? '')}-${String(ss.month ?? '').padStart(2, '0')}`,
        type: 'راتب',
      });
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return items.slice(0, 5);
  }, [leaveApplications, salarySlips]);

  /* ---------- Salary breakdown ---------- */
  const salaryBreakdown = useMemo(() => {
    const todayDate = new Date();
    const thisMonthSlips = salarySlips.filter((ss) => {
      const ssMonth = String(ss.month).padStart(2, '0');
      const ssYear = String(ss.year);
      return ssMonth === String(todayDate.getMonth() + 1).padStart(2, '0') && ssYear === String(todayDate.getFullYear()) && Number(ss.docstatus) === 1;
    });
    const totalGross = thisMonthSlips.reduce((s, ss) => s + Number(ss.gross_pay || 0), 0);
    const totalDeductions = thisMonthSlips.reduce((s, ss) => s + Number(ss.total_deduction || 0), 0);
    const totalNet = thisMonthSlips.reduce((s, ss) => s + Number(ss.net_pay || 0), 0);
    const slipCount = thisMonthSlips.length;
    return { totalGross, totalDeductions, totalNet, slipCount };
  }, [salarySlips]);

  return (
    <div dir="rtl" className="erp-page-enter mx-auto w-full max-w-[1600px] space-y-5 md:space-y-6">
      <PageHeader
        title="لوحة تحكم الموارد البشرية"
        description="متابعة الموظفين والحضور والإجازات والرواتب والأنشطة"
        iconify="solar:users-group-rounded-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الموارد البشرية' }, { label: 'لوحة التحكم' }]}
      />

      {/* ── KPI Row 1 ── */}
      {/* ── KPI Row 2 ── */}
      {/* ── Quick Actions ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.label} variant="outline" size="sm" className="h-9 gap-2 text-xs" asChild>
                  <Link href={action.href}>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${action.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Department Distribution & Today's Attendance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Distribution */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">توزيع الأقسام</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentDist.length === 0 && (
              <p className="text-xs text-muted-foreground py-8 text-center">لا توجد بيانات أقسام بعد.</p>
            )}
            {departmentDist.length > 0 && (
              <SimpleDonut segments={departmentDist} />
            )}
          </CardContent>
        </Card>

        {/* Today's Attendance Summary */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">ملخص حضور اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{todayAttendance.present}</p>
                  <p className="text-[10px] text-muted-foreground">حاضر</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5">
                <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <UserX className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">{todayAttendance.absent}</p>
                  <p className="text-[10px] text-muted-foreground">غائب</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-chart-1/5">
                <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-chart-1/10">
                  <PlaneTakeoff className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-lg font-bold text-chart-1">{todayAttendance.onLeave}</p>
                  <p className="text-[10px] text-muted-foreground">في إجازة</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-chart-2/5">
                <div className="flex h-9 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                  <Clock className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-lg font-bold text-chart-2">{todayAttendance.halfDay}</p>
                  <p className="text-[10px] text-muted-foreground">نصف يوم</p>
                </div>
              </div>
            </div>
            {/* Attendance rate bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">معدل الحضور</span>
                <span className="text-xs font-semibold">{avgAttendanceRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${avgAttendanceRate >= 90 ? 'bg-chart-3' : avgAttendanceRate >= 70 ? 'bg-chart-2' : 'bg-destructive'}`}
                  style={{ width: `${avgAttendanceRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Holidays, Pending Leaves & Salary Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Holidays */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-chart-5" />
              <CardTitle className="text-sm font-semibold">العطلات القادمة</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingHolidays.length === 0 && (
              <div className="py-6 text-center">
                <div className="mx-auto mb-2 flex h-9 w-10 items-center justify-center rounded-full bg-chart-5/10">
                  <CalendarDays className="h-5 w-5 text-chart-5" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد عطلات قادمة مسجلة</p>
                <Link href="/hr/holidays" className="text-[10px] text-primary hover:underline mt-1 inline-block">
                  إدارة العطلات
                </Link>
              </div>
            )}
            {upcomingHolidays.length > 0 && (
              <div className="space-y-2">
                {upcomingHolidays.map((hol: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">{String(hol.name ?? '')}</p>
                      <p className="text-[10px] text-muted-foreground">{String(hol.date ?? '')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pendingLeaveRequests > 0 && <AlertCircle className="h-4 w-4 text-amber-500" />}
                <CardTitle className="text-sm font-semibold">طلبات إجازة معلّقة</CardTitle>
              </div>
              <Link href="/hr/leave-applications" className="text-xs text-primary hover:underline">عرض الكل</Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingLeaveList.length === 0 && (
              <div className="py-6 text-center">
                <div className="mx-auto mb-2 flex h-9 w-10 items-center justify-center rounded-full bg-primary/10">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">لا توجد طلبات إجازة معلّقة</p>
              </div>
            )}
            {pendingLeaveList.length > 0 && (
              <div className="space-y-2">
                {pendingLeaveList.map((la) => (
                  <div key={la.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium truncate">{la.employee}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {la.leaveType} — {la.totalDays} يوم
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-chart-2/10 text-chart-2">
                      معلّق
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Breakdown */}
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-semibold">ملخص الرواتب هذا الشهر</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">إجمالي الرواتب</span>
                <span className="text-xs font-semibold">{formatCurrency(salaryBreakdown.totalGross)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">إجمالي الخصومات</span>
                <span className="text-xs font-semibold text-rose-600">-{formatCurrency(salaryBreakdown.totalDeductions)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">صافي الرواتب</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(salaryBreakdown.totalNet)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>عدد الكشوف</span>
                <span>{salaryBreakdown.slipCount}</span>
              </div>
              {/* Visual bar */}
              {salaryBreakdown.totalGross > 0 && (
                <div className="mt-2">
                  <div className="flex rounded-full overflow-hidden h-2.5">
                    <div
                      className="bg-chart-3 transition-all duration-500"
                      style={{ width: `${((salaryBreakdown.totalGross - salaryBreakdown.totalDeductions) / salaryBreakdown.totalGross) * 100}%` }}
                    />
                    <div
                      className="bg-destructive transition-all duration-500"
                      style={{ width: `${(salaryBreakdown.totalDeductions / salaryBreakdown.totalGross) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-chart-3" />
                      <span className="text-[9px] text-muted-foreground">صافي</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-[9px] text-muted-foreground">خصومات</span>
                    </div>
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full text-xs mt-2" asChild>
                <Link href="/hr/salary-slips">عرض كشوف الرواتب</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Employee Activities ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">آخر الأنشطة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground py-6 text-center">جاري التحميل…</p>}
          {!isLoading && recentActivities.length === 0 && (
            <p className="text-xs text-muted-foreground py-8 text-center">لا توجد أنشطة حديثة.</p>
          )}
          {!isLoading && recentActivities.length > 0 && (
            <div className="space-y-1.5">
              {recentActivities.map((act, i) => (
                <div
                  key={`activity-${i}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10">
                      {act.type === 'إجازة' ? (
                        <PlaneTakeoff className="h-4 w-4 text-chart-5" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{act.description}</p>
                      <p className="text-[10px] text-muted-foreground">{act.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{act.date}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 bg-purple/10 text-chart-5">
                      {act.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
