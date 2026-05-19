'use client';

import { useMemo, useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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
  Warehouse,
  Filter,
  ChevronDown,
  RefreshCw,
  TreePine,
  Table2,
  Building2,
  MapPin,
  Package,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildWarehouseCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';

/* ───────────────────────────── Types ───────────────────────────── */

interface WhRow {
  name: string;
  warehouse_name: string;
  company: string;
  parent_warehouse?: string;
  account?: string;
  is_group?: 0 | 1 | boolean;
  disabled?: 0 | 1 | boolean;
}

/* ───────────────────────────── Tree Item ───────────────────────────── */

function WarehouseTreeItem({
  wh,
  allWarehouses,
  level,
  onDelete,
}: {
  wh: WhRow;
  allWarehouses: WhRow[];
  level: number;
  onDelete: (row: WhRow) => void;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const children = allWarehouses.filter(w => w.parent_warehouse === wh.name);
  const hasChildren = children.length > 0;
  const isGroup = Number(wh.is_group) === 1 || wh.is_group === true;
  const isDisabled = Number(wh.disabled) === 1 || wh.disabled === true;

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
              <Warehouse className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="font-medium truncate">{wh.warehouse_name || wh.name}</span>
              {children.length > 0 && (
                <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">({children.length})</span>
              )}
            </div>
          </Collapsible>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-5 shrink-0" />
            <Package className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="truncate">{wh.warehouse_name || wh.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {isGroup && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">مجموعة</Badge>
          )}
          {isDisabled && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">معطّل</Badge>
          )}
          <span className="text-muted-foreground text-xs max-w-[120px] truncate">{wh.company || ''}</span>
          <button
            onClick={() => onDelete(wh)}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      {hasChildren && isOpen && (
        <div>
          {children.map(child => (
            <WarehouseTreeItem
              key={child.name}
              wh={child}
              allWarehouses={allWarehouses}
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

export default function WarehousesPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  /* ── State ── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<WhRow | null>(null);
  const [whName, setWhName] = useState('');
  const [parent, setParent] = useState('');
  const [whCompany, setWhCompany] = useState('');
  const [whAccount, setWhAccount] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');
  const [editingDoc, setEditingDoc] = useState<WhRow | null>(null);

  /* ── Filter state ── */
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterIsGroup, setFilterIsGroup] = useState<string>('all');
  const [filterDisabled, setFilterDisabled] = useState<string>('all');

  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  /* ── Data ── */
  const { data, isLoading, isError, error, refetch } = useDocList<WhRow>('Warehouse', {
    fields: ['name', 'warehouse_name', 'company', 'parent_warehouse', 'account', 'is_group', 'disabled'],
    order_by: 'warehouse_name asc',
    limit: 500,
  });
  const createMutation = useCreateDoc('Warehouse');
  const updateMutation = useUpdateDoc('Warehouse');
  const deleteMutation = useDeleteDoc('Warehouse');

  const rows = data || [];

  /* ── Derived data ── */
  const companies = useMemo(() => [...new Set(rows.map(r => r.company).filter(Boolean))], [rows]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        r.warehouse_name?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.company?.toLowerCase().includes(q)
      );
    }
    if (filterCompany !== 'all') result = result.filter(r => r.company === filterCompany);
    if (filterIsGroup === 'yes') result = result.filter(r => Number(r.is_group) === 1 || r.is_group === true);
    if (filterIsGroup === 'no') result = result.filter(r => Number(r.is_group) !== 1 && r.is_group !== true);
    if (filterDisabled === 'yes') result = result.filter(r => Number(r.disabled) === 1 || r.disabled === true);
    if (filterDisabled === 'no') result = result.filter(r => Number(r.disabled) !== 1 && r.disabled !== true);
    return result;
  }, [rows, search, filterCompany, filterIsGroup, filterDisabled]);

  /* ── KPI calculations ── */
  const totalWarehouses = rows.length;
  const rootWarehouses = rows.filter(r => !r.parent_warehouse).length;
  const parentWarehouses = rows.filter(r => Number(r.is_group) === 1 || r.is_group === true).length;
  const disabledCount = rows.filter(r => Number(r.disabled) === 1 || r.disabled === true).length;

  /* ── Tree data ── */
  const rootItems = useMemo(
    () => filteredRows.filter(w => !w.parent_warehouse || !filteredRows.find(p => p.name === w.parent_warehouse)),
    [filteredRows]
  );

  /* ── Columns ── */
  const columns: Column<WhRow>[] = useMemo(
    () => [
      {
        key: 'warehouse_name',
        header: 'المستودع',
        sortable: true,
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <Warehouse className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span className="font-medium text-primary">{String(v)}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{row.name !== row.warehouse_name ? row.name : ''}</span>
          </div>
        ),
      },
      {
        key: 'parent_warehouse',
        header: 'المستودع الأب',
        sortable: true,
        render: (v) => <span className="text-muted-foreground text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'company',
        header: 'الشركة',
        sortable: true,
        render: (v) => (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs">{String(v || '—')}</span>
          </div>
        ),
      },
      {
        key: 'account',
        header: 'الحساب',
        render: (v) => <span className="text-muted-foreground text-xs truncate max-w-[140px] block" dir="ltr">{String(v || '—')}</span>,
      },
      {
        key: 'is_group',
        header: 'النوع',
        render: (v) =>
          Number(v) === 1 || v === true ? (
            <Badge variant="secondary" className="text-[9px]">مجموعة</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px]">تفصيلي</Badge>
          ),
      },
      {
        key: 'disabled',
        header: 'الحالة',
        render: (v) =>
          Number(v) === 1 || v === true ? (
            <Badge variant="outline" className="text-[9px] text-muted-foreground">معطّل</Badge>
          ) : (
            <Badge variant="secondary" className="text-[9px] bg-success/10 text-success">نشط</Badge>
          ),
      },
    ],
    []
  );

  /* ── Handlers ── */
  const resetForm = () => {
    setWhName('');
    setParent('');
    setWhCompany('');
    setWhAccount('');
    setIsGroup(false);
    setIsDisabled(false);
    setEditingDoc(null);
  };

  const openEditDialog = (row: WhRow) => {
    setEditingDoc(row);
    setWhName(row.warehouse_name || row.name);
    setParent(row.parent_warehouse || '');
    setWhCompany(row.company || '');
    setWhAccount(row.account || '');
    setIsGroup(Number(row.is_group) === 1 || row.is_group === true);
    setIsDisabled(Number(row.disabled) === 1 || row.disabled === true);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSave = () => {
    if (editingDoc) {
      // تعديل مستودع
      updateMutation.mutate(
        {
          name: editingDoc.name,
          doc: {
            warehouse_name: whName.trim(),
            parent_warehouse: parent || undefined,
            account: whAccount || undefined,
            is_group: isGroup ? 1 : 0,
            disabled: isDisabled ? 1 : 0,
          },
        },
        {
          onSuccess: () => {
            toast.success('تم تعديل المستودع');
            setDialogOpen(false);
            resetForm();
            void refetch();
          },
          onError: () => toast.error('تعذر تعديل المستودع'),
        },
      );
      return;
    }
    // إنشاء مستودع جديد
    const effectiveCompany = whCompany || company;
    if (!effectiveCompany || !whName.trim()) {
      toast.error('الشركة واسم المستودع مطلوبان');
      return;
    }
    const doc = buildWarehouseCreate({
      warehouse_name: whName.trim(),
      company: effectiveCompany,
      parent_warehouse: parent || undefined,
      is_group: isGroup,
    });
    // Add optional fields
    const finalDoc: Record<string, unknown> = { ...doc };
    if (whAccount) finalDoc.account = whAccount;
    if (isDisabled) finalDoc.disabled = 1;

    createMutation.mutate(finalDoc, {
      onSuccess: () => {
        toast.success('تم إنشاء المستودع');
        setDialogOpen(false);
        resetForm();
        void refetch();
      },
      onError: () => toast.error('تعذر الحفظ'),
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteName) return;
    deleteMutation.mutate(deleteName, {
      onSuccess: () => {
        toast.success('تم الحذف');
        setDeleteName(null);
        setDeleteRow(null);
        void refetch();
      },
      onError: () => toast.error('تعذر الحذف'),
    });
  };

  const openDelete = (row: WhRow) => {
    setDeleteName(row.name);
    setDeleteRow(row);
  };

  const clearFilters = () => {
    setFilterCompany('all');
    setFilterIsGroup('all');
    setFilterDisabled('all');
    setSearch('');
  };

  const hasActiveFilters = filterCompany !== 'all' || filterIsGroup !== 'all' || filterDisabled !== 'all';

  /* ── Render ── */
  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="المستودعات"
        description="إدارة المستودعات بهيكل هرمي وربطها بالشركة، مع إعدادات تخزين وإعادة الطلب"
        iconify="solar:server-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'المستودعات' }]}
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
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              مستودع جديد
            </Button>
          </div>
        }
      />
      {/* ─── Filters Bar ─── */}
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder="بحث بالمستودع..."
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
              {filteredRows.length} من {totalWarehouses}
            </Badge>
          </div>
        </div>

        {/* Filter Controls */}
        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">الشركة</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="جميع الشركات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الشركات</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
                  <SelectItem value="yes">مجموعة</SelectItem>
                  <SelectItem value="no">تفصيلي</SelectItem>
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
                  <SelectItem value="yes">معطّل</SelectItem>
                  <SelectItem value="no">نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* ─── Hint ─── */}
      <PageShell className="text-xs text-muted-foreground">
        مستويات إعادة الطلب والكميات الفعلية تظهر في <strong>مستويات المخزون</strong> و<strong>الجرد</strong>.
      </PageShell>

      {/* ─── Content: Table or Tree ─── */}
      {viewMode === 'table' ? (
        <PageShell padded={false}>
          <DataTable
            data={filteredRows}
            columns={columns}
            searchable
            loading={isLoading}
            onDelete={(r) => openDelete(r)}
            onEdit={(r) => openEditDialog(r)}
            tableId="inventory-warehouses"
            exportFileName="warehouses.csv"
            printTitle="المستودعات"
          />
        </PageShell>
      ) : (
        <PageShell padded={false}>
          <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-2 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/40 select-none">
            <span className="flex-1">المستودع</span>
            <span className="w-24 text-center">الحالة</span>
            <span className="w-24 text-center">الشركة</span>
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
              <Warehouse className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground/70">لا توجد مستودعات</p>
              <p className="text-xs text-muted-foreground mt-1">أضف مستودعاً جديداً أو عدّل الفلاتر</p>
            </div>
          ) : (
            <div>
              {rootItems.map(wh => (
                <WarehouseTreeItem
                  key={wh.name}
                  wh={wh}
                  allWarehouses={filteredRows}
                  level={0}
                  onDelete={openDelete}
                />
              ))}
            </div>
          )}
        </PageShell>
      )}

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={!!deleteName} onOpenChange={() => { setDeleteName(null); setDeleteRow(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستودع؟</AlertDialogTitle>
            {deleteRow && (
              <p className="text-sm text-muted-foreground">
                هل أنت متأكد من حذف المستودع &quot;{deleteRow.warehouse_name || deleteRow.name}&quot;؟
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} variant="destructive">
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحذف...</span>
              ) : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Create Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>{editingDoc ? `تعديل المستودع — ${editingDoc.name}` : 'مستودع جديد'}</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{editingDoc ? 'تعديل بيانات المستودع' : 'أدخل بيانات المستودع'}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Basic Info */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Warehouse className="h-3 w-3 text-primary" />
                  </span>
                  المعلومات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم المستودع <span className="text-destructive text-xs">*</span></Label>
                  <Input
                    value={whName}
                    onChange={(e) => setWhName(e.target.value)}
                    placeholder="مثال: مستودع رئيسي - الرياض"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">مستودع أب (اختياري)</Label>
                  <ErpLinkCombobox
                    doctype="Warehouse"
                    value={parent}
                    onChange={setParent}
                    placeholder="اختر المستودع الأب..."
                    displayKey="warehouse_name"
                  />
                </div>
              </div>
            </fieldset>

            {/* Company & Account */}
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-info" />
                  </span>
                  الشركة والحساب
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الشركة</Label>
                  <ErpLinkCombobox
                    doctype="Company"
                    value={whCompany || company}
                    onChange={setWhCompany}
                    placeholder="اختر الشركة..."
                  />
                  {!whCompany && company && (
                    <p className="text-[10px] text-muted-foreground">الشركة الافتراضية: {company}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">حساب المخزون (اختياري)</Label>
                  <ErpLinkCombobox
                    doctype="Account"
                    value={whAccount}
                    onChange={setWhAccount}
                    placeholder="اختر الحساب..."
                    displayKey="account_name"
                    filters={[['account_type', '=', 'Stock'], ['company', '=', whCompany || company]]}
                    showCreateShortcut={false}
                  />
                </div>
              </div>
            </fieldset>

            {/* Checkboxes */}
            <div className="space-y-3 p-4 rounded-2xl border border-border/40 bg-card/50">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-accent/30 rounded-lg px-2 py-1.5 transition-colors">
                <Checkbox checked={isGroup} onCheckedChange={(checked) => setIsGroup(!!checked)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">مجموعة</span>
                  <span className="text-xs text-muted-foreground block">ليس مخزناً تفصيلياً — يحتوي على مستودعات فرعية فقط</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-accent/30 rounded-lg px-2 py-1.5 transition-colors">
                <Checkbox checked={isDisabled} onCheckedChange={(checked) => setIsDisabled(!!checked)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">معطّل</span>
                  <span className="text-xs text-muted-foreground block">لن يظهر في الحركات الجديدة</span>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => handleDialogClose(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending || updateMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />جاري الحفظ...</>
              ) : editingDoc ? 'حفظ التعديل' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
