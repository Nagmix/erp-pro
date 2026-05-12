'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  Clock,
  Sun,
  Moon,
  Sunrise,
  Workflow,
  Filter,
  ChevronDown,
  RefreshCw,
  X,
  Calendar,
} from 'lucide-react';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildShiftTypeCreate, buildShiftAssignmentCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { PageHeader } from '@/components/erp/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/core/helpers';

/* ────────────────────────────────────────────
   أنواع البيانات
   ──────────────────────────────────────────── */
type ShiftRow = {
  name: string;
  shift_type?: string;
  start_time?: string;
  end_time?: string;
  holiday_list?: string;
  last_sync_of_checkin?: string;
  status?: string;
};

type AssignRow = {
  name: string;
  employee_name?: string;
  shift_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  docstatus?: number;
};

/* ────────────────────────────────────────────
   دوال مساعدة
   ──────────────────────────────────────────── */
const getShiftIcon = (name: string) => {
  if (name.includes('صباح') || name.includes('Morning')) return <Sun className="h-4 w-4 text-amber-500" />;
  if (name.includes('مسائي') || name.includes('Evening')) return <Moon className="h-4 w-4 text-blue-500" />;
  if (name.includes('ليل') || name.includes('Night')) return <Sunrise className="h-4 w-4 text-purple-500" />;
  return <Workflow className="h-4 w-4 text-green-500" />;
};

const getShiftHours = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return (diff / 60).toFixed(1);
};

/* ────────────────────────────────────────────
   أعمدة الجدول — أنواع الورديات
   ──────────────────────────────────────────── */
