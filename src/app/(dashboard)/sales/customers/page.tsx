'use client';

import { useState, useEffect, useMemo } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Users, Building2, User, Eye, Pencil, Loader2, Hash, Mail, Phone, MapPin, CreditCard, TrendingUp } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc, useUpdateDoc, useDoc } from '@/lib/client/hooks';
import { buildCustomerCreate } from '@/lib/erp/erpnext-payloads';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { toast } from 'sonner';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { formatCurrency } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

type CustomerRow = {
  name: string;
  customer_name: string;
  customer_type: string;
  customer_group: string;
  territory: string;
  email_id: string;
  mobile_no: string;
  tax_id: string;
  outstanding_amount?: number;
};

type CustomerFullDoc = {
  name: string;
  customer_name: string;
  customer_type: string;
  customer_group: string;
  territory: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  tax_id?: string;
  tax_category?: string;
  default_price_list?: string;
  default_currency?: string;
  language?: string;
  image?: string;
  disabled?: number | boolean;
  outstanding_amount?: number;
  credit_limit?: number;
  company?: string;
  creation?: string;
  modified?: string;
  owner?: string;
};

const emptyForm = {
  customer_name: '', customer_type: 'Company', customer_group: '', territory: '',
  email_id: '', mobile_no: '', tax_id: ''
};

