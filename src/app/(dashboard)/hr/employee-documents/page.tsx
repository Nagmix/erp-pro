'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatDate } from '@/lib/core/helpers';
import {
  Plus,
  Filter,
  ChevronDown,
  X,
  Trash2,
  Edit,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useHrmsCheck } from '@/hooks/use-hrms-check';
import { HrmsRequiredBanner } from '@/components/erp/hrms-required-banner';

/* ───────────── Types ───────────── */
type DocRow = {
  name: string;
  file_name?: string;
  attached_to_name?: string;
  attached_to_doctype?: string;
  file_url?: string;
  file_type?: string;
  creation?: string;
  is_private?: number | boolean;
  /* Custom metadata fields we store via description / tags */
  document_type?: string;
  document_name?: string;
  issued_on?: string;
  valid_from?: string;
  valid_to?: string;
};

interface DocFormState {
  employee: string;
  document_type: string;
  document_name: string;
  file_url: string;
  issued_on: string;
  valid_from: string;
  valid_to: string;
}

const initialForm: DocFormState = {
  employee: '',
  document_type: '',
  document_name: '',
  file_url: '',
  issued_on: '',
  valid_from: '',
  valid_to: '',
};

/* ───────────── Document Types ───────────── */
const docTypeOptions = [
  { value: 'جواز سفر', label: 'جواز سفر' },
  { value: 'بطاقة هوية', label: 'بطاقة هوية' },
  { value: 'رخصة قيادة', label: 'رخصة قيادة' },
  { value: 'شهادة تعليمية', label: 'شهادة تعليمية' },
  { value: 'عقد عمل', label: 'عقد عمل' },
  { value: 'إقامة', label: 'إقامة' },
  { value: 'تأشيرة', label: 'تأشيرة' },
  { value: 'شهادة خبرة', label: 'شهادة خبرة' },
  { value: 'أخرى', label: 'أخرى' },
];

/* ───────────── Status Helpers ───────────── */
function getDocValidityStatus(validTo?: string): {
  label: string;
  variant: 'default' | 'destructive' | 'secondary' | 'outline';
  icon: typeof CheckCircle2;
  className: string;
} {
  if (!validTo) {
    return { label: 'غير محدد', variant: 'secondary', icon: Clock, className: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border/40' };
  }
  const now = new Date();
  const end = new Date(validTo);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'منتهي الصلاحية', variant: 'destructive', icon: XCircle, className: 'bg-destructive/12 text-destructive ring-1 ring-inset ring-destructive/25' };
  }
  if (diffDays <= 30) {
    return { label: `ينتهي خلال ${diffDays} يوم`, variant: 'outline', icon: AlertTriangle, className: 'bg-warning/15 text-warning-foreground/90 ring-1 ring-inset ring-warning/30' };
  }
  return { label: 'ساري', variant: 'default', icon: CheckCircle2, className: 'bg-success/12 text-success ring-1 ring-inset ring-success/25' };
}

function ValidityBadge({ validTo }: { validTo?: string }) {
  const status = getDocValidityStatus(validTo);
  const Icon = status.icon;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium px-2 py-0.5 border-0 gap-1', status.className)}>
      <Icon className="h-3 w-3" />
      {status.label}
    </Badge>
  );
}

