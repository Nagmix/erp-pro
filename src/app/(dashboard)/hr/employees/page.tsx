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
import {
  Plus,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Building2,
  Filter,
  ChevronDown,
  X,
  Briefcase,
  Phone,
  Calendar,
  Search,
  RefreshCw,
  MapPin,
} from 'lucide-react';
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

/* ────────────────────────────────────────────
   أنواع البيانات
   ──────────────────────────────────────────── */
type EmployeeRow = {
  name: string;
  employee_name?: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  branch?: string;
  company?: string;
  status?: string;
  date_of_joining?: string;
  gender?: string;
  cell_number?: string;
  prefered_email?: string;
};

/* ────────────────────────────────────────────
   أعمدة الجدول
   ──────────────────────────────────────────── */
const columns: Column<EmployeeRow>[] = [
  {
    key: 'name',
    header: 'الرقم',
    sortable: true,
    width: 'w-24',
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: 'employee_name',
    header: 'اسم الموظف',
    sortable: true,
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {(row.first_name || '?').charAt(0)}
            {(row.last_name || '?').charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="font-medium block">
            {row.employee_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim()}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.designation || '—'}
          </span>
        </div>
      </div>
    ),
  },
  {
    key: 'designation',
    header: 'المسمى الوظيفي',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{String(value || '—')}</span>
      </div>
    ),
  },
  {
    key: 'department',
    header: 'القسم',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{String(value || '—')}</span>
      </div>
    ),
  },
  {
    key: 'branch',
    header: 'الفرع',
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{String(value || '—')}</span>
      </div>
    ),
  },
  {
    key: 'company',
    header: 'الشركة',
    render: (value) => <span>{String(value || '—')}</span>,
  },
  {
    key: 'status',
    header: 'الحالة',
    render: (value) => <StatusBadge status={String(value || '')} />,
  },
  {
    key: 'date_of_joining',
    header: 'تاريخ الالتحاق',
    sortable: true,
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{value ? formatDate(String(value)) : '—'}</span>
      </div>
    ),
  },
  {
    key: 'gender',
    header: 'الجنس',
    render: (value) => (
      <span className="text-xs">
        {String(value) === 'Female'
          ? 'أنثى'
          : String(value) === 'Male'
            ? 'ذكر'
            : String(value || '—')}
      </span>
    ),
  },
  {
    key: 'cell_number',
    header: 'الهاتف',
    render: (value) => (
      <div className="flex items-center gap-1.5">
        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-muted-foreground text-xs" dir="ltr">
          {String(value || '—')}
        </span>
      </div>
    ),
  },
];

/* ────────────────────────────────────────────
   بيانات النموذج الافتراضية
   ──────────────────────────────────────────── */
const initialFormData = {
  first_name: '',
  last_name: '',
  department: '',
  designation: '',
  branch: '',
  company: '',
  gender: 'Male',
  date_of_birth: '',
  date_of_joining: '',
  cell_number: '',
  prefered_email: '',
  status: 'Active',
};

/* ────────────────────────────────────────────
   الصفحة الرئيسية
   ──────────────────────────────────────────── */
