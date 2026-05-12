'use client';

import { useState, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Plus,
  Trash2,
  Users,
  RefreshCw,
  FolderTree,
  Folder,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  List,
  TreePine,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { cn } from '@/lib/utils';

/* ───────────────────────────── Types & Constants ───────────────────────────── */

interface CustomerGroupRow {
  name: string;
  is_group: number | boolean;
  parent_customer_group?: string;
  lft?: number;
  rgt?: number;
  old_parent?: string;
  disabled?: number | boolean;
}

interface CustomerRow {
  name: string;
  customer_group: string;
}

/* ───────────────────────────── Helpers ───────────────────────────── */

const chk = (v: unknown) => Number(v) === 1 || v === true;

/* ───────────────────────────── Main Page ───────────────────────────── */

export default function CustomerGroupsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [parentGroup, setParentGroup] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroupRow | null>(null);
  const [editGroup, setEditGroup] = useState<CustomerGroupRow | null>(null);
  const [editParentGroup, setEditParentGroup] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupTypeFilter, setGroupTypeFilter] = useState<'all' | 'root' | 'sub'>('all');
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  /* ── Data ── */
  const { data: groups = [], isLoading, isError, error, refetch } = useDocList<CustomerGroupRow>('Customer Group', {
    fields: ['name', 'is_group', 'parent_customer_group', 'lft', 'rgt', 'old_parent', 'disabled'],
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

  /* ── Customer count per group ── */
  const customerCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of customers) {
      const g = c.customer_group || '__none__';
      map[g] = (map[g] || 0) + 1;
    }
    return map;
  }, [customers]);

  /* ── Unique parent groups for filter ── */
  const parentGroupOptions = useMemo(() => {
    const parents = new Set<string>();
    for (const g of groups) {
      if (g.parent_customer_group) parents.add(g.parent_customer_group);
    }
    return [...parents].sort();
  }, [groups]);

  /* ── Filtered data ── */
  const filtered = useMemo(() => {
    let result = groups;
    if (groupTypeFilter === 'root') result = result.filter((r) => chk(r.is_group));
    if (groupTypeFilter === 'sub') result = result.filter((r) => !chk(r.is_group));
    if (parentFilter !== 'all') result = result.filter((r) => r.parent_customer_group === parentFilter);
    return result;
  }, [groups, groupTypeFilter, parentFilter]);

  /* ── KPIs ── */
  const totalGroups = groups.length;
  const rootGroups = groups.filter((r) => chk(r.is_group)).length;
  const subGroups = groups.filter((r) => !chk(r.is_group)).length;
  const totalCustomers = customers.length;
  const disabledGroups = groups.filter((r) => chk(r.disabled)).length;

  /* ── Tree structure ── */
  const treeData = useMemo(() => {
    const groupMap = new Map<string, CustomerGroupRow & { children: (CustomerGroupRow & { children: unknown[] })[] }>();
    const roots: (CustomerGroupRow & { children: (CustomerGroupRow & { children: unknown[] })[] })[] = [];

    for (const g of groups) {
      groupMap.set(g.name, { ...g, children: [] });
    }

    for (const g of groups) {
      const node = groupMap.get(g.name)!;
      if (g.parent_customer_group && groupMap.has(g.parent_customer_group)) {
        groupMap.get(g.parent_customer_group)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }, [groups]);

  /* ── Render tree node ── */
  const renderTreeNode = (
    node: CustomerGroupRow & { children: (CustomerGroupRow & { children: unknown[] })[] },
    depth: number = 0,
  ): React.ReactNode => {
    const count = customerCountMap[node.name] || 0;
    const isOpen = chk(node.is_group);
    return (
      <div key={node.name}>
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-primary/5 border border-transparent',
            depth === 0 && 'font-semibold',
          )}
          style={{ paddingInlineStart: `${depth * 24 + 12}px` }}
        >
          {/* Expand indicator */}
          {isOpen && node.children.length > 0 ? (
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
          ) : isOpen ? (
            <FolderTree className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          <span className="flex-1 text-sm truncate">{node.name}</span>

          {isOpen && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
              رئيسية
            </Badge>
          )}

          {chk(node.disabled) && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/10 text-muted-foreground border-muted/30">
              معطّلة
            </Badge>
          )}

          <Badge variant="outline" className={cn(
            'text-[9px] px-1.5 py-0',
            count > 0 ? 'bg-success/5 text-success border-success/20' : 'bg-muted/10 text-muted-foreground border-muted/30',
          )}>
            {count} عميل
          </Badge>

          {node.parent_customer_group && (
            <span className="text-xs text-muted-foreground">
              ← {node.parent_customer_group}
            </span>
          )}

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEditDialog(node)}
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={() => { setSelectedGroup(node); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {(node.children as (CustomerGroupRow & { children: unknown[] })[]).map((child) => renderTreeNode(child as CustomerGroupRow & { children: (CustomerGroupRow & { children: unknown[] })[] }, depth + 1))}
      </div>
    );
  };

  /* ── Create Handler ── */
  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }
    setBusy(true);
    try {
      await createMutation.mutateAsync({
        customer_group_name: groupName.trim(),
        parent_customer_group: parentGroup || 'All Customer Groups',
        is_group: isGroup ? 1 : 0,
        disabled: isDisabled ? 1 : 0,
      });
      setDialogOpen(false);
      setGroupName('');
      setParentGroup('');
      setIsGroup(false);
      setIsDisabled(false);
      toast.success('تم إنشاء مجموعة العملاء بنجاح');
      void refetch();
    } catch (e) {
      toast.error('تعذر إنشاء المجموعة', { description: String((e as Error).message || e) });
    } finally {
      setBusy(false);
    }
  };

  /* ── Update Handler ── */
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
      toast.success('تم تحديث مجموعة العملاء بنجاح');
      void refetch();
    } catch (e) {
      toast.error('تعذر تحديث المجموعة', { description: String((e as Error).message || e) });
    } finally {
      setBusy(false);
    }
  };

  /* ── Delete Handler ── */
  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteMutation.mutateAsync(selectedGroup.name);
      toast.success('تم حذف المجموعة بنجاح');
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      void refetch();
    } catch (e) {
      toast.error('تعذر حذف المجموعة', { description: String((e as Error).message || e) });
    }
  };

  const openEditDialog = (row: CustomerGroupRow) => {
    setEditGroup(row);
    setEditParentGroup(row.parent_customer_group || '');
    setEditDialogOpen(true);
  };

  const clearFilters = () => {
    setGroupTypeFilter('all');
    setParentFilter('all');
  };

  const hasActiveFilters = groupTypeFilter !== 'all' || parentFilter !== 'all';

  /* ── Table Columns ── */
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
            {chk(row.disabled) && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted/10 text-muted-foreground border-muted/30">
                معطّلة
              </Badge>
            )}
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
          <span className={cn('text-xs px-2 py-0.5 rounded-md', chk(v) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
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
            <span className={cn('tabular-nums text-sm', count > 0 ? 'text-success font-medium' : 'text-muted-foreground')}>
              {count}
            </span>
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
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              تحديث
            </Button>
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                className="h-8 px-2.5 gap-1 text-xs rounded-none"
                onClick={() => setViewMode('table')}
              >
                <List className="h-3.5 w-3.5" />
                جدول
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                className="h-8 px-2.5 gap-1 text-xs rounded-none"
                onClick={() => setViewMode('tree')}
              >
                <TreePine className="h-3.5 w-3.5" />
                شجرة
              </Button>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setGroupName('');
                setParentGroup('');
                setIsGroup(false);
                setIsDisabled(false);
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
                <Label className="text-xs">نوع المجموعة</Label>
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
              <div className="space-y-1">
                <Label className="text-xs">المجموعة الأب</Label>
                <Select
                  value={parentFilter}
                  onValueChange={setParentFilter}
                >
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {parentGroupOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Tree View */}
      {viewMode === 'tree' && (
        <PageShell>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {treeData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لا توجد مجموعات لعرضها
              </div>
            ) : (
              treeData.map((node) => renderTreeNode(node))
            )}
          </div>
        </PageShell>
      )}

      {/* Data Table */}
      {viewMode === 'table' && (
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
      )}

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
                  <Label className="text-sm font-medium">اسم المجموعة <span className="text-destructive text-xs">*</span></Label>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="مثال: عملاء جملة، عملاء تجزئة" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">المجموعة الأب</Label>
                  <ErpLinkCombobox
                    doctype="Customer Group"
                    value={parentGroup}
                    onChange={setParentGroup}
                    placeholder="جميع مجموعات العملاء"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-3">
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isDisabled}
                      onChange={(e) => setIsDisabled(e.target.checked)}
                      className="rounded"
                      id="isDisabledCreate"
                    />
                    <Label htmlFor="isDisabledCreate" className="text-sm cursor-pointer text-muted-foreground">معطّلة (لن تظهر في الاختيارات)</Label>
                  </div>
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
                  <Label className="text-sm font-medium">اسم المجموعة</Label>
                  <Input value={editGroup?.name || ''} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">المجموعة الأب</Label>
                  <ErpLinkCombobox
                    doctype="Customer Group"
                    value={editParentGroup}
                    onChange={setEditParentGroup}
                    placeholder="جميع مجموعات العملاء"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>النوع: <strong>{chk(editGroup?.is_group) ? 'رئيسية' : 'فرعية'}</strong></span>
                  <span>العملاء: <strong>{customerCountMap[editGroup?.name || ''] || 0}</strong></span>
                  {chk(editGroup?.disabled) && <Badge variant="outline" className="text-[9px] bg-muted/10 text-muted-foreground border-muted/30">معطّلة</Badge>}
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
            <AlertDialogAction onClick={() => void handleDelete()} variant="destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
