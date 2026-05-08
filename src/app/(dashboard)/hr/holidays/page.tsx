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
import { Plus, Trash2, Calendar, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/core/helpers';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc, useDoc } from '@/lib/client/hooks';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { buildHolidayListCreate, prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/page-header';

type HolidayChild = { holiday_date?: string; description?: string };
type HolidayListRow = {
  name: string;
  holiday_list_name?: string;
  from_date?: string;
  to_date?: string;
  total_holidays?: number;
  holidays?: HolidayChild[];
};

const columns: Column<HolidayListRow>[] = [
  { key: 'name', header: 'المعرّف', sortable: true, render: (value) => <span className="font-medium text-primary">{String(value)}</span> },
  { key: 'holiday_list_name', header: 'الاسم', render: (_, row) => <span className="font-medium">{row.holiday_list_name || row.name}</span> },
  { key: 'from_date', header: 'من', sortable: true, render: (value) => (value ? formatDate(String(value)) : '—') },
  { key: 'to_date', header: 'إلى', render: (value) => (value ? formatDate(String(value)) : '—') },
  { key: 'total_holidays', header: 'أيام', render: (value) => <span className="tabular-nums">{Number(value ?? 0)}</span> },
];

type Entry = { description: string; holiday_date: string };

const emptyEntry = (): Entry => ({ description: '', holiday_date: '' });

export default function HolidaysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<HolidayListRow | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [holidayListName, setHolidayListName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entries, setEntries] = useState<Entry[]>([emptyEntry()]);
  const { toast } = useToast();

  // Edit state
  const [editingDoc, setEditingDoc] = useState<HolidayListRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useDocList<HolidayListRow>('Holiday List', {
    fields: ['name', 'holiday_list_name', 'from_date', 'to_date', 'total_holidays'],
    limit: 200,
  });
  const { data: expandedDoc } = useDoc<HolidayListRow>('Holiday List', expandedName ?? '');
  // Fetch full doc for editing
  const { data: editDoc } = useDoc<HolidayListRow>('Holiday List', editingDoc?.name ?? '', { enabled: !!editingDoc && dialogOpen });

  const createMutation = useCreateDoc('Holiday List');
  const updateMutation = useUpdateDoc('Holiday List');
  const deleteMutation = useDeleteDoc('Holiday List');

  const holidayLists = data || [];

  const openCreateDialog = () => {
    setEditingDoc(null);
    setHolidayListName('');
    setFromDate('');
    setToDate('');
    setEntries([emptyEntry()]);
    setDialogOpen(true);
  };

  const openEditDialog = (row: HolidayListRow) => {
    setEditingDoc(row);
    setHolidayListName(row.holiday_list_name || row.name);
    setFromDate(row.from_date || '');
    setToDate(row.to_date || '');
    setEntries([emptyEntry()]);
    setDialogOpen(true);
  };

  // When editDoc loads, populate entries
  const handleEditDocLoaded = () => {
    if (editDoc && Array.isArray(editDoc.holidays) && editDoc.holidays.length > 0) {
      setEntries(editDoc.holidays.map((h: HolidayChild) => ({ description: h.description || '', holiday_date: h.holiday_date || '' })));
    }
  };

  // Trigger population when editDoc changes
  if (editingDoc && editDoc && entries.length === 1 && !entries[0].description && !entries[0].holiday_date) {
    // Use setTimeout to avoid setState during render
    setTimeout(handleEditDocLoaded, 0);
  }

  const handleSave = () => {
    if (!holidayListName.trim()) { toast({ title: 'اسم قائمة العطلات مطلوب', variant: 'destructive' }); return; }
    if (!fromDate || !toDate) { toast({ title: 'من تاريخ وإلى تاريخ مطلوبان', variant: 'destructive' }); return; }
    const rows = entries.filter((e) => e.holiday_date && e.description.trim());
    if (rows.length === 0) { toast({ title: 'أضف صفاً واحداً على الأقل (تاريخ + وصف)', variant: 'destructive' }); return; }

    if (editingDoc) {
      const holidayRows = rows.map((r) => ({ holiday_date: r.holiday_date, description: r.description.trim() }));
      updateMutation.mutate({
        name: editingDoc.name,
        doc: {
          holiday_list_name: holidayListName,
          from_date: fromDate,
          to_date: toDate,
          holidays: holidayRows,
        },
      }, {
        onSuccess: () => { toast({ title: 'تم تعديل قائمة العطلات' }); setDialogOpen(false); setEditingDoc(null); },
        onError: () => toast({ title: 'تعذر التعديل', variant: 'destructive' }),
      });
    } else {
      const mapped = buildHolidayListCreate({
        holiday_list_name: holidayListName,
        from_date: fromDate,
        to_date: toDate,
        holidays: rows.map((r) => ({ holiday_date: r.holiday_date, description: r.description.trim() })),
      });
      createMutation.mutate(prepareFrappeDocForCreate(mapped), {
        onSuccess: () => {
          toast({ title: 'تم إنشاء قائمة العطلات' });
          setDialogOpen(false);
          setHolidayListName('');
          setFromDate('');
          setToDate('');
          setEntries([emptyEntry()]);
        },
        onError: () => toast({ title: 'تعذر الحفظ — تحقق من عدم تكرار الاسم والتواريخ', variant: 'destructive' }),
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) { setEditingDoc(null); setHolidayListName(''); setFromDate(''); setToDate(''); setEntries([emptyEntry()]); }
  };

  const handleDelete = (row: HolidayListRow) => {
    deleteMutation.mutate(row.name, {
      onSuccess: () => { toast({ title: 'تم الحذف' }); setDeleteDialog(null); if (expandedName === row.name) setExpandedName(null); },
      onError: () => toast({ title: 'فشل الحذف', variant: 'destructive' }),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={isError ? error : null} onRetry={() => refetch()} />

      <PageHeader
        title="العطلات"
        description="إدارة قوائم العطلات الرسمية"
        iconify="solar:calendar-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'الموارد البشرية', href: '/hr' }, { label: 'العطلات' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" />قائمة جديدة</Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDoc ? `تعديل قائمة العطلات — ${editingDoc.name}` : 'قائمة عطلات'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-xs">اسم القائمة <span className="text-destructive">*</span></Label><Input value={holidayListName} onChange={(e) => setHolidayListName(e.target.value)} placeholder="رسمية 2026" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-xs">من تاريخ</Label><Input type="date" dir="ltr" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
              <div className="space-y-2"><Label className="text-xs">إلى تاريخ</Label><Input type="date" dir="ltr" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/35 px-3 py-2 text-xs font-semibold grid grid-cols-12 gap-2"><span className="col-span-4">الوصف</span><span className="col-span-4">التاريخ</span><span className="col-span-2" /></div>
              {entries.map((item, idx) => (
                <div key={idx} className="px-3 py-2 grid grid-cols-12 gap-2 border-b last:border-b-0 items-center">
                  <Input className="col-span-4 h-8 text-xs" placeholder="وصف العطلة" value={item.description} onChange={(e) => {
                    const n = [...entries]; n[idx] = { ...n[idx], description: e.target.value }; setEntries(n);
                  }} />
                  <Input className="col-span-4 h-8 text-xs" type="date" dir="ltr" value={item.holiday_date} onChange={(e) => {
                    const n = [...entries]; n[idx] = { ...n[idx], holiday_date: e.target.value }; setEntries(n);
                  }} />
                  <Button type="button" variant="ghost" size="icon" className="col-span-2 h-8" onClick={() => entries.length > 1 && setEntries(entries.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
              <div className="p-2 flex justify-center"><Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setEntries([...entries, emptyEntry()])}><Plus className="h-3 w-3" />صف</Button></div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><Calendar className="h-4 w-4 text-primary" /><div><p className="text-[10px] text-muted-foreground">قوائم</p><p className="text-sm font-bold">{holidayLists.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><CalendarDays className="h-4 w-4 text-green-600" /><div><p className="text-[10px] text-muted-foreground">مجموع أيام العطلات</p><p className="text-sm font-bold tabular-nums">{holidayLists.reduce((s, r) => s + Number(r.total_holidays ?? 0), 0)}</p></div></CardContent></Card>
      </div>

      <DataTable
        data={holidayLists}
        columns={columns}
        searchable
        loading={isLoading}
        onEdit={(row) => openEditDialog(row)}
        onDelete={(row) => setDeleteDialog(row)}
        onView={(row) => setExpandedName(expandedName === row.name ? null : row.name)}
      />

      {expandedName && expandedDoc && Array.isArray(expandedDoc.holidays) && expandedDoc.holidays.length > 0 && (
        <div className="border rounded-lg p-3 text-xs space-y-1">
          <div className="font-semibold mb-2">تفاصيل {expandedDoc.holiday_list_name || expandedDoc.name}</div>
          {expandedDoc.holidays.map((h, i) => (
            <div key={i} className="flex justify-between gap-2 border-b border-dashed py-1 last:border-0">
              <span>{h.description || '—'}</span>
              <span dir="ltr" className="tabular-nums">{h.holiday_date ? formatDate(String(h.holiday_date)) : '—'}</span>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>حذف {deleteDialog?.name}؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