export default function EmployeesPage() {
  /* ── الحالة ── */
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<EmployeeRow | null>(null);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { company: defaultCompany, isLoading: coLoading } =
    useDefaultCompanyName();

  /* ── جلب البيانات ── */
  const { data, isLoading, isError, error, refetch } =
    useDocList<EmployeeRow>('Employee', {
      fields: [
        'name',
        'employee_name',
        'first_name',
        'last_name',
        'designation',
        'department',
        'branch',
        'company',
        'status',
        'date_of_joining',
        'gender',
        'cell_number',
        'prefered_email',
      ],
      limit: 500,
    });

  const createMutation = useCreateDoc('Employee');
  const deleteMutation = useDeleteDoc('Employee');

  const employees = data || [];

  /* ── اشتقاقات القوائم ── */
  const departments = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.department) s.add(String(e.department));
    });
    return Array.from(s).sort();
  }, [employees]);

  const designations = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      if (e.designation) s.add(String(e.designation));
    });
    return Array.from(s).sort();
  }, [employees]);

  /* ── فلاتر ── */
  let filtered = employees;
  if (statusFilter !== 'all')
    filtered = filtered.filter((e) => e.status === statusFilter);
  if (deptFilter !== 'all')
    filtered = filtered.filter((e) => e.department === deptFilter);
  if (genderFilter !== 'all')
    filtered = filtered.filter((e) => e.gender === genderFilter);

  /* ── مؤشرات الأداء ── */
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const inactiveCount = employees.filter(
    (e) => e.status === 'Inactive' || e.status === 'Left'
  ).length;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newThisMonth = employees.filter((e) =>
    e.date_of_joining?.startsWith(thisMonth)
  ).length;

  const hasActiveFilters =
    statusFilter !== 'all' || deptFilter !== 'all' || genderFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setDeptFilter('all');
    setGenderFilter('all');
    setSearch('');
  };

  /* ── إنشاء موظف ── */
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
      company_email: formData.prefered_email || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      branch: formData.branch || undefined,
    });
    const body = prepareFrappeDocForCreate(mapped);
    createMutation.mutate(body, {
      onSuccess: () => {
        toast.success('تم إضافة الموظف بنجاح');
        setDialogOpen(false);
        setFormData({ ...initialFormData });
      },
      onError: () =>
        toast.error('تعذر إنشاء الموظف، يرجى التحقق من البيانات المدخلة'),
    });
  };

  /* ── حذف موظف ── */
  const handleDelete = (row: EmployeeRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => {
        toast.success('تم حذف الموظف بنجاح');
        setDeleteDialog(null);
      },
      onError: () => toast.error('حدث خطأ أثناء حذف الموظف'),
    });
  };

  /* ──────────────────────────────────────────
     واجهة المستخدم
     ────────────────────────────────────────── */
  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      {/* ═══ رأس الصفحة ═══ */}
      <PageHeader
        title="الموظفين"
        description="إدارة بيانات الموظفين، الأقسام، المسميات الوظيفية، الحالة الوظيفية وروابطها"
        iconify="solar:users-group-rounded-bold-duotone"
        accent="success"
        breadcrumbs={[
          { label: 'الموارد البشرية', href: '/hr' },
          { label: 'الموظفون' },
        ]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled={coLoading}>
                <Plus className="h-3.5 w-3.5" />
                موظف جديد
              </Button>
            </DialogTrigger>
            <DialogContent
              dir="rtl"
              className="max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  إضافة موظف جديد
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/35 p-1">
                  <TabsTrigger value="personal" className="text-xs">
                    بيانات شخصية
                  </TabsTrigger>
                  <TabsTrigger value="job" className="text-xs">
                    بيانات وظيفية
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs">
                    اتصال وفرع
                  </TabsTrigger>
                </TabsList>

                {/* ── تبويب البيانات الشخصية ── */}
                <TabsContent
                  value="personal"
                  className="space-y-4 py-4 outline-none"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        الاسم الأول <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="الاسم الأول"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            first_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        اسم العائلة <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="اسم العائلة"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            last_name: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">الجنس</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, gender: v }))
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">ذكر</SelectItem>
                          <SelectItem value="Female">أنثى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        تاريخ الميلاد
                      </Label>
                      <Input
                        type="date"
                        dir="ltr"
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            date_of_birth: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ── تبويب البيانات الوظيفية ── */}
                <TabsContent
                  value="job"
                  className="space-y-4 py-4 outline-none"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        المسمى الوظيفي
                      </Label>
                      <ErpLinkCombobox
                        doctype="Designation"
                        value={formData.designation}
                        onChange={(v) =>
                          setFormData((prev) => ({
                            ...prev,
                            designation: v,
                          }))
                        }
                        placeholder="اختر المسمى..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">القسم</Label>
                      <ErpLinkCombobox
                        doctype="Department"
                        value={formData.department}
                        onChange={(v) =>
                          setFormData((prev) => ({
                            ...prev,
                            department: v,
                          }))
                        }
                        placeholder="اختر القسم..."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        تاريخ الالتحاق
                      </Label>
                      <Input
                        type="date"
                        dir="ltr"
                        value={formData.date_of_joining}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            date_of_joining: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">الحالة</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, status: v }))
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">نشط</SelectItem>
                          <SelectItem value="Inactive">غير نشط</SelectItem>
                          <SelectItem value="Left">مغادر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ── تبويب الاتصال والفرع ── */}
                <TabsContent
                  value="contact"
                  className="space-y-4 py-4 outline-none"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        البريد الإلكتروني المفضّل
                      </Label>
                      <Input
                        type="email"
                        placeholder="email@company.sa"
                        dir="ltr"
                        value={formData.prefered_email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            prefered_email: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">رقم الهاتف</Label>
                      <Input
                        placeholder="05XXXXXXXX"
                        dir="ltr"
                        value={formData.cell_number}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            cell_number: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">الفرع</Label>
                      <ErpLinkCombobox
                        doctype="Branch"
                        value={formData.branch}
                        onChange={(v) =>
                          setFormData((prev) => ({ ...prev, branch: v }))
                        }
                        placeholder="اختر الفرع..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">الشركة</Label>
                      <ErpLinkCombobox
                        doctype="Company"
                        value={formData.company || defaultCompany || ''}
                        onChange={(v) =>
                          setFormData((prev) => ({ ...prev, company: v }))
                        }
                        placeholder="الشركة..."
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    الشركة الافتراضية: {defaultCompany || '—'}
                  </p>
                </TabsContent>
              </Tabs>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending || coLoading}
              >
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الموظف'}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />
      {/* ═══ شريط البحث والفلاتر ═══ */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الموظف أو الرقم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pe-8"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => void refetch()}
          >
            <RefreshCw className="h-3 w-3" />
            تحديث
          </Button>
        </div>

        {/* فلاتر متقدمة (قابلة للطي) */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    filtersOpen && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              {/* فلتر الحالة */}
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Active">نشط</SelectItem>
                    <SelectItem value="Inactive">غير نشط</SelectItem>
                    <SelectItem value="Left">مغادر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر القسم */}
              <div className="space-y-1">
                <Label className="text-xs">القسم</Label>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأقسام</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر الجنس */}
              <div className="space-y-1">
                <Label className="text-xs">الجنس</Label>
                <Select
                  value={genderFilter}
                  onValueChange={setGenderFilter}
                >
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="Male">ذكر</SelectItem>
                    <SelectItem value="Female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ═══ تبويبات الحالة السريعة ═══ */}
      <div className="flex gap-3 flex-wrap">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-muted/35">
            <TabsTrigger value="all" className="text-xs">
              الكل ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="Active" className="text-xs">
              نشط ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="Inactive" className="text-xs">
              غير نشط
            </TabsTrigger>
            <TabsTrigger value="Left" className="text-xs">
              مغادر
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={deptFilter} onValueChange={setDeptFilter}>
          <TabsList className="bg-muted/35 flex flex-wrap h-auto gap-1 py-1">
            <TabsTrigger value="all" className="text-xs">
              كل الأقسام
            </TabsTrigger>
            {departments.slice(0, 8).map((d) => (
              <TabsTrigger key={d} value={d} className="text-xs max-w-[140px] truncate">
                {d}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ═══ جدول البيانات ═══ */}
      <DataTable
        data={filtered}
        columns={columns}
        searchable
        loading={isLoading}
        tableId="hr-employees"
        exportFileName="الموظفين"
        onDelete={(row) => setDeleteDialog(row)}
      />

      {/* ═══ حوار تأكيد الحذف ═══ */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الموظف{' '}
              {deleteDialog?.employee_name || deleteDialog?.name}؟ لا يمكن التراجع
              عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
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
