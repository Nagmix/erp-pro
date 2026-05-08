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
import { Plus, Target, Building2, Wallet, Calendar, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildOpportunityCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type OppRow = {
  name: string;
  party_name?: string;
  customer_name?: string;
  opportunity_from?: string;
  status?: string;
  transaction_date?: string;
  expected_closing?: string;
  opportunity_amount?: number;
};

const OPP_STATUS_AR: Record<string, string> = { Open: 'مفتوح', Quotation: 'عرض سعر', Converted: 'تم التحويل', Lost: 'مفقود', Replied: 'تم الرد', Closed: 'مغلق' };

const columns: Column<OppRow>[] = [
  { key: 'name', header: 'الرقم', render: (v) => <span className="text-xs text-primary font-medium">{String(v)}</span> },
  { key: 'customer_name', header: 'الطرف', render: (_, r) => <span className="font-medium">{r.customer_name || r.party_name || '—'}</span> },
  { key: 'opportunity_from', header: 'المصدر', render: (v) => <Badge variant="outline" className="text-[10px]">{String(v || '—')}</Badge> },
  { key: 'status', header: 'الحالة', render: (v) => OPP_STATUS_AR[String(v)] || String(v || '—') },
  { key: 'transaction_date', header: 'التاريخ', render: (v) => String(v || '—') },
  { key: 'opportunity_amount', header: 'المبلغ', render: (v) => <span className="tabular-nums">{Number(v ?? 0).toLocaleString()}</span> },
];

export default function OpportunitiesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [del, setDel] = useState<OppRow | null>(null);
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [form, setForm] = useState({
    opportunity_from: 'Lead',
    party_name: '',
    status: 'Open',
    expected_closing: '',
    opportunity_amount: '',
    currency: '',
  });

  const { data, isLoading, isError, error, refetch } = useDocList<OppRow>('Opportunity', {
    fields: ['name', 'party_name', 'customer_name', 'opportunity_from', 'status', 'transaction_date', 'expected_closing', 'opportunity_amount'],
    limit: 400,
    order_by: 'modified desc',
  });
  const createMutation = useCreateDoc('Opportunity');
  const deleteMutation = useDeleteDoc('Opportunity');

  const rows = data || [];

  const handleCreate = () => {
    if (!company) { toast.error('الشركة مطلوبة'); return; }
    if (!form.party_name) { toast.error('اختر عميلاً محتملاً أو عميلاً'); return; }
    const mapped = buildOpportunityCreate({
      opportunity_from: form.opportunity_from,
      party_name: form.party_name,
      company,
      status: form.status,
      expected_closing: form.expected_closing || undefined,
      opportunity_amount: form.opportunity_amount ? Number(form.opportunity_amount) : undefined,
      currency: form.currency || undefined,
    });
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast.success('تم إنشاء الفرصة'); setDialogOpen(false); setForm({ opportunity_from: 'Lead', party_name: '', status: 'Open', expected_closing: '', opportunity_amount: '', currency: '' }); },
      onError: () => toast.error('فشل الإنشاء — تحقق من الطرف والشركة'),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الفرص"
        description="إدارة الفرص البيعية وربطها بالعملاء المحتملين أو الحاليين ومتابعة قيمها وإغلاقها المتوقع"
        iconify="solar:target-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'علاقات العملاء', href: '/crm' }, { label: 'الفرص' }]}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" disabled={coLoading}>
                <Plus className="h-3.5 w-3.5" />فرصة جديدة
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg p-5 gap-0">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-3 text-lg font-bold">
                <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <span>فرصة جديدة</span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">أدخل بيانات الفرصة البيعية</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5"><Label className="text-[13px] font-semibold">من</Label>
                <select className="w-full h-10 rounded-md border bg-background px-2 text-sm" value={form.opportunity_from} onChange={(e) => setForm((p) => ({ ...p, opportunity_from: e.target.value, party_name: '' }))}>
                  <option value="Lead"> عميل محتمل </option>
                  <option value="Customer"> عميل حالي </option>
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-[13px] font-semibold">الطرف</Label>
                {form.opportunity_from === 'Lead' ? (
                  <ErpLinkCombobox doctype="Lead" value={form.party_name} onChange={(v) => setForm((p) => ({ ...p, party_name: v }))} displayKey="lead_name" className="h-10" />
                ) : (
                  <ErpLinkCombobox doctype="Customer" value={form.party_name} onChange={(v) => setForm((p) => ({ ...p, party_name: v }))} displayKey="customer_name" className="h-10" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">الحالة</Label>
                  <select className="w-full h-10 border rounded-md px-2 text-sm" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    {['Open', 'Quotation', 'Converted', 'Lost', 'Replied', 'Closed'].map((s) => <option key={s} value={s}>{OPP_STATUS_AR[s]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">إغلاق متوقع</Label><Input type="date" dir="ltr" value={form.expected_closing} onChange={(e) => setForm((p) => ({ ...p, expected_closing: e.target.value }))} className="h-10" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">مبلغ</Label><Input dir="ltr" type="number" value={form.opportunity_amount} onChange={(e) => setForm((p) => ({ ...p, opportunity_amount: e.target.value }))} className="h-10" /></div>
                <div className="space-y-1.5"><Label className="text-[13px] font-semibold">العملة</Label><ErpLinkCombobox doctype="Currency" value={form.currency} onChange={(v) => setForm((p) => ({ ...p, currency: v }))} placeholder="اختياري" className="h-10" /></div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border/40">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">إلغاء</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5 min-w-[130px]">
                  {createMutation.isPending ? '...' : 'حفظ'}
                </Button>
              </div>
            </div>
          </DialogContent>
          </Dialog>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
      <Card className="border-border/60"><CardContent className="p-3 flex gap-2"><Target className="h-4 w-4 text-warning" /><span className="text-sm font-medium">الفرص: <b>{rows.length}</b></span></CardContent></Card>
      <DataTable data={rows} columns={columns} searchable loading={isLoading} onDelete={(r) => setDel(r)} />

      <AlertDialog open={!!del} onOpenChange={() => setDel(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف فرصة؟</AlertDialogTitle><AlertDialogDescription>{del?.name}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => del && deleteMutation.mutate(del.name, { onSuccess: () => { toast.success('تم'); setDel(null); } })}>حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
