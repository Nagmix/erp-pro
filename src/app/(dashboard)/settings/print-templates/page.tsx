'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Dialog,
 DialogContent,
 DialogFooter,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from '@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/erp/page-header';
import { Plus, PenLine, Loader2, Printer, Eye, FileText, LayoutTemplate } from 'lucide-react';
import { useCreateDoc, useDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { prepareFrappeDocForCreate } from '@/lib/erp/erpnext-payloads';
import { toast } from 'sonner';

type Row = { name: string; doc_type?: string; print_format_type?: string; disabled?: number };

type PfDoc = {
 name: string;
 doc_type?: string;
 print_format_type?: string;
 disabled?: number;
 html?: string;
 css?: string;
};

/** القوالب المدمجة في النظام */
const BUILT_IN_TEMPLATES = [
 { name: 'فاتورة مبيعات', doctype: 'Sales Invoice', nameAr: 'فاتورة مبيعات', icon: '🧾' },
 { name: 'فاتورة مشتريات', doctype: 'Purchase Invoice', nameAr: 'فاتورة مشتريات', icon: '📋' },
 { name: 'سند قبض', doctype: 'Payment Entry', nameAr: 'سند قبض', icon: '💵' },
 { name: 'سند صرف', doctype: 'Payment Entry', nameAr: 'سند صرف', icon: '💸' },
 { name: 'قيد يومي', doctype: 'Journal Entry', nameAr: 'قيد يومي', icon: '📝' },
 { name: 'أمر بيع', doctype: 'Sales Order', nameAr: 'أمر بيع', icon: '📦' },
 { name: 'أمر شراء', doctype: 'Purchase Order', nameAr: 'أمر شراء', icon: '🛒' },
 { name: 'عرض سعر', doctype: 'Quotation', nameAr: 'عرض سعر', icon: '💰' },
];

/** DocType خيارات لإنشاء قالب جديد */
const DOCTYPE_OPTIONS = [
 'Sales Invoice',
 'Purchase Invoice',
 'Payment Entry',
 'Journal Entry',
 'Sales Order',
 'Purchase Order',
 'Quotation',
 'Expense Claim',
 'Delivery Note',
];

function buildPreviewHtml(html: string, css: string): string {
 let body = html?.trim() ? html : '<p style="color:#999;">— لا محتوى HTML —</p>';
 body = body.replace(/\{\{\s*doc\.name\s*\}\}/gi, 'INV-2026-00001');
 body = body.replace(/\{\{\s*doc\.customer_name\s*\}\}/gi, 'اسم العميل');
 body = body.replace(/\{\{\s*doc\.supplier_name\s*\}\}/gi, 'اسم المورد');
 body = body.replace(/\{\{\s*doc\.grand_total\s*\}\}/gi, '12,500.00');
 body = body.replace(/\{\{\s*doc\.posting_date\s*\}\}/gi, '2026-03-01');
 body = body.replace(/\{\{\s*doc\.status\s*\}\}/gi, 'غير مدفوع');
 body = body.replace(/\{\%\s*[^%]*\s*\%\}/g, '');
 return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><style>
body{font-family:system-ui,sans-serif;padding:16px;font-size:13px;color:#111;line-height:1.5;}
table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:6px;text-align:right;}
${css || ''}
</style></head><body>${body}</body></html>`;
}

const tableColumns: Column<Row>[] = [
 { key: 'name', header: 'القالب', sortable: true },
 { key: 'doc_type', header: 'المستند', sortable: true },
 { key: 'print_format_type', header: 'النوع', sortable: true },
 { key: 'disabled', header: 'الحالة', render: (v) => (Number(v) === 1 ? 'معطل' : 'نشط') },
];

export default function PrintTemplatesPage() {
 const [createOpen, setCreateOpen] = useState(false);
 const [name, setName] = useState('');
 const [docType, setDocType] = useState('Sales Invoice');

 const [editorOpen, setEditorOpen] = useState(false);
 const [editingName, setEditingName] = useState<string | null>(null);
 const [htmlDraft, setHtmlDraft] = useState('');
 const [cssDraft, setCssDraft] = useState('');
 const [headerDraft, setHeaderDraft] = useState('');
 const [footerDraft, setFooterDraft] = useState('');

 const [previewOpen, setPreviewOpen] = useState(false);
 const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

 const list = useDocList<Row>('Print Format', {
 fields: ['name', 'doc_type', 'print_format_type', 'disabled'],
 limit: 400,
 order_by: 'modified desc',
 });

 const docQuery = useDoc<PfDoc>('Print Format', editingName ?? '', {
 enabled: Boolean(editingName) && editorOpen,
 });

 useEffect(() => {
 if (!docQuery.data || !editingName) return;
 const docData = docQuery.data;
 queueMicrotask(() => {
  setHtmlDraft(String(docData.html ?? ''));
  setCssDraft(String(docData.css ?? ''));
 });
 }, [docQuery.data, editingName]);

 const createMut = useCreateDoc('Print Format');
 const updateMut = useUpdateDoc<PfDoc>('Print Format');

 const create = () => {
 if (!name.trim()) return toast.error('اسم القالب مطلوب');
 createMut.mutate(
  prepareFrappeDocForCreate({
  doctype: 'Print Format',
  name: name.trim(),
  doc_type: docType,
  print_format_type: 'Jinja',
  html: `<div dir="rtl"><h2>${name}</h2><p>{{ doc.name }}</p></div>`,
  }),
  {
  onSuccess: () => {
   toast.success('تم إنشاء القالب');
   setCreateOpen(false);
   void list.refetch();
  },
  onError: () => toast.error('فشل إنشاء القالب'),
  }
 );
 };

 const openEditor = useCallback((row: Row) => {
 setEditingName(row.name);
 setHtmlDraft('');
 setCssDraft('');
 setEditorOpen(true);
 }, []);

 const openPreview = useCallback((templateName: string) => {
 setPreviewTemplate(templateName);
 setPreviewOpen(true);
 }, []);

 const saveEdits = () => {
 if (!editingName) return;
 updateMut.mutate(
  {
  name: editingName,
  doc: { html: htmlDraft, css: cssDraft },
  },
  {
  onSuccess: () => {
   toast.success('تم حفظ القالب');
   void list.refetch();
  },
  onError: () => toast.error('فشل الحفظ — قد يكون القالب قياسياً أو الصلاحيات غير كافية'),
  }
 );
 };

 const columnsWithActions = useMemo<Column<Row>[]>(
 () => [
  ...tableColumns,
  {
  key: '_actions',
  header: '',
  width: 'w-36',
  render: (_, row) => (
   <div className="flex gap-1">
   <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => openPreview(row.name)}>
    <Eye className="h-3 w-3" />
    معاينة
   </Button>
   <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => openEditor(row)}>
    <PenLine className="h-3 w-3" />
    تحرير
   </Button>
   </div>
  ),
  },
 ],
 [openEditor, openPreview]
 );

 const previewSrc = buildPreviewHtml(htmlDraft, cssDraft);
 const templatePreviewSrc = previewTemplate
 ? buildPreviewHtml(
  `<div dir="rtl" style="padding:20px;">
   <h2 style="color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:8px;">${previewTemplate}</h2>
   <p>رقم المستند: INV-2026-00001</p>
   <p>التاريخ: 2026-03-01</p>
   <p>العميل: اسم العميل</p>
   <table style="margin-top:16px;">
   <thead><tr style="background:#f1f5f9;"><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
   <tbody><tr><td>اسم الصنف</td><td>2</td><td>5,000.00</td><td>10,000.00</td></tr></tbody>
   </table>
   <p style="margin-top:12px;font-weight:bold;">الإجمالي: 12,500.00</p>
  </div>`,
  ''
  )
 : '';

 return (
 <div className="erp-page-enter space-y-5" dir="rtl">
  <PageHeader
  title="قوالب الطباعة"
  description="إنشاء قوالب جينجا، تعديل HTML/CSS، ومعاينة تقريبية. يمكنك تخصيص القالب بالكامل من خلال محرر HTML/CSS المتقدم."
  iconify="solar:printer-bold-duotone"
  accent="info"
  breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'قوالب الطباعة' },
  ]}
  actions={
   <div className="flex flex-wrap gap-2">
   <Button variant="outline" size="sm" asChild>
    <Link href="/settings/rich-templates" className="gap-1.5">
    <PenLine className="h-3.5 w-3.5" />
    محرر نصوص غني
    </Link>
   </Button>
   <Dialog open={createOpen} onOpenChange={setCreateOpen}>
    <DialogTrigger asChild>
    <Button size="sm" className="gap-1.5">
     <Plus className="h-3.5 w-3.5" />
     قالب جديد
    </Button>
    </DialogTrigger>
    <DialogContent dir="rtl" className="max-w-md">
    <DialogHeader>
     <DialogTitle>إضافة قالب طباعة</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 py-2">
     <div className="space-y-1">
     <Label className="text-xs">اسم القالب</Label>
     <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: فاتورة مخصصة" />
     </div>
     <div className="space-y-1">
     <Label className="text-xs">نوع المستند (DocType)</Label>
     <Select value={docType} onValueChange={setDocType}>
      <SelectTrigger className="h-9 text-xs">
      <SelectValue />
      </SelectTrigger>
      <SelectContent>
      {DOCTYPE_OPTIONS.map((dt) => (
       <SelectItem key={dt} value={dt}>{dt}</SelectItem>
      ))}
      </SelectContent>
     </Select>
     </div>
     <Button className="w-full" onClick={create} disabled={createMut.isPending}>
     {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
     </Button>
    </div>
    </DialogContent>
   </Dialog>
   </div>
  }
  />

  <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

  {/* Built-in Templates Grid */}
  <div className="space-y-3">
  <div className="flex items-center gap-2 text-sm font-semibold">
   <LayoutTemplate className="h-4 w-4 text-primary" />
   القوالب المدمجة
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
   {BUILT_IN_TEMPLATES.map((tmpl) => (
   <Card
    key={tmpl.name}
    className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all border-border/40"
    onClick={() => openPreview(tmpl.nameAr)}
   >
    <CardContent className="p-4 flex items-center gap-3">
    <span className="text-2xl">{tmpl.icon}</span>
    <div className="min-w-0 flex-1">
     <p className="text-sm font-medium truncate">{tmpl.nameAr}</p>
     <p className="text-[10px] text-muted-foreground" dir="ltr">{tmpl.doctype}</p>
    </div>
    <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
    </CardContent>
   </Card>
   ))}
  </div>
  </div>

  {/* Custom Templates Table */}
  <div className="space-y-3">
  <div className="flex items-center gap-2 text-sm font-semibold">
   <FileText className="h-4 w-4 text-primary" />
   القوالب المخصصة
  </div>
  <DataTable
   data={list.data || []}
   columns={columnsWithActions}
   searchable
   loading={list.isLoading}
   pageSize={15}
  />
  </div>

  {/* Template Preview Dialog */}
  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent dir="rtl" className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
   <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
   <DialogTitle className="text-start">معاينة القالب: {previewTemplate ?? '—'}</DialogTitle>
   <p className="text-xs text-muted-foreground text-start font-normal">
    هذه معاينة تقريبية — القالب النهائي يُعرض بتنسيق ERPNext عند الطباعة من المستند.
   </p>
   </DialogHeader>
   <div className="flex-1 min-h-[400px] overflow-hidden px-6 pb-6">
   {previewTemplate && (
    <iframe
    title="print-preview"
    className="w-full h-[500px] rounded-[var(--radius-md-ui)] border border-border/60 bg-white"
    sandbox=""
    srcDoc={templatePreviewSrc}
    />
   )}
   </div>
   <DialogFooter className="gap-2 border-t px-6 py-4 shrink-0 flex-row-reverse justify-start sm:justify-start">
   <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
    إغلاق
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* Template Editor Dialog */}
  <Dialog
  open={editorOpen}
  onOpenChange={(o) => {
   setEditorOpen(o);
   if (!o) setEditingName(null);
  }}
  >
  <DialogContent dir="rtl" className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col gap-0 p-0">
   <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
   <DialogTitle className="text-start">تحرير القالب: {editingName ?? '—'}</DialogTitle>
   <p className="text-xs text-muted-foreground text-start font-normal">
    المعاينة تعرض قيماً توضيحية بدلاً من حقول <code className="text-[10px]">{'{{ doc.* }}'}</code>.
   </p>
   </DialogHeader>
   {docQuery.isLoading && (
   <div className="flex items-center gap-2 px-6 py-8 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" />
    جاري تحميل القالب…
   </div>
   )}
   {docQuery.isError && (
   <p className="px-6 py-4 text-sm text-destructive">
    {(docQuery.error as Error)?.message || 'تعذر تحميل القالب.'}
   </p>
   )}
   {!docQuery.isLoading && docQuery.data && (
   <Tabs defaultValue="html" className="flex min-h-0 flex-1 flex-col px-6 pb-4">
    <TabsList className="h-auto w-full justify-start gap-1 bg-muted/40 p-1 shrink-0">
    <TabsTrigger value="html" className="text-xs">
     HTML / جينجا
    </TabsTrigger>
    <TabsTrigger value="css" className="text-xs">
     CSS
    </TabsTrigger>
    <TabsTrigger value="header-footer" className="text-xs">
     رأس وتذييل
    </TabsTrigger>
    <TabsTrigger value="preview" className="text-xs">
     معاينة
    </TabsTrigger>
    </TabsList>
    <TabsContent value="html" className="mt-3 min-h-[280px] flex-1 overflow-hidden">
    <Textarea
     value={htmlDraft}
     onChange={(e) => setHtmlDraft(e.target.value)}
     className="font-mono text-xs min-h-[320px] resize-y"
     spellCheck={false}
    />
    </TabsContent>
    <TabsContent value="css" className="mt-3 min-h-[280px] flex-1 overflow-hidden">
    <Textarea
     value={cssDraft}
     onChange={(e) => setCssDraft(e.target.value)}
     className="font-mono text-xs min-h-[320px] resize-y"
     spellCheck={false}
     placeholder="/* أنماط إضافية للقالب */"
    />
    </TabsContent>
    <TabsContent value="header-footer" className="mt-3 min-h-[280px] flex-1 overflow-hidden space-y-3">
    <div className="space-y-1">
     <Label className="text-xs">رأس الصفحة (Header)</Label>
     <Textarea
     value={headerDraft}
     onChange={(e) => setHeaderDraft(e.target.value)}
     className="font-mono text-xs min-h-[120px] resize-y"
     spellCheck={false}
     placeholder="<!-- رأس الصفحة المطبوعة -->"
     />
    </div>
    <div className="space-y-1">
     <Label className="text-xs">تذييل الصفحة (Footer)</Label>
     <Textarea
     value={footerDraft}
     onChange={(e) => setFooterDraft(e.target.value)}
     className="font-mono text-xs min-h-[120px] resize-y"
     spellCheck={false}
     placeholder="<!-- تذييل الصفحة المطبوعة -->"
     />
    </div>
    </TabsContent>
    <TabsContent value="preview" className="mt-3 flex-1 min-h-[320px]">
    <iframe
     title="print-preview"
     className="h-[420px] w-full rounded-[var(--radius-md-ui)] border border-border/60 bg-white"
     sandbox=""
     srcDoc={previewSrc}
    />
    </TabsContent>
   </Tabs>
   )}
   <DialogFooter className="gap-2 border-t px-6 py-4 shrink-0 flex-row-reverse justify-start sm:justify-start">
   <Button type="button" size="sm" onClick={saveEdits} disabled={updateMut.isPending || docQuery.isLoading}>
    {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ في النظام'}
   </Button>
   <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => {
    setEditorOpen(false);
    setEditingName(null);
    }}
   >
    إغلاق
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>
 </div>
 );
}
