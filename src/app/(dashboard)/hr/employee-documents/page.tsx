'use client';

import { useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FileText, Paperclip, Clock, Users } from 'lucide-react';
import { useCreateDoc, useUpdateDoc, useDocList } from '@/lib/client/hooks';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader, KpiStrip, KpiCard } from '@/components/erp/page-header';
import { toast } from 'sonner';

type Row = { name: string; file_name?: string; attached_to_name?: string; attached_to_doctype?: string; file_url?: string; creation?: string };
const columns: Column<Row>[] = [
  { key: 'file_name', header: 'المستند' },
  { key: 'attached_to_name', header: 'الموظف' },
  { key: 'creation', header: 'تاريخ الرفع' },
];

export default function EmployeeDocumentsPage() {
  const [open, setOpen] = useState(false);
  const [employee, setEmployee] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const docs = useDocList<Row>('File', {
    fields: ['name', 'file_name', 'attached_to_name', 'attached_to_doctype', 'file_url', 'creation'],
    filters: [['attached_to_doctype', '=', 'Employee']],
    order_by: 'creation desc',
    limit: 500,
  });
  const createMut = useCreateDoc('File');
  const updateMut = useUpdateDoc('File');

  const [editingDoc, setEditingDoc] = useState<Row | null>(null);

  const openCreateDialog = () => {
    setEditingDoc(null);
    setEmployee('');
    setUrl('');
    setName('');
    setOpen(true);
  };

  const openEditDialog = (row: Row) => {
    setEditingDoc(row);
    setEmployee(row.attached_to_name || '');
    setName(row.file_name || '');
    setUrl(row.file_url || '');
    setOpen(true);
  };

  const handleSave = () => {
    if (!employee || !url || !name) return toast.error('اكمل البيانات');

    if (editingDoc) {
      updateMut.mutate({
        name: editingDoc.name,
        doc: { file_url: url, file_name: name, attached_to_name: employee },
      }, {
        onSuccess: () => { toast.success('تم تعديل المستند'); setOpen(false); setEditingDoc(null); },
        onError: () => toast.error('فشل التعديل'),
      });
    } else {
      createMut.mutate({
        doctype: 'File',
        file_url: url,
        file_name: name,
        attached_to_doctype: 'Employee',
        attached_to_name: employee,
        is_private: 1,
      }, {
        onSuccess: () => { toast.success('تم إرفاق المستند'); setOpen(false); setEmployee(''); setUrl(''); setName(''); },
        onError: () => toast.error('فشل الإرفاق'),
      });
    }
  };

  const handleDialogClose = (openVal: boolean) => {
    setOpen(openVal);
    if (!openVal) { setEditingDoc(null); setEmployee(''); setUrl(''); setName(''); }
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="مستندات الموظفين"
        description="أرشفة المستندات المرفقة لكل موظف"
        iconify="solar:folder-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'مستندات الموظفين' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />ربط مستند</Button>
        }
      />

      <KpiStrip cols={3}>
        <KpiCard title="المستندات" value={(docs.data || []).length} icon={FileText} accent="primary" description="إجمالي المستندات المرفقة" />
        <KpiCard title="موظفون لديهم مستندات" value={new Set((docs.data || []).map((d) => d.attached_to_name).filter(Boolean)).size} icon={Users} accent="info" description="مستندات مرتبطة" />
        <KpiCard title="آخر رفع" value={(docs.data || [])[0]?.creation ? new Date((docs.data || [])[0].creation!).toLocaleDateString('ar-YE') : '—'} icon={Clock} accent="success" description="تاريخ آخر مستند" />
      </KpiStrip>

      <ListQueryAlert error={docs.isError ? docs.error : null} onRetry={() => docs.refetch()} />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingDoc ? `تعديل المستند — ${editingDoc.file_name || editingDoc.name}` : 'إضافة مستند موظف'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">الموظف</Label><ErpLinkCombobox doctype="Employee" value={employee} onChange={setEmployee} displayKey="employee_name" /></div>
            <div><Label className="text-xs">اسم المستند</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="passport.pdf" /></div>
            <div><Label className="text-xs">رابط الملف (URL)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder="/files/passport.pdf" /></div>
            <Button className="w-full" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>{(createMut.isPending || updateMut.isPending) ? 'جاري الحفظ...' : editingDoc ? 'حفظ التعديل' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DataTable data={docs.data || []} columns={columns} searchable loading={docs.isLoading}
        onEdit={(row) => openEditDialog(row as Row)}
      />
    </div>
  );
}
