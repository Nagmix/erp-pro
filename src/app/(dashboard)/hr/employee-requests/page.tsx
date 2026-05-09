'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { DocStatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc, useSubmitDoc, useDoc } from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { buildAttendanceRequestCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type RequestRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  from_date?: string;
  to_date?: string;
  reason?: string;
  explanation?: string;
  custom_request_category?: string;
  custom_attachment_url?: string;
  docstatus?: number;
  half_day?: number;
  half_day_date?: string;
  shift?: string;
};

const columns: Column<RequestRow>[] = [
  { key: 'name', header: 'الرقم', width: 'w-28', render: (v) => <span className="font-medium text-primary text-xs">{String(v)}</span> },
  { key: 'employee_name', header: 'الموظف', render: (_, row) => <span className="font-medium">{row.employee_name || row.employee || '—'}</span> },
  { key: 'from_date', header: 'من', render: (v) => (v ? formatDate(String(v)) : '—') },
  { key: 'to_date', header: 'إلى', render: (v) => (v ? formatDate(String(v)) : '—') },
  { key: 'reason', header: 'السبب', render: (v) => <span className="text-xs">{String(v || '—')}</span> },
  { key: 'docstatus', header: 'المستند', render: (v) => <DocStatusBadge docstatus={Number(v ?? 0) as 0 | 1 | 2} /> },
];

const initialForm = {
  employee: '',
  from_date: '',
  to_date: '',
  reason: 'Work From Home' as 'Work From Home' | 'On Duty',
  request_category: 'Change Shift',
  explanation: '',
  attachment_url: '',
  half_day: false,
  half_day_date: '',
  shift: '',
};

