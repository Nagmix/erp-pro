'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { buildLeaveTypeCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';
import {
  Plus,
  Filter,
  ChevronDown,
  X,
  Trash2,
  Edit,
  TreePalm,
  DollarSign,
  CalendarCheck,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────────── Types ───────────── */
type LeaveTypeRow = {
  name: string;
  leave_type_name?: string;
  is_lwp?: number | boolean;
  is_compensatory?: number | boolean;
  is_carry_forward?: number | boolean;
  max_leaves_allowed?: number;
  max_leaves?: number;
  allow_encashment?: number | boolean;
  is_earned_leave?: number | boolean;
  include_holiday?: number | boolean;
};

interface LeaveTypeFormState {
  leave_type_name: string;
  is_lwp: boolean;
  is_compensatory: boolean;
  is_carry_forward: boolean;
  max_leaves_allowed: string;
  allow_encashment: boolean;
  is_earned_leave: boolean;
}

const initialForm: LeaveTypeFormState = {
  leave_type_name: '',
  is_lwp: false,
  is_compensatory: false,
  is_carry_forward: false,
  max_leaves_allowed: '0',
  allow_encashment: false,
  is_earned_leave: false,
};

/* ───────────── Badge Helpers ───────────── */
function BoolBadge({ value, yesLabel = 'نعم', noLabel = 'لا' }: { value: boolean | number | unknown; yesLabel?: string; noLabel?: string }) {
  const isYes = Number(value) === 1 || value === true;
  return isYes ? (
    <Badge className="text-[10px] px-1.5 py-0 h-5 bg-success/12 text-success ring-1 ring-inset ring-success/25 border-0 hover:bg-success/20">
      {yesLabel}
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 border-0">
      {noLabel}
    </Badge>
  );
}

/* ───────────── Page ───────────── */
export default function LeaveTypesPage() {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<LeaveTypeRow>('Leave Type', {
    fields: [
      'name',
      'leave_type_name',
      'is_lwp',
      'is_compensatory',
      'is_carry_forward',
      'max_leaves_allowed',
      'max_leaves',
      'allow_encashment',
      'is_earned_leave',
      'include_holiday',
    ],
    limit: 200,
  });

  const createMut = useCreateDoc('Leave Type');
  const updateMut = useUpdateDoc('Leave Type');
  const deleteMut = useDeleteDoc('Leave Type');

  /* ── Filters ── */
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* ── Dialog ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LeaveTypeRow | null>(null);
  const [formData, setFormData] = useState<LeaveTypeFormState>({ ...initialForm });

  /* ── Delete Dialog ── */
  const [deleteDialog, setDeleteDialog] = useState<LeaveTypeRow | null>(null);

  /* ── KPIs ── */
  const leaveTypes = data || [];
  const totalCount = leaveTypes.length;
  const paidCount = leaveTypes.filter((l) => !Number(l.is_lwp)).length;
  const unpaidCount = leaveTypes.filter((l) => Number(l.is_lwp) === 1 || l.is_lwp === true).length;
  const compOffCount = leaveTypes.filter(
    (l) => Number(l.is_compensatory) === 1 || l.is_compensatory === true
  ).length;

  /* ── Filtered Data ── */
  const filtered = useMemo(() => {
    return leaveTypes.filter((row) => {
      if (search) {
        const s = search.toLowerCase();
        const hit =
          String(row.name).toLowerCase().includes(s) ||
          String(row.leave_type_name || '').toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (typeFilter !== 'all') {
        if (typeFilter === 'paid' && Number(row.is_lwp)) return false;
        if (typeFilter === 'unpaid' && !(Number(row.is_lwp) === 1 || row.is_lwp === true)) return false;
        if (typeFilter === 'comp' && !(Number(row.is_compensatory) === 1 || row.is_compensatory === true)) return false;
      }
      return true;
    });
  }, [leaveTypes, search, typeFilter]);

  const hasActiveFilters = typeFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
  };

  /* ── Dialog Handlers ── */
  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({ ...initialForm });
    setDialogOpen(true);
  };

  const openEditDialog = (row: LeaveTypeRow) => {
    setEditingDoc(row);
    setFormData({
      leave_type_name: row.leave_type_name || row.name || '',
      is_lwp: Number(row.is_lwp) === 1 || row.is_lwp === true,
      is_compensatory: Number(row.is_compensatory) === 1 || row.is_compensatory === true,
      is_carry_forward: Number(row.is_carry_forward) === 1 || row.is_carry_forward === true,
      max_leaves_allowed: String(row.max_leaves_allowed ?? row.max_leaves ?? 0),
      allow_encashment: Number(row.allow_encashment) === 1 || row.allow_encashment === true,
      is_earned_leave: Number(row.is_earned_leave) === 1 || row.is_earned_leave === true,
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
    if (!formData.leave_type_name.trim()) {
      toast.error('يرجى إدخال اسم نوع الإجازة');
      return;
    }

    if (editingDoc) {
      updateMut.mutate(
        {
          name: editingDoc.name,
          doc: {
            leave_type_name: formData.leave_type_name.trim(),
            is_lwp: formData.is_lwp ? 1 : 0,
            is_compensatory: formData.is_compensatory ? 1 : 0,
            is_carry_forward: formData.is_carry_forward ? 1 : 0,
            max_leaves_allowed: Number(formData.max_leaves_allowed) || 0,
            allow_encashment: formData.allow_encashment ? 1 : 0,
            is_earned_leave: formData.is_earned_leave ? 1 : 0,
          },
        },
        {
          onSuccess: () => {
            toast.success('تم تعديل نوع الإجازة');
            setDialogOpen(false);
            setEditingDoc(null);
          },
          onError: () => toast.error('فشل التعديل'),
        }
      );
    } else {
      createMut.mutate(
        prepareFrappeDocForCreate(
          buildLeaveTypeCreate({
            leave_type_name: formData.leave_type_name,
            max_leaves_allowed: Number(formData.max_leaves_allowed) || 0,
            is_carry_forward: formData.is_carry_forward,
            is_lwp: formData.is_lwp,
            include_holiday: false,
          })
        ),
        {
          onSuccess: () => {
            toast.success('تم إضافة نوع الإجازة بنجاح');
            setDialogOpen(false);
            setFormData({ ...initialForm });
          },
          onError: () => toast.error('تعذر الحفظ — قد يكون الاسم مكرراً'),
        }
      );
    }
  };

  const handleDelete = async (row: LeaveTypeRow) => {
    try {
      await deleteMut.mutateAsync(row.name);
      toast.success('تم حذف نوع الإجازة بنجاح');
      setDeleteDialog(null);
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء الحذف');
    }
  };

  /* ── Columns ── */
  const columns: Column<LeaveTypeRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'الاسم',
        sortable: true,
        render: (_, row) => (
          <span className="font-medium text-primary">
            {String(row.leave_type_name || row.name)}
          </span>
        ),
      },
      {
        key: 'is_lwp',
        header: 'بدون راتب',
        render: (v) => <BoolBadge value={v} yesLabel="نعم" noLabel="لا" />,
      },
      {
        key: 'is_compensatory',
        header: 'تعويضي',
        render: (v) => <BoolBadge value={v} yesLabel="نعم" noLabel="لا" />,
      },
      {
        key: 'is_carry_forward',
        header: 'ترحيل الرصيد',
        render: (v) => <BoolBadge value={v} yesLabel="نعم" noLabel="لا" />,
      },
      {
        key: 'max_leaves_allowed',
        header: 'الحد الأقصى',
        sortable: true,
        render: (_, row) => {
          const max = Number(row.max_leaves_allowed ?? row.max_leaves ?? 0);
          return (
            <span className="tabular-nums font-semibold text-xs">
              {max} يوم
            </span>
          );
        },
      },
      {
        key: 'allow_encashment',
        header: 'صرف نقدي',
        render: (v) => <BoolBadge value={v} yesLabel="نعم" noLabel="لا" />,
      },
      {
        key: 'is_earned_leave',
        header: 'إجازة مكتسبة',
        render: (v) => <BoolBadge value={v} yesLabel="نعم" noLabel="لا" />,
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
              className="h-7 text-[10px] gap-1"
              onClick={() => openEditDialog(row)}
            >
              <Edit className="h-3 w-3" />
              تعديل
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-destructive"
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

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="أنواع الإجازات"
        description="إدارة أنواع الإجازات المتاحة للموظفين — مدفوعة وبدون راتب وتعويضية"
        iconify="solar:calendar-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'أنواع الإجازات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
            <Plus className="h-3.5 w-3.5" />
            نوع إجازة جديد
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي الأنواع"
          value={totalCount}
          icon={TreePalm}
          accent="primary"
          description="كل أنواع الإجازات"
        />
        <KpiCard
          title="مدفوعة الراتب"
          value={paidCount}
          icon={DollarSign}
          accent="success"
          description="إجازات بدون خصم"
        />
        <KpiCard
          title="بدون راتب"
          value={unpaidCount}
          icon={CalendarCheck}
          accent="warning"
          description="إجازات LWP"
        />
        <KpiCard
          title="تعويضية"
          value={compOffCount}
          icon={RotateCcw}
          accent="info"
          description="إجازات Comp Off"
        />
      </KpiStrip>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="بحث باسم نوع الإجازة..."
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
                <Label className="text-[10px]">النوع</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="paid">مدفوعة الراتب</SelectItem>
                    <SelectItem value="unpaid">بدون راتب (LWP)</SelectItem>
                    <SelectItem value="comp">تعويضية</SelectItem>
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
          tableId="hr-leave-types"
          exportFileName="أنواع_الإجازات"
        />
      </PageShell>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? `تعديل نوع الإجازة — ${editingDoc.name}` : 'إضافة نوع إجازة جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                اسم نوع الإجازة <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="مثال: إجازة سنوية"
                value={formData.leave_type_name}
                onChange={(e) => setFormData((p) => ({ ...p, leave_type_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">الحد الأقصى للأيام</Label>
              <Input
                type="number"
                dir="ltr"
                value={formData.max_leaves_allowed}
                onChange={(e) => setFormData((p) => ({ ...p, max_leaves_allowed: e.target.value }))}
                min={0}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt_is_lwp"
                  checked={formData.is_lwp}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_lwp: !!v }))}
                />
                <Label htmlFor="lt_is_lwp" className="text-xs">
                  بدون راتب (LWP)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt_is_compensatory"
                  checked={formData.is_compensatory}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_compensatory: !!v }))}
                />
                <Label htmlFor="lt_is_compensatory" className="text-xs">
                  تعويضية (Comp Off)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt_is_carry_forward"
                  checked={formData.is_carry_forward}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_carry_forward: !!v }))}
                />
                <Label htmlFor="lt_is_carry_forward" className="text-xs">
                  ترحيل الرصيد
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lt_allow_encashment"
                  checked={formData.allow_encashment}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, allow_encashment: !!v }))}
                />
                <Label htmlFor="lt_allow_encashment" className="text-xs">
                  صرف نقدي (Encashment)
                </Label>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Checkbox
                  id="lt_is_earned_leave"
                  checked={formData.is_earned_leave}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_earned_leave: !!v }))}
                />
                <Label htmlFor="lt_is_earned_leave" className="text-xs">
                  إجازة مكتسبة (Earned Leave)
                </Label>
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
                : 'حفظ'}
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
              هل أنت متأكد من حذف نوع الإجازة{' '}
              {deleteDialog?.leave_type_name || deleteDialog?.name}؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
