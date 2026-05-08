'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Users, UserCheck, UserX, Building2, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildEmployeeCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type EmployeeRow = {
  name: string;
  employee_name?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  designation?: string;
  company?: string;
  status?: string;
  date_of_joining?: string;
  gender?: string;
  cell_number?: string;
  company_email?: string;
};

const columns: Column<EmployeeRow>[] = [
  { key: 'name', header: 'الرقم', sortable: true, width: 'w-24', render: (value) => <span className="font-medium text-primary">{String(value)}</span> },
  { key: 'employee_name', header: 'اسم الموظف', sortable: true, render: (_, row) => (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{(row.first_name || '?').charAt(0)}{(row.last_name || '?').charAt(0)}</AvatarFallback></Avatar>
      <div>
        <span className="font-medium block">{row.employee_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()}</span>
        <span className="text-[10px] text-muted-foreground">{row.designation || '—'}</span>
      </div>
    </div>
  )},
  { key: 'department', header: 'القسم', render: (value) => String(value || '—') },
  { key: 'gender', header: 'الجنس', render: (value) => <span className="text-xs">{String(value) === 'Female' ? 'أنثى' : String(value) === 'Male' ? 'ذكر' : String(value || '—')}</span> },
  { key: 'date_of_joining', header: 'تاريخ الالتحاق', sortable: true, render: (value) => (value ? formatDate(String(value)) : '—') },
  { key: 'cell_number', header: 'الهاتف', render: (value) => <span className="text-muted-foreground text-[10px]" dir="ltr">{String(value || '—')}</span> },
  { key: 'company_email', header: 'البريد', render: (value) => <span className="text-muted-foreground text-[10px]" dir="ltr">{String(value || '—')}</span> },
  { key: 'status', header: 'الحالة', render: (value) => <StatusBadge status={String(value || '')} /> },
];

const initialFormData = {
  first_name: '',
  last_name: '',
  department: '',
  designation: '',
  gender: 'Male',
  date_of_joining: '',
  company_email: '',
  cell_number: '',
  date_of_birth: '',
  branch: '',
  employment_type: '',
  status: 'Active'};

export default function EmployeesPage() {
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<EmployeeRow | null>(null);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');
  const { company: defaultCompany, isLoading: coLoading } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<EmployeeRow>('Employee', {
    fields: ['name', 'employee_name', 'first_name', 'last_name', 'department', 'designation', 'company', 'status', 'date_of_joining', 'gender', 'cell_number', 'company_email'],
    limit: 500,
  });
  const createMutation = useCreateDoc('Employee');
  const deleteMutation = useDeleteDoc('Employee');

  const employees = data || [];

  const departments = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.department) s.add(String(e.department));
    });
    return Array.from(s).sort();
  }, [employees]);

  let filtered = employees;
  if (deptFilter !== 'all') filtered = filtered.filter((e) => e.department === deptFilter);
  if (statusFilter !== 'all') filtered = filtered.filter((e) => e.status === statusFilter);

  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const leftCount = employees.filter((e) => e.status === 'Left').length;
  const deptCount = departments.length;

  const handleCreate = () => {
    if (!formData.first_name || !formData.last_name) {
      toast.error('يرجى إدخال الاسم الأول واسم العائلة');
      return;
    }
    if (!defaultCompany) {
      toast.error('لم يُعثر على شركة افتراضية');
      return;
    }
    const mapped = buildEmployeeCreate({
      first_name: formData.first_name,
      last_name: formData.last_name,
      company: defaultCompany,
      gender: formData.gender,
      date_of_joining: formData.date_of_joining || undefined,
      status: formData.status,
      department: formData.department || undefined,
      designation: formData.designation || undefined,
      cell_number: formData.cell_number || undefined,
      company_email: formData.company_email || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      branch: formData.branch || undefined,
      employment_type: formData.employment_type || undefined});
    const body = prepareFrappeDocForCreate(mapped);
    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success('تم إضافة الموظف بنجاح');
        setDialogOpen(false);
        setFormData({ ...initialFormData });
      },
      onError: () => toast.error('تعذر إنشاء الموظف، يرجى التحقق من البيانات المدخلة')});
  };

  const handleDelete = (row: EmployeeRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => { toast.success('تم حذف الموظف بنجاح'); setDeleteDialog(null); },
      onError: () => toast.error('حدث خطأ أثناء حذف الموظف')});
  };
  const clearFilters = () => { setStatusFilter('all'); setSearch(''); setEmployeeStatusFilter('all'); };


  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="الموظفين"
        description="إدارة بيانات الموظفين، الأقسام، المسميات الوظيفية، الحالة الوظيفية وروابطها"
        iconify="solar:users-group-rounded-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الموظفون' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled={coLoading}>
                <Plus className="h-3.5 w-3.5" />
