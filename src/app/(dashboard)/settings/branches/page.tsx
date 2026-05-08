'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Building2, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useToast } from '@/hooks/use-toast';
import { useCreateDoc, useDeleteDoc, useDocList } from '@/lib/client/hooks';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';

interface Branch {
  name: string;
  branch?: string;
  company: string;
  address: string;
  phone: string;
  manager?: string;
  status?: string;
}

type BranchRow = Branch;

const emptyForm = { name: '', company: '', address: '', phone: '', manager: '', status: 'Active' };

const columns: Column<BranchRow>[] = [
  { key: 'name', header: 'اسم الفرع', sortable: true, render: (_, row) => (
    <div className="flex items-center gap-2">
      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="font-medium">{row.branch || row.name}</span>
    </div>
  )},
  { key: 'company', header: 'الشركة', sortable: true },
  { key: 'address', header: 'العنوان', render: (_, row) => (
    <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground shrink-0" /><span className="text-xs">{row.address}</span></div>
  )},
  { key: 'phone', header: 'الهاتف', render: (value) => <span dir="ltr">{String(value)}</span> },
  { key: 'manager', header: 'المدير' },
  { key: 'status', header: 'الحالة', sortable: true, render: (value) => {
    const s = String(value);
    return <Badge variant="outline" className={`text-[10px] border-0 ${s === 'Active' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>{s}</Badge>;
  }},
];

export default function BranchesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<BranchRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();
  const branchesQuery = useDocList<Branch>('Branch', {
    fields: ['name', 'branch', 'company', 'address', 'phone', 'manager', 'status'],
    limit: 400,
    order_by: 'modified desc',
  });
  const createMutation = useCreateDoc('Branch');
  const deleteMutation = useDeleteDoc('Branch');
  const branches = branchesQuery.data || [];

  const handleCreate = () => {
    if (!formData.name) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم الفرع', variant: 'destructive' });
      return;
    }
    createMutation.mutate(prepareFrappeDocForCreate({
      doctype: 'Branch',
      branch: formData.name,
      company: formData.company,
      ...(formData.address ? { address: formData.address } : {}),
      ...(formData.phone ? { phone: formData.phone } : {}),
      ...(formData.manager ? { custom_manager: formData.manager } : {}),
      status: formData.status,
    }), {
      onSuccess: () => {
        toast({ title: 'تم بنجاح', description: 'تم إضافة الفرع بنجاح' });
        setDialogOpen(false);
        setFormData(emptyForm);
      },
      onError: () => toast({ title: 'فشل', description: 'تعذر إنشاء الفرع', variant: 'destructive' }),
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => {
        toast({ title: 'تم بنجاح', description: 'تم حذف الفرع بنجاح' });
        setDeleteDialogOpen(false);
        setSelected(null);
      },
      onError: () => toast({ title: 'فشل', description: 'تعذر حذف الفرع', variant: 'destructive' }),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الفروع"
        description="إدارة فروع الشركة ومواقعها وأرقام الاتصال والمسؤولين"
        iconify="solar:buildings-3-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الفروع' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            فرع جديد
          </Button>
        }
      />

      <div className="hidden">
        <Card><CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-[10px] text-muted-foreground">غير نشط</p><p className="text-sm font-bold mt-0.5">{branches.filter(b => b.status !== 'Active').length}</p></div>
        </CardContent></Card>
      </div>

      <DataTable
        data={branches}
        columns={columns}
        searchable
        onView={(row) => toast({ title: 'عرض الفرع', description: row.name })}
        onEdit={(row) => toast({ title: 'تعديل الفرع', description: row.name })}
        onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة فرع جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">اسم الفرع *</Label>
                <Input placeholder="اسم الفرع" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">الشركة</Label>
                <Input placeholder="اسم الشركة" value={formData.company} onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">العنوان</Label>
              <Input placeholder="عنوان الفرع" value={formData.address} onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">الهاتف</Label>
                <Input placeholder="01XXXXXXXX" dir="ltr" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">المدير</Label>
                <Input placeholder="اسم مدير الفرع" value={formData.manager} onChange={e => setFormData(prev => ({ ...prev, manager: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-medium">الحالة</Label>
              <Select value={formData.status} onValueChange={val => setFormData(prev => ({ ...prev, status: val }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">نشط</SelectItem>
                  <SelectItem value="Inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreate}>حفظ الفرع</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف الفرع &quot;{selected?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
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