export default function EmployeeRequestsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<RequestRow | null>(null);
  const [formData, setFormData] = useState({ ...initialForm });
  const { company, isLoading: coLoading } = useDefaultCompanyName();

  // Edit state
  const [editingDoc, setEditingDoc] = useState<RequestRow | null>(null);
  const { data: editFullDoc } = useDoc<RequestRow>('Attendance Request', editingDoc?.name ?? '', { enabled: !!editingDoc && dialogOpen });

  const { data, isLoading, isError, error, refetch } = useDocList<RequestRow>('Attendance Request', {
    fields: ['name', 'employee', 'employee_name', 'from_date', 'to_date', 'reason', 'explanation', 'custom_request_category', 'custom_attachment_url', 'docstatus'],
    limit: 300,
    order_by: 'modified desc',
  });
  const createMutation = useCreateDoc('Attendance Request');
  const updateMutation = useUpdateDoc('Attendance Request');
  const deleteMutation = useDeleteDoc('Attendance Request');
  const submitMut = useSubmitDoc('Attendance Request');

  const requests = data ?? [];
  const draftCount = requests.filter((r) => Number(r.docstatus) === 0).length;
  const submittedCount = requests.filter((r) => Number(r.docstatus) === 1).length;
  const drafts = requests.filter((r) => Number(r.docstatus) === 0);

  const openCreateDialog = () => {
    setEditingDoc(null);
    setFormData({ ...initialForm });
    setDialogOpen(true);
  };

  const openEditDialog = (row: RequestRow) => {
    if (Number(row.docstatus) !== 0) { toast.error('لا يمكن تعديل مستند معتمد'); return; }
    setEditingDoc(row);
    // Populate form from row data
    let explanation = row.explanation || '';
    let requestCategory = 'Change Shift';
    let attachmentUrl = '';
    // Parse explanation for category and attachment
    if (explanation.includes('RequestCategory:')) {
      const catMatch = explanation.match(/RequestCategory:\s*(.+)/);
      if (catMatch) requestCategory = catMatch[1].trim();
      explanation = explanation.replace(/RequestCategory:\s*.+\n?/, '');
    }
    if (explanation.includes('Attachment:')) {
      const attMatch = explanation.match(/Attachment:\s*(.+)/);
      if (attMatch) attachmentUrl = attMatch[1].trim();
      explanation = explanation.replace(/Attachment:\s*.+\n?/, '');
    }
    setFormData({
      employee: row.employee || '',
      from_date: row.from_date || '',
      to_date: row.to_date || '',
      reason: (row.reason as 'Work From Home' | 'On Duty') || 'Work From Home',
      request_category: row.custom_request_category || requestCategory,
      explanation: explanation.trim(),
      attachment_url: row.custom_attachment_url || attachmentUrl,
      half_day: Boolean(row.half_day),
      half_day_date: row.half_day_date || '',
      shift: row.shift || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.employee || !company) { toast.error('اختر موظفاً وتأكد من الشركة'); return; }
    if (!formData.from_date || !formData.to_date) { toast.error('حدد فترة الطلب'); return; }

    if (editingDoc) {
      updateMutation.mutate({
        name: editingDoc.name,
        doc: {
          from_date: formData.from_date,
          to_date: formData.to_date,
          reason: formData.reason,
          explanation: [
            `RequestCategory: ${formData.request_category}`,
            formData.explanation || '',
            formData.attachment_url ? `Attachment: ${formData.attachment_url}` : '',
          ].filter(Boolean).join('\n'),
          half_day: formData.half_day ? 1 : 0,
          half_day_date: formData.half_day ? formData.half_day_date || undefined : undefined,
          shift: formData.shift || undefined,
        },
      }, {
        onSuccess: () => { toast.success('تم تعديل الطلب'); setDialogOpen(false); setEditingDoc(null); setFormData({ ...initialForm }); },
        onError: () => toast.error('تعذر التعديل'),
      });
    } else {
      const mapped = buildAttendanceRequestCreate({
        employee: formData.employee,
        company,
        from_date: formData.from_date,
        to_date: formData.to_date,
        reason: formData.reason,
        explanation: [
          `RequestCategory: ${formData.request_category}`,
          formData.explanation || '',
          formData.attachment_url ? `Attachment: ${formData.attachment_url}` : '',
        ].filter(Boolean).join('\n'),
        half_day: formData.half_day,
        half_day_date: formData.half_day ? formData.half_day_date || undefined : undefined,
        shift: formData.shift || undefined,
      });
      createMutation.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => {
          toast.success('تم إنشاء الطلب');
          setDialogOpen(false);
          setFormData({ ...initialForm });
        },
        onError: () => toast.error('تعذر الإنشاء — تحقق من HRMS'),
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) { setEditingDoc(null); setFormData({ ...initialForm }); }
  };

  const handleDelete = (row: RequestRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => { toast.success('تم الحذف'); setDeleteDialog(null); },
      onError: () => toast.error('الحذف متاح للمسودات غالباً'),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="طلبات الحضور"
        description="إدارة طلبات الحضور للعمل عن بُعد أو المهام الخارجية."
        iconify="solar:clipboard-list-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'طلبات الحضور' }]}
        actions={<Button size="sm" className="gap-1.5" disabled={coLoading} onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />طلب جديد</Button>}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>{editingDoc ? `تعديل طلب الحضور — ${editingDoc.name}` : 'طلب حضور'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-xs">الموظف</Label><ErpLinkCombobox doctype="Employee" value={formData.employee} onChange={(v) => setFormData((p) => ({ ...p, employee: v }))} displayKey="employee_name" disabled={!!editingDoc} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label className="text-xs">من</Label><Input type="date" dir="ltr" value={formData.from_date} onChange={(e) => setFormData((p) => ({ ...p, from_date: e.target.value }))} /></div>
              <div className="space-y-2"><Label className="text-xs">إلى</Label><Input type="date" dir="ltr" value={formData.to_date} onChange={(e) => setFormData((p) => ({ ...p, to_date: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label className="text-xs">السبب</Label>
              <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={formData.reason} onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value as 'Work From Home' | 'On Duty' }))}>
                <option value="Work From Home">عمل عن بُعد</option>
                <option value="On Duty">مهمة / خارج الموقع</option>
              </select>
            </div>
            <div className="space-y-2"><Label className="text-xs">نوع طلب الموظف</Label>
              <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={formData.request_category} onChange={(e) => setFormData((p) => ({ ...p, request_category: e.target.value }))}>
                <option value="Change Shift">تغيير وردية</option>
                <option value="Promotion">ترقية</option>
                <option value="Transfer">نقل</option>
                <option value="Other">أخرى</option>
              </select>
            </div>
            <div className="space-y-2"><Label className="text-xs">وردية (اختياري)</Label><ErpLinkCombobox doctype="Shift Type" value={formData.shift} onChange={(v) => setFormData((p) => ({ ...p, shift: v }))} placeholder="—" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="hd" checked={formData.half_day} onChange={(e) => setFormData((p) => ({ ...p, half_day: e.target.checked }))} /><Label htmlFor="hd" className="text-xs">نصف يوم</Label></div>
            {formData.half_day && (
              <div className="space-y-2"><Label className="text-xs">تاريخ نصف اليوم</Label><Input type="date" dir="ltr" value={formData.half_day_date} onChange={(e) => setFormData((p) => ({ ...p, half_day_date: e.target.value }))} /></div>
            )}
            <div className="space-y-2"><Label className="text-xs">ملاحظات</Label><Textarea rows={2} value={formData.explanation} onChange={(e) => setFormData((p) => ({ ...p, explanation: e.target.value }))} /></div>
            <div className="space-y-2"><Label className="text-xs">رابط مرفق (اختياري)</Label><Input dir="ltr" value={formData.attachment_url} onChange={(e) => setFormData((p) => ({ ...p, attachment_url: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? 'جاري الحفظ...' : editingDoc ? 'حفظ التعديل' : 'حفظ مسودة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><ClipboardList className="h-4 w-4 text-primary" /><div><p className="text-[10px] text-muted-foreground">الإجمالي</p><p className="text-sm font-bold">{requests.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">مسودة</p><p className="text-sm font-bold">{draftCount}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">مُرحَّل</p><p className="text-sm font-bold text-green-600">{submittedCount}</p></CardContent></Card>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        searchable
        loading={isLoading}
        onEdit={(row) => openEditDialog(row as RequestRow)}
        onDelete={(row) => Number((row as RequestRow).docstatus) === 0 && setDeleteDialog(row as RequestRow)}
      />

      {drafts.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/35 px-4 py-2 text-xs font-semibold">مسودات — ترحيل أو إلغاء</div>
          {drafts.map((req) => (
            <div key={req.name} className="px-4 py-3 flex items-center justify-between border-b last:border-b-0 gap-2">
              <div className="min-w-0">
                <span className="font-medium text-sm">{req.employee_name || req.employee}</span>
                <span className="text-muted-foreground text-xs me-2">{req.reason}</span>
                <span className="text-[10px] text-muted-foreground block">{req.from_date} → {req.to_date}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => submitMut.mutate(req.name, { onSuccess: () => toast.success('تم الترحيل'), onError: () => toast.error('فشل الترحيل') })} disabled={submitMut.isPending}>
                  <CheckCircle className="h-3 w-3" />ترحيل
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive" onClick={() => deleteMutation.mutate(req.name, { onSuccess: () => toast.success('تم حذف المسودة'), onError: () => toast.error('فشل الحذف') })} disabled={deleteMutation.isPending}>
                  <XCircle className="h-3 w-3" />حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف؟</AlertDialogTitle><AlertDialogDescription>{deleteDialog?.name}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)}>حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
