'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, TreePalm } from 'lucide-react';
import { useDocList, useCreateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { buildLeaveTypeCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/page-header';
import { Checkbox } from '@/components/ui/checkbox';

type LeaveTypeRow = {
  name: string;
  leave_type_name?: string;
  max_leaves_allowed?: number;
  max_leaves?: number;
  is_carry_forward?: number | boolean;
  is_lwp?: number | boolean;
  include_holiday?: number | boolean;
};

function maxLeaves(r: LeaveTypeRow): number {
  return Number(r.max_leaves_allowed ?? r.max_leaves ?? 0);
}

const columns: Column<LeaveTypeRow>[] = [
  { key: 'name', header: 'الاسم', sortable: true, render: (_, row) => <span className="font-medium text-primary">{String(row.leave_type_name || row.name)}</span> },
  { key: 'max_leaves_allowed', header: 'الحد الأقصى', sortable: true, render: (_, row) => <span className="tabular-nums font-semibold">{maxLeaves(row)} يوم</span> },
  { key: 'is_carry_forward', header: 'ترحيل الرصيد', render: (value) => (Number(value) === 1 || value === true ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">نعم</span> : <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">لا</span>) },
  { key: 'is_lwp', header: 'بدون راتب', render: (value) => (Number(value) === 1 || value === true ? <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">نعم</span> : <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">لا</span>) },
];

const initialFormData = { leave_type_name: '', max_leaves_allowed: '0', is_carry_forward: false, is_lwp: false, include_holiday: false };

export default function LeaveTypesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<LeaveTypeRow | null>(null);
  const [formData, setFormData] = useState({ ...initialFormData });
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch } = useDocList<LeaveTypeRow>('Leave Type', {
    fields: ['name', 'leave_type_name', 'max_leaves_allowed', 'is_carry_forward', 'is_lwp', 'include_holiday'],
    limit: 200,
  });
  const createMutation = useCreateDoc('Leave Type');
  const deleteMutation = useDeleteDoc('Leave Type');

  const leaveTypes = data || [];
  const totalMaxLeaves = leaveTypes.reduce((s, r) => s + maxLeaves(r), 0);
  const paidTypes = leaveTypes.filter((l) => !Number(l.is_lwp)).length;
  const carryForwardTypes = leaveTypes.filter((l) => Number(l.is_carry_forward) === 1 || l.is_carry_forward === true).length;

  const handleCreate = () => {
    if (!formData.leave_type_name.trim()) { toast({ title: 'يرجى إدخال اسم نوع الإجازة', variant: 'destructive' }); return; }
    const mapped = buildLeaveTypeCreate({
      leave_type_name: formData.leave_type_name,
      max_leaves_allowed: Number(formData.max_leaves_allowed) || 0,
      is_carry_forward: formData.is_carry_forward,
      is_lwp: formData.is_lwp,
      include_holiday: formData.include_holiday,
    });
    createMutation.mutate(prepareFrappeDocForCreate(mapped), {
      onSuccess: () => { toast({ title: 'تم إضافة نوع الإجازة بنجاح' }); setDialogOpen(false); setFormData({ ...initialFormData }); },
      onError: () => toast({ title: 'تعذر الحفظ — قد يكون الاسم مكرراً', variant: 'destructive' }),
    });
  };

  const handleDelete = (row: LeaveTypeRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => { toast({ title: 'تم حذف نوع الإجازة بنجاح' }); setDeleteDialog(null); },
      onError: () => toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' }),
    });
  };

  return (
    <div dir="rtl" className="space-y-6 erp-page-enter">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <div className="flex items-center justify-between">
        <PageHeader
          title="أنواع الإجازات"
          description="إدارة أنواع الإجازات المتاحة للموظفين"
          iconify="solar:calendar-bold-duotone"
          accent="purple"
          breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'أنواع الإجازات' }]}
        />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />نوع إجازة جديد</Button></DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>إضافة نوع إجازة</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label className="text-xs font-medium">اسم نوع الإجازة <span className="text-destructive">*</span></Label><Input placeholder="مثال: إجازة سنوية" value={formData.leave_type_name} onChange={(e) => setFormData((p) => ({ ...p, leave_type_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs font-medium">الحد الأقصى للأيام</Label><Input type="number" dir="ltr" value={formData.max_leaves_allowed} onChange={(e) => setFormData((p) => ({ ...p, max_leaves_allowed: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Checkbox id="is_carry_forward" checked={formData.is_carry_forward} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_carry_forward: !!v }))} /><Label htmlFor="is_carry_forward" className="text-xs">ترحيل الرصيد</Label></div>
                <div className="flex items-center gap-2"><Checkbox id="is_lwp" checked={formData.is_lwp} onCheckedChange={(v) => setFormData((p) => ({ ...p, is_lwp: !!v }))} /><Label htmlFor="is_lwp" className="text-xs">بدون راتب (LWP)</Label></div>
                <div className="flex items-center gap-2 col-span-2"><Checkbox id="include_holiday" checked={formData.include_holiday} onCheckedChange={(v) => setFormData((p) => ({ ...p, include_holiday: !!v }))} /><Label htmlFor="include_holiday" className="text-xs">احتساب العطل ضمن الإجازة</Label></div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><TreePalm className="h-4 w-4 text-primary" /></div><div><p className="text-[10px] text-muted-foreground">أنواع</p><p className="text-sm font-bold mt-1">{leaveTypes.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">مجموع الحدود</p><p className="text-sm font-bold tabular-nums mt-1">{totalMaxLeaves}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">مدفوعة / ترحيل</p><p className="text-xs font-medium mt-1">{paidTypes} نوع، {carryForwardTypes} بترحيل</p></CardContent></Card>
      </div>

      <DataTable data={leaveTypes} columns={columns} searchable loading={isLoading} onDelete={(row) => setDeleteDialog(row)} />

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>حذف نوع الإجازة {deleteDialog?.leave_type_name || deleteDialog?.name}؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
