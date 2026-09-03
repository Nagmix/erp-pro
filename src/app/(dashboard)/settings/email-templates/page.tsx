'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatDate } from '@/lib/core/helpers';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
 DialogFooter,
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
import { toast } from 'sonner';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { apiGetList } from '@/lib/client/api';
import { sanitizeHtml } from '@/lib/client/sanitize';
import {
 Mail,
 Eye,
 Info,
 Loader2,
} from 'lucide-react';

/* ─── ERPNext Email Template Doctype Fields ─── */
type EmailTemplate = {
 name: string;
 subject?: string;
 response?: string;
 reference_doctype?: string;
 reference_name?: string;
 use_html?: number | boolean;
 owner?: string;
 modified?: string;
};

const DOCTYPE_OPTIONS = [
 { value: 'Sales Invoice', label: 'فاتورة مبيعات' },
 { value: 'Purchase Invoice', label: 'فاتورة مشتريات' },
 { value: 'Payment Entry', label: 'سند دفع' },
 { value: 'Quotation', label: 'عرض سعر' },
 { value: 'Sales Order', label: 'أمر بيع' },
 { value: 'Delivery Note', label: 'إشعار تسليم' },
];

const VARIABLES_BY_DOCTYPE: Record<string, string[]> = {
 'Sales Invoice': ['doc.name', 'doc.customer_name', 'doc.grand_total', 'doc.due_date', 'doc.posting_date', 'doc.outstanding_amount', 'doc.currency'],
 'Purchase Invoice': ['doc.name', 'doc.supplier_name', 'doc.grand_total', 'doc.due_date', 'doc.posting_date', 'doc.currency'],
 'Payment Entry': ['doc.name', 'doc.party_name', 'doc.paid_amount', 'doc.posting_date', 'doc.reference_no', 'doc.mode_of_payment'],
 'Quotation': ['doc.name', 'doc.customer_name', 'doc.grand_total', 'doc.valid_till', 'doc.posting_date'],
 'Sales Order': ['doc.name', 'doc.customer_name', 'doc.grand_total', 'doc.delivery_date', 'doc.posting_date'],
 'Delivery Note': ['doc.name', 'doc.customer_name', 'doc.posting_date'],
};

/* ── حقول الجلب لكل نوع مستند ── */
const FETCH_FIELDS_BY_DOCTYPE: Record<string, string[]> = {
 'Sales Invoice': ['name', 'customer_name', 'grand_total', 'due_date', 'posting_date', 'outstanding_amount', 'currency'],
 'Purchase Invoice': ['name', 'supplier_name', 'grand_total', 'due_date', 'posting_date', 'currency'],
 'Payment Entry': ['name', 'party_name', 'paid_amount', 'posting_date', 'reference_no', 'mode_of_payment'],
 'Quotation': ['name', 'customer_name', 'grand_total', 'valid_till', 'posting_date'],
 'Sales Order': ['name', 'customer_name', 'grand_total', 'delivery_date', 'posting_date'],
 'Delivery Note': ['name', 'customer_name', 'posting_date'],
};

/* ─ـ بيانات نموذجية بسيطة ── */
const MINIMAL_PLACEHOLDER: Record<string, Record<string, string>> = {
 'Sales Invoice': { name: '—', customer_name: '—', grand_total: '0', due_date: '—', posting_date: '—', outstanding_amount: '0', currency: 'YER' },
 'Purchase Invoice': { name: '—', supplier_name: '—', grand_total: '0', due_date: '—', posting_date: '—', currency: 'YER' },
 'Payment Entry': { name: '—', party_name: '—', paid_amount: '0', posting_date: '—', reference_no: '—', mode_of_payment: '—' },
 'Quotation': { name: '—', customer_name: '—', grand_total: '0', valid_till: '—', posting_date: '—' },
 'Sales Order': { name: '—', customer_name: '—', grand_total: '0', delivery_date: '—', posting_date: '—' },
 'Delivery Note': { name: '—', customer_name: '—', posting_date: '—' },
};