موظف جديد
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
                <TabsTrigger value="personal" className="text-xs">شخصي</TabsTrigger>
                <TabsTrigger value="job" className="text-xs">وظيفي</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs">اتصال وفرع</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="space-y-4 py-4 outline-none">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-medium">الاسم الأول <span className="text-destructive">*</span></Label><Input placeholder="الاسم الأول" value={formData.first_name} onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-xs font-medium">اسم العائلة <span className="text-destructive">*</span></Label><Input placeholder="اسم العائلة" value={formData.last_name} onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-medium">الجنس</Label>
                  <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={formData.gender} onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}>
                    <option value="Male">ذكر</option>
                    <option value="Female">أنثى</option>
                  </select>
                </div>
                <div className="space-y-2"><Label className="text-xs font-medium">تاريخ الميلاد</Label><Input type="date" dir="ltr" value={formData.date_of_birth} onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))} /></div>
              </div>
              </TabsContent>
              <TabsContent value="job" className="space-y-4 py-4 outline-none">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-medium">القسم</Label><ErpLinkCombobox doctype="Department" value={formData.department} onChange={(v) => setFormData((prev) => ({ ...prev, department: v }))} placeholder="قسم..." /></div>
                <div className="space-y-2"><Label className="text-xs font-medium">المسمى الوظيفي</Label><ErpLinkCombobox doctype="Designation" value={formData.designation} onChange={(v) => setFormData((prev) => ({ ...prev, designation: v }))} placeholder="مسمى..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-medium">تاريخ الالتحاق</Label><Input type="date" dir="ltr" value={formData.date_of_joining} onChange={(e) => setFormData((prev) => ({ ...prev, date_of_joining: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-xs font-medium">نوع التوظيف</Label>
                  <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={formData.employment_type} onChange={(e) => setFormData((prev) => ({ ...prev, employment_type: e.target.value }))}>
                    <option value="">—</option>
                    <option value="Full-time">دوام كامل</option>
                    <option value="Part-time">دوام جزئي</option>
                    <option value="Intern">تدريب</option>
                    <option value="Contract">عقد</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-xs font-medium">الحالة</Label>
                <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={formData.status} onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}>
                  <option value="Active">نشط</option>
                  <option value="Inactive">غير نشط</option>
                  <option value="Left">مغادر</option>
                </select>
              </div>
              </TabsContent>
              <TabsContent value="contact" className="space-y-4 py-4 outline-none">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-xs font-medium">البريد الإلكتروني</Label><Input type="email" placeholder="email@company.sa" dir="ltr" value={formData.company_email} onChange={(e) => setFormData((prev) => ({ ...prev, company_email: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="text-xs font-medium">رقم الهاتف</Label><Input placeholder="05XXXXXXXX" dir="ltr" value={formData.cell_number} onChange={(e) => setFormData((prev) => ({ ...prev, cell_number: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label className="text-xs font-medium">الفرع</Label><ErpLinkCombobox doctype="Branch" value={formData.branch} onChange={(v) => setFormData((prev) => ({ ...prev, branch: v }))} placeholder="اختياري" /></div>
              <p className="text-[10px] text-muted-foreground">الشركة: {defaultCompany || '—'}</p>
              </TabsContent>
            </Tabs>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending || coLoading}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الموظف'}</Button>
          </DialogContent>
          </Dialog>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث باسم الموظف..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(employeeStatusFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-[10px]">الحالة</Label>
            <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Active">نشط</SelectItem>
                <SelectItem value="Inactive">غير نشط</SelectItem>
                <SelectItem value="Left">مغادر</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-muted/35"><TabsTrigger value="all" className="text-xs">الكل</TabsTrigger><TabsTrigger value="Active" className="text-xs">نشط</TabsTrigger><TabsTrigger value="Inactive" className="text-xs">غير نشط</TabsTrigger><TabsTrigger value="Left" className="text-xs">مغادر</TabsTrigger></TabsList>
        </Tabs>
        <Tabs value={deptFilter} onValueChange={setDeptFilter}>
          <TabsList className="bg-muted/35 flex flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="all" className="text-xs">كل الأقسام</TabsTrigger>
            {departments.slice(0, 12).map((d) => (
              <TabsTrigger key={d} value={d} className="text-xs max-w-[140px] truncate">{d}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <DataTable data={filtered} columns={columns} searchable loading={isLoading} onDelete={(row) => setDeleteDialog(row)} />

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف الموظف {deleteDialog?.employee_name || deleteDialog?.name}؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
