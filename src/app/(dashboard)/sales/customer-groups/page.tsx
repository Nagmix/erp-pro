'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Users, RefreshCw, FolderTree, Folder, Filter, ChevronDown, XCircle } from 'lucide-react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { cn } from '@/lib/utils';

interface CustomerGroupRow {
  name: string;
  is_group: number | boolean;
  parent_customer_group?: string;
  lft?: number;
  rgt?: number;
  old_parent?: string;
}

interface CustomerRow {
  name: string;
  customer_group: string;
}

export default function CustomerGroupsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [parentGroup, setParentGroup] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroupRow | null>(null);
  const [editGroup, setEditGroup] = useState<CustomerGroupRow | null>(null);
  const [editParentGroup, setEditParentGroup] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupTypeFilter, setGroupTypeFilter] = useState<'all' | 'root' | 'sub'>('all');

  // ── Data ──
  const { data: groups = [], isLoading, isError, error, refetch } = useDocList<CustomerGroupRow>('Customer Group', {
    fields: ['name', 'is_group', 'parent_customer_group', 'lft', 'rgt', 'old_parent'],
    order_by: 'name asc',
    limit: 500,
  });

  const { data: customers = [] } = useDocList<CustomerRow>('Customer', {
    fields: ['name', 'customer_group'],
    limit: 5000,
  });

  const createMutation = useCreateDoc('Customer Group');
  const deleteMutation = useDeleteDoc('Customer Group');
  const updateMutation = useUpdateDoc('Customer Group');

  // ── Customer count per group ──
  const customerCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of customers) {
      const g = c.customer_group || '__none__';
      map[g] = (map[g] || 0) + 1;
    }
    return map;
  }, [customers]);

  // ── Filtered data ──
  const filtered = useMemo(() => {
    let result = groups;
    if (groupTypeFilter === 'root') result = result.filter((r) => Number(r.is_group) === 1 || r.is_group === true);
    if (groupTypeFilter === 'sub') result = result.filter((r) => Number(r.is_group) === 0 || r.is_group === false);
    return result;
  }, [groups, groupTypeFilter]);

  // ── KPIs ──
  const totalGroups = groups.length;
  const rootGroups = groups.filter((r) => Number(r.is_group) === 1 || r.is_group === true).length;
  const totalCustomers = customers.length;

  const chk = (v: unknown) => Number(v) === 1 || v === true;

  // ── Create Handler ──
  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({ title: 'اسم المجموعة مطلوب', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createMutation.mutateAsync({
        customer_group_name: groupName.trim(),
        parent_customer_group: parentGroup || 'All Customer Groups',
        is_group: isGroup ? 1 : 0,
      });
      setDialogOpen(false);
      setGroupName('');
      setParentGroup('');
      setIsGroup(false);
      toast({ title: 'تم إنشاء مجموعة العملاء بنجاح' });
      void refetch();
    } catch (e) {
      toast({ title: 'تعذر إنشاء المجموعة', description: String((e as Error).message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // ── Update Handler ──
  const handleUpdate = async () => {
    if (!editGroup) return;
    setBusy(true);
    try {
      await updateMutation.mutateAsync({
        name: editGroup.name,
        doc: {
          parent_customer_group: editParentGroup || 'All Customer Groups',
        },
      });
      setEditDialogOpen(false);
      setEditGroup(null);
      toast({ title: 'تم تحديث مجموعة العملاء بنجاح' });
      void refetch();
    } catch (e) {
      toast({ title: 'تعذر تحديث المجموعة', description: String((e as Error).message || e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // ── Delete Handler ──
  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteMutation.mutateAsync(selectedGroup.name);
      toast({ title: 'تم حذف المجموعة بنجاح' });
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      void refetch();
    } catch (e) {
      toast({ title: 'تعذر حذف المجموعة', description: String((e as Error).message || e), variant: 'destructive' });
    }
  };

  const openEditDialog = (row: CustomerGroupRow) => {
    setEditGroup(row);
    setEditParentGroup(row.parent_customer_group || '');
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setGroupTypeFilter('all');
  };
  const hasActiveFilters = groupTypeFilter !== 'all';

  const columns: Column<CustomerGroupRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'اسم المجموعة',
        sortable: true,
        filterable: true,
        render: (v, row) => (
          <div className="flex items-center gap-2">
            {chk(row.is_group) ? (
              <FolderTree className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium">{String(v)}</span>
          </div>
        ),
      },
      {
        key: 'parent_customer_group',
        header: 'المجموعة الأب',
        sortable: true,
        render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'is_group',
        header: 'النوع',
        width: 'w-28',
        render: (v) => (
          <span className={`text-xs px-2 py-0.5 rounded-md ${chk(v) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {chk(v) ? 'رئيسية' : 'فرعية'}
          </span>
        ),
      },
      {
        key: '_customer_count',
        header: 'عدد العملاء',
        width: 'w-28',
        render: (_v, row) => {
          const count = customerCountMap[row.name] || 0;
          return (
            <span className="tabular-nums text-sm">{count}</span>
          );
        },
      },
      {
        key: 'actions',
        header: 'إجراءات',
        width: 'w-28',
        render: (_v, row) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEditDialog(row)}
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => { setSelectedGroup(row); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [customerCountMap],
  );

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="مجموعات العملاء"
        description="إدارة مجموعات العملاء وتصنيفهم — إنشاء وتنظيم المجموعات الرئيسية والفرعية"
        iconify="solar:users-group-two-rounded-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'مجموعات العملاء' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setGroupName('');
                setParentGroup('');
                setIsGroup(false);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              مجموعة جديدة
            </Button>
          </div>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي المجموعات"
          value={totalGroups}
          icon={Users}
          accent="primary"
          description="جميع مجموعات العملاء"
        />
        <KpiCard
          title="المجموعات الرئيسية"
          value={rootGroups}
          icon={FolderTree}
          accent="success"
          description="مجموعات يمكن أن تحتوي فرعية"
        />
        <KpiCard
          title="إجمالي العملاء"
          value={totalCustomers}
          icon={Users}
          accent="info"
          description="جميع العملاء المسجلين"
        />
      </KpiStrip>

      {/* Filters */}
      <div className="space-y-3">
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
                <XCircle className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
                <Label className="text-[10px]">نوع المجموعة</Label>
                <Select
                  value={groupTypeFilter}
                  onValueChange={(v) => setGroupTypeFilter(v as 'all' | 'root' | 'sub')}
                >
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="root">رئيسية فقط</SelectItem>
                    <SelectItem value="sub">فرعية فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Data Table */}
      <DataTable
        data={filtered}
        columns={columns}
        pageSize={15}
        searchable
        loading={isLoading}
        tableId="sales-customer-groups"
        exportFileName="customer-groups.csv"
        printTitle="مجموعات العملاء"
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span>إنشاء مجموعة عملاء</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات مجموعة العملاء الجديدة</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">البيانات الأساسية</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">اسم المجموعة <span className="text-destructive text-xs">*</span></Label>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="مثال: عملاء جملة، عملاء تجزئة" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">المجموعة الأب</Label>
                  <ErpLinkCombobox
                    doctype="Customer Group"
                    value={parentGroup}
                    onChange={setParentGroup}
                    placeholder="All Customer Groups"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isGroup}
                    onChange={(e) => setIsGroup(e.target.checked)}
                    className="rounded"
                    id="isGroupCreate"
                  />
                  <Label htmlFor="isGroupCreate" className="text-sm cursor-pointer">مجموعة رئيسية (يمكن أن تحتوي على مجموعات فرعية)</Label>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={() => void handleCreate()} disabled={busy} className="gap-1.5 min-w-[130px]">
              {busy ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل مجموعة العملاء</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل بيانات مجموعة: {editGroup?.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70">بيانات المجموعة</h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">اسم المجموعة</Label>
                  <Input value={editGroup?.name || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">المجموعة الأب</Label>
                  <ErpLinkCombobox
                    doctype="Customer Group"
                    value={editParentGroup}
                    onChange={setEditParentGroup}
                    placeholder="All Customer Groups"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={() => void handleUpdate()} disabled={busy} className="gap-1.5 min-w-[130px]">
              {busy ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المجموعة &quot;{selectedGroup?.name}&quot;؟
              {customerCountMap[selectedGroup?.name || ''] ? ` تحتوي على ${customerCountMap[selectedGroup?.name || '']} عميل.` : ''}
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
