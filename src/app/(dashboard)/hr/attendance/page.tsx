'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Clock, UserCheck, UserX, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildAttendanceCreate, buildEmployeeCheckinCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AttendanceRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  attendance_date?: string;
  status?: string;
  in_time?: string;
  out_time?: string;
  late_entry?: number | boolean;
  early_exit?: number | boolean;
};

const columns: Column<AttendanceRow>[] = [
  { key: 'employee_name', header: 'الموظف', sortable: true, render: (_, row) => <span className="font-medium">{row.employee_name || row.employee || '—'}</span> },
  { key: 'attendance_date', header: 'التاريخ', sortable: true, render: (value) => (value ? formatDate(String(value)) : '—') },
  { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value || '')} /> },
  { key: 'in_time', header: 'وقت الحضور', render: (value) => <span className="text-xs tabular-nums" dir="ltr">{value != null && value !== '' ? String(value).slice(0, 8) : '—'}</span> },
  { key: 'out_time', header: 'وقت الانصراف', render: (value) => <span className="text-xs tabular-nums" dir="ltr">{value != null && value !== '' ? String(value).slice(0, 8) : '—'}</span> },
  { key: 'late_entry', header: 'تأخير', render: (value) => (Number(value) === 1 || value === true ? <span className="text-xs text-destructive font-medium">نعم</span> : <span className="text-xs text-muted-foreground">لا</span>) },
  { key: 'early_exit', header: 'خروج مبكر', render: (value) => (Number(value) === 1 || value === true ? <span className="text-xs text-amber-600 font-medium">نعم</span> : <span className="text-xs text-muted-foreground">لا</span>) },
];

const initialFormData = {
  employee: '',
  attendance_date: '',
  status: 'Present',
  in_time: '',
  out_time: ''};

export default function AttendancePage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [bulkCsv, setBulkCsv] = useState('');
  const [checkinEmployee, setCheckinEmployee] = useState('');
  const [checkinTime, setCheckinTime] = useState('');
  const [provider, setProvider] = useState('ZKTeco');
  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');

  const { data, isLoading, isError, error, refetch } = useDocList<AttendanceRow>('Attendance', {
    fields: ['name', 'employee', 'employee_name', 'attendance_date', 'status', 'in_time', 'out_time', 'late_entry', 'early_exit'],
    limit: 500,
    order_by: 'attendance_date desc'});
  const createMutation = useCreateDoc('Attendance');
  const createCheckinMutation = useCreateDoc('Employee Checkin');

  const attendanceRecords = data || [];

  let filtered = attendanceRecords;
  if (statusFilter !== 'all') filtered = filtered.filter((a) => a.status === statusFilter);
  if (dateFilter) filtered = filtered.filter((a) => a.attendance_date === dateFilter);  const halfDayCount = attendanceRecords.filter((a) => a.status === 'Half Day').length;  const handleCreate = () => {
    if (!formData.employee) { toast.error('يرجى اختيار الموظف'); return; }
    if (!formData.attendance_date) { toast.error('يرجى تحديد التاريخ'); return; }
    const mapped = buildAttendanceCreate({
      employee: formData.employee,
      attendance_date: formData.attendance_date,
      status: formData.status,
      in_time: formData.in_time || undefined,
      out_time: formData.out_time || undefined});
    const body = prepareFrappeDocForCreate(mapped);
    createMutation.mutate(body, {
      onSuccess: () => { toast.success('تم تسجيل الحضور بنجاح'); setDialogOpen(false); setFormData({ ...initialFormData }); },
      onError: () => toast.error('تعذر الحفظ — قد يكون السجل موجوداً لنفس اليوم')});
  };

  const parsedRows = useMemo(() => {
    return bulkCsv
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [employee, attendance_date, status, in_time, out_time] = line.split(',').map((x) => (x || '').trim());
        return { employee, attendance_date, status, in_time, out_time };
      })
      .filter((x) => x.employee && x.attendance_date && x.status);
  }, [bulkCsv]);

  const submitBulk = async () => {
    if (parsedRows.length === 0) return toast.error('لا توجد صفوف صالحة');
    let ok = 0;
    for (const r of parsedRows) {
      const payload = prepareFrappeDocForCreate(buildAttendanceCreate({
        employee: r.employee,
        attendance_date: r.attendance_date,
        status: r.status,
        in_time: r.in_time || undefined,
        out_time: r.out_time || undefined}));
      try {
        await createMutation.mutateAsync(payload);
        ok += 1;
      } catch {
        // keep progressing; failures are expected on duplicates
      }
    }
    toast.success(`تم حفظ ${ok} من ${parsedRows.length}`);
    setBulkCsv('');
  };

  const createCheckin = () => {
    if (!checkinEmployee || !checkinTime) return toast.error('الموظف والوقت مطلوبان');
    createCheckinMutation.mutate(prepareFrappeDocForCreate(buildEmployeeCheckinCreate({ employee: checkinEmployee, time: checkinTime })), {
      onSuccess: () => { toast.success('تم تسجيل الحضور'); setCheckinEmployee(''); setCheckinTime(''); },
      onError: () => toast.error('فشل تسجيل الحضور')});
  };
  const clearFilters = () => { setStatusFilter('all'); setSearch(''); setAttendanceStatusFilter('all'); setDateFrom(''); setDateTo(''); };


  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="الحضور والانصراف"
        description="إدارة سجلات الحضور والانصراف اليومية، الحالات، الأوقات، والاستثناءات"
        iconify="solar:calendar-mark-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الحضور والانصراف' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