/** يجلب أحدث مستند من ERPNext لنوع معين ويعيد بياناته كخريطة */
async function fetchLatestDocForDoctype(doctype: string): Promise<Record<string, string> | null> {
 try {
 const fields = FETCH_FIELDS_BY_DOCTYPE[doctype];
 if (!fields) return null;
 const rows = await apiGetList<Record<string, unknown>>(doctype, {
  fields,
  limit: 1,
  order_by: 'creation desc',
 });
 if (rows.length === 0) return null;
 const doc = rows[0]!;
 // تحويل القيم إلى نصوص
 const result: Record<string, string> = {};
 for (const [key, value] of Object.entries(doc)) {
  if (value != null) result[key] = String(value);
 }
 return result;
 } catch {
 return null;
 }
}

export default function EmailTemplatesPage() {
 /* ─── State ─── */
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingDoc, setEditingDoc] = useState<EmailTemplate | null>(null);
 const [formName, setFormName] = useState('');
 const [formSubject, setFormSubject] = useState('');
 const [formResponse, setFormResponse] = useState('');
 const [formRefDoctype, setFormRefDoctype] = useState('');
 const [formRefName, setFormRefName] = useState('');
 const [formUseHtml, setFormUseHtml] = useState(false);

 const [previewOpen, setPreviewOpen] = useState(false);
 const [previewHtml, setPreviewHtml] = useState('');
 const [previewUsingPlaceholder, setPreviewUsingPlaceholder] = useState(false);
 const [previewLoading, setPreviewLoading] = useState(false);

 // ── مخبأ بيانات المعاينة ──
 const [previewDataCache, setPreviewDataCache] = useState<Record<string, Record<string, string>>>({});

 const [deleteOpen, setDeleteOpen] = useState(false);
 const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

 /* ─── ERPNext Data Hooks ─── */
 const list = useDocList<EmailTemplate>('Email Template', {
 fields: ['name', 'subject', 'response', 'reference_doctype', 'reference_name', 'use_html', 'owner', 'modified'],
 limit: 500,
 order_by: 'modified desc',
 });

 const createMut = useCreateDoc('Email Template');
 const updateMut = useUpdateDoc('Email Template');
 const deleteMut = useDeleteDoc('Email Template');

 const rows = list.data || [];

 /* ─── Dialog Handlers ─── */
 const openCreate = () => {
 setEditingDoc(null);
 setFormName('');
 setFormSubject('');
 setFormResponse('');
 setFormRefDoctype('');
 setFormRefName('');
 setFormUseHtml(false);
 setDialogOpen(true);
 };

 const openEdit = (row: EmailTemplate) => {
 setEditingDoc(row);
 setFormName(row.name || '');
 setFormSubject(row.subject || '');
 setFormResponse(row.response || '');
 setFormRefDoctype(row.reference_doctype || '');
 setFormRefName(row.reference_name || '');
 setFormUseHtml(Number(row.use_html) === 1);
 setDialogOpen(true);
 };

 const saveTemplate = () => {
 if (!formName.trim() || !formSubject.trim() || !formResponse.trim()) {
  toast.error('أدخل اسم القالب والموضوع والمحتوى');
  return;
 }

 const doc: Record<string, unknown> = {
  doctype: 'Email Template',
  __newname: formName.trim(),
  subject: formSubject.trim(),
  response: formResponse.trim(),
  reference_doctype: formRefDoctype || undefined,
  reference_name: formRefName || undefined,
  use_html: formUseHtml ? 1 : 0,
 };

 if (editingDoc) {
  // When editing, don't send __newname
  const updateDoc: Record<string, unknown> = {
  subject: formSubject.trim(),
  response: formResponse.trim(),
  reference_doctype: formRefDoctype || undefined,
  reference_name: formRefName || undefined,
  use_html: formUseHtml ? 1 : 0,
  };
  updateMut.mutate(
  { name: editingDoc.name, doc: updateDoc },
  {
   onSuccess: () => {
   toast.success('تم تحديث القالب');
   setDialogOpen(false);
   setEditingDoc(null);
   },
   onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
  }
  );
 } else {
  createMut.mutate(doc, {
  onSuccess: () => {
   toast.success('تم إنشاء القالب');
   setDialogOpen(false);
  },
  onError: () => toast.error('فشل الإنشاء — قد يكون الاسم مكرراً'),
  });
 }
 };

 const confirmDelete = () => {
 if (!toDelete) return;
 deleteMut.mutate(toDelete.name, {
  onSuccess: () => {
  toast.success('تم حذف القالب');
  setDeleteOpen(false);
  setToDelete(null);
  },
  onError: () => toast.error('تعذر الحذف — تحقق من الصلاحيات'),
 });
 };

 /** معاينة القالب مع جلب بيانات حقيقية */
 const renderWithRealData = useCallback(async (html: string, doctype: string) => {
 setPreviewLoading(true);
 setPreviewOpen(true);
 setPreviewUsingPlaceholder(false);

 let data = previewDataCache[doctype];
 let usingPlaceholder = false;

 if (!data) {
  // محاولة جلب أحدث مستند حقيقي
  const realData = await fetchLatestDocForDoctype(doctype);
  if (realData) {
  data = realData;
  // تحديث المخبأ
  setPreviewDataCache((prev) => ({ ...prev, [doctype]: realData }));
  } else {
  // لا يوجد مستندات — استخدام بيانات نموذجية
  data = MINIMAL_PLACEHOLDER[doctype] ?? {};
  usingPlaceholder = true;
  }
 }

 // استبدال المتغيرات في القالب
 let rendered = html;
 for (const [key, value] of Object.entries(data)) {
  rendered = rendered.replaceAll(`{{doc.${key}}}`, value);
 }
 // تنظيف المتغيرات غير المستبدلة
 rendered = rendered.replace(/\{\{doc\.[^}]+\}\}/g, '—');

 setPreviewHtml(rendered);
 setPreviewUsingPlaceholder(usingPlaceholder);
 setPreviewLoading(false);
 }, [previewDataCache]);

 const openPreview = (row: EmailTemplate) => {
 const doctype = row.reference_doctype || 'Sales Invoice';
 renderWithRealData(row.response || '', doctype);
 };

 const previewCurrentForm = () => {
 const doctype = formRefDoctype || 'Sales Invoice';
 renderWithRealData(formResponse, doctype);
 };

 const isSaving = createMut.isPending || updateMut.isPending;

 /* ─── Columns ─── */
 const columns: Column<EmailTemplate>[] = useMemo(
 () => [
  {
  key: 'name',
  header: 'اسم القالب',
  sortable: true,
  render: (v) => <span className="font-medium text-xs">{String(v)}</span>,
  },
  {
  key: 'subject',
  header: 'الموضوع',
  render: (v) => (
   <span className="text-xs line-clamp-1 max-w-[250px]">{String(v || '—')}</span>
  ),
  },
  {
  key: 'reference_doctype',
  header: 'نوع المستند',
  render: (v) => {
   if (!v) return <span className="text-xs text-muted-foreground">—</span>;
   const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
   return <span className="text-xs">{opt?.label ?? String(v)}</span>;
  },
  },
  {
  key: 'use_html',
  header: 'HTML',
  render: (v) => (
   <span className="text-xs">{Number(v) === 1 ? 'نعم' : 'لا'}</span>
  ),
  },
  {
  key: 'owner',
  header: 'المُنشئ',
  render: (v) => (
   <span className="text-xs text-muted-foreground">{String(v || '—')}</span>
  ),
  },
  {
  key: 'modified',
  header: 'آخر تعديل',
  sortable: true,
  render: (v) => {
   if (!v) return <span className="text-xs text-muted-foreground">—</span>;
   return <span className="text-xs text-muted-foreground">{formatDate(String(v))}</span>;
  },
  },
 ],
 []
 );

 /* ─── Variables for current doctype ─── */
 const currentDoctype = formRefDoctype || 'Sales Invoice';
 const currentVariables = VARIABLES_BY_DOCTYPE[currentDoctype] ?? [];

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="قوالب البريد الإلكتروني"
  description="إنشاء وإدارة قوالب البريد الإلكتروني للمستندات والفواتير من ERPNext"
  iconify="solar:letter-bold-duotone"
  accent="purple"
  breadcrumbs={[{ label: 'الإعدادات' }, { label: 'قوالب البريد' }]}
  />

  <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

  <DataTable
  data={rows}
  columns={columns}
  tableId="email-templates"
  searchable
  loading={list.isLoading}
  addLabel="إنشاء قالب"
  onAdd={openCreate}
  onEdit={openEdit}
  onDelete={(row) => {
   setToDelete(row);
   setDeleteOpen(true);
  }}
  onView={(row) => openPreview(row)}
  exportFileName="قوالب-البريد-الإلكتروني"
  />

  {/* Variables Help Section */}
  <Card className="border-dashed border-border/50 bg-muted/20">
  <CardContent className="p-4 space-y-3">
   <div className="flex items-center gap-2">
   <Info className="h-4 w-4 text-chart-5 shrink-0" />
   <h3 className="text-xs font-semibold">المتغيرات المتاحة حسب نوع المستند</h3>
   </div>
   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
   {DOCTYPE_OPTIONS.map((opt) => {
    const vars = VARIABLES_BY_DOCTYPE[opt.value] ?? [];
    return (
    <div key={opt.value} className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
     <p className="text-[11px] font-semibold">{opt.label}</p>
     <div className="flex flex-wrap gap-1">
     {vars.map((v) => (
      <code
      key={v}
      className="rounded bg-chart-5/5 px-1 py-0.5 text-[9px] font-mono text-chart-5 border border-chart-5/20"
      >
      {`{{${v}}}`}
      </code>
     ))}
     </div>
    </div>
    );
   })}
   </div>
   <p className="text-[10px] text-muted-foreground">
   أدخل المتغيرات بين أقواس مزدوجة في الموضوع أو المحتوى وسيتم استبدالها بقيم المستند عند الإرسال.
   </p>
  </CardContent>
  </Card>

  {/* ─── Create/Edit Dialog ─── */}
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Mail className="h-4 w-4" />
    {editingDoc ? 'تعديل القالب' : 'إنشاء قالب جديد'}
   </DialogTitle>
   </DialogHeader>

   <div className="space-y-4">
   <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-1.5">
    <Label className="text-xs">اسم القالب *</Label>
    <Input
     className="h-9"
     value={formName}
     onChange={(e) => setFormName(e.target.value)}
     placeholder="مثال: إشعار فاتورة مبيعات"
     disabled={!!editingDoc}
    />
    {editingDoc && (
     <p className="text-[10px] text-muted-foreground">لا يمكن تغيير اسم القالب بعد الإنشاء</p>
    )}
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">نوع المستند المرجعي</Label>
    <Select
     value={formRefDoctype || '__none__'}
     onValueChange={(v) => setFormRefDoctype(v === '__none__' ? '' : v)}
    >
     <SelectTrigger className="h-9">
     <SelectValue placeholder="اختر نوع المستند" />
     </SelectTrigger>
     <SelectContent>
     <SelectItem value="__none__">— بدون —</SelectItem>
     {DOCTYPE_OPTIONS.map((o) => (
      <SelectItem key={o.value} value={o.value}>
      {o.label}
      </SelectItem>
     ))}
     </SelectContent>
    </Select>
    </div>
   </div>

   {formRefDoctype && (
    <div className="space-y-1.5">
    <Label className="text-xs">اسم المستند المرجعي</Label>
    <Input
     className="h-9"
     value={formRefName}
     onChange={(e) => setFormRefName(e.target.value)}
     placeholder="مثال: SINV-001"
     dir="ltr"
    />
    </div>
   )}

   <div className="space-y-1.5">
    <Label className="text-xs">الموضوع *</Label>
    <Input
    className="h-9"
    value={formSubject}
    onChange={(e) => setFormSubject(e.target.value)}
    placeholder="فاتورة مبيعات {{doc.name}} — {{doc.customer_name}}"
    />
   </div>

   <div className="space-y-1.5">
    <div className="flex items-center justify-between">
    <Label className="text-xs">محتوى القالب *</Label>
    <Button
     type="button"
     variant="ghost"
     size="sm"
     className="h-7 text-[10px] gap-1"
     onClick={previewCurrentForm}
    >
     <Eye className="h-3 w-3" />
     معاينة
    </Button>
    </div>
    <Textarea
    rows={12}
    value={formResponse}
    onChange={(e) => setFormResponse(e.target.value)}
    placeholder={`<div style="font-family: system-ui, sans-serif; direction: rtl;">\n <h2>فاتورة مبيعات</h2>\n <p>العميل: {{doc.customer_name}}</p>\n <p>رقم الفاتورة: {{doc.name}}</p>\n <p>الإجمالي: {{doc.grand_total}}</p>\n</div>`}
    className="font-mono text-xs"
    />
   </div>

   {/* Inline variables hint for selected doctype */}
   <div className="rounded-lg border border-chart-5/20 bg-chart-5/5 p-2.5 space-y-1">
    <p className="text-[10px] font-semibold text-chart-5">متغيرات {DOCTYPE_OPTIONS.find((o) => o.value === formRefDoctype)?.label ?? 'المستند'}</p>
    <div className="flex flex-wrap gap-1">
    {currentVariables.map((v) => (
     <button
     key={v}
     type="button"
     className="rounded border border-chart-5/20 bg-card px-1.5 py-0.5 text-[9px] font-mono text-chart-5 hover:bg-chart-5/10 transition-colors"
     onClick={() => {
      const insertion = `{{${v}}}`;
      setFormResponse((prev) => prev + insertion);
     }}
     >
     {`{{${v}}}`}
     </button>
    ))}
    </div>
    <p className="text-[9px] text-chart-5">اضغط على متغير لإضافته إلى المحتوى</p>
   </div>

   <div className="flex items-center gap-2">
    <Checkbox
    id="use-html"
    checked={formUseHtml}
    onCheckedChange={(v) => setFormUseHtml(v === true)}
    />
    <Label htmlFor="use-html" className="text-xs cursor-pointer">
    استخدام وضع HTML
    </Label>
   </div>

   {editingDoc && (
    <div className="rounded-lg border border-chart-5/20 bg-chart-5/5 p-2.5 space-y-1">
    <p className="text-[10px] font-semibold text-chart-5">
     جاري تعديل: {editingDoc.name}
    </p>
    </div>
   )}
   </div>

   <DialogFooter>
   <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
    إلغاء
   </Button>
   <Button size="sm" onClick={saveTemplate} disabled={isSaving}>
    {isSaving && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
    {editingDoc ? 'تحديث' : 'إنشاء'}
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ─── Preview Dialog ─── */}
  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Eye className="h-4 w-4" />
    معاينة القالب
   </DialogTitle>
   </DialogHeader>

   {previewUsingPlaceholder && (
   <div className="rounded-lg border border-chart-2/20 bg-chart-2/5 p-2.5 flex items-center gap-2">
    <Info className="h-4 w-4 text-chart-2 shrink-0" />
    <span className="text-[11px] text-chart-2">
    لا توجد مستندات
    </span>
   </div>
   )}

   <div className="rounded-lg border border-border/40 bg-card p-4">
   {previewLoading ? (
    <div className="flex items-center justify-center py-8 gap-2">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    <span className="text-sm text-muted-foreground">جارٍ تحميل بيانات المعاينة...</span>
    </div>
   ) : previewHtml ? (
    <div
    className="prose prose-sm max-w-none text-foreground"
    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewHtml) }}
    />
   ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
    لا يوجد محتوى للمعاينة
    </p>
   )}
   </div>
   <DialogFooter>
   <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
    إغلاق
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ─── Delete Confirm ─── */}
  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف القالب «{toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleteMut.isPending}>
    {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
