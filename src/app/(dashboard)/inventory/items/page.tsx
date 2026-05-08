'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Package, Layers, Upload, FileDown, CalendarRange, Filter, ChevronDown, X } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { buildItemCreate } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  parseCsvRows,
  parseExcelFirstSheetToGrid,
  validateItemImportHeaders,
  runItemImportFromGrid,
} from '@/lib/inventory/items-import';

function isStockFlag(v: unknown): boolean {
  return Number(v) === 1 || v === true;
}

interface ItemRow {
  name: string;
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  is_stock_item: 0 | 1 | boolean;
  has_batch_no?: 0 | 1 | boolean;
  has_serial_no?: 0 | 1 | boolean;
  standard_rate?: number;
  enable_deferred_revenue?: 0 | 1 | boolean;
}

const ITEMS_CSV_TEMPLATE = `item_code,item_name,item_group,stock_uom,is_stock_item,standard_rate,has_batch_no,has_serial_no,brand,description
SKU-001,مثال صنف,Products,Nos,1,10,0,0,`;

export default function ItemsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [groupFilter, setGroupFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemGroup, setItemGroup] = useState('');
  const [stockUom, setStockUom] = useState('Nos');
  const [isStock, setIsStock] = useState(true);
  const [hasBatch, setHasBatch] = useState(false);
  const [hasSerial, setHasSerial] = useState(false);
  const [standardRate, setStandardRate] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [fileImporting, setFileImporting] = useState(false);
  const [enableDeferredRev, setEnableDeferredRev] = useState(false);
  const [deferredMonths, setDeferredMonths] = useState('12');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  const { data, isLoading, isError, error, refetch } = useDocList<ItemRow>('Item', {
    fields: [
      'name',
      'item_code',
      'item_name',
      'item_group',
      'stock_uom',
      'is_stock_item',
      'has_batch_no',
      'has_serial_no',
      'standard_rate',
      'enable_deferred_revenue',
    ],
    order_by: 'modified desc',
    limit: 2000,
  });
  const createMutation = useCreateDoc('Item');
  const deleteMutation = useDeleteDoc('Item');

  const items = data || [];
  let filtered = items;
  if (groupFilter !== 'all') filtered = filtered.filter((i) => i.item_group === groupFilter);
  if (stockFilter === 'stock') filtered = filtered.filter((i) => isStockFlag(i.is_stock_item));
  else if (stockFilter === 'service') filtered = filtered.filter((i) => !isStockFlag(i.is_stock_item));

  const groups = [...new Set(items.map((i) => i.item_group).filter(Boolean))];

  const columns: Column<ItemRow>[] = useMemo(
    () => [
      {
        key: 'item_code',
        header: 'الكود',
        sortable: true,
        filterable: true,
        render: (v) => <span className="font-medium text-primary">{String(v)}</span>},
      {
        key: 'item_name',
        header: 'الاسم',
        sortable: true,
        filterable: true,
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{row.item_name}</span>
          </div>
        )},
      { key: 'item_group', header: 'المجموعة', filterable: true, render: (v) => <Badge variant="outline" className="text-[9px]">{String(v)}</Badge> },
      { key: 'stock_uom', header: 'الوحدة' },
      {
        key: 'is_stock_item',
        header: 'مخزني',
        render: (v) =>
          isStockFlag(v) ? (
            <Badge className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">نعم</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px]">لا</Badge>
          )},
      { key: 'has_batch_no', header: 'دفعة', render: (_v, row) => (isStockFlag(row.has_batch_no) ? '✓' : '—') },
      { key: 'has_serial_no', header: 'تسلسل', render: (_v, row) => (isStockFlag(row.has_serial_no) ? '✓' : '—') },
      { key: 'standard_rate', header: 'سعر قياسي', render: (v) => <span className="tabular-nums">{formatCurrency(Number(v ?? 0))}</span> },
      {
        key: 'enable_deferred_revenue',
        header: 'مؤجل',
        render: (_v, row) =>
          isStockFlag(row.enable_deferred_revenue) ? (
            <Badge className="text-[9px] border-0 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">إيراد</Badge>
          ) : (
            '—'
          )},
    ],
    []
  );

  const handleCreate = () => {
    if (!itemCode.trim() || !itemName.trim() || !itemGroup || !stockUom) {
      toast({ title: 'أكمل الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    if (isStock && !company) {
      toast({ title: 'تعذر تحديد الشركة لافتراضيات الصنف', variant: 'destructive' });
      return;
    }
    const doc = buildItemCreate({
      item_code: itemCode.trim(),
      item_name: itemName.trim(),
      item_group: itemGroup,
      stock_uom: stockUom,
      is_stock_item: isStock,
      company: isStock ? company || undefined : undefined,
      has_batch_no: hasBatch,
      has_serial_no: hasSerial,
      standard_rate: Number(standardRate) || 0,
      description: description || undefined,
      brand: brand || undefined,
      enable_deferred_revenue: enableDeferredRev,
      no_of_months: enableDeferredRev ? Math.max(1, Math.min(600, parseInt(deferredMonths, 10) || 12)) : undefined});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء الصنف' });
        setDialogOpen(false);
        setItemCode('');
        setItemName('');
        setItemGroup('');
        setStockUom('Nos');
        setIsStock(true);
        setHasBatch(false);
        setHasSerial(false);
        setStandardRate('');
        setDescription('');
        setBrand('');
        setEnableDeferredRev(false);
        setDeferredMonths('12');
        void refetch();
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' })});
  };

  const downloadCsvTemplate = useCallback(() => {
    const blob = new Blob([ITEMS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const runSpreadsheetImport = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      let grid: string[][] = [];
      if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
        const buf = await file.arrayBuffer();
        grid = await parseExcelFirstSheetToGrid(buf);
      } else {
        const text = await file.text();
        grid = parseCsvRows(text);
      }
      if (grid.length < 2) {
        toast({ title: 'الملف فارغ أو بلا صف بيانات', variant: 'destructive' });
        return;
      }
      const headerCells = grid[0]!;
      const headers = validateItemImportHeaders(headerCells);
      if (!headers.ok) {
        toast({ title: 'رؤوس الأعمدة ناقصة', description: headers.message, variant: 'destructive' });
        return;
      }
      if (!company) {
        toast({ title: 'تعذر تحديد الشركة لأصناف مخزنية', variant: 'destructive' });
        return;
      }
      setFileImporting(true);
      const { ok, fail, skipped } = await runItemImportFromGrid(grid, headers.colIndex, company);
      setFileImporting(false);
      void queryClient.invalidateQueries({ queryKey: ['docList', 'Item'] });
      void refetch();
      toast({
        title: 'انتهى الاستيراد',
        description: `نجح ${ok}، فشل ${fail}، تخطي ${skipped}`,
        variant: fail ? 'destructive' : 'default'});
    },
    [company, queryClient, refetch, toast]
  );
  const clearFilters = () => { setSearch(''); setStockFilter('all'); };


  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="الأصناف"
        description="إدارة أصناف وخدمات المخزون مع تتبع الدفعات والأرقام التسلسلية والمعايير"
        iconify="solar:box-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'الأصناف' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void runSpreadsheetImport(f);
              }}
            />

            <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={coLoading || fileImporting}
            onClick={() => fileInputRef.current?.click()}
            >
            <Upload className="h-3.5 w-3.5" />
            {fileImporting ? 'جاري الاستيراد…' : 'استيراد CSV / Excel'}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={downloadCsvTemplate}>
            <FileDown className="h-3.5 w-3.5" />
            قالب CSV
            </Button>
            <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            صنف جديد
            </Button>
          </div>
        }
      />

            {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث بالصنف أو المجموعة..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(stockFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-[10px]">النوع</Label>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="1">مخزني</SelectItem>
                <SelectItem value="0">خدمي/غير مخزني</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4 space-y-3">
          <Tabs value={groupFilter} onValueChange={setGroupFilter}>
            <TabsList className="bg-muted/35 flex flex-wrap h-auto max-w-full overflow-x-auto">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              {groups.slice(0, 12).map((g) => (
                <TabsTrigger key={g} value={g} className="text-xs whitespace-nowrap">{g}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Tabs value={stockFilter} onValueChange={setStockFilter}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="stock" className="text-xs">مخزني</TabsTrigger>
              <TabsTrigger value="service" className="text-xs">خدمة</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          searchable
          loading={isLoading}
          onDelete={(row) => setDeleteName(row.name)}
          tableId="items-list"
          columnFilters
          selectable
          stickyFirstColumn
          exportFileName="items.csv"
          getRowId={(row) => row.name}
          bulkActions={[
            {
              label: 'نسخ أكواد الأصناف',
              onClick: (rows) => {
                const text = rows.map((r) => r.item_code).join('\n');
                void navigator.clipboard.writeText(text);
                toast({ title: 'تم النسخ', description: `${rows.length} صنفاً` });
              }},
          ]}
        />
      </PageShell>

      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصنف؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => { toast({ title: 'تم الحذف' }); setDeleteName(null); void refetch(); },
                  onError: () => toast({ title: 'تعذر الحذف — قد يكون الصنف مرتبطاً', variant: 'destructive' })});
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>صنف جديد</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              <TabsTrigger value="basic" className="text-xs">
                أساسي
              </TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs">
                تسعير ووصف
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-xs">
                مخزون ودفعات
              </TabsTrigger>
              <TabsTrigger value="deferred" className="text-xs gap-1">
                <CalendarRange className="h-3 w-3" />
                إيراد مؤجل
              </TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4 outline-none">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">كود الصنف *</Label>
                <Input dir="ltr" value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="صنف-001" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">اسم الصنف *</Label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">مجموعة أصناف *</Label>
                <ErpLinkCombobox doctype="Item Group" value={itemGroup} onChange={setItemGroup} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">وحدة القياس *</Label>
                <ErpLinkCombobox doctype="UOM" value={stockUom} onChange={setStockUom} />
              </div>
            </div>
            </TabsContent>
            <TabsContent value="pricing" className="space-y-4 mt-4 outline-none">
            <div className="space-y-2">
              <Label className="text-xs">سعر قياسي (بيع)</Label>
              <Input type="number" dir="ltr" value={standardRate} onChange={(e) => setStandardRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">العلامة / الوصف</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="علامة" />
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف" />
              </div>
            </div>
            </TabsContent>
            <TabsContent value="stock" className="space-y-4 mt-4 outline-none">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={isStock} onChange={(e) => setIsStock(e.target.checked)} />
                صنف مخزني
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={hasBatch} onChange={(e) => setHasBatch(e.target.checked)} disabled={!isStock} />
                تتبع دفعة
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={hasSerial} onChange={(e) => setHasSerial(e.target.checked)} disabled={!isStock} />
                تتبع تسلسلي
              </label>
            </div>
            </TabsContent>
            <TabsContent value="deferred" className="space-y-4 mt-4 outline-none">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                يطابق حقول الصنف في النظام المحاسبي — يُستخدم مع فواتير المبيعات ذات الإقران على مدى الخدمة.
                عند حفظ فاتورة ببند «مؤجل» يُحدَّث الصنف تلقائياً إن لزم.
              </p>
              <div className="flex items-center justify-between rounded-lg border border-border/40 p-3 gap-3">
                <Label className="text-xs leading-snug">تمكين الإيراد المؤجل لهذا الصنف</Label>
                <Switch checked={enableDeferredRev} onCheckedChange={setEnableDeferredRev} />
              </div>
              {enableDeferredRev ? (
                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-xs">عدد الأشهر الافتراضي للإقران (صنف)</Label>
                  <Input
                    type="number"
                    dir="ltr"
                    min={1}
                    max={600}
                    className="h-9"
                    value={deferredMonths}
                    onChange={(e) => setDeferredMonths(e.target.value)}
                  />
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
            <Button className="w-full mt-4" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? '...' : 'حفظ'}
            </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