export default function CustomersPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editFormData, setEditFormData] = useState(emptyForm);
  useEffect(() => {
    consumeCreateQueryParam(() => setDialogOpen(true));
  }, []);

  const { data, isLoading, isError, error, refetch } = useDocList<CustomerRow>('Customer', {
    fields: [
      'name',
      'customer_name',
      'customer_type',
      'customer_group',
      'territory',
      'email_id',
      'mobile_no',
      'tax_id',
    ],
    limit: 2000,
  });
  const createMutation = useCreateDoc('Customer');
  const deleteMutation = useDeleteDoc('Customer');
  const updateMutation = useUpdateDoc('Customer');

  // Fetch full document for viewing
  const { data: viewDoc, isLoading: viewDocLoading } = useDoc<CustomerFullDoc>(
    'Customer',
    viewingCustomer?.name || '',
    { enabled: viewDialogOpen && Boolean(viewingCustomer?.name) }
  );

  const customers = data || [];

  // ── Apply filters ──
  const filteredData = useMemo(() => {
    return typeFilter === 'all' ? customers : customers.filter(c => c.customer_type === typeFilter);
  }, [customers, typeFilter]);

  // ── KPIs ──
  const totalCustomers = customers.length;
  const companiesCount = customers.filter(c => c.customer_type === 'Company').length;
  const individualsCount = customers.filter(c => c.customer_type === 'Individual').length;

  const handleCreate = () => {
    if (!formData.customer_name) {
      toast.error('خطأ', { description: 'يرجى إدخال اسم العميل' });
      return;
    }
    if (!formData.customer_group?.trim() || !formData.territory?.trim()) {
      toast.error('خطأ', { description: 'يرجى اختيار مجموعة العملاء والمنطقة من القوائم المرتبطة' });
      return;
    }
    const doc = buildCustomerCreate({
      customer_name: formData.customer_name,
      customer_type: formData.customer_type as 'Company' | 'Individual',
      customer_group: formData.customer_group,
      territory: formData.territory,
      email_id: formData.email_id || undefined,
      mobile_no: formData.mobile_no || undefined,
      tax_id: formData.tax_id || undefined});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('تم بنجاح', { description: 'تم إضافة العميل بنجاح' });
        setDialogOpen(false);
        setFormData(emptyForm);
      },
      onError: () => toast.error('خطأ', { description: 'حدث خطأ أثناء إضافة العميل' })});
  };

  // ── Edit Handlers ──
  const openEditDialog = (row: CustomerRow) => {
    setSelected(row);
    setEditFormData({
      customer_name: row.customer_name || '',
      customer_type: row.customer_type || 'Company',
      customer_group: row.customer_group || '',
      territory: row.territory || '',
      email_id: row.email_id || '',
      mobile_no: row.mobile_no || '',
      tax_id: row.tax_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selected) return;
    if (!editFormData.customer_name?.trim()) {
      toast.error('خطأ', { description: 'يرجى إدخال اسم العميل' });
      return;
    }
    if (!editFormData.customer_group?.trim() || !editFormData.territory?.trim()) {
      toast.error('خطأ', { description: 'يرجى اختيار مجموعة العملاء والمنطقة' });
      return;
    }
    const doc: Record<string, unknown> = {
      customer_name: editFormData.customer_name.trim(),
      customer_type: editFormData.customer_type,
      customer_group: editFormData.customer_group,
      territory: editFormData.territory,
      email_id: editFormData.email_id || undefined,
      mobile_no: editFormData.mobile_no || undefined,
      tax_id: editFormData.tax_id || undefined,
    };
    updateMutation.mutate(
      { name: selected.name, doc },
      {
        onSuccess: () => {
          toast.success('تم بنجاح', { description: 'تم تحديث بيانات العميل بنجاح' });
          setEditDialogOpen(false);
          setSelected(null);
        },
        onError: () => toast.error('خطأ', { description: 'حدث خطأ أثناء تحديث العميل' }),
      }
    );
  };

  // ── View Handler ──
  const openViewDialog = (row: CustomerRow) => {
    setViewingCustomer(row);
    setViewDialogOpen(true);
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast.success('تم بنجاح', { description: 'تم حذف العميل بنجاح' });
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast.error('خطأ', { description: 'حدث خطأ أثناء حذف العميل' })});
  };

  // ── Columns ──
  const columns: Column<CustomerRow>[] = useMemo(() => [
    { key: 'customer_name', header: 'اسم العميل', sortable: true, render: (_, row) => (
      <div className="flex items-center gap-2">
        {row.customer_type === 'Company' ? <Building2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="font-medium">{row.customer_name}</span>
      </div>
    )},
    { key: 'customer_type', header: 'النوع', width: 'w-24', render: (value) => (
      <Badge variant="outline" className={`text-xs font-medium px-2 py-0.5 border-0 ${String(value) === 'Company' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
        {String(value) === 'Company' ? 'شركة' : 'فرد'}
      </Badge>
    )},
    { key: 'customer_group', header: 'المجموعة' },
    { key: 'email_id', header: 'البريد الإلكتروني', render: (value) => <span className="text-muted-foreground" dir="ltr">{String(value)}</span> },
    { key: 'mobile_no', header: 'الهاتف', render: (value) => <span dir="ltr">{String(value)}</span> },
    { key: 'outstanding_amount', header: 'الرصيد المستحق', width: 'w-32', sortable: true, render: (value) => {
      const amt = Number(value) || 0;
      if (amt > 0) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-semibold text-destructive tabular-nums cursor-help" dir="ltr">
                  {formatCurrency(amt)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">مبلغ مستحق على العميل</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <span className="text-muted-foreground tabular-nums" dir="ltr">{formatCurrency(0)}</span>;
    }},
  ], []);

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="العملاء"
        description="إدارة بيانات العملاء (شركات وأفراد) وملفاتهم وحساباتهم المالية"
        iconify="solar:users-group-rounded-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'المبيعات', href: '/sales' }, { label: 'العملاء' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            عميل جديد
          </Button>
        }
      />
      <PageShell className="space-y-4" padded={false}>
        <div className="px-4 pt-4">
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              <TabsTrigger value="Company" className="text-xs">شركات</TabsTrigger>
              <TabsTrigger value="Individual" className="text-xs">أفراد</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          searchable
          loading={isLoading}
          onView={(row) => openViewDialog(row)}
          onEdit={(row) => openEditDialog(row)}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
          tableId="sales-customers"
          exportFileName="customers.csv"
          printTitle="العملاء"
        />
      </PageShell>

      {/* ════════════════════════════════════════════════════════
          Create Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <span>إضافة عميل جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات العميل في الحقول أدناه</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><User className="h-3 w-3 text-primary" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم العميل <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="اسم العميل أو الشركة" value={formData.customer_name} onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع العميل</Label>
                    <Select dir="rtl" value={formData.customer_type} onValueChange={val => setFormData(prev => ({ ...prev, customer_type: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Company">شركة</SelectItem>
                        <SelectItem value="Individual">فرد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مجموعة العملاء</Label>
                    <ErpLinkCombobox
                      doctype="Customer Group"
                      value={formData.customer_group}
                      onChange={(v) => setFormData((prev) => ({ ...prev, customer_group: v }))}
                      placeholder="اختر المجموعة..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المنطقة</Label>
                    <ErpLinkCombobox
                      doctype="Territory"
                      value={formData.territory}
                      onChange={(v) => setFormData((prev) => ({ ...prev, territory: v }))}
                      placeholder="اختر المنطقة..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الرقم الضريبي</Label>
                    <Input placeholder="300xxxxxxxxx" dir="ltr" value={formData.tax_id} onChange={e => setFormData(prev => ({ ...prev, tax_id: e.target.value }))} />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-info" /></span>
                  معلومات الاتصال
                </h4>
              </div>
              <div className="p-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">البريد الإلكتروني</Label>
                    <Input type="email" placeholder="name@company.com" dir="ltr" value={formData.email_id} onChange={e => setFormData(prev => ({ ...prev, email_id: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الهاتف</Label>
                    <Input placeholder="05XXXXXXXX" dir="ltr" value={formData.mobile_no} onChange={e => setFormData(prev => ({ ...prev, mobile_no: e.target.value }))} />
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
              {createMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ العميل'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          Edit Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-info/10 text-info flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <span>تعديل بيانات العميل</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">تعديل بيانات: {selected?.customer_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><User className="h-3 w-3 text-info" /></span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم العميل <span className="text-destructive text-xs">*</span></Label>
                  <Input
                    placeholder="اسم العميل أو الشركة"
                    value={editFormData.customer_name}
                    onChange={e => setEditFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">كود العميل</Label>
                  <Input value={selected?.name || ''} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">نوع العميل</Label>
                    <Select dir="rtl" value={editFormData.customer_type} onValueChange={val => setEditFormData(prev => ({ ...prev, customer_type: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Company">شركة</SelectItem>
                        <SelectItem value="Individual">فرد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">مجموعة العملاء</Label>
                    <ErpLinkCombobox
                      doctype="Customer Group"
                      value={editFormData.customer_group}
                      onChange={(v) => setEditFormData((prev) => ({ ...prev, customer_group: v }))}
                      placeholder="اختر المجموعة..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">المنطقة</Label>
                    <ErpLinkCombobox
                      doctype="Territory"
                      value={editFormData.territory}
                      onChange={(v) => setEditFormData((prev) => ({ ...prev, territory: v }))}
                      placeholder="اختر المنطقة..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">الرقم الضريبي</Label>
                    <Input placeholder="300xxxxxxxxx" dir="ltr" value={editFormData.tax_id} onChange={e => setEditFormData(prev => ({ ...prev, tax_id: e.target.value }))} />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center"><Building2 className="h-3 w-3 text-primary" /></span>
                  معلومات الاتصال
                </h4>
              </div>
              <div className="p-4 bg-card/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">البريد الإلكتروني</Label>
                    <Input type="email" placeholder="name@company.com" dir="ltr" value={editFormData.email_id} onChange={e => setEditFormData(prev => ({ ...prev, email_id: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">رقم الهاتف</Label>
                    <Input placeholder="05XXXXXXXX" dir="ltr" value={editFormData.mobile_no} onChange={e => setEditFormData(prev => ({ ...prev, mobile_no: e.target.value }))} />
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button type="button" variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-1.5 min-w-[130px]">
              {updateMutation.isPending ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />جاري الحفظ...</>
              ) : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════
          View Dialog
          ════════════════════════════════════════════════════════ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <span>تفاصيل العميل</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">{viewingCustomer?.customer_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewDocLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ms-3 text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          ) : viewDoc ? (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {/* البيانات الأساسية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center"><User className="h-3 w-3 text-success" /></span>
                    البيانات الأساسية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField icon={<Hash className="h-3.5 w-3.5" />} label="كود العميل" value={viewDoc.name} dir="ltr" />
                    <DetailField icon={<User className="h-3.5 w-3.5" />} label="اسم العميل" value={viewDoc.customer_name} />
                    <DetailField
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      label="نوع العميل"
                      value={viewDoc.customer_type === 'Company' ? 'شركة' : 'فرد'}
                      badge
                      badgeClass={viewDoc.customer_type === 'Company' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}
                    />
                    <DetailField icon={<Users className="h-3.5 w-3.5" />} label="مجموعة العملاء" value={viewDoc.customer_group} />
                    <DetailField icon={<MapPin className="h-3.5 w-3.5" />} label="المنطقة" value={viewDoc.territory} />
                    <DetailField icon={<CreditCard className="h-3.5 w-3.5" />} label="الرقم الضريبي" value={viewDoc.tax_id} dir="ltr" />
                  </div>
                </div>
              </fieldset>

              {/* معلومات الاتصال */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center"><Mail className="h-3 w-3 text-info" /></span>
                    معلومات الاتصال
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField icon={<Mail className="h-3.5 w-3.5" />} label="البريد الإلكتروني" value={viewDoc.email_id} dir="ltr" />
                    <DetailField icon={<Phone className="h-3.5 w-3.5" />} label="رقم الهاتف" value={viewDoc.mobile_no || viewDoc.phone} dir="ltr" />
                  </div>
                </div>
              </fieldset>

              {/* البيانات المالية */}
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center"><TrendingUp className="h-3 w-3 text-warning" /></span>
                    البيانات المالية
                  </h4>
                </div>
                <div className="p-4 space-y-3 bg-card/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailField
                      icon={<TrendingUp className="h-3.5 w-3.5" />}
                      label="الرصيد المستحق"
                      value={viewDoc.outstanding_amount ? formatCurrency(Number(viewDoc.outstanding_amount)) : formatCurrency(0)}
                      highlight={Number(viewDoc.outstanding_amount) > 0}
                    />
                    <DetailField
                      icon={<CreditCard className="h-3.5 w-3.5" />}
                      label="حد الائتمان"
                      value={viewDoc.credit_limit ? formatCurrency(Number(viewDoc.credit_limit)) : '—'}
                    />
                    <DetailField icon={<CreditCard className="h-3.5 w-3.5" />} label="العملة الافتراضية" value={viewDoc.default_currency || '—'} dir="ltr" />
                    <DetailField icon={<CreditCard className="h-3.5 w-3.5" />} label="قائمة الأسعار" value={viewDoc.default_price_list || '—'} />
                  </div>
                </div>
              </fieldset>

              {/* معلومات النظام */}
              {viewDoc.creation && (
                <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                  <div className="bg-gradient-to-l from-muted/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                    <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-muted/20 flex items-center justify-center"><Hash className="h-3 w-3 text-muted-foreground" /></span>
                      معلومات النظام
                    </h4>
                  </div>
                  <div className="p-4 space-y-3 bg-card/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailField label="تاريخ الإنشاء" value={viewDoc.creation ? new Date(viewDoc.creation).toLocaleDateString('ar-YE') : '—'} />
                      <DetailField label="آخر تعديل" value={viewDoc.modified ? new Date(viewDoc.modified).toLocaleDateString('ar-YE') : '—'} />
                      <DetailField label="المُنشئ" value={viewDoc.owner || '—'} dir="ltr" />
                      <DetailField label="الحالة" value={viewDoc.disabled ? 'معطّل' : 'نشط'} badge badgeClass={viewDoc.disabled ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'} />
                    </div>
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              تعذر تحميل بيانات العميل
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
            <Button variant="ghost" onClick={() => setViewDialogOpen(false)} className="text-muted-foreground">إغلاق</Button>
            {viewingCustomer && (
              <Button
                className="gap-1.5"
                onClick={() => {
                  setViewDialogOpen(false);
                  openEditDialog(viewingCustomer);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف العميل &quot;{selected?.customer_name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Reusable Detail Field component for View Dialog ─── */
function DetailField({
  icon,
  label,
  value,
  dir,
  badge,
  badgeClass,
  highlight,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  dir?: string;
  badge?: boolean;
  badgeClass?: string;
  highlight?: boolean;
}) {
  const displayValue = value || '—';
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {badge ? (
        <Badge variant="outline" className={cn('text-xs font-medium px-2 py-0.5 border-0', badgeClass)}>
          {displayValue}
        </Badge>
      ) : (
        <p className={cn(
          'text-sm font-medium',
          highlight && 'text-destructive font-semibold',
          !value && 'text-muted-foreground',
        )} dir={dir}>
          {displayValue}
        </p>
      )}
    </div>
  );
}
