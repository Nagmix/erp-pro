'use client';

import { useState, useMemo, useEffect } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus,
  Trash2,
  Package,
  RefreshCw,
  TreePine,
  Table2,
  Filter,
  ChevronDown,
  X,
  Loader2,
  FolderOpen,
  Tag,
  Layers,
} from 'lucide-react';
import { PageHeader, KpiStrip, PageShell } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';

/* ───────────────────────────── Types ───────────────────────────── */

interface ItemGroupRow {
  name: string;
  is_group: number | boolean;
  parent_item_group?: string;
  disabled?: number | boolean;
}

/* ───────────────────────────── Tree Item ───────────────────────────── */

function ItemGroupTreeItem({
  group,
  allGroups,
  level,
  onDelete,
}: {
  group: ItemGroupRow;
  allGroups: ItemGroupRow[];
  level: number;
  onDelete: (row: ItemGroupRow) => void;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const children = allGroups.filter(g => g.parent_item_group === group.name);
  const hasChildren = children.length > 0;
  const isGroup = Number(group.is_group) === 1 || group.is_group === true;
  const isDisabled = Number(group.disabled) === 1 || group.disabled === true;

  return (
    <div>
      <div
        className="flex items-center gap-2 h-9 px-4 group transition-colors hover:bg-accent/50 border-b border-border/20 text-xs"
        style={{ paddingRight: `${level * 1.25 + 1}rem` }}
      >
        {hasChildren ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CollapsibleTrigger asChild>
                <button className="h-5 w-5 rounded flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
              </CollapsibleTrigger>
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-600/70" />
              <span className="font-medium truncate">{group.name}</span>
              {children.length > 0 && (
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">({children.length})</span>
              )}
            </div>
          </Collapsible>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-5 shrink-0" />
            <Tag className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="truncate">{group.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {isGroup && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-chart-2/10/80 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300">مجموعة</Badge>
          )}
          {isDisabled && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">معطّلة</Badge>
          )}
          <span className="text-muted-foreground text-xs max-w-[140px] truncate">{group.parent_item_group || '—'}</span>
          <button
            onClick={() => onDelete(group)}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {hasChildren && isOpen && (
        <div>
          {children.map(child => (
            <ItemGroupTreeItem
              key={child.name}
              group={child}
              allGroups={allGroups}
              level={level + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Main Page ───────────────────────────── */

export default function ItemGroupsPage() {
  /* ── State ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ItemGroupRow | null>(null);
  const [groupName, setGroupName] = useState('');
  const [parentGroup, setParentGroup] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');

  /* ── Filter state ── */
  const [filterParent, setFilterParent] = useState<string>('all');
  const [filterIsGroup, setFilterIsGroup] = useState<string>('all');
  const [filterDisabled, setFilterDisabled] = useState<string>('all');

  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  /* ── Data ── */
  const { data: rawData = [], isLoading, isError, error, refetch } = useDocList<ItemGroupRow>('Item Group', {
    fields: ['name', 'is_group', 'parent_item_group', 'disabled'],
    order_by: 'name asc',
    limit: 500,
  });

  const createMutation = useCreateDoc('Item Group');
  const deleteMutation = useDeleteDoc('Item Group');

  const groups = rawData;

  /* ── Derived data ── */
  const parentGroups = useMemo(
    () => [...new Set(groups.map(g => g.parent_item_group).filter((p): p is string => Boolean(p)))],
    [groups]
  );

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (filterParent !== 'all') result = result.filter(g => g.parent_item_group === filterParent);
    if (filterIsGroup === 'yes') result = result.filter(g => Number(g.is_group) === 1 || g.is_group === true);
    if (filterIsGroup === 'no') result = result.filter(g => Number(g.is_group) !== 1 && g.is_group !== true);
    if (filterDisabled === 'yes') result = result.filter(g => Number(g.disabled) === 1 || g.disabled === true);
    if (filterDisabled === 'no') result = result.filter(g => Number(g.disabled) !== 1 && g.disabled !== true);
    return result;
  }, [groups, filterParent, filterIsGroup, filterDisabled]);

  /* ── KPI calculations ── */
  const totalGroups = groups.length;
  const rootGroups = groups.filter(g => !g.parent_item_group || g.parent_item_group === 'All Item Groups').length;
  const parentGroupCount = groups.filter(g => Number(g.is_group) === 1 || g.is_group === true).length;
  const disabledCount = groups.filter(g => Number(g.disabled) === 1 || g.disabled === true).length;

  /* ── Tree data ── */
  const rootItems = useMemo(
    () => filteredGroups.filter(g => !g.parent_item_group || !filteredGroups.find(p => p.name === g.parent_item_group)),
    [filteredGroups]
  );

  /* ── Columns ── */
  const columns: Column<ItemGroupRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'اسم المجموعة',
        sortable: true,
        filterable: true,
        render: (v) => (
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-amber-600/70 shrink-0" />
            <span className="font-medium">{String(v)}</span>
          </div>
        ),
      },
      {
        key: 'parent_item_group',
        header: 'المجموعة الأب',
        sortable: true,
        render: (v) => (
          <span className="text-muted-foreground text-xs">{String(v || '—')}</span>
        ),
      },
      {
        key: 'is_group',
        header: 'النوع',
        render: (v) =>
          Number(v) === 1 || v === true ? (
            <Badge variant="secondary" className="text-[9px] bg-chart-2/10/80 text-amber-700 dark:bg-chart-2/10 dark:text-amber-300">مجموعة رئيسية</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px]">فرعية</Badge>
          ),
      },
      {
        key: 'disabled',
        header: 'الحالة',
        render: (v) =>
          Number(v) === 1 || v === true ? (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">معطّلة</Badge>
          ) : (
            <Badge variant="secondary" className="text-[9px] bg-success/10 text-success">نشطة</Badge>
          ),
      },
      {
        key: 'actions',
        header: 'إجراءات',
        width: 'w-20',
        render: (_v, row) => (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setSelectedGroup(row); setDeleteDialogOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    []
  );

  /* ── Handlers ── */
  const resetForm = () => {
    setGroupName('');
    setParentGroup('');
    setIsGroup(false);
    setIsDisabled(false);
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error('اسم المجموعة مطلوب');
      return;
    }
    setBusy(true);
    try {
      const doc: Record<string, unknown> = {
        item_group_name: groupName.trim(),
        parent_item_group: parentGroup || 'All Item Groups',
        is_group: isGroup ? 1 : 0,
      };
      if (isDisabled) doc.disabled = 1;
      await createMutation.mutateAsync(doc);
      setDialogOpen(false);
      resetForm();
      toast.success('تم إنشاء مجموعة الأصناف');
      void refetch();
    } catch (e) {
      toast.error('تعذر إنشاء المجموعة', { description: String((e as Error).message || e) });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    try {
      await deleteMutation.mutateAsync(selectedGroup.name);
      toast.success('تم حذف المجموعة');
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
      void refetch();
    } catch (e) {
      toast.error('تعذر حذف المجموعة', { description: String((e as Error).message || e) });
    }
  };

  const openTreeDelete = (row: ItemGroupRow) => {
    setSelectedGroup(row);
    setDeleteDialogOpen(true);
  };

  const clearFilters = () => {
    setFilterParent('all');
    setFilterIsGroup('all');
    setFilterDisabled('all');
    setSearch('');
  };

  const hasActiveFilters = filterParent !== 'all' || filterIsGroup !== 'all' || filterDisabled !== 'all';

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="مجموعات الأصناف"
        description="إدارة مجموعات الأصناف وتصنيف المنتجات بهيكل هرمي"
        iconify="solar:box-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'مجموعات الأصناف' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setViewMode(viewMode === 'table' ? 'tree' : 'table')}
            >
              {viewMode === 'table' ? <TreePine className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              {viewMode === 'table' ? 'عرض شجري' : 'عرض جدول'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" onClick={() => resetForm()}>
                  <Plus className="h-3.5 w-3.5" />
                  مجموعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="max-w-lg" size="md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="h-9 w-9 rounded-lg bg-chart-2/10/80 text-amber-700 flex items-center justify-center">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <span>إنشاء مجموعة أصناف</span>
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات المجموعة</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[65vh] overflow-y-auto">
                  {/* Basic Info */}
                  <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                    <div className="bg-gradient-to-l from-amber-500/[0.06] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                      <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-chart-2/10/80 flex items-center justify-center">
                          <Tag className="h-3 w-3 text-amber-700" />
                        </span>
                        المعلومات الأساسية
                      </h4>
                    </div>
                    <div className="p-4 space-y-4 bg-card/50">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">اسم المجموعة <span className="text-destructive text-xs">*</span></Label>
                        <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="مثال: منتجات غذائية، أدوات مكتبية" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">المجموعة الأب</Label>
                        <ErpLinkCombobox
                          doctype="Item Group"
                          value={parentGroup}
                          onChange={setParentGroup}
                          placeholder="اختر المجموعة الأب..."
                        />
                        {!parentGroup && (
                          <p className="text-[10px] text-muted-foreground">سيتم تعيين &quot;All Item Groups&quot; تلقائياً</p>
                        )}
                      </div>
                    </div>
                  </fieldset>

                  {/* Checkboxes */}
                  <div className="space-y-3 p-4 rounded-2xl border border-border/40 bg-card/50">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-accent/30 rounded-lg px-2 py-1.5 transition-colors">
                      <Checkbox checked={isGroup} onCheckedChange={(checked) => setIsGroup(!!checked)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">مجموعة رئيسية</span>
                        <span className="text-xs text-muted-foreground block">تحتوي على مجموعات فرعية — لا يُضاف إليها أصناف مباشرة</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-accent/30 rounded-lg px-2 py-1.5 transition-colors">
                      <Checkbox checked={isDisabled} onCheckedChange={(checked) => setIsDisabled(!!checked)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">معطّلة</span>
                        <span className="text-xs text-muted-foreground block">لن تظهر عند إضافة أصناف جديدة</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
                  <Button onClick={() => void handleCreate()} disabled={busy} className="gap-1.5 min-w-[130px]">
                    {busy ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الإنشاء...</>
                    ) : 'إنشاء'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* ─── KPI Strip ─── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي المجموعات"
          value={totalGroups}
          icon={Layers}
          accent="primary"
          description="جميع مجموعات الأصناف"
        />
        <KpiCard
          title="مجموعات جذرية"
          value={rootGroups}
          icon={TreePine}
          accent="info"
          description="مجموعات بدون أب"
        />
        <KpiCard
          title="مجموعات رئيسية"
          value={parentGroupCount}
          icon={FolderOpen}
          accent="warning"
          description="تحتوي على فروع"
        />
        <KpiCard
          title="معطّلة"
          value={disabledCount}
          icon={Package}
          accent={disabledCount > 0 ? 'destructive' : 'success'}
          description={disabledCount > 0 ? `${disabledCount} مجموعة معطّلة` : 'جميع المجموعات نشطة'}
        />
      </KpiStrip>

      {/* ─── Filters Bar ─── */}
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="بحث بالمجموعة..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs pe-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <Button
            size="sm"
            variant={filtersOpen ? 'secondary' : 'outline'}
            className="h-8 gap-1.5 text-xs"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            فلاتر
            {hasActiveFilters && (
              <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full">!</Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
              مسح الفلاتر
            </Button>
          )}

          <div className="ms-auto">
            <Badge variant="outline" className="text-xs h-7 px-2.5 rounded-lg border-border/40 bg-muted/30 text-muted-foreground">
              {filteredGroups.length} من {totalGroups}
            </Badge>
          </div>
        </div>

        {/* Filter Controls */}
        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">المجموعة الأب</Label>
              <Select value={filterParent} onValueChange={setFilterParent}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="جميع المجموعات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المجموعات</SelectItem>
                  {parentGroups.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">النوع</Label>
              <Select value={filterIsGroup} onValueChange={setFilterIsGroup}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="yes">مجموعة رئيسية</SelectItem>
                  <SelectItem value="no">فرعية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">الحالة</Label>
              <Select value={filterDisabled} onValueChange={setFilterDisabled}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="yes">معطّلة</SelectItem>
                  <SelectItem value="no">نشطة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* ─── Content: Table or Tree ─── */}
      {viewMode === 'table' ? (
        <PageShell padded={false}>
          <DataTable
            data={filteredGroups}
            columns={columns}
            pageSize={15}
            searchable
            loading={isLoading}
            tableId="inventory-item-groups"
            exportFileName="item-groups.csv"
            printTitle="مجموعات الأصناف"
          />
        </PageShell>
      ) : (
        <PageShell padded={false}>
          <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/40 select-none">
            <span className="flex-1">المجموعة</span>
            <span className="w-20 text-center">الحالة</span>
            <span className="w-32 text-center">الأب</span>
            <span className="w-8" />
          </div>
          {isLoading ? (
            <div className="divide-y divide-border/20">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 h-9 px-4 animate-pulse" style={{ paddingRight: `${(i % 3) * 1.25 + 1}rem` }}>
                  <div className="h-3.5 w-3.5 rounded bg-muted" />
                  <div className="h-3.5 rounded bg-muted flex-1 max-w-[180px]" />
                  <div className="h-3 rounded bg-muted w-14" />
                </div>
              ))}
            </div>
          ) : rootItems.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-center">
              <Package className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground/70">لا توجد مجموعات</p>
              <p className="text-xs text-muted-foreground mt-1">أضف مجموعة جديدة أو عدّل الفلاتر</p>
            </div>
          ) : (
            <div>
              {rootItems.map(group => (
                <ItemGroupTreeItem
                  key={group.name}
                  group={group}
                  allGroups={filteredGroups}
                  level={0}
                  onDelete={openTreeDelete}
                />
              ))}
            </div>
          )}
        </PageShell>
      )}

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المجموعة &quot;{selectedGroup?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              variant="destructive"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحذف...</span>
              ) : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
