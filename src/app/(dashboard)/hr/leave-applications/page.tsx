'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
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
import { Plus, CheckCircle, Clock, FileX, Calendar, Filter, ChevronDown, X, Undo2, Edit } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc, useSubmitDoc, useUpdateDoc, useCancelDoc } from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { buildLeaveApplicationCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { rowInDateRangeISO } from '@/lib/core/list-date-filter';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

interface LeaveRow {
  name: string;
  employee?: string;
  employee_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  total_leave_days?: number;
  status?: string;
  description?: string;
  docstatus?: number;
}

const columns: Column<LeaveRow>[] = [
  { key: 'name', header: 'الرقم', sortable: true, width: 'w-24', render: (value) => <span className="font-medium text-primary">{String(value)}</span> },
  { key: 'employee_name', header: 'الموظف', sortable: true, render: (_, row) => <span className="font-medium">{row.employee_name || row.employee}</span> },
  { key: 'leave_type', header: 'نوع الإجازة', render: (value) => <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{String(value)}</span> },
  { key: 'from_date', header: 'من', sortable: true, render: (value) => (value ? formatDate(String(value)) : '—') },
  { key: 'to_date', header: 'إلى', render: (value) => (value ? formatDate(String(value)) : '—') },
  { key: 'total_leave_days', header: 'أيام', render: (value) => <span className="tabular-nums font-semibold">{Number(value ?? 0)}</span> },
  { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value || '')} /> },
];

const initialFormData = {
  employee: '',
  leave_type: '',
  from_date: '',
  to_date: '',
  description: '',
  half_day: false,
  half_day_date: ''};

