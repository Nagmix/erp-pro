'use client';

import { useState } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Plus, Trash2, Mail, Phone, MapPin, Truck, User, Globe, Filter, ChevronDown, Upload, X } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { buildSupplierCreate } from '@/lib/erp/erpnext-payloads';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { cn } from '@/lib/utils';

type SupplierRow = {
  name: string;
  supplier_name: string;
  supplier_type: string;
  supplier_group: string;
  country: string;
  email_id: string;
  mobile_no: string;
  tax_id: string;
};

const emptyForm = {
  supplier_name: '', supplier_type: 'Company', supplier_group: '', country: '',
  email_id: '', mobile_no: '', tax_id: ''};

const columns: Column<SupplierRow>[] = [
  { key: 'supplier_name', header: 'اسم المورد', sortable: true, render: (_, row) => (
    <div className="flex items-center gap-2">
      {row.supplier_type === 'Company' ? <Building2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      <span className="font-medium">{row.supplier_name}</span>
    </div>
  )},
  { key: 'supplier_type', header: 'النوع', width: 'w-24', render: (value) => (
    <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 border-0 ${String(value) === 'Company' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
      {String(value) === 'Company' ? 'شركة' : 'فرد'}
    </Badge>
  )},
  { key: 'supplier_group', header: 'المجموعة' },
  { key: 'country', header: 'البلد', render: (value) => (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
      <span>{String(value)}</span>
    </div>
  )},
  { key: 'email_id', header: 'البريد الإلكتروني', render: (value) => <span className="text-muted-foreground" dir="rtl">{String(value)}</span> },
  { key: 'mobile_no', header: 'الهاتف', render: (value) => <span dir="rtl">{String(value)}</span> },
];

export default function PurchasesSuppliersPage() {
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<SupplierRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [supplierTypeFilter, setSupplierTypeFilter] = useState('all');
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch } = useDocList<SupplierRow>('Supplier', {
    fields: [
      'name',
      'supplier_name',
      'supplier_type',
      'supplier_group',
      'country',
      'email_id',
      'mobile_no',
      'tax_id',
    ],
    limit: 2000,
  });
  const createMutation = useCreateDoc('Supplier');
  const deleteMutation = useDeleteDoc('Supplier');

  const suppliers = data || [];
  const filteredData = groupFilter === 'all' ? suppliers : suppliers.filter(s => s.supplier_group === groupFilter);

  const handleCreate = () => {
    if (!formData.supplier_name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المورد', variant: 'destructive' });
      return;
    }
    if (!formData.supplier_group?.trim() || !formData.country?.trim()) {
      toast({ title: 'خطأ', description: 'يرجى اختيار مجموعة الموردين والبلد من القوائم المرتبطة', variant: 'destructive' });
      return;
    }
    const doc = buildSupplierCreate({
      supplier_name: formData.supplier_name,
      supplier_type: formData.supplier_type as 'Company' | 'Individual',
      supplier_group: formData.supplier_group,
      country: formData.country,
      email_id: formData.email_id || undefined,
      mobile_no: formData.mobile_no || undefined,
      tax_id: formData.tax_id || undefined});
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم بنجاح', description: 'تم إضافة المورد بنجاح' });
        setDialogOpen(false);
        setFormData(emptyForm);
      },
      onError: () => toast({ title: 'خطأ', description: 'حدث خطأ أثناء إضافة المورد', variant: 'destructive' })});
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast({ title: 'تم بنجاح', description: 'تم حذف المورد بنجاح' });
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast({ title: 'خطأ', description: 'حدث خطأ أثناء حذف المورد', variant: 'destructive' })});
  };

  const groups = [...new Set(suppliers.map(s => s.supplier_group))];
  const clearFilters = () => { setSearch(''); setSupplierTypeFilter('all'); };


  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <PageHeader
        title="الموردين"
        description="إدارة الموردين، متابعة الحسابات، البيانات الضريبية، الفروع والتصنيفات"
        iconify="solar:buildings-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المشتريات', href: '/purchases' }, { label: 'الموردون' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            مورد جديد
          </Button>
        }
      />

      {/* شريط البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* بحث سريع */}
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="بحث باسم المورد..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
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
            {(supplierTypeFilter !== 'all' || search) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> مسح الفلاتر
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t mt-1">
              <div className="space-y-1">
            <Label className="text-[10px]">النوع</Label>
            <Select value={supplierTypeFilter} onValueChange={setSupplierTypeFilter}>
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
          <Tabs value={groupFilter} onValueChange={setGroupFilter}>
            <TabsList className="bg-muted/35">
              <TabsTrigger value="all" className="text-xs">الكل</TabsTrigger>
              {groups.map(g => <TabsTrigger key={g} value={g} className="text-xs">{g}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          searchable
          loading={isLoading}
          onView={(row) => toast({ title: 'عرض المورد', description: row.supplier_name })}
          onEdit={(row) => toast({ title: 'تعديل المورد', description: row.supplier_name })}
          onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
        />
      </PageShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <span>إضافة مورد جديد</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات المورد في الحقول أدناه</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-warning/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-warning/10 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-warning" />
                  </span>
                  البيانات الأساسية
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">اسم المورد <span className="text-destructive text-xs">*</span></Label>
                  <Input placeholder="اسم المورد أو الشركة" value={formData.supplier_name} onChange={e => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))} className="h-10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">نوع المورد</Label>
                    <Select dir="rtl" value={formData.supplier_type} onValueChange={val => setFormData(prev => ({ ...prev, supplier_type: val }))}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent dir="rtl" align="start">
                        <SelectItem value="Company">شركة</SelectItem>
                        <SelectItem value="Individual">فرد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">مجموعة الموردين</Label>
                    <ErpLinkCombobox
                      doctype="Supplier Group"
                      value={formData.supplier_group}
                      onChange={(v) => setFormData((prev) => ({ ...prev, supplier_group: v }))}
                      placeholder="اختر المجموعة..."
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                    <Mail className="h-3 w-3 text-info" />
                  </span>
                  معلومات الاتصال
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">البريد الإلكتروني</Label>
                    <Input type="email" placeholder="name@company.sa" dir="ltr" value={formData.email_id} onChange={e => setFormData(prev => ({ ...prev, email_id: e.target.value }))} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">رقم الهاتف</Label>
                    <Input placeholder="05XXXXXXXX" dir="ltr" value={formData.mobile_no} onChange={e => setFormData(prev => ({ ...prev, mobile_no: e.target.value }))} className="h-10" />
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
              <div className="bg-gradient-to-l from-success/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-success/10 flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-success" />
                  </span>
                  الموقع والضرائب
                </h4>
              </div>
              <div className="p-4 space-y-4 bg-card/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">البلد</Label>
                    <ErpLinkCombobox
                      doctype="Country"
                      value={formData.country}
                      onChange={(v) => setFormData((prev) => ({ ...prev, country: v }))}
                      placeholder="اختر البلدان..."
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">الرقم الضريبي</Label>
                    <Input placeholder="الرقم الضريبي" dir="rtl" value={formData.tax_id} onChange={e => setFormData(prev => ({ ...prev, tax_id: e.target.value }))} className="h-10" />
                  </div>
                </div>
              </div>
            </fieldset>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">
                إلغاء
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                {createMutation.isPending ? '...' : 'حفظ المورد'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف المورد &quot;{selected?.supplier_name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
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