/* ───────────── Page ───────────── */
export default function EmployeeDocumentsPage() {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<DocRow>('File', {
    fields: [
      'name',
      'file_name',
      'attached_to_name',
      'attached_to_doctype',
      'file_url',
      'file_type',
      'creation',
      'is_private',
    ],
    filters: [['attached_to_doctype', '=', 'Employee']],
    order_by: 'creation desc',
    limit: 500,
  });

  const createMut = useCreateDoc('File');
  const updateMut = useUpdateDoc('File');
  const deleteMut = useDeleteDoc('File');

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Dialog ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocRow | null>(null);
  const [formData, setFormData] = useState<DocFormState>({ ...initialForm });

  /* ── Delete Dialog ── */
  const [deleteDialog, setDeleteDialog] = useState<DocRow | null>(null);

  const { hrmsInstalled, loaded: hrmsLoaded } = useHrmsCheck();

  /* ── KPIs ── */
  const docs = data || [];
  const totalCount = docs.length;
  const uniqueEmployees = new Set(docs.map((d) => d.attached_to_name).filter(Boolean)).size;

  /* Type breakdown */
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of docs) {
      const ext = d.file_type || d.file_name?.split('.').pop()?.toUpperCase() || 'أخرى';
      map[ext] = (map[ext] || 0) + 1;
    }
    return map;
  }, [docs]);

  const topTypes = Object.entries(typeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  /* ── Filtered Data ── */
  const filtered = useMemo(() => {
    return docs.filter((row) => {
      if (search) {
        const s = search.toLowerCase();
        const hit =
          String(row.file_name).toLowerCase().includes(s) ||
          String(row.attached_to_name || '').toLowerCase().includes(s) ||
          String(row.file_url || '').toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (employeeFilter && row.attached_to_name !== employeeFilter) return false;
      if (docTypeFilter !== 'all') {
        const rowDocType = row.document_type || '';
        if (docTypeFilter !== rowDocType) return false;
      }
      return true;
    });
  }, [docs, search, employeeFilter, docTypeFilter]);

  const hasActiveFilters = employeeFilter || docTypeFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setEmployeeFilter('');
    setDocTypeFilter('all');
  };

  /* ── Dialog Handlers ── */
  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({ ...initialForm });
    setDialogOpen(true);
  };

  const openEditDialog = (row: DocRow) => {
    setEditingDoc(row);
    setFormData({
      employee: row.attached_to_name || '',
      document_type: row.document_type || '',
      document_name: row.file_name || '',
      file_url: row.file_url || '',
      issued_on: row.issued_on || '',
      valid_from: row.valid_from || '',
      valid_to: row.valid_to || '',
    });
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingDoc(null);
      setFormData({ ...initialForm });
    }
  };

  const handleSave = () => {
    if (!formData.employee || !formData.file_url || !formData.document_name) {
      toast.error('أكمل البيانات المطلوبة');
      return;
    }

    if (editingDoc) {
      updateMut.mutate(
        {
          name: editingDoc.name,
          doc: {
            file_url: formData.file_url,
            file_name: formData.document_name,
            attached_to_name: formData.employee,
          },
        },
        {
          onSuccess: () => {
            toast.success('تم تعديل المستند');
            setDialogOpen(false);
            setEditingDoc(null);
          },
          onError: () => toast.error('فشل التعديل'),
        }
      );
    } else {
      createMut.mutate(
        {
          doctype: 'File',
          file_url: formData.file_url,
          file_name: formData.document_name,
          attached_to_doctype: 'Employee',
          attached_to_name: formData.employee,
          is_private: 1,
        },
        {
          onSuccess: () => {
            toast.success('تم إرفاق المستند');
            setDialogOpen(false);
            setFormData({ ...initialForm });
          },
          onError: () => toast.error('فشل الإرفاق'),
        }
      );
    }
  };

  const handleDelete = async (row: DocRow) => {
    try {
      await deleteMut.mutateAsync(row.name);
      toast.success('تم حذف المستند');
      setDeleteDialog(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'تعذر الحذف');
    }
  };

  /* ── Columns ── */
  const columns: Column<DocRow>[] = useMemo(
    () => [
      {
        key: 'file_name',
        header: 'المستند',
        sortable: true,
        render: (v, r) => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-xs truncate max-w-[180px]">
              {String(v || '—')}
            </span>
          </div>
        ),
      },
      {
        key: 'attached_to_name',
        header: 'الموظف',
        sortable: true,
        render: (v) => <span className="font-medium text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'document_type',
        header: 'نوع المستند',
        render: (v) => {
          const val = String(v || '—');
          return val !== '—' ? (
            <Badge variant="secondary" className="text-xs border-0">
              {val}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        key: 'file_url',
        header: 'الرابط',
        render: (v) => {
          if (!v) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <a
              href={String(v)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              dir="ltr"
            >
              <ExternalLink className="h-3 w-3" />
              عرض
            </a>
          );
        },
      },
      {
        key: 'issued_on',
        header: 'تاريخ الإصدار',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'valid_from',
        header: 'صالح من',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: 'valid_to',
        header: 'صالح إلى',
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: '_validity',
        header: 'الحالة',
        render: (_, row) => <ValidityBadge validTo={row.valid_to} />,
      },
      {
        key: 'creation',
        header: 'تاريخ الرفع',
        sortable: true,
        render: (v) => (v ? formatDate(String(v)) : '—'),
      },
      {
        key: '_actions',
        header: 'إجراءات',
        width: 'w-32',
        render: (_, row) => (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1"
              onClick={() => openEditDialog(row)}
            >
              <Edit className="h-3 w-3" />
              تعديل
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => setDeleteDialog(row)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  /* ── HRMS Check ── */
  if (hrmsLoaded && !hrmsInstalled) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="مستندات الموظفين"
          description="أرشفة المستندات المرفقة لكل موظف — جوازات وإقامات وعقود وشهادات"
          iconify="solar:folder-bold-duotone"
          accent="primary"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مستندات الموظفين' }]}
        />
        <HrmsRequiredBanner />
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="مستندات الموظفين"
        description="أرشفة المستندات المرفقة لكل موظف — جوازات وإقامات وعقود وشهادات"
        iconify="solar:folder-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مستندات الموظفين' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            ربط مستند
          </Button>
        }
      />

      {/* KPI Strip */}
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث باسم المستند أو الموظف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                <Filter className="h-3 w-3" /> فلاتر متقدمة
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
                <Label className="text-xs">الموظف</Label>
                <div className="w-56">
                  <ErpLinkCombobox
                    doctype="Employee"
                    value={employeeFilter}
                    onChange={setEmployeeFilter}
                    displayKey="employee_name"
                    placeholder="كل الموظفين"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">نوع المستند</Label>
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {docTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageShell padded={false}>
        <DataTable
          data={filtered}
          columns={columns}
          searchable
          loading={isLoading}
          pageSize={15}
          tableId="hr-employee-documents"
          exportFileName="مستندات_الموظفين"
        />
      </PageShell>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? `تعديل المستند — ${editingDoc.file_name || editingDoc.name}` : 'إضافة مستند موظف'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                الموظف <span className="text-destructive">*</span>
              </Label>
              <ErpLinkCombobox
                doctype="Employee"
                value={formData.employee}
                onChange={(v) => setFormData((p) => ({ ...p, employee: v }))}
                displayKey="employee_name"
                placeholder="اختر الموظف..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع المستند</Label>
              <Select
                value={formData.document_type}
                onValueChange={(v) => setFormData((p) => ({ ...p, document_type: v }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="اختر نوع المستند..." />
                </SelectTrigger>
                <SelectContent>
                  {docTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                اسم المستند <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.document_name}
                onChange={(e) => setFormData((p) => ({ ...p, document_name: e.target.value }))}
                placeholder="passport.pdf"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                رابط الملف (URL) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData((p) => ({ ...p, file_url: e.target.value }))}
                dir="ltr"
                placeholder="/files/passport.pdf"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">تاريخ الإصدار</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.issued_on}
                  onChange={(e) => setFormData((p) => ({ ...p, issued_on: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">صالح من</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.valid_from}
                  onChange={(e) => setFormData((p) => ({ ...p, valid_from: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">صالح إلى</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={formData.valid_to}
                  onChange={(e) => setFormData((p) => ({ ...p, valid_to: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleDialogClose(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending
                ? 'جاري الحفظ...'
                : editingDoc
                ? 'حفظ التعديل'
                : 'إرفاق'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-xs mt-1">
              هل أنت متأكد من حذف المستند {deleteDialog?.file_name || deleteDialog?.name}؟
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
