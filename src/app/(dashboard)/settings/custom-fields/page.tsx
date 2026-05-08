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
import { FormInput, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiCallMethod } from '@/lib/client/api';
import { useCreateDoc, useDeleteDoc, useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';

type Row = {
  name: string;
  dt?: string;
  label?: string;
  fieldname?: string;
  fieldtype?: string;
  options?: string;
  reqd?: number;
  unique?: number;
  in_list_view?: number;
};

const FIELD_TYPES = [
  'Data',
  'Small Text',
  'Text',
  'Int',
  'Float',
  'Currency',
  'Check',
  'Date',
  'Datetime',
  'Select',
  'Link',
  'Dynamic Link',
  'Table',
  'HTML Editor',
  'Attach',
  'Attach Image',
] as const;

export default function CustomFieldsPage() {
  const [open, setOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const [dt, setDt] = useState('');
  const [label, setLabel] = useState('');
  const [fieldname, setFieldname] = useState('');
  const [fieldtype, setFieldtype] = useState<string>('Data');
  const [options, setOptions] = useState('');
  const [insertAfter, setInsertAfter] = useState('reference_no');
  const [reqd, setReqd] = useState(false);
  const [uniq, setUniq] = useState(false);
  const [listView, setListView] = useState(false);

  const list = useDocList<Row>('Custom Field', {
    fields: ['name', 'dt', 'label', 'fieldname', 'fieldtype', 'options', 'reqd', 'unique', 'in_list_view'],
    limit: 500,
    order_by: 'modified desc',
  });

  const createMut = useCreateDoc('Custom Field');
  const deleteMut = useDeleteDoc('Custom Field');

  const columns: Column<Row>[] = useMemo(
    () => [
      { key: 'dt', header: 'نوع المستند', sortable: true },
      { key: 'label', header: 'التسمية', render: (v) => String(v || '—') },
      { key: 'fieldname', header: 'اسم الحقل', render: (v) => <span dir="ltr" className="font-mono text-xs">{String(v || '—')}</span> },
      { key: 'fieldtype', header: 'النوع' },
      {
        key: 'options',
        header: 'خيارات',
        render: (v) => <span className="text-[10px] text-muted-foreground line-clamp-2">{String(v || '—')}</span>,
      },
      { key: 'reqd', header: 'إلزامي', render: (v) => (Number(v) === 1 ? 'نعم' : 'لا') },
      { key: 'unique', header: 'فريد', render: (v) => (Number(v) === 1 ? 'نعم' : 'لا') },
      { key: 'in_list_view', header: 'قائمة', render: (v) => (Number(v) === 1 ? 'نعم' : 'لا') },
      {
        key: '_delete_cf',
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
      },
    ],
    []
  );

  const create = () => {
    if (!dt || !label?.trim() || !fieldname.trim()) {
      toast.error('اختر نوع المستند وأدخل التسمية واسم الحقل');
      return;
    }
    const fn = fieldname.trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z][a-z0-9_]*$/.test(fn)) {
      toast.error('اسم الحقل: أحرف إنجليزية صغيرة وأرقام وشرطة سفلية فقط');
      return;
    }
    if ((fieldtype === 'Select' || fieldtype === 'Link') && !options.trim()) {
      toast.error('أدخل خيارات الحقل (أسطر لـ Select أو اسم DocType لـ Link)');
      return;
    }

    const doc: Record<string, unknown> = {
      doctype: 'Custom Field',
      dt,
      label: label.trim(),
      fieldname: fn,
      fieldtype,
      reqd: reqd ? 1 : 0,
      unique: uniq ? 1 : 0,
      in_list_view: listView ? 1 : 0,
    };
    if (insertAfter.trim()) doc.insert_after = insertAfter.trim();
    if (options.trim()) {
      doc.options = fieldtype === 'Select' ? options.trim().replace(/,/g, '\n') : options.trim();
    }

    createMut.mutate(doc, {
      onSuccess: () => {
        toast.success('تم إنشاء الحقل — قد تحتاج لمزامنة النموذج في الخادم');
        setOpen(false);
        setLabel('');
        setFieldname('');
        setOptions('');
      },
      onError: () =>
        toast.error('فشل الإنشاء — تحقق من الصلاحيات أو من عدم تكرار اسم الحقل على نفس المستند'),
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteMut.mutate(toDelete.name, {
      onSuccess: () => {
        toast.success('تم حذف تعريف الحقل');
        setDeleteOpen(false);
        setToDelete(null);
      },
      onError: () => toast.error('تعذر الحذف — قد يكون الحقل مستخدماً'),
    });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

      <PageHeader
        title="الحقول المخصصة"
        description="مصمّم حقول مرتبط بنوع المستند — يُحفظ كسجل حقل مخصص"
        iconify="solar:clipboard-list-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'حقول مخصصة' }]}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                حقل جديد
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle>إنشاء حقل مخصص</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto">
                <div className="space-y-1">
                  <Label className="text-xs">نوع المستند (DocType)</Label>
                  <ErpLinkCombobox doctype="DocType" value={dt} onChange={setDt} placeholder="فاتورة مبيعات…" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">التسمية المعروضة</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="حقل إضافي" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">اسم الحقل (بالإنجليزية)</Label>
                  <Input dir="ltr" className="font-mono text-sm" value={fieldname} onChange={(e) => setFieldname(e.target.value)} placeholder="custom_notes" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">نوع البيانات</Label>
                    <Select value={fieldtype} onValueChange={setFieldtype}>
                      <SelectTrigger dir="rtl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="max-h-56">
                        {FIELD_TYPES.map((ft) => (
                          <SelectItem key={ft} value={ft}>
                            {ft}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">إدراج بعد (حقل مرجعي)</Label>
                    <Input dir="ltr" value={insertAfter} onChange={(e) => setInsertAfter(e.target.value)} placeholder="reference_no" />
                  </div>
                </div>
                {(fieldtype === 'Select' || fieldtype === 'Link') && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {fieldtype === 'Select' ? 'خيارات (سطر لكل خيار)' : 'اختيارات DocType لـ Link'}
                    </Label>
                    <Textarea
                      dir="ltr"
                      rows={fieldtype === 'Select' ? 4 : 1}
                      className="font-mono text-xs"
                      value={options}
                      onChange={(e) => setOptions(e.target.value)}
                      placeholder={fieldtype === 'Select' ? 'Option A\nOption B' : 'Customer'}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={reqd} onChange={(e) => setReqd(e.target.checked)} />
                    إلزامي
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={uniq} onChange={(e) => setUniq(e.target.checked)} />
                    فريد
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={listView} onChange={(e) => setListView(e.target.checked)} />
                    في قائمة العرض
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button type="button" onClick={create} disabled={createMut.isPending}>
                  {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  حفظ
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-xl border border-border/40 bg-muted/15 px-3 py-2 text-xs text-muted-foreground leading-relaxed flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <FormInput className="h-3.5 w-3.5" />
          بعد إنشاء حقل مخصص، اضغط على زر مسح الذاكرة المؤقتة لتحديث النماذج.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 shrink-0"
          disabled={clearingCache}
          onClick={async () => {
            setClearingCache(true);
            try {
              await apiCallMethod('frappe.client.clear_cache');
              toast.success('تم مسح الذاكرة المؤقتة بنجاح');
            } catch {
              toast.error('فشل مسح الذاكرة المؤقتة — تحقق من الصلاحيات');
            } finally {
              setClearingCache(false);
            }
          }}
        >
          {clearingCache ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          مسح الذاكرة المؤقتة
        </Button>
      </div>

      <DataTable data={list.data || []} columns={columns} searchable loading={list.isLoading} pageSize={15} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحقل المخصص؟</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs dir-ltr">{toDelete?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