تسجيل حضور
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>تسجيل حضور موظف</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">الموظف <span className="text-destructive">*</span></Label>
                <ErpLinkCombobox doctype="Employee" value={formData.employee} onChange={(v) => setFormData((p) => ({ ...p, employee: v }))} displayKey="employee_name" placeholder="اختر الموظف..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">التاريخ <span className="text-destructive">*</span></Label><Input type="date" dir="ltr" value={formData.attendance_date} onChange={(e) => setFormData((p) => ({ ...p, attendance_date: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-sm font-medium">الحالة</Label>
                  <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}>
                    <option value="Present">حاضر</option>
                    <option value="Absent">غائب</option>
                    <option value="Half Day">نصف يوم</option>
                    <option value="On Leave">في إجازة</option>
                    <option value="Work From Home">عمل عن بُعد</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-sm font-medium">وقت الحضور</Label><Input type="time" dir="ltr" value={formData.in_time} onChange={(e) => setFormData((p) => ({ ...p, in_time: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-sm font-medium">وقت الانصراف</Label><Input type="time" dir="ltr" value={formData.out_time} onChange={(e) => setFormData((p) => ({ ...p, out_time: e.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
            </div>
          </DialogContent>
          </Dialog>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالموظف..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            {(dateFrom || dateTo || attendanceStatusFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" dir="ltr" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" dir="ltr" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الحالة</Label>
            <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Present">حاضر</SelectItem>
                <SelectItem value="Absent">غائب</SelectItem>
                <SelectItem value="Half Day">نصف يوم</SelectItem>
                <SelectItem value="On Leave">في إجازة</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-muted/35">
            <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
            <TabsTrigger value="Present" className="text-xs">حاضر</TabsTrigger>
            <TabsTrigger value="Absent" className="text-xs">غائب</TabsTrigger>
            <TabsTrigger value="On Leave" className="text-xs">إجازة</TabsTrigger>
            <TabsTrigger value="Half Day" className="text-xs">نصف يوم</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">تصفية بالتاريخ:</Label>
          <Input type="date" dir="ltr" className="w-40 h-8 text-xs" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          {dateFilter && <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setDateFilter('')}>مسح</Button>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">رفع حضور جماعي (CSV سريع)</p>
            <p className="text-[11px] text-muted-foreground">الصيغة: employee,attendance_date,status,in_time,out_time</p>
            <Textarea rows={6} dir="ltr" value={bulkCsv} onChange={(e) => setBulkCsv(e.target.value)} placeholder={'HR-EMP-0001,2026-04-30,Present,09:00,17:00'} />
            <Button size="sm" onClick={submitBulk} disabled={createMutation.isPending}>تنفيذ الرفع</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">تكامل جهاز الحضور</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label className="text-xs">المزوّد</Label><Input value={provider} onChange={(e) => setProvider(e.target.value)} /></div>
              <div><Label className="text-xs">رمز الدخول</Label><Input value={token} onChange={(e) => setToken(e.target.value)} dir="ltr" /></div>
            </div>
            <div><Label className="text-xs">عنوان الخدمة</Label><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} dir="ltr" placeholder="https://attendance-gateway/api/punches" /></div>
            <div className="border rounded-md p-2 text-[11px] text-muted-foreground">قم بإعداد بيانات الاتصال لجهاز الحضور. سيتم تفعيل الربط تلقائياً عند توفر الاتصال.</div>
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold">تسجيل حضور يدوي سريع</p>
              <ErpLinkCombobox doctype="Employee" value={checkinEmployee} onChange={setCheckinEmployee} displayKey="employee_name" />
              <Input type="datetime-local" dir="ltr" value={checkinTime} onChange={(e) => setCheckinTime(e.target.value)} />
              <Button size="sm" variant="outline" onClick={createCheckin} disabled={createCheckinMutation.isPending}>إضافة حضور</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable data={filtered} columns={columns} searchable loading={isLoading} />
    </div>
  );
}