const shiftColumns: Column<ShiftRow>[] = [
  {
    key: 'name',
    header: 'الاسم',
    sortable: true,
    render: (value, row) => (
      <div className="flex items-center gap-2">
        {getShiftIcon(String(value))}
        <span className="font-medium text-primary">{String(value)}</span>
      </div>
    ),
  },
  {
    key: 'shift_type',
    header: 'نوع الوردية',
    render: (value) => <Badge variant="outline" className="text-xs font-medium border-0 bg-info/10 text-info">{String(value || '—')}</Badge>,
  },
  {
    key: 'start_time',
    header: 'وقت البداية',
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Sun className="h-3 w-3 text-amber-500 shrink-0" />
        <span className="tabular-nums font-medium" dir="ltr">
          {String(value || '').slice(0, 8) || '—'}
        </span>
      </div>
    ),
  },
  {
    key: 'end_time',
    header: 'وقت النهاية',
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Moon className="h-3 w-3 text-blue-500 shrink-0" />
        <span className="tabular-nums font-medium" dir="ltr">
          {String(value || '').slice(0, 8) || '—'}
        </span>
      </div>
    ),
  },
  {
    key: '__hours',
    header: 'ساعات العمل',
    render: (_, row) => {
      const st = String(row.start_time || '08:00:00').slice(0, 5);
      const en = String(row.end_time || '17:00:00').slice(0, 5);
      return (
        <span className="tabular-nums text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {getShiftHours(st, en)} ساعة
        </span>
      );
    },
  },
  {
    key: 'holiday_list',
    header: 'قائمة العطلات',
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{String(value || '—')}</span>
      </div>
    ),
  },
  {
    key: 'last_sync_of_checkin',
    header: 'آخر مزامنة',
    render: (value) => (
      <span className="text-xs text-muted-foreground">
        {value ? formatDate(String(value)) : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'الحالة',
    render: (value) => <StatusBadge status={String(value || 'Active')} />,
  },
];

/* ────────────────────────────────────────────
   أعمدة الجدول — التعيينات
   ──────────────────────────────────────────── */
const assignColumns: Column<AssignRow>[] = [
  { key: 'name', header: 'الرقم', render: (v) => <span className="text-primary font-medium text-xs">{String(v)}</span> },
  { key: 'employee_name', header: 'الموظف', render: (_, r) => r.employee_name || '—' },
  { key: 'shift_type', header: 'الوردية', render: (v) => <Badge variant="outline" className="text-xs font-medium border-0 bg-info/10 text-info">{String(v || '—')}</Badge> },
  { key: 'start_date', header: 'من', render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span> },
  { key: 'end_date', header: 'إلى', render: (v) => <span className="text-xs">{v ? formatDate(String(v)) : '—'}</span> },
  { key: 'status', header: 'الحالة', render: (v) => <StatusBadge status={String(v || '')} /> },
  { key: 'docstatus', header: 'المستند', render: (v) => <Badge variant="outline" className="text-xs font-medium border-0 bg-muted text-muted-foreground">{Number(v) === 1 ? 'مُرحّل' : 'مسودة'}</Badge> },
];

/* ────────────────────────────────────────────
   بيانات النماذج الافتراضية
   ──────────────────────────────────────────── */
const emptyShiftForm = { name: '', shift_type: '', start_time: '08:00', end_time: '16:00', holiday_list: '' };
const emptyAssignForm = { employee: '', shift_type: '', start_date: '', end_date: '', status: 'Active' };

/* ────────────────────────────────────────────
   الصفحة الرئيسية
   ──────────────────────────────────────────── */
export default function ShiftsPage() {
  /* ── الحالة ── */
  const [tab, setTab] = useState('types');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<ShiftRow | null>(null);
  const [deleteAssign, setDeleteAssign] = useState<AssignRow | null>(null);
  const [formData, setFormData] = useState({ ...emptyShiftForm });
  const [assignForm, setAssignForm] = useState({ ...emptyAssignForm });
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);
  const [editingAssign, setEditingAssign] = useState<AssignRow | null>(null);
  const [shiftTypeFilter, setShiftTypeFilter] = useState('all');
  const [shiftStatusFilter, setShiftStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { company, isLoading: coLoading } = useDefaultCompanyName();

  /* ── جلب البيانات ── */
  const { data, isLoading, isError, error, refetch } = useDocList<ShiftRow>('Shift Type', {
    fields: ['name', 'shift_type', 'start_time', 'end_time', 'holiday_list', 'last_sync_of_checkin', 'status'],
    limit: 200,
  });
  const { data: assigns, isLoading: al, isError: ae, error: aerr, refetch: ar } = useDocList<AssignRow>('Shift Assignment', {
    fields: ['name', 'employee_name', 'shift_type', 'start_date', 'end_date', 'status', 'docstatus'],
    limit: 300,
    order_by: 'start_date desc',
  });

  const createMutation = useCreateDoc('Shift Type');
  const updateMutation = useUpdateDoc('Shift Type');
  const deleteMutation = useDeleteDoc('Shift Type');
  const createAssign = useCreateDoc('Shift Assignment');
  const updateAssign = useUpdateDoc('Shift Assignment');
  const deleteAssignMut = useDeleteDoc('Shift Assignment');

  const shifts = data || [];

  /* ── اشتقاقات ── */
  const shiftTypes = useMemo(() => {
    const s = new Set<string>();
    shifts.forEach((r) => { if (r.shift_type) s.add(String(r.shift_type)); });
    return Array.from(s).sort();
  }, [shifts]);

  const avgHours = shifts.length > 0
    ? (shifts.reduce((s, r) => {
        const st = String(r.start_time || '08:00:00').slice(0, 5);
        const en = String(r.end_time || '17:00:00').slice(0, 5);
        return s + Number(getShiftHours(st, en));
      }, 0) / shifts.length).toFixed(1)
    : '0';

  const totalShifts = shifts.length;
  const activeShifts = shifts.filter((s) => s.status !== 'Inactive').length;
  const defaultCount = shifts.filter((s) => s.name?.includes('Default') || s.name?.includes('افتراضي')).length;

  /* ── فلاتر الورديات ── */
  let filteredShifts = shifts;
  if (shiftTypeFilter !== 'all') filteredShifts = filteredShifts.filter((s) => s.shift_type === shiftTypeFilter);
  if (shiftStatusFilter !== 'all') filteredShifts = filteredShifts.filter((s) => s.status === shiftStatusFilter);

  const hasActiveFilters = shiftTypeFilter !== 'all' || shiftStatusFilter !== 'all';
  const clearFilters = () => { setShiftTypeFilter('all'); setShiftStatusFilter('all'); };

  /* ── فتح حوار الوردية ── */
  const openShiftDialog = (row?: ShiftRow) => {
    if (row) {
      setEditingShift(row);
      setFormData({
        name: row.name,
        shift_type: row.shift_type || '',
        start_time: String(row.start_time || '08:00').slice(0, 5),
        end_time: String(row.end_time || '16:00').slice(0, 5),
        holiday_list: row.holiday_list || '',
      });
    } else {
      setEditingShift(null);
      setFormData({ ...emptyShiftForm });
    }
    setDialogOpen(true);
  };

  /* ── فتح حوار التعيين ── */
  const openAssignDialog = (row?: AssignRow) => {
    if (row) {
      setEditingAssign(row);
      setAssignForm({ employee: '', shift_type: row.shift_type || '', start_date: row.start_date || '', end_date: row.end_date || '', status: row.status || 'Active' });
    } else {
      setEditingAssign(null);
      setAssignForm({ ...emptyAssignForm });
    }
    setAssignDialog(true);
  };

  /* ── حفظ نوع الوردية ── */
  const handleSaveShift = () => {
    if (editingShift) {
      updateMutation.mutate(
        { name: editingShift.name, doc: { start_time: formData.start_time, end_time: formData.end_time, holiday_list: formData.holiday_list || undefined } },
        {
          onSuccess: () => { toast.success('تم تعديل نوع الوردية بنجاح'); setDialogOpen(false); setEditingShift(null); setFormData({ ...emptyShiftForm }); },
          onError: () => toast.error('تعذر تعديل نوع الوردية'),
        }
      );
    } else {
      if (!formData.name.trim()) { toast.error('اسم الوردية مطلوب'); return; }
      const mapped = buildShiftTypeCreate({ name: formData.name, start_time: formData.start_time, end_time: formData.end_time });
      createMutation.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => { toast.success('تم إضافة نوع الوردية بنجاح'); setDialogOpen(false); setFormData({ ...emptyShiftForm }); },
        onError: () => toast.error('تعذر إنشاء نوع الوردية'),
      });
    }
  };

  /* ── حفظ التعيين ── */
  const handleSaveAssign = () => {
    if (editingAssign) {
      updateAssign.mutate(
        { name: editingAssign.name, doc: { shift_type: assignForm.shift_type, start_date: assignForm.start_date, end_date: assignForm.end_date || undefined, status: assignForm.status } },
        {
          onSuccess: () => { toast.success('تم تعديل التعيين بنجاح'); setAssignDialog(false); setEditingAssign(null); setAssignForm({ ...emptyAssignForm }); },
          onError: () => toast.error('تعذر تعديل التعيين'),
        }
      );
    } else {
      if (!assignForm.employee || !assignForm.shift_type || !assignForm.start_date) {
        toast.error('الموظف ونوع الوردية وتاريخ البدء مطلوبة');
        return;
      }
      if (!company) { toast.error('الشركة غير معروفة'); return; }
      const mapped = buildShiftAssignmentCreate({
        employee: assignForm.employee,
        company,
        shift_type: assignForm.shift_type,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || undefined,
        status: assignForm.status,
      });
      createAssign.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => { toast.success('تم تعيين الوردية بنجاح'); setAssignDialog(false); setAssignForm({ ...emptyAssignForm }); },
        onError: () => toast.error('تعذر تعيين الوردية'),
      });
    }
  };

  const handleShiftDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) { setEditingShift(null); setFormData({ ...emptyShiftForm }); }
  };

  const handleAssignDialogClose = (open: boolean) => {
    setAssignDialog(open);
    if (!open) { setEditingAssign(null); setAssignForm({ ...emptyAssignForm }); }
  };

  /* ──────────────────────────────────────────
     واجهة المستخدم
     ────────────────────────────────────────── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الورديات"
        description="إدارة أنواع الورديات، ساعات العمل وتعيينات الموظفين"
        iconify="solar:clock-circle-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الورديات' }]}
      />
      {/* ═══ التبويبات ═══ */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="types">أنواع الوردية</TabsTrigger>
            <TabsTrigger value="assign">تعيينات</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {tab === 'types' && (
              <Button size="sm" className="gap-1.5" onClick={() => openShiftDialog()}>
                <Plus className="h-3.5 w-3.5" />
                نوع وردية
              </Button>
            )}
            {tab === 'assign' && (
              <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => openAssignDialog()}>
                <Plus className="h-3.5 w-3.5" />
                تعيين وردية
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => tab === 'types' ? refetch() : ar()}>
              <RefreshCw className="h-3 w-3" />
              تحديث
            </Button>
          </div>
        </div>

        {/* ═══ تبويب أنواع الوردية ═══ */}
        <TabsContent value="types" className="space-y-4 mt-4">
          <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

          {/* فلاتر */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                  <Filter className="h-3 w-3" /> فلاتر
                  <ChevronDown className={cn('h-3 w-3 transition-transform', filtersOpen && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                  <X className="h-3 w-3" /> مسح
                </Button>
              )}
            </div>
            <CollapsibleContent>
              <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
                <div className="space-y-1">
                  <Label className="text-xs">نوع الوردية</Label>
                  <Select value={shiftTypeFilter} onValueChange={setShiftTypeFilter}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {shiftTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الحالة</Label>
                  <Select value={shiftStatusFilter} onValueChange={setShiftStatusFilter}>
                    <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="Active">نشط</SelectItem>
                      <SelectItem value="Inactive">غير نشط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DataTable
            data={filteredShifts}
            columns={shiftColumns}
            searchable
            loading={isLoading}
            tableId="hr-shift-types"
            exportFileName="أنواع_الورديات"
            onEdit={(row) => openShiftDialog(row)}
            onDelete={(row) => setDeleteDialog(row)}
          />
        </TabsContent>

        {/* ═══ تبويب التعيينات ═══ */}
        <TabsContent value="assign" className="space-y-4 mt-4">
          <ListQueryAlert error={ae ? aerr : null} onRetry={() => ar()} />

          <DataTable
            data={assigns || []}
            columns={assignColumns}
            searchable
            loading={al}
            tableId="hr-shift-assignments"
            exportFileName="تعيينات_الورديات"
            onEdit={(row) => {
              if (Number((row as AssignRow).docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
              openAssignDialog(row);
            }}
            onDelete={(row) => setDeleteAssign(row)}
          />
        </TabsContent>
      </Tabs>

      {/* ═══ حوار إنشاء/تعديل نوع الوردية ═══ */}
      <Dialog open={dialogOpen} onOpenChange={handleShiftDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              {editingShift ? `تعديل نوع الوردية — ${editingShift.name}` : 'إضافة نوع وردية جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                الاسم <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="اسم نوع الوردية"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                disabled={!!editingShift}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">وقت البداية</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={formData.start_time}
                  onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">وقت النهاية</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={formData.end_time}
                  onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>

            {/* معاينة ساعات العمل */}
            {formData.start_time && formData.end_time && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground">مدة العمل:</span>
                <span className="text-sm font-bold text-primary">
                  {getShiftHours(formData.start_time, formData.end_time)} ساعة
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">قائمة العطلات</Label>
              <ErpLinkCombobox
                doctype="Holiday List"
                value={formData.holiday_list}
                onChange={(v) => setFormData((p) => ({ ...p, holiday_list: v }))}
                placeholder="اختر قائمة العطلات..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border/30">
              <Button
                className="flex-1"
                onClick={handleSaveShift}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'جاري الحفظ...' : editingShift ? 'تحديث الوردية' : 'حفظ الوردية'}
              </Button>
              <Button variant="ghost" onClick={() => handleShiftDialogClose(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار إنشاء/تعديل التعيين ═══ */}
      <Dialog open={assignDialog} onOpenChange={handleAssignDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-success" />
              {editingAssign ? `تعديل تعيين الوردية — ${editingAssign.name}` : 'تعيين وردية لموظف'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">الموظف</Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={assignForm.employee}
                onChange={(v) => setAssignForm((p) => ({ ...p, employee: v }))}
                displayKey="employee_name"
                disabled={!!editingAssign}
                placeholder="اختر الموظف..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع الوردية</Label>
              <ErpLinkCombobox
                doctype="Shift Type"
                value={assignForm.shift_type}
                onChange={(v) => setAssignForm((p) => ({ ...p, shift_type: v }))}
                placeholder="اختر نوع الوردية..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">من تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={assignForm.start_date}
                  onChange={(e) => setAssignForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">إلى تاريخ</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={assignForm.end_date}
                  onChange={(e) => setAssignForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">الحالة</Label>
              <Select value={assignForm.status} onValueChange={(v) => setAssignForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">نشط</SelectItem>
                  <SelectItem value="Inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-border/30">
              <Button
                className="flex-1"
                onClick={handleSaveAssign}
                disabled={createAssign.isPending || updateAssign.isPending}
              >
                {(createAssign.isPending || updateAssign.isPending) ? 'جاري الحفظ...' : editingAssign ? 'تحديث التعيين' : 'تعيين الوردية'}
              </Button>
              <Button variant="ghost" onClick={() => handleAssignDialogClose(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ حوار تأكيد حذف نوع الوردية ═══ */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف نوع الوردية</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف نوع الوردية &quot;{deleteDialog?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.name, {
                onSuccess: () => { toast.success('تم حذف نوع الوردية'); setDeleteDialog(null); },
                onError: () => toast.error('حدث خطأ أثناء الحذف'),
              })}
              variant="destructive"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ حوار تأكيد حذف التعيين ═══ */}
      <AlertDialog open={!!deleteAssign} onOpenChange={() => setDeleteAssign(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف التعيين</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف تعيين الوردية &quot;{deleteAssign?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssign && deleteAssignMut.mutate(deleteAssign.name, {
                onSuccess: () => { toast.success('تم حذف التعيين'); setDeleteAssign(null); },
                onError: () => toast.error('حدث خطأ أثناء الحذف'),
              })}
              variant="destructive"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
