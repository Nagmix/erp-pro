'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Clock, Sun, Moon, Sunrise, Workflow } from 'lucide-react';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildShiftTypeCreate, buildShiftAssignmentCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ShiftRow = { name: string; start_time?: string; end_time?: string };

type AssignRow = {
  name: string;
  employee_name?: string;
  shift_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  docstatus?: number;
};

const getShiftIcon = (name: string) => {
  if (name.includes('صباح')) return <Sun className="h-4 w-4 text-amber-500" />;
  if (name.includes('مسائي')) return <Moon className="h-4 w-4 text-blue-500" />;
  if (name.includes('ليل')) return <Sunrise className="h-4 w-4 text-purple-500" />;
  return <Workflow className="h-4 w-4 text-green-500" />;
};

const getShiftHours = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return (diff / 60).toFixed(1);
};

const shiftColumns: Column<ShiftRow>[] = [
  { key: 'name', header: 'الاسم', sortable: true, render: (value, row) => (
    <div className="flex items-center gap-2">
      {getShiftIcon(String(value))}
      <span className="font-medium text-primary">{String(value)}</span>
    </div>
  )},
  { key: 'start_time', header: 'البداية', render: (value) => <span className="tabular-nums font-medium" dir="ltr">{String(value || '').slice(0, 8)}</span> },
  { key: 'end_time', header: 'النهاية', render: (value) => <span className="tabular-nums font-medium" dir="ltr">{String(value || '').slice(0, 8)}</span> },
  { key: '__hours', header: 'ساعات', render: (_, row) => {
    const st = String(row.start_time || '08:00:00').slice(0, 5);
    const en = String(row.end_time || '17:00:00').slice(0, 5);
    return <span className="tabular-nums text-xs bg-muted px-2 py-0.5 rounded-full">{getShiftHours(st, en)} ساعة</span>;
  }},
];

const assignColumns: Column<AssignRow>[] = [
  { key: 'name', header: 'الرقم', render: (v) => <span className="text-primary font-medium text-xs">{String(v)}</span> },
  { key: 'employee_name', header: 'الموظف', render: (_, r) => r.employee_name || '—' },
  { key: 'shift_type', header: 'الوردية' },
  { key: 'start_date', header: 'من', render: (v) => String(v || '—') },
  { key: 'end_date', header: 'إلى', render: (v) => String(v || '—') },
  { key: 'status', header: 'الحالة' },
  { key: 'docstatus', header: 'المستند', render: (v) => (Number(v) === 1 ? 'مُرحّل' : 'مسودة') },
];

const emptyShiftForm = { name: '', start_time: '08:00', end_time: '16:00' };
const emptyAssignForm = { employee: '', shift_type: '', start_date: '', end_date: '', status: 'Active' };