export default function LeaveApplicationsPage() {
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<LeaveRow | null>(null);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [balanceEmployee, setBalanceEmployee] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editDialog, setEditDialog] = useState<LeaveRow | null>(null);
  const [editForm, setEditForm] = useState({ leave_type: '', from_date: '', to_date: '', half_day: false, description: '' });

  const { company } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<LeaveRow>('Leave Application', {
    fields: ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status', 'description', 'docstatus'],
    filters: company ? [['company', '=', company]] : [],
    limit: 400,
    order_by: 'modified desc'});
  const createMutation = useCreateDoc('Leave Application');
  const deleteMutation = useDeleteDoc('Leave Application');
  const submitMut = useSubmitDoc('Leave Application');
  const updateMut = useUpdateDoc('Leave Application');
  const cancelMut = useCancelDoc('Leave Application');
  const balanceQuery = useDocList<{ name: string; employee?: string; leave_type?: string; leaves?: number }>('Leave Ledger Entry', {
    fields: ['name', 'employee', 'leave_type', 'leaves'],
    filters: balanceEmployee ? [['employee', '=', balanceEmployee]] : [],
    limit: 100,
    order_by: 'creation desc'});

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  const leaveApplications = data ?? [];
  const filtered = useMemo(() => {
    let result = leaveApplications;
    // Tab filter (status)
    if (filter !== 'all') result = result.filter((l) => l.status === filter);
    // Search by employee_name and name
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((l) =>
        (l.employee_name || '').toLowerCase().includes(s) ||
        (l.name || '').toLowerCase().includes(s)
      );
    }
    // Date range filter
    result = result.filter((l) => rowInDateRangeISO(l.from_date, dateFrom, dateTo));
    // Status filter from advanced filters
    if (leaveStatusFilter !== 'all') result = result.filter((l) => l.status === leaveStatusFilter);
    return result;
  }, [leaveApplications, filter, search, dateFrom, dateTo, leaveStatusFilter]);

  const draftLeaves = leaveApplications.filter((l) => Number(l.docstatus) === 0);

  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="طلبات الإجازة"
          description="إدارة طلبات الإجازة ومتابعة الموافقات وحالة الطلب وأرصدة الموظفين"
          iconify="solar:calendar-bold-duotone"
          accent="info"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'طلبات الإجازة' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  const calculateDays = () => {
    if (formData.from_date && formData.to_date) {
      const start = new Date(formData.from_date);
      const end = new Date(formData.to_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 0;
    }
    return 0;
  };

  const handleCreate = () => {
    if (!formData.employee) { toast.error('يرجى اختيار الموظف'); return; }
    if (!formData.leave_type) { toast.error('اختر نوع الإجازة'); return; }
    if (!formData.from_date || !formData.to_date) { toast.error('حدد الفترة'); return; }
    if (formData.from_date > formData.to_date) { toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'); return; }
    const mapped = buildLeaveApplicationCreate({
      employee: formData.employee,
      leave_type: formData.leave_type,
      from_date: formData.from_date,
      to_date: formData.to_date,
      description: formData.description || undefined,
      half_day: formData.half_day,
      half_day_date: formData.half_day ? formData.half_day_date || undefined : undefined});
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم تقديم طلب الإجازة'); setDialogOpen(false); setFormData({ ...initialFormData }); },
      onError: () => toast.error('فشل الإنشاء — تحقق من naming_series والرصيد')});
  };

  const handleDelete = (row: LeaveRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => { toast.success('تم حذف الطلب'); setDeleteDialog(null); },
      onError: () => toast.error('الحذف للمسودات فقط غالباً')});
  };

  const handleSubmitForApproval = (row: LeaveRow) => {
    if (Number(row.docstatus) !== 0) {
      toast.message('الطلب ليس بمسودة');
      return;
    }
    submitMut.mutate(row.name, {
      onSuccess: () => toast.success('تم الترحيل'),
      onError: () => toast.error('فشل الترحيل')});
  };

  const clearFilters = () => { setSearch(''); setLeaveStatusFilter('all'); };

  const openEditLeaveDialog = (row: LeaveRow) => {
    setEditDialog(row);
    setEditForm({
      leave_type: row.leave_type || '',
      from_date: row.from_date || '',
      to_date: row.to_date || '',
      half_day: false,
      description: row.description || '',
    });
  };

  const handleEditLeaveSave = () => {
    if (!editDialog) return;
    if (Number(editDialog.docstatus) !== 0) {
      toast.error('لا يمكن تعديل طلب غير مسودة');
      return;
    }
    if (!editForm.leave_type) { toast.error('اختر نوع الإجازة'); return; }
    if (!editForm.from_date || !editForm.to_date) { toast.error('حدد الفترة'); return; }
    if (editForm.from_date > editForm.to_date) { toast.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية'); return; }
    updateMut.mutate(
      {
        name: editDialog.name,
        doc: {
          leave_type: editForm.leave_type,
          from_date: editForm.from_date,
          to_date: editForm.to_date,
          half_day: editForm.half_day ? 1 : 0,
          description: editForm.description || undefined,
        },
      },
      {
        onSuccess: () => { toast.success('تم تعديل طلب الإجازة'); setEditDialog(null); void refetch(); },
        onError: () => toast.error('فشل التعديل'),
      }
    );
  };


  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="طلبات الإجازة"
        description="إدارة طلبات الإجازة ومتابعة الموافقات وحالة الطلب وأرصدة الموظفين"
        iconify="solar:calendar-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'طلبات الإجازة' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
طلب إجازة جديد
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span>تقديم طلب إجازة</span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الإجازة المطلوبة</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5"><Label className="text-sm font-medium">الموظف <span className="text-destructive text-xs">*</span></Label><ErpLinkCombobox doctype="Employee" value={formData.employee} onChange={(v) => setFormData((p) => ({ ...p, employee: v }))} displayKey="employee_name" className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-sm font-medium">نوع الإجازة <span className="text-destructive text-xs">*</span></Label><ErpLinkCombobox doctype="Leave Type" value={formData.leave_type} onChange={(v) => setFormData((p) => ({ ...p, leave_type: v }))} className="h-9" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm font-medium">من تاريخ</Label><Input type="date" dir="ltr" value={formData.from_date} onChange={(e) => setFormData((p) => ({ ...p, from_date: e.target.value }))} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-sm font-medium">إلى تاريخ</Label><Input type="date" dir="ltr" value={formData.to_date} onChange={(e) => setFormData((p) => ({ ...p, to_date: e.target.value }))} className="h-9" /></div>
              </div>
              {calculateDays() > 0 && <div className="bg-muted/35 rounded-lg p-3 text-sm"><span className="text-muted-foreground">أيام تقريبية: </span><span className="font-bold">{calculateDays()}</span> (يحسبها النظام عند الحفظ)</div>}
              <div className="flex items-center gap-2"><Checkbox id="نصف-يوم" checked={formData.half_day} onCheckedChange={(v) => setFormData((p) => ({ ...p, half_day: v === true }))} /><Label htmlFor="نصف-يوم" className="text-xs">نصف يوم</Label></div>
              {formData.half_day && <div className="space-y-1.5"><Label className="text-sm font-medium">تاريخ نصف اليوم</Label><Input type="date" dir="ltr" value={formData.half_day_date} onChange={(e) => setFormData((p) => ({ ...p, half_day_date: e.target.value }))} className="h-9" /></div>}
              <div className="space-y-1.5"><Label className="text-sm font-medium">السبب</Label><Textarea placeholder="سبب الإجازة..." value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                  {createMutation.isPending ? 'جاري التقديم...' : 'تقديم الطلب'}
                </Button>
              </div>
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
            {(dateFrom || dateTo || leaveStatusFilter !== 'all' || search) && (
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
            <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Open">مفتوح</SelectItem>
                <SelectItem value="Approved">موافق</SelectItem>
                <SelectItem value="Rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-muted/35">
          <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
          <TabsTrigger value="Open" className="text-xs">مفتوح</TabsTrigger>
          <TabsTrigger value="Approved" className="text-xs">موافق</TabsTrigger>
          <TabsTrigger value="Rejected" className="text-xs">مرفوض</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable data={filtered} columns={columns} searchable loading={isLoading} onDelete={(row) => Number(row.docstatus) === 0 && setDeleteDialog(row)} onEdit={(row) => { const l = row as LeaveRow; if (Number(l.docstatus) === 0) { openEditLeaveDialog(l); } else { openEditLeaveDialog(l); } }} />

      <div className="border rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold">رصيد الإجازات (Leave Ledger)</p>
        <ErpLinkCombobox doctype="Employee" value={balanceEmployee} onChange={setBalanceEmployee} displayKey="employee_name" />
        <ListQueryAlert error={balanceQuery.isError ? balanceQuery.error : null} onRetry={() => balanceQuery.refetch()} />
        <div className="text-xs text-muted-foreground max-h-40 overflow-auto space-y-1">
          {(balanceQuery.data || []).slice(0, 20).map((r) => (
            <div key={r.name} className="border rounded-sm px-2 py-1">{r.leave_type || '—'}: {Number(r.leaves || 0)}</div>
          ))}
        </div>
      </div>

      {draftLeaves.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/35 px-4 py-2 text-xs font-semibold">مسودات — ترحيل للموافقة أو رفض</div>
          {draftLeaves.map((leave) => (
            <div key={leave.name} className="px-4 py-3 flex items-center justify-between border-b last:border-b-0">
              <div className="flex-1">
                <span className="font-medium text-sm">{leave.employee_name}</span>
                <span className="text-muted-foreground text-xs me-2">- {leave.leave_type}</span>
                <span className="text-muted-foreground text-xs block">{leave.description}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleSubmitForApproval(leave)} disabled={submitMut.isPending}><CheckCircle className="h-3 w-3" />موافقة (ترحيل)</Button>
                <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => updateMut.mutate({ name: leave.name, doc: { status: 'Rejected' } }, { onSuccess: () => { toast.success('تم الرفض'); void refetch(); }, onError: () => toast.error('تعذر الرفض') })}>رفض</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {leaveApplications.filter((l) => Number(l.docstatus) === 1).length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/35 px-4 py-2 text-xs font-semibold">مُرحّلة — إلغاء</div>
          {leaveApplications.filter((l) => Number(l.docstatus) === 1).map((leave) => (
            <div key={leave.name} className="px-4 py-3 flex items-center justify-between border-b last:border-b-0">
              <div className="flex-1">
                <span className="font-medium text-sm">{leave.employee_name}</span>
                <span className="text-muted-foreground text-xs me-2">- {leave.leave_type}</span>
                <span className="text-muted-foreground text-xs block">{leave.status}</span>
              </div>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => cancelMut.mutate(leave.name, { onSuccess: () => { toast.success('تم إلغاء الطلب'); void refetch(); }, onError: () => toast.error('تعذر الإلغاء') })} disabled={cancelMut.isPending}><Undo2 className="h-3 w-3" />إلغاء</Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>حذف {deleteDialog?.name}؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)} variant="destructive">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Edit Leave Application Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => { if (!open) setEditDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Edit className="h-5 w-5" />
              </div>
              <div>
                <span>{Number(editDialog?.docstatus) === 0 ? 'تعديل طلب الإجازة' : 'عرض طلب الإجازة'}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{editDialog?.name} — {editDialog?.employee_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">نوع الإجازة</Label>
                {Number(editDialog.docstatus) === 0 ? (
                  <ErpLinkCombobox doctype="Leave Type" value={editForm.leave_type} onChange={(v) => setEditForm((p) => ({ ...p, leave_type: v }))} className="h-9" />
                ) : (
                  <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{editDialog.leave_type}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">من تاريخ</Label>
                  {Number(editDialog.docstatus) === 0 ? (
                    <Input type="date" dir="ltr" value={editForm.from_date} onChange={(e) => setEditForm((p) => ({ ...p, from_date: e.target.value }))} className="h-9" />
                  ) : (
                    <span className="text-sm">{editDialog.from_date ? formatDate(String(editDialog.from_date)) : '—'}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">إلى تاريخ</Label>
                  {Number(editDialog.docstatus) === 0 ? (
                    <Input type="date" dir="ltr" value={editForm.to_date} onChange={(e) => setEditForm((p) => ({ ...p, to_date: e.target.value }))} className="h-9" />
                  ) : (
                    <span className="text-sm">{editDialog.to_date ? formatDate(String(editDialog.to_date)) : '—'}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-نصف-يوم" checked={editForm.half_day} onCheckedChange={(v) => setEditForm((p) => ({ ...p, half_day: v === true }))} disabled={Number(editDialog.docstatus) !== 0} />
                <Label htmlFor="edit-نصف-يوم" className="text-xs">نصف يوم</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">السبب</Label>
                {Number(editDialog.docstatus) === 0 ? (
                  <Textarea placeholder="سبب الإجازة..." value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
                ) : (
                  <span className="text-sm text-muted-foreground">{editDialog.description || '—'}</span>
                )}
              </div>
              {Number(editDialog.docstatus) === 0 && (
                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setEditDialog(null)} className="text-muted-foreground">إلغاء</Button>
                  <Button onClick={handleEditLeaveSave} disabled={updateMut.isPending} className="gap-1.5 min-w-[130px]">
                    {updateMut.isPending ? 'جاري الحفظ...' : 'حفظ التعديل'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
