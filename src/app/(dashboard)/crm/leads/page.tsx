'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Plus, UserPlus, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildLeadCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type LeadRow = {
  name: string;
  lead_name?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  status?: string;
};

const STATUS_AR: Record<string, string> = {
  Lead: 'عميل محتمل',
  Open: 'مفتوح',
  Replied: 'تم الرد',
  Opportunity: 'فرصة',
  Quotation: 'عرض سعر',
  'Lost Quotation': 'عرض مرفوض',
  Interested: 'مهتم',
  Converted: 'مُحوَّل',
  'Do Not Contact': 'عدم الاتصال',
};

const columns: Column<LeadRow>[] = [
  { key: 'name', header: 'الرقم', render: (v) => <span className="text-primary font-medium text-xs">{String(v)}</span> },
  { key: 'lead_name', header: 'الاسم', render: (_, row) => (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">
        {(row.first_name || row.lead_name || '?').toString().charAt(0)}
      </div>
      <span className="font-medium">{row.lead_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.company_name || '—'}</span>
    </div>
  )},
  { key: 'company_name', header: 'الشركة', render: (_, row) => (
    <div className="flex items-center gap-1.5">
      <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
      <span>{row.company_name || '—'}</span>
    </div>
  )},
  { key: 'email_id', header: 'البريد', render: (value) => <span className="text-muted-foreground" dir="ltr">{String(value || '—')}</span> },
  { key: 'mobile_no', header: 'الجوال', render: (value, row) => <span dir="ltr">{String(value || row.phone || '—')}</span> },
  { key: 'status', header: 'الحالة', render: (value) => {
    const s = String(value || '');
    return <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 border-0 bg-secondary">{STATUS_AR[s] || s}</Badge>;
  }},
];

const emptyForm = {
  first_name: '',
  last_name: '',
  company_name: '',
  email_id: '',
  mobile_no: '',
  status: 'Lead',
};

export default function LeadsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { company } = useDefaultCompanyName();

  const { data, isLoading, isError, error, refetch } = useDocList<LeadRow>('Lead', {
    fields: ['name', 'lead_name', 'first_name', 'last_name', 'company_name', 'email_id', 'mobile_no', 'phone', 'status'],
    limit: 400,
    order_by: 'modified desc',
  });
  const createMutation = useCreateDoc('Lead');
  const deleteMutation = useDeleteDoc('Lead');

  const leads = data || [];

  const handleCreate = () => {
    if (!formData.first_name.trim() && !formData.company_name.trim()) {
      toast.error('أدخل الاسم الأول أو اسم المنشأة');
      return;
    }
    const mapped = buildLeadCreate({
      first_name: formData.first_name || undefined,
      last_name: formData.last_name || undefined,
      company_name: formData.company_name || undefined,
      email_id: formData.email_id || undefined,
      mobile_no: formData.mobile_no || undefined,
      status: formData.status,
      company: company || undefined,
    });
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم إنشاء العميل المحتمل'); setDialogOpen(false); setFormData({ ...emptyForm }); },
      onError: () => toast.error('فشل الإنشاء'),
    });
  };

  const handleDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.name, {
      onSuccess: () => { toast.success('تم الحذف'); setDeleteDialogOpen(false); setSelected(null); },
      onError: () => toast.error('فشل الحذف'),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="العملاء المحتملون"
        description="إدارة العملاء المحتملين ومتابعة حالات التحويل عبر مراحل التواصل والصفقات"
        iconify="solar:user-plus-rounded-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'العملاء المحتملون' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />عميل محتمل
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <span>عميل محتمل جديد</span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات العميل المحتمل</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-primary/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <UserPlus className="h-3 w-3 text-primary" />
                    </span>
                    البيانات الشخصية
                  </h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold">الاسم الأول <span className="text-destructive text-xs">*</span></Label>
                      <Input value={formData.first_name} onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))} className="h-10" placeholder="الاسم الأول" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold">اسم العائلة</Label>
                      <Input value={formData.last_name} onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))} className="h-10" placeholder="اسم العائلة" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">اسم المنشأة (بديل عن الاسم)</Label>
                    <Input value={formData.company_name} onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))} className="h-10" placeholder="اسم المنشأة" />
                  </div>
                </div>
              </fieldset>
              <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
                <div className="bg-gradient-to-l from-info/[0.04] via-transparent to-transparent px-4 py-2.5 border-b border-border/30">
                  <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-info/10 flex items-center justify-center">
                      <Building2 className="h-3 w-3 text-info" />
                    </span>
                    معلومات الاتصال
                  </h4>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold">البريد الإلكتروني</Label>
                      <Input dir="ltr" type="email" value={formData.email_id} onChange={(e) => setFormData((p) => ({ ...p, email_id: e.target.value }))} className="h-10" placeholder="email@company.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-semibold">رقم الجوال</Label>
                      <Input dir="ltr" value={formData.mobile_no} onChange={(e) => setFormData((p) => ({ ...p, mobile_no: e.target.value }))} className="h-10" placeholder="05xxxxxxxx" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold">الحالة</Label>
                    <select className="w-full h-10 rounded-md border border-border/40 bg-background px-3 text-sm" value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}>
                      {['Lead', 'Open', 'Replied', 'Interested', 'Opportunity', 'Quotation', 'Converted', 'Lost Quotation', 'Do Not Contact'].map((s) => (
                        <option key={s} value={s}>{STATUS_AR[s] || s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
              <Button disabled={createMutation.isPending} onClick={handleCreate} className="gap-1.5 min-w-[130px]">
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <DataTable
        data={leads}
        columns={columns}
        searchable
        loading={isLoading}
        onDelete={(row) => { setSelected(row); setDeleteDialogOpen(true); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف عميل محتمل؟</AlertDialogTitle><AlertDialogDescription>{selected?.name}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