export default function ShiftsPage() {
  const [tab, setTab] = useState('types');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<ShiftRow | null>(null);
  const [deleteAssign, setDeleteAssign] = useState<AssignRow | null>(null);
  const [formData, setFormData] = useState({ ...emptyShiftForm });
  const [assignForm, setAssignForm] = useState({ ...emptyAssignForm });
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const { toast } = useToast();

  // Edit state
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);
  const [editingAssign, setEditingAssign] = useState<AssignRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useDocList<ShiftRow>('Shift Type', {
    fields: ['name', 'start_time', 'end_time'],
    limit: 200,
  });
  const { data: assigns, isLoading: al, isError: ae, error: aerr, refetch: ar } = useDocList<AssignRow>('Shift Assignment', {
    fields: ['name', 'employee_name', 'shift_type', 'start_date', 'end_date', 'status', 'docstatus'],
    limit: 300,
    order_by: 'start_date desc',
  });

  const createMutation = useCreateDoc('Shift Type');
  const updateMutation = useUpdateDoc('Shift Type');
  const deleteMutation = useDeleteDoc('Shift Type');
  const createAssign = useCreateDoc('Shift Assignment');
  const updateAssign = useUpdateDoc('Shift Assignment');
  const deleteAssignMut = useDeleteDoc('Shift Assignment');

  const shifts = data || [];
  const avgHours = shifts.length > 0
    ? (shifts.reduce((s, r) => {
      const st = String(r.start_time || '08:00:00').slice(0, 5);
      const en = String(r.end_time || '17:00:00').slice(0, 5);
      return s + Number(getShiftHours(st, en));
    }, 0) / shifts.length).toFixed(1)
    : '0';

  const openShiftDialog = (row?: ShiftRow) => {
    if (row) {
      setEditingShift(row);
      setFormData({ name: row.name, start_time: String(row.start_time || '08:00').slice(0, 5), end_time: String(row.end_time || '16:00').slice(0, 5) });
    } else {
      setEditingShift(null);
      setFormData({ ...emptyShiftForm });
    }
    setDialogOpen(true);
  };

  const openAssignDialog = (row?: AssignRow) => {
    if (row) {
      setEditingAssign(row);
      setAssignForm({ employee: '', shift_type: row.shift_type || '', start_date: row.start_date || '', end_date: row.end_date || '', status: row.status || 'Active' });
    } else {
      setEditingAssign(null);
      setAssignForm({ ...emptyAssignForm });
    }
    setAssignDialog(true);
  };

  const handleSaveShift = () => {
    if (editingShift) {
      updateMutation.mutate({ name: editingShift.name, doc: { start_time: formData.start_time, end_time: formData.end_time } }, {
        onSuccess: () => { toast({ title: 'تم التعديل' }); setDialogOpen(false); setEditingShift(null); setFormData({ ...emptyShiftForm }); },
        onError: () => toast({ title: 'تعذر تعديل نوع الوردية', variant: 'destructive' }),
      });
    } else {
      if (!formData.name.trim()) { toast({ title: 'اسم الوردية مطلوب', variant: 'destructive' }); return; }
      const mapped = buildShiftTypeCreate({ name: formData.name, start_time: formData.start_time, end_time: formData.end_time });
      createMutation.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => { toast({ title: 'تمت الإضافة' }); setDialogOpen(false); setFormData({ ...emptyShiftForm }); },
        onError: () => toast({ title: 'تعذر إنشاء نوع الوردية', variant: 'destructive' }),
      });
    }
  };

  const handleSaveAssign = () => {
    if (editingAssign) {
      updateAssign.mutate({ name: editingAssign.name, doc: { shift_type: assignForm.shift_type, start_date: assignForm.start_date, end_date: assignForm.end_date || undefined, status: assignForm.status } }, {
        onSuccess: () => { toast({ title: 'تم تعديل التعيين' }); setAssignDialog(false); setEditingAssign(null); setAssignForm({ ...emptyAssignForm }); },
        onError: () => toast({ title: 'تعذر تعديل التعيين', variant: 'destructive' }),
      });
    } else {
      if (!assignForm.employee || !assignForm.shift_type || !assignForm.start_date) {
        toast({ title: 'الموظف ونوع الوردية وتاريخ البدء مطلوبة', variant: 'destructive' });
        return;
      }
      if (!company) { toast({ title: 'الشركة غير معروفة', variant: 'destructive' }); return; }
      const mapped = buildShiftAssignmentCreate({
        employee: assignForm.employee,
        company,
        shift_type: assignForm.shift_type,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || undefined,
        status: assignForm.status,
      });
      createAssign.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => { toast({ title: 'تم تعيين الوردية' }); setAssignDialog(false); setAssignForm({ ...emptyAssignForm }); },
        onError: () => toast({ title: 'تعذر تعيين الوردية', variant: 'destructive' }),
      });
    }
  };

  const handleShiftDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) { setEditingShift(null); setFormData({ ...emptyShiftForm }); }
  };

  const handleAssignDialogClose = (open: boolean) => {
    setAssignDialog(open);
    if (!open) { setEditingAssign(null); setAssignForm({ ...emptyAssignForm }); }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="الورديات"
        description="إدارة أنواع الورديات وساعات العمل"
        iconify="solar:clock-circle-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'الورديات' }]}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="types">أنواع الوردية</TabsTrigger>
            <TabsTrigger value="assign">تعيينات</TabsTrigger>
          </TabsList>
          {tab === 'types' && (
            <Button size="sm" className="gap-1.5" onClick={() => openShiftDialog()}><Plus className="h-3.5 w-3.5" />نوع وردية</Button>
          )}
          {tab === 'assign' && (
            <Button size="sm" className="gap-1.5" disabled={coLoading} onClick={() => openAssignDialog()}><Plus className="h-3.5 w-3.5" />تعيين وردية</Button>
          )}
        </div>

        <TabsContent value="types" className="space-y-4 mt-4">
          <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />
          <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">متوسط ساعات / نوع</p><p className="text-sm font-bold">{avgHours}</p></CardContent></Card>
          <DataTable data={shifts} columns={shiftColumns} searchable loading={isLoading}
            onEdit={(row) => openShiftDialog(row)}
            onDelete={(row) => setDeleteDialog(row)}
          />
        </TabsContent>

        <TabsContent value="assign" className="space-y-4 mt-4">
          <ListQueryAlert error={ae ? aerr : null} onRetry={() => ar()} />
          <DataTable data={assigns || []} columns={assignColumns} searchable loading={al}
            onEdit={(row) => {
              if (Number((row as AssignRow).docstatus) !== 0) { toast({ title: 'لا يمكن تعديل مستند معتمد', variant: 'destructive' }); return; }
              openAssignDialog(row);
            }}
            onDelete={(row) => setDeleteAssign(row)}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={handleShiftDialogClose}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingShift ? `تعديل نوع الوردية — ${editingShift.name}` : 'نوع وردية (نوع الوردية)'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-2"><Label className="text-xs">الاسم</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} disabled={!!editingShift} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-xs">بداية</Label><Input type="time" dir="ltr" value={formData.start_time} onChange={(e) => setFormData((p) => ({ ...p, start_time: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">نهاية</Label><Input type="time" dir="ltr" value={formData.end_time} onChange={(e) => setFormData((p) => ({ ...p, end_time: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSaveShift} disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialog} onOpenChange={handleAssignDialogClose}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingAssign ? `تعديل تعيين الوردية — ${editingAssign.name}` : 'تعيين وردية'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-2"><Label className="text-xs">موظف</Label><ErpLinkCombobox doctype="Employee" value={assignForm.employee} onChange={(v) => setAssignForm((p) => ({ ...p, employee: v }))} displayKey="employee_name" disabled={!!editingAssign} /></div>
            <div className="space-y-2"><Label className="text-xs">نوع الوردية</Label><ErpLinkCombobox doctype="Shift Type" value={assignForm.shift_type} onChange={(v) => setAssignForm((p) => ({ ...p, shift_type: v }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-xs">من تاريخ</Label><Input type="date" dir="ltr" value={assignForm.start_date} onChange={(e) => setAssignForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">إلى تاريخ</Label><Input type="date" dir="ltr" value={assignForm.end_date} onChange={(e) => setAssignForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">الحالة</Label>
              <Select value={assignForm.status} onValueChange={(v) => setAssignForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">نشط</SelectItem>
                  <SelectItem value="Inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveAssign} disabled={createAssign.isPending || updateAssign.isPending}>{(createAssign.isPending || updateAssign.isPending) ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف نوع الوردية؟</AlertDialogTitle><AlertDialogDescription>{deleteDialog?.name}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.name, { onSuccess: () => { toast({ title: 'تم' }); setDeleteDialog(null); } })}>حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAssign} onOpenChange={() => setDeleteAssign(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف التعيين؟</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteAssign && deleteAssignMut.mutate(deleteAssign.name, { onSuccess: () => { toast({ title: 'تم' }); setDeleteAssign(null); } })}>حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
