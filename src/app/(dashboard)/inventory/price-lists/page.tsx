'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, ListTree, Pencil, Edit, CheckCircle, XCircle, Search } from 'lucide-react';
import {
  useDocList,
  useCreateDoc,
  useDeleteDoc,
  useUpdateDoc,
  useDoc,
} from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { buildPriceList, buildItemPrice } from '@/lib/erp/erpnext-payloads';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { formatCurrency } from '@/lib/core/helpers';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Checkbox } from '@/components/ui/checkbox';
interface PLRow {
  name: string;
  currency: string;
  buying?: 0 | 1 | boolean;
  selling?: 0 | 1 | boolean;
  enabled?: 0 | 1 | boolean;
}

interface ItemPriceRow {
  name: string;
  item_code: string;
  item_name?: string;
  uom: string;
  price_list_rate: number;
  currency?: string;
}

export default function PriceListsPage() {
  const { company } = useDefaultCompanyName();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteName, setDeleteName] = useState<string | null>(null);

  // Auto-open create dialog when ?create=1
  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);
  const [plName, setPlName] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [buying, setBuying] = useState(true);
  const [selling, setSelling] = useState(false);
  const [plEnabled, setPlEnabled] = useState(true);

  // Edit state for Price List
  const [editDialog, setEditDialog] = useState<PLRow | null>(null);
  const [editCurrency, setEditCurrency] = useState('YER');
  const [editBuying, setEditBuying] = useState(false);
  const [editSelling, setEditSelling] = useState(false);
  const [editEnabled, setEditEnabled] = useState(true);

  const [detailPl, setDetailPl] = useState<PLRow | null>(null);
  const [addIpOpen, setAddIpOpen] = useState(false);
  const [ipItem, setIpItem] = useState('');
  const [ipUom, setIpUom] = useState('');
  const [ipRate, setIpRate] = useState('');
  const [deleteIpName, setDeleteIpName] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<ItemPriceRow | null>(null);
  const [editRate, setEditRate] = useState('');
  const [plSearch, setPlSearch] = useState('');

  const plKey = detailPl?.name ?? '';
  const {
    data: itemPriceRows = [],
    isLoading: ipLoading,
    refetch: refetchIp,
  } = useDocList<ItemPriceRow>('Item Price', {
    fields: ['name', 'item_code', 'item_name', 'uom', 'price_list_rate', 'currency'],
    filters: [['price_list', '=', plKey]],
    order_by: 'item_code asc',
    limit: 2000,
    enabled: Boolean(plKey),
  });

  const { data: itemDoc } = useDoc<Record<string, unknown>>('Item', ipItem);
  useEffect(() => {
    if (!addIpOpen || !ipItem) return;
    const su = itemDoc?.stock_uom;
    if (typeof su === 'string' && su)
      queueMicrotask(() => setIpUom(su));
  }, [addIpOpen, ipItem, itemDoc?.stock_uom]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useDocList<PLRow>('Price List', {
    fields: ['name', 'currency', 'buying', 'selling', 'enabled'],
    order_by: 'name asc',
    limit: 500,
    filters: company ? [['company', '=', company]] : undefined,
  });
  const createMutation = useCreateDoc('Price List');
  const deleteMutation = useDeleteDoc('Price List');
  const updateMutation = useUpdateDoc('Price List');
  const createIpMutation = useCreateDoc('Item Price');
  const deleteIpMutation = useDeleteDoc('Item Price');
  const updateIpMutation = useUpdateDoc('Item Price');

  const rows = data || [];
  const chk = (v: unknown) => Number(v) === 1 || v === true;

  const filteredRows = useMemo(() => {
    if (!plSearch.trim()) return rows;
    const s = plSearch.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.currency.toLowerCase().includes(s)
    );
  }, [rows, plSearch]);

  const columns: Column<PLRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'القائمة',
        sortable: true,
        render: (v) => (
          <span className="font-medium text-primary">{String(v)}</span>
        ),
      },
      {
        key: 'currency',
        header: 'العملة',
        render: (v) => (
          <span dir="ltr" className="text-xs">
            {String(v)}
          </span>
        ),
      },
      {
        key: 'buying',
        header: 'شراء',
        render: (v) =>
          chk(v) ? (
            <Badge className="text-[9px]">شراء</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'selling',
        header: 'بيع',
        render: (v) =>
          chk(v) ? (
            <Badge variant="secondary" className="text-[9px]">
              بيع
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'enabled',
        header: 'مفعّلة',
        render: (v) =>
          chk(v) ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          ),
      },
      {
        key: '_items',
        header: 'بنود السعر',
        render: (_v, row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={() => setDetailPl(row)}
          >
            <ListTree className="h-3 w-3" />
            أسعار الأصناف
          </Button>
        ),
      },
    ],
    []
  );

  const handleCreate = () => {
    if (!plName.trim()) {
      toast.error('اسم القائمة مطلوب');
      return;
    }
    if (!buying && !selling) {
      toast.error('اختر شراء أو بيع أو كلاهما');
      return;
    }
    const doc = buildPriceList({
      price_list_name: plName.trim(),
      currency,
      buying,
      selling,
    });
    if (!plEnabled) {
      (doc as Record<string, unknown>).enabled = 0;
    }
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء قائمة الأسعار');
        setDialogOpen(false);
        setPlName('');
        setCurrency('YER');
        setBuying(true);
        setSelling(false);
        setPlEnabled(true);
        void refetch();
      },
      onError: () =>
        toast.error('تعذر الحفظ'),
    });
  };

  const openEditDialog = (row: PLRow) => {
    setEditDialog(row);
    setEditCurrency(row.currency || 'YER');
    setEditBuying(chk(row.buying));
    setEditSelling(chk(row.selling));
    setEditEnabled(chk(row.enabled));
  };

  const handleSaveEdit = () => {
    if (!editDialog) return;
    const doc: Record<string, unknown> = {
      currency: editCurrency || 'YER',
      buying: editBuying ? 1 : 0,
      selling: editSelling ? 1 : 0,
      enabled: editEnabled ? 1 : 0,
    };
    updateMutation.mutate(
      { name: editDialog.name, doc },
      {
        onSuccess: () => {
          toast.success('تم تحديث قائمة الأسعار');
          setEditDialog(null);
          void refetch();
        },
        onError: () =>
          toast.error('تعذر التحديث'),
      }
    );
  };

  const openAddIp = () => {
    setIpItem('');
    setIpUom('');
    setIpRate('');
    setAddIpOpen(true);
  };

  const handleCreateItemPrice = () => {
    if (!detailPl) return;
    const rate = Number(ipRate);
    if (!ipItem.trim() || !ipUom.trim() || !Number.isFinite(rate) || rate < 0) {
      toast.error('أكمل الصنف ووحدة القياس والسعر');
      return;
    }
    const doc = buildItemPrice({
      item_code: ipItem.trim(),
      uom: ipUom.trim(),
      price_list: detailPl.name,
      price_list_rate: rate,
    });
    createIpMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تمت إضافة سعر الصنف');
        setAddIpOpen(false);
        void refetchIp();
      },
      onError: (e) => {
        toast.error('تعذر الحفظ', { description: e instanceof Error ? e.message : undefined });
      },
    });
  };

  const openEditIp = (r: ItemPriceRow) => {
    setEditRow(r);
    setEditRate(String(r.price_list_rate ?? ''));
  };

  const handleSaveEditIp = () => {
    if (!editRow) return;
    const rate = Number(editRate);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error('سعر غير صالح');
      return;
    }
    updateIpMutation.mutate(
      { name: editRow.name, doc: { price_list_rate: rate } },
      {
        onSuccess: () => {
          toast.success('تم تحديث السعر');
          setEditRow(null);
          void refetchIp();
        },
        onError: () =>
          toast.error('تعذر التحديث'),
      }
    );
  };

  return (
    <div className="erp-page-enter space-y-6" dir="rtl">
      <ListQueryAlert
        error={isError ? error : null}
        onRetry={() => void refetch()}
      />
      <PageHeader
        title="قوائم الأسعار"
        description="إدارة قوائم الأسعار وربطها بأسعار الأصناف (سعر الصنف) من واجهة واحدة"
        iconify="solar:wallet-money-bold-duotone"
        accent="info"
        breadcrumbs={[
          { label: 'المخزون', href: '/inventory' },
          { label: 'قوائم الأسعار' },
        ]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            قائمة جديدة
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="بحث بقائمة الأسعار..." value={plSearch} onChange={(e) => setPlSearch(e.target.value)} className="h-8 text-xs pe-8" />
          </div>
        </div>
      </div>
      <PageShell padded={false}>
        <DataTable
          data={filteredRows}
          columns={columns}
          searchable
          loading={isLoading}
          onEdit={(r) => openEditDialog(r)}
          onDelete={(r) => setDeleteName(r.name)}
        />
      </PageShell>
      <AlertDialog open={!!deleteName} onOpenChange={() => setDeleteName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف قائمة الأسعار؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteName) return;
                deleteMutation.mutate(deleteName, {
                  onSuccess: () => {
                    toast.success('تم الحذف');
                    setDeleteName(null);
                    void refetch();
                  },
                  onError: () =>
                    toast.error('تعذر الحذف'),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={!!detailPl}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPl(null);
            setAddIpOpen(false);
          }
        }}
      >
        <SheetContent
          dir="rtl"
          side="right"
          className="flex w-full flex-col sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle className="truncate">
              أسعار الأصناف — {detailPl?.name}
            </SheetTitle>
            <SheetDescription>
              سجلات <span dir="ltr">سعر الصنف</span> المرتبطة بهذه القائمة
              مع متابعة العملة ونوع السعر.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1"
                onClick={openAddIp}
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة سعر صنف
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchIp()}
                disabled={ipLoading}
              >
                تحديث
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الصنف</TableHead>
                    <TableHead className="text-start">وحدة</TableHead>
                    <TableHead className="text-start">السعر</TableHead>
                    <TableHead className="w-[100px] text-start">
                      إجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground text-sm"
                      >
                        جاري التحميل…
                      </TableCell>
                    </TableRow>
                  ) : itemPriceRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground text-sm"
                      >
                        لا توجد أسعار أصناف لهذه القائمة بعد.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemPriceRows.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">
                          <span dir="ltr">{r.item_code}</span>
                          {r.item_name ? (
                            <span className="me-2 block text-xs text-muted-foreground">
                              {r.item_name}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <span dir="ltr" className="text-xs">
                            {r.uom}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(Number(r.price_list_rate ?? 0))}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={()=> openEditIp(r)}
                              title="تعديل السعر"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive"
                              onClick={() => setDeleteIpName(r.name)}
                            >
                              حذف
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={addIpOpen} onOpenChange={setAddIpOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              سعر صنف — {detailPl?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">الصنف *</Label>
              <ErpLinkCombobox
                doctype="Item"
                value={ipItem}
                onChange={setIpItem}
                placeholder="اختر صنفاً"
                displayKey="item_name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">وحدة القياس *</Label>
              <ErpLinkCombobox
                doctype="UOM"
                value={ipUom}
                onChange={setIpUom}
                placeholder="وحدة"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">السعر *</Label>
              <Input
                dir="ltr"
                type="number"
                min={0}
                step="0.01"
                value={ipRate}
                onChange={(e) => setIpRate(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateItemPrice}
              disabled={createIpMutation.isPending}
            >
              {createIpMutation.isPending ? '...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              تعديل السعر — {editRow?.item_code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">السعر الجديد</Label>
              <Input
                dir="ltr"
                type="number"
                min={0}
                step="0.01"
                value={editRate}
                onChange={(e) => setEditRate(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEditIp}
              disabled={updateIpMutation.isPending}
            >
              {updateIpMutation.isPending ? '...' : 'تحديث'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteIpName}
        onOpenChange={() => setDeleteIpName(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سعر الصنف؟</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteIpName) return;
                deleteIpMutation.mutate(deleteIpName, {
                  onSuccess: () => {
                    toast.success('تم الحذف');
                    setDeleteIpName(null);
                    void refetchIp();
                  },
                  onError: () =>
                    toast.error('تعذر الحذف'),
                });
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Price List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>قائمة أسعار جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">اسم القائمة *</Label>
              <Input
                value={plName}
                onChange={(e) => setPlName(e.target.value)}
                placeholder="مثال: شراء مواد 2026"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">العملة</Label>
              <ErpLinkCombobox
                doctype="Currency"
                value={currency}
                onChange={setCurrency}
                placeholder="YER"
              />
            </div>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={buying} onCheckedChange={(v) => setBuying(v === true)} />
                شراء
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selling} onCheckedChange={(v) => setSelling(v === true)} />
                بيع
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={plEnabled} onCheckedChange={(v) => setPlEnabled(v === true)} />
                مفعّلة
              </label>
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? '...' : 'حفظ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Price List Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              تعديل قائمة الأسعار — {editDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">العملة</Label>
              <ErpLinkCombobox
                doctype="Currency"
                value={editCurrency}
                onChange={setEditCurrency}
                placeholder="YER"
              />
            </div>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={editBuying} onCheckedChange={(v) => setEditBuying(v === true)} />
                شراء
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={editSelling} onCheckedChange={(v) => setEditSelling(v === true)} />
                بيع
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={editEnabled} onCheckedChange={(v) => setEditEnabled(v === true)} />
                مفعّلة
              </label>
            </div>
            <Button
              className="w-full"
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? '...' : 'تحديث'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
