'use client';

import { useState, useEffect } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { Plus, Users, Building2, User, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { buildCustomerCreate } from '@/lib/erp/erpnext-payloads';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { consumeCreateQueryParam } from '@/lib/client/open-create-query';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
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
};

const emptyForm = {
  customer_name: '', customer_type: 'Company', customer_group: '', territory: '',
  email_id: '', mobile_no: '', tax_id: ''};

const columns: Column<CustomerRow>[] = [
  { key: 'customer_name', header: 'اسم العميل', sortable: true, render: (_, row) => (
    <div className="flex items-center gap-2">
      {row.customer_type === 'Company' ? <Building2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className="font-medium">{row.customer_name}</span>
    </div>
  )},
  { key: 'customer_type', header: 'النوع', width: 'w-24', render: (value) => (
    <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 border-0 ${String(value) === 'Company' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
      {String(value) === 'Company' ? 'شركة' : 'فرد'}
    </Badge>
  )},
  { key: 'customer_group', header: 'المجموعة' },
  { key: 'email_id', header: 'البريد الإلكتروني', render: (value) => <span className="text-muted-foreground" dir="ltr">{String(value)}</span> },
  { key: 'mobile_no', header: 'الهاتف', render: (value) => <span dir="ltr">{String(value)}</span> },
];

export default function CustomersPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const { toast } = useToast();

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

  const customers = data || [];
  const filteredData = typeFilter === 'all' ? customers : customers.filter(c => c.customer_type === typeFilter);

  const handleCreate = () => {
    if (!formData.customer_name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم العميل', variant: 'destructive' });
      return;
    }
    if (!formData.customer_group?.trim() || !formData.territory?.trim()) {
      toast({ title: 'خطأ', description: 'يرجى اختيار مجموعة العملاء والمنطقة من القوائم المرتبطة', variant: 'destructive' });
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
        toast({ title: 'تم بنجاح', description: 'تم إضافة العميل بنجاح' });
        setDialogOpen(false);
        setFormData(emptyForm);
      },
      onError: () => toast({ title: 'خطأ', description: 'حدث خطأ أثناء إضافة العميل', variant: 'destructive' })});
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast({ title: 'تم بنجاح', description: 'تم حذف العميل بنجاح' });
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast({ title: 'خطأ', description: 'حدث خطأ أثناء حذف العميل', variant: 'destructive' })});
  };
  const clearFilters = () => { setSearch(''); setCustomerTypeFilter('all'); };


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

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث باسم العميل..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(customerTypeFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-[10px]">النوع</Label>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Company">شركة</SelectItem>
                <SelectItem value="Individual">فرد</SelectItem>
              </SelectContent>
            </Select>
          </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

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
          onView={(row) => toast({ title: 'عرض العميل', description: row.customer_name })}
          onEdit={(row) => toast({ title: 'تعديل العميل', description: row.customer_name })}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
        />
      </PageShell>

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
                  <Label className="text-[13px] font-semibold">اسم العميل <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="اسم العميل أو الشركة" value={formData.customer_name} onChange={e => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">نوع العميل</Label>
                    <Select dir="rtl" value={formData.customer_type} onValueChange={val => setFormData(prev => ({ ...prev, customer_type: val }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Company">شركة</SelectItem>
                        <SelectItem value="Individual">فرد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">مجموعة العملاء</Label>
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
                    <Label className="text-[13px] font-semibold">المنطقة</Label>
                    <ErpLinkCombobox
                      doctype="Territory"
                      value={formData.territory}
                      onChange={(v) => setFormData((prev) => ({ ...prev, territory: v }))}
                      placeholder="اختر المنطقة..."
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">الرقم الضريبي</Label>
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
                    <Label className="text-[13px] font-semibold">البريد الإلكتروني</Label>
                    <Input type="email" placeholder="name@company.com" dir="ltr" value={formData.email_id} onChange={e => setFormData(prev => ({ ...prev, email_id: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">رقم الهاتف</Label>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف العميل &quot;{selected?.customer_name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
