'use client';

import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import {
 Dialog,
 DialogContent,
 DialogFooter,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { BellPlus, Loader2, Trash2 } from 'lucide-react';
import { useCreateDoc, useDeleteDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';

type NotifRow = {
 name: string;
 subject?: string;
 document_type?: string;
 event?: string;
 channel?: string;
 enabled?: number;
};

const EVENT_OPTIONS = ['New', 'Save', 'Submit', 'Cancel', 'Value Change', 'Days After', 'Days Before'] as const;
const EVENT_AR: Record<string, string> = { New: 'جديد', Save: 'حفظ', Submit: 'اعتماد', Cancel: 'إلغاء', 'Value Change': 'تغيير قيمة', 'Days After': 'بعد أيام', 'Days Before': 'قبل أيام' };

const CHANNEL_OPTIONS = ['Email', 'SMS', 'System Notification'] as const;
const CHANNEL_AR: Record<string, string> = { Email: 'بريد إلكتروني', SMS: 'رسالة SMS', 'System Notification': 'إشعار نظام' };

const dataColumns: Column<NotifRow>[] = [
 { key: 'name', header: 'المعرّف', sortable: true, width: 'w-36' },
 { key: 'subject', header: 'العنوان', sortable: true },
 { key: 'document_type', header: 'المستند', render: (v) => <span className="text-xs">{String(v || '—')}</span> },
 { key: 'event', header: 'الحدث', render: (v) => <span className="text-xs font-medium">{String(v || '—')}</span> },
 { key: 'channel', header: 'القناة', render: (v) => String(v || '—') },
];

export default function NotificationRulesPage() {
 const [open, setOpen] = useState(false);
 const [ruleName, setRuleName] = useState('');
 const [documentType, setDocumentType] = useState('');
 const [event, setEvent] = useState<string>('Submit');
 const [channel, setChannel] = useState<string>('Email');
 const [subject, setSubject] = useState('');
 const [message, setMessage] = useState('{% if doc %}{{ doc.name }}{% endif %}');
 const [deleteOpen, setDeleteOpen] = useState(false);
 const [toDelete, setToDelete] = useState<NotifRow | null>(null);

 const list = useDocList<NotifRow>('Notification', {
 fields: ['name', 'subject', 'document_type', 'event', 'channel', 'enabled'],
 limit: 300,
 order_by: 'modified desc',
 });

 const createMut = useCreateDoc('Notification');
 const updateMut = useUpdateDoc('Notification');
 const deleteMut = useDeleteDoc('Notification');

 const rows = list.data || [];

 const extendedColumns: Column<NotifRow>[] = useMemo(() => {
 const toggleCol: Column<NotifRow> = {
  key: '_toggle_enabled',
  header: 'تشغيل',
  width: 'w-24',
  render: (_v, row) => (
  <Switch
   checked={Number(row.enabled) === 1}
   onCheckedChange={(checked) => {
   updateMut.mutate(
    { name: row.name, doc: { enabled: checked ? 1 : 0 } },
    {
    onSuccess: () => toast.success('تم تحديث القاعدة'),
    onError: () => toast.error('فشل التحديث — قد تتطلب صلاحية مدير النظام'),
    }
   );
   }}
   disabled={updateMut.isPending}
   aria-label={`تفعيل ${row.name}`}
  />
  ),
 };
 const deleteCol: Column<NotifRow> = {
  key: '_delete',
  header: '',
  width: 'w-12',
  render: (_v, row) => (
  <Button
   type="button"
   variant="ghost"
   size="icon"
   className="h-8 w-8 text-destructive hover:text-destructive"
   onClick={() => {
   setToDelete(row);
   setDeleteOpen(true);
   }}
   aria-label="حذف"
  >
   <Trash2 className="h-4 w-4" />
  </Button>
  ),
 };
 return [dataColumns[0]!, toggleCol, ...dataColumns.slice(1), deleteCol];
 }, [updateMut]);

 const submitCreate = () => {
 const nm = ruleName.trim().replace(/\s+/g, '-');
 if (!nm || !documentType || !subject.trim()) {
  toast.error('أكمل المعرّف ونوع المستند والعنوان');
  return;
 }
 const doc: Record<string, unknown> = {
  doctype: 'Notification',
  name: nm,
  enabled: 1,
  channel,
  document_type: documentType,
  event,
  subject: subject.trim(),
  message: message.trim() || '{{ doc.name }}',
  condition_type: 'Python',
  send_to_all_assignees: channel === 'Email' || channel === 'SMS' ? 1 : 0,
  send_system_notification: channel === 'System Notification' ? 1 : 0,
 };
 createMut.mutate(doc, {
  onSuccess: () => {
  toast.success('تم إنشاء قاعدة الإرسال');
  setOpen(false);
  setRuleName('');
  setSubject('');
  },
  onError: () =>
  toast.error('فشل الإنشاء — غالباً يلزم دور «مدير النظام» أو معرّف مكرر'),
 });
 };

 const confirmDelete = () => {
 if (!toDelete) return;
 deleteMut.mutate(toDelete.name, {
  onSuccess: () => {
  toast.success('تم الحذف');
  setDeleteOpen(false);
  setToDelete(null);
  },
  onError: () => toast.error('تعذر الحذف'),
 });
 };

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

  <PageHeader
  title="قواعد الإرسال الآلي"
  description="بريد أو SMS أو إشعار نظام عند أحداث المستندات — عبر محرك إشعارات النظام (قد تتطلب إعداد قنوات البريد أو SMS من صفحة بريد SMTP)"
  iconify="solar:letter-bold-duotone"
  accent="primary"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'قواعد الإرسال' }]}
  actions={
   <Dialog open={open} onOpenChange={setOpen}>
   <DialogTrigger asChild>
    <Button size="sm" className="gap-1.5">
    <BellPlus className="h-3.5 w-3.5" />
    قاعدة جديدة
    </Button>
   </DialogTrigger>
   <DialogContent dir="rtl" className="max-w-lg">
    <DialogHeader>
    <DialogTitle>قاعدة إرسال</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
    <div className="space-y-1">
     <Label className="text-xs">معرّف القاعدة (بالإنجليزية، بدون مسافات)</Label>
     <Input
     dir="ltr"
     value={ruleName}
     onChange={(e) => setRuleName(e.target.value)}
     placeholder="notify-sales-submit"
     />
    </div>
    <div className="space-y-1">
     <Label className="text-xs">نوع المستند</Label>
     <ErpLinkCombobox
     doctype="DocType"
     value={documentType}
     onChange={setDocumentType}
     placeholder="فاتورة مبيعات…"
     />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
     <div className="space-y-1">
     <Label className="text-xs">الحدث</Label>
     <Select value={event} onValueChange={setEvent}>
      <SelectTrigger dir="rtl">
      <SelectValue />
      </SelectTrigger>
      <SelectContent dir="rtl">
      {EVENT_OPTIONS.map((ev) => (
       <SelectItem key={ev} value={ev}>
       {EVENT_AR[ev] || ev}
       </SelectItem>
      ))}
      </SelectContent>
     </Select>
     </div>
     <div className="space-y-1">
     <Label className="text-xs">القناة</Label>
     <Select value={channel} onValueChange={setChannel}>
      <SelectTrigger dir="rtl">
      <SelectValue />
      </SelectTrigger>
      <SelectContent dir="rtl">
      {CHANNEL_OPTIONS.map((ch) => (
       <SelectItem key={ch} value={ch}>
       {CHANNEL_AR[ch] || ch}
       </SelectItem>
      ))}
      </SelectContent>
     </Select>
     </div>
    </div>
    <div className="space-y-1">
     <Label className="text-xs">العنوان (يدعم Jinja)</Label>
     <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="فاتورة {{ doc.name }}" />
    </div>
    <div className="space-y-1">
     <Label className="text-xs">الرسالة (Jinja)</Label>
     <Textarea
     rows={5}
     dir="ltr"
     className="font-mono text-xs"
     value={message}
     onChange={(e) => setMessage(e.target.value)}
     />
    </div>
    <p className="text-[11px] text-muted-foreground leading-relaxed">
     يُرسل للمعيّنين على المستند عند تفعيل «إرسال لجميع المُعيَّنين». SMS يحتاج ضبط بوابة SMS من صفحة إعدادات البريد والتكاملات.
    </p>
    </div>
    <DialogFooter>
    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
     إلغاء
    </Button>
    <Button type="button" onClick={submitCreate} disabled={createMut.isPending}>
     {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
     حفظ
    </Button>
    </DialogFooter>
   </DialogContent>
   </Dialog>
  }
  />

  <DataTable
  data={rows}
  columns={extendedColumns}
  searchable
  loading={list.isLoading}
  pageSize={12}
  />

  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle>حذف القاعدة؟</AlertDialogTitle>
   <AlertDialogDescription>
    {toDelete?.name} — لا يمكن التراجع من النظام عبر هذا الإجراء إلا باستعادة يدوية.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter className="gap-2 sm:gap-0">
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction onClick={confirmDelete} variant="destructive">
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
