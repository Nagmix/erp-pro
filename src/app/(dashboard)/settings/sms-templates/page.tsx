'use client';

import { useMemo, useState, useCallback } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import {
 MessageSquare,
 Plus,
 Eye,
 Copy,
 Variable,
 FileText,
 Loader2,
 MoreHorizontal,
 Edit,
 Trash2,
 Hash,
 Type,
 Sparkles,
 ChevronDown,
 CheckCircle2,
 AlertTriangle,
} from 'lucide-react';

/* ─── Types ─── */
interface SmsTemplate {
 name: string;
 template_name?: string;
 body?: string;
 category?: string;
 owner?: string;
 modified?: string;
 creation?: string;
}

/* ─── Constants ─── */
const CATEGORY_OPTIONS = [
 { value: 'invoice', label: 'فاتورة', color: 'bg-chart-1/10 text-chart-1 border-chart-1/20' },
 { value: 'quote', label: 'عرض سعر', color: 'bg-chart-5/10 text-chart-5 border-chart-5/20' },
 { value: 'credit_note', label: 'إشعار دائن', color: 'bg-primary/10 text-primary border-primary/20' },
 { value: 'debit_note', label: 'إشعار مدين', color: 'bg-destructive/10 text-destructive border-destructive/20' },
 { value: 'reminder', label: 'تذكير', color: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
 { value: 'appointment', label: 'موعد', color: 'bg-chart-3/10 text-chart-3 border-chart-3/20' },
 { value: 'general', label: 'عام', color: 'bg-muted text-muted-foreground border-border/40' },
] as const;

const TEMPLATE_VARIABLES = [
 { key: '{customer_name}', label: 'اسم العميل', description: 'اسم العميل المرتبط بالمستند' },
 { key: '{invoice_number}', label: 'رقم الفاتورة', description: 'رقم الفاتورة التسلسلي' },
 { key: '{amount}', label: 'المبلغ', description: 'المبلغ الإجمالي للمستند' },
 { key: '{due_date}', label: 'تاريخ الاستحقاق', description: 'تاريخ استحقاق الدفع' },
 { key: '{company_name}', label: 'اسم الشركة', description: 'الاسم الرسمي للشركة' },
 { key: '{outstanding_amount}', label: 'المبلغ المستحق', description: 'المبلغ المتبقي غير المدفوع' },
 { key: '{posting_date}', label: 'تاريخ الإصدار', description: 'تاريخ إصدار المستند' },
 { key: '{currency}', label: 'العملة', description: 'رمز العملة المستخدمة' },
 { key: '{reference_no}', label: 'رقم المرجع', description: 'رقم مرجع الدفع' },
 { key: '{supplier_name}', label: 'اسم المورد', description: 'اسم المورد أو البائع' },
 { key: '{employee_name}', label: 'اسم الموظف', description: 'اسم الموظف المعني' },
 { key: '{appointment_date}', label: 'تاريخ الموعد', description: 'تاريخ الموعد المجدول' },
 { key: '{appointment_time}', label: 'وقت الموعد', description: 'وقت الموعد المجدول' },
] as const;

const PREVIEW_FALLBACK_DATA: Record<string, string> = {
 '{customer_name}': '{{customer_name}}',
 '{invoice_number}': '{{invoice_number}}',
 '{amount}': '{{amount}}',
 '{due_date}': '{{due_date}}',
 '{company_name}': '{{company_name}}',
 '{outstanding_amount}': '{{outstanding_amount}}',
 '{posting_date}': '{{posting_date}}',
 '{currency}': '{{currency}}',
 '{reference_no}': '{{reference_no}}',
 '{supplier_name}': '{{supplier_name}}',
 '{employee_name}': '{{employee_name}}',
 '{appointment_date}': '{{appointment_date}}',
 '{appointment_time}': '{{appointment_time}}',
};

/* ─── Default template suggestions ─── */
const DEFAULT_TEMPLATES = [
 {
 template_name: 'فاتورة مبيعات جديدة',
 body: 'عزيزي {customer_name}، تم إصدار فاتورة رقم {invoice_number} بمبلغ {amount} {currency} واستحقاق {due_date}. - {company_name}',
 category: 'invoice',
 },
 {
 template_name: 'تذكير دفع فاتورة',
 body: 'تذكير: لدى {customer_name} فاتورة رقم {invoice_number} مستحقة الدفع بمبلغ {outstanding_amount} {currency} بتاريخ {due_date}. يرجى السداد في الوقت المحدد. - {company_name}',
 category: 'reminder',
 },
 {
 template_name: 'تأكيد عرض سعر',
 body: '{customer_name}، تم إعداد عرض سعر رقم {invoice_number} بمبلغ {amount} {currency}. العرض ساري حتى {due_date}. - {company_name}',
 category: 'quote',
 },
 {
 template_name: 'تذكير موعد',
 body: 'عزيزي {customer_name}، نذكرك بموعدك يوم {appointment_date} الساعة {appointment_time}. نتطلع لرؤيتك. - {company_name}',
 category: 'appointment',
 },
 {
 template_name: 'إشعار دائن',
 body: 'عزيزي {customer_name}، تم إصدار إشعار دائن رقم {invoice_number} بمبلغ {amount} {currency}. - {company_name}',
 category: 'credit_note',
 },
];

const SMS_CHARS_PER_PART = 160;
const SMS_UNICODE_CHARS_PER_PART = 70;

function countSmsParts(text: string): { chars: number; parts: number; isUnicode: boolean } {
 const isUnicode = /[^\x00-\x7F]/.test(text);
 const chars = text.length;
 const limit = isUnicode ? SMS_UNICODE_CHARS_PER_PART : SMS_CHARS_PER_PART;
 const parts = chars <= 0 ? 0 : Math.ceil(chars / limit);
 return { chars, parts, isUnicode };
}

function renderPreview(body: string): string {
 let rendered = body;
 for (const [key, value] of Object.entries(PREVIEW_FALLBACK_DATA)) {
 rendered = rendered.replaceAll(key, value);
 }
 return rendered;
}

function getCategoryInfo(category: string) {
 return CATEGORY_OPTIONS.find(c => c.value === category) ?? CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

/* ─── Main Component ─── */
export default function SmsTemplatesPage() {
 /* ─── ERPNext Data Hooks ─── */
 const list = useDocList<SmsTemplate>('SMS Template', {
 fields: ['name', 'template_name', 'body', 'category', 'owner', 'modified', 'creation'],
 limit: 500,
 order_by: 'modified desc',
 });

 const createMut = useCreateDoc('SMS Template');
 const updateMut = useUpdateDoc('SMS Template');
 const deleteMut = useDeleteDoc('SMS Template');

 const rows = list.data || [];

 /* ─── Local State ─── */
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingDoc, setEditingDoc] = useState<SmsTemplate | null>(null);
 const [formName, setFormName] = useState('');
 const [formBody, setFormBody] = useState('');
 const [formCategory, setFormCategory] = useState('general');

 const [previewOpen, setPreviewOpen] = useState(false);
 const [previewText, setPreviewText] = useState('');
 const [previewOriginal, setPreviewOriginal] = useState('');

 const [deleteOpen, setDeleteOpen] = useState(false);
 const [toDelete, setToDelete] = useState<SmsTemplate | null>(null);

 const [variablePickerOpen, setVariablePickerOpen] = useState(false);
 const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

 /* ─── Computed Values ─── */
 const smsInfo = useMemo(() => countSmsParts(formBody), [formBody]);
 const previewRendered = useMemo(() => renderPreview(formBody), [formBody]);

 const isSaving = createMut.isPending || updateMut.isPending;

 /* ─── KPIs ─── */
 const totalTemplates = rows.length;
 const invoiceTemplates = rows.filter(r => r.category === 'invoice').length;
 const reminderTemplates = rows.filter(r => r.category === 'reminder').length;
 const generalTemplates = rows.filter(r => r.category === 'general' || !r.category).length;

 /* ─── Handlers ─── */
 const openCreate = useCallback(() => {
 setEditingDoc(null);
 setFormName('');
 setFormBody('');
 setFormCategory('general');
 setDialogOpen(true);
 }, []);

 const openEdit = useCallback((row: SmsTemplate) => {
 setEditingDoc(row);
 setFormName(row.template_name || row.name || '');
 setFormBody(row.body || '');
 setFormCategory(row.category || 'general');
 setDialogOpen(true);
 }, []);

 const openPreview = useCallback((row: SmsTemplate) => {
 setPreviewOriginal(row.body || '');
 setPreviewText(renderPreview(row.body || ''));
 setPreviewOpen(true);
 }, []);

 const openPreviewCurrent = useCallback(() => {
 setPreviewOriginal(formBody);
 setPreviewText(renderPreview(formBody));
 setPreviewOpen(true);
 }, [formBody]);

 const insertVariable = useCallback((variableKey: string) => {
 setFormBody(prev => prev + variableKey);
 setVariablePickerOpen(false);
 }, []);

 const applyDefaultTemplate = useCallback((tpl: typeof DEFAULT_TEMPLATES[number]) => {
 setFormName(tpl.template_name);
 setFormBody(tpl.body);
 setFormCategory(tpl.category);
 }, []);

 const copyTemplate = useCallback(async (row: SmsTemplate) => {
 try {
  await navigator.clipboard.writeText(row.body || '');
  setCopiedTemplate(row.name);
  toast.success('تم نسخ نص القالب إلى الحافظة');
  setTimeout(() => setCopiedTemplate(null), 2000);
 } catch {
  toast.error('فشل نسخ القالب');
 }
 }, []);

 const saveTemplate = useCallback(() => {
 if (!formName.trim()) {
  toast.error('أدخل اسم القالب');
  return;
 }
 if (!formBody.trim()) {
  toast.error('أدخل نص الرسالة');
  return;
 }

 const doc: Record<string, unknown> = {
  doctype: 'SMS Template',
  __newname: formName.trim(),
  template_name: formName.trim(),
  body: formBody.trim(),
  category: formCategory,
 };

 if (editingDoc) {
  const updateDoc: Record<string, unknown> = {
  template_name: formName.trim(),
  body: formBody.trim(),
  category: formCategory,
  };
  updateMut.mutate(
  { name: editingDoc.name, doc: updateDoc },
  {
   onSuccess: () => {
   toast.success('تم تحديث القالب بنجاح');
   setDialogOpen(false);
   setEditingDoc(null);
   },
   onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
  }
  );
 } else {
  createMut.mutate(doc, {
  onSuccess: () => {
   toast.success('تم إنشاء القالب بنجاح');
   setDialogOpen(false);
  },
  onError: () => toast.error('فشل الإنشاء — قد يكون الاسم مكرراً'),
  });
 }
 }, [formName, formBody, formCategory, editingDoc, createMut, updateMut]);

 const confirmDelete = useCallback(() => {
 if (!toDelete) return;
 deleteMut.mutate(toDelete.name, {
  onSuccess: () => {
  toast.success('تم حذف القالب');
  setDeleteOpen(false);
  setToDelete(null);
  },
  onError: () => toast.error('تعذر الحذف — تحقق من الصلاحيات'),
 });
 }, [toDelete, deleteMut]);

 /* ─── DataTable Columns ─── */
 const columns: Column<SmsTemplate>[] = useMemo(
 () => [
  {
  key: 'template_name',
  header: 'اسم القالب',
  sortable: true,
  render: (v, row) => (
   <div className="flex items-center gap-2">
   <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
    <MessageSquare className="h-3.5 w-3.5 text-primary" />
   </div>
   <div className="min-w-0">
    <p className="text-xs font-semibold truncate">{String(v || row.name)}</p>
    <p className="text-xs text-muted-foreground truncate">{String(row.name)}</p>
   </div>
   </div>
  ),
  },
  {
  key: 'body',
  header: 'نص الرسالة',
  render: (v) => {
   const text = String(v || '—');
   const info = countSmsParts(text);
   return (
   <div className="max-w-[300px]">
    <p className="text-xs line-clamp-2 leading-relaxed">{text}</p>
    <div className="flex items-center gap-2 mt-1">
    <span className="text-xs text-muted-foreground">{info.chars} حرف</span>
    <span className="text-xs text-muted-foreground">•</span>
    <span className="text-xs font-medium text-primary">{info.parts} رسالة</span>
    </div>
   </div>
   );
  },
  },
  {
  key: 'category',
  header: 'التصنيف',
  render: (v) => {
   const cat = getCategoryInfo(String(v || ''));
   return (
   <Badge variant="outline" className={`text-xs border ${cat.color}`}>
    {cat.label}
   </Badge>
   );
  },
  },
  {
  key: 'modified',
  header: 'آخر تعديل',
  sortable: true,
  render: (v) => {
   if (!v) return <span className="text-xs text-muted-foreground">—</span>;
   return (
   <span className="text-xs text-muted-foreground">
    {new Date(String(v)).toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    })}
   </span>
   );
  },
  },
 ],
 []
 );

 /* ─── Extended Columns with Actions ─── */
 const extendedColumns: Column<SmsTemplate>[] = useMemo(() => {
 const actionsCol: Column<SmsTemplate> = {
  key: '_actions',
  header: '',
  width: 'w-16',
  render: (_v, row) => (
  <DropdownMenu>
   <DropdownMenuTrigger asChild>
   <Button variant="ghost" size="icon" className="h-8 w-8">
    <MoreHorizontal className="h-3.5 w-3.5" />
   </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="start">
   <DropdownMenuItem onClick={() => openEdit(row)}>
    <Edit className="me-2 h-3.5 w-3.5" />
    تعديل
   </DropdownMenuItem>
   <DropdownMenuItem onClick={() => openPreview(row)}>
    <Eye className="me-2 h-3.5 w-3.5" />
    معاينة
   </DropdownMenuItem>
   <DropdownMenuItem onClick={() => copyTemplate(row)}>
    {copiedTemplate === row.name ? (
    <CheckCircle2 className="me-2 h-3.5 w-3.5 text-chart-3" />
    ) : (
    <Copy className="me-2 h-3.5 w-3.5" />
    )}
    {copiedTemplate === row.name ? 'تم النسخ' : 'نسخ النص'}
   </DropdownMenuItem>
   <DropdownMenuItem
    onClick={() => {
    setToDelete(row);
    setDeleteOpen(true);
    }}
    className="text-destructive focus:text-destructive"
   >
    <Trash2 className="me-2 h-3.5 w-3.5" />
    حذف
   </DropdownMenuItem>
   </DropdownMenuContent>
  </DropdownMenu>
  ),
 };
 return [...columns, actionsCol];
 }, [columns, copiedTemplate, openEdit, openPreview, copyTemplate]);

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="قوالب الرسائل النصية"
  description="إنشاء وإدارة قوالب SMS للمستندات والفواتير والتذكيرات مع دعم المتغيرات الديناميكية"
  iconify="solar:chat-round-dots-bold-duotone"
  accent="info"
  breadcrumbs={[{ label: 'الإعدادات' }, { label: 'قوالب SMS' }]}
  />

  {/* ─── KPI Cards ─── */}
  <KpiStrip cols={4}>
  <KpiCard title="إجمالي القوالب" value={totalTemplates} icon={FileText} accent="primary" />
  <KpiCard title="قوالب الفواتير" value={invoiceTemplates} icon={Hash} accent="info" />
  <KpiCard title="قوالب التذكير" value={reminderTemplates} icon={AlertTriangle} accent="warning" />
  <KpiCard title="قوالب عامة" value={generalTemplates} icon={Type} accent="success" />
  </KpiStrip>

  <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

  {/* ─── DataTable ─── */}
  <DataTable
  data={rows}
  columns={extendedColumns}
  tableId="sms-templates"
  searchable
  loading={list.isLoading}
  addLabel="إنشاء قالب"
  onAdd={openCreate}
  onEdit={openEdit}
  onDelete={(row) => {
   setToDelete(row);
   setDeleteOpen(true);
  }}
  onView={openPreview}
  exportFileName="قوالب-الرسائل-النصية"
  />

  {/* ─── Variables Help Card ─── */}
  <Card className="border-dashed border-border/50 bg-muted/20">
  <CardContent className="p-4 space-y-3">
   <div className="flex items-center gap-2">
   <Variable className="h-4 w-4 text-info shrink-0" />
   <h3 className="text-xs font-semibold">المتغيرات المتاحة في القوالب</h3>
   </div>
   <p className="text-xs text-muted-foreground leading-relaxed">
   أدخل المتغيرات بين أقواس معقوفة في نص الرسالة وسيتم استبدالها تلقائياً بقيم المستند عند الإرسال.
   مثال: {'{customer_name}'} سيتم استبدالها باسم العميل الفعلي.
   </p>
   <div className="flex flex-wrap gap-1.5">
   {TEMPLATE_VARIABLES.map((v) => (
    <button
    key={v.key}
    type="button"
    className="rounded border border-chart-1/20 bg-chart-1/5 px-2 py-1 text-xs font-mono text-chart-1 hover:bg-chart-1/10 transition-colors cursor-pointer"
    title={v.description}
    onClick={() => {
     navigator.clipboard.writeText(v.key);
     toast.success(`تم نسخ ${v.label}`);
    }}
    >
    {v.key}
    <span className="ms-1 text-chart-1 font-sans">({v.label})</span>
    </button>
   ))}
   </div>
  </CardContent>
  </Card>

  {/* ─── Create/Edit Dialog ─── */}
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <MessageSquare className="h-4 w-4" />
    {editingDoc ? 'تعديل القالب' : 'إنشاء قالب جديد'}
   </DialogTitle>
   </DialogHeader>

   <ScrollArea className="flex-1 -mx-6 px-6">
   <div className="space-y-4 pb-4">
    {/* Quick Templates */}
    {!editingDoc && (
    <>
     <div className="space-y-2">
     <Label className="text-xs font-semibold flex items-center gap-1.5">
      <Sparkles className="h-3.5 w-3.5 text-chart-2" />
      قوالب سريعة جاهزة
     </Label>
     <div className="grid sm:grid-cols-2 gap-2">
      {DEFAULT_TEMPLATES.map((tpl, idx) => (
      <button
       key={idx}
       type="button"
       className="rounded-lg border border-border/50 bg-muted/30 p-2.5 text-start hover:bg-muted/50 hover:border-border transition-colors"
       onClick={() => applyDefaultTemplate(tpl)}
      >
       <div className="flex items-center gap-1.5 mb-1">
       <Badge variant="outline" className="text-[9px]">
        {getCategoryInfo(tpl.category).label}
       </Badge>
       <span className="text-xs font-medium">{tpl.template_name}</span>
       </div>
       <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed" dir="rtl">
       {tpl.body}
       </p>
      </button>
      ))}
     </div>
     <Separator className="my-3" />
     </div>
    </>
    )}

    {/* Template Name */}
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
     <p className="text-xs text-muted-foreground">لا يمكن تغيير اسم القالب بعد الإنشاء</p>
     )}
    </div>
    <div className="space-y-1.5">
     <Label className="text-xs">التصنيف</Label>
     <Select value={formCategory} onValueChange={setFormCategory}>
     <SelectTrigger className="h-9">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      {CATEGORY_OPTIONS.map((cat) => (
      <SelectItem key={cat.value} value={cat.value}>
       {cat.label}
      </SelectItem>
      ))}
     </SelectContent>
     </Select>
    </div>
    </div>

    {/* Template Body with Variable Picker */}
    <div className="space-y-1.5">
    <div className="flex items-center justify-between">
     <Label className="text-xs">نص الرسالة *</Label>
     <div className="flex items-center gap-2">
     <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={openPreviewCurrent}
     >
      <Eye className="h-3 w-3" />
      معاينة
     </Button>
     <Popover open={variablePickerOpen} onOpenChange={setVariablePickerOpen}>
      <PopoverTrigger asChild>
      <Button
       type="button"
       variant="outline"
       size="sm"
       className="h-7 text-xs gap-1"
      >
       <Variable className="h-3 w-3" />
       إدراج متغير
       <ChevronDown className="h-2.5 w-2.5" />
      </Button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" className="w-72 p-2" align="start">
      <div className="space-y-1">
       <p className="text-xs font-medium text-muted-foreground px-2 py-1">
       اختر متغيراً لإدراجه في نص الرسالة
       </p>
       {TEMPLATE_VARIABLES.map((v) => (
       <button
        key={v.key}
        type="button"
        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-start"
        onClick={() => insertVariable(v.key)}
       >
        <code className="rounded bg-chart-1/5 px-1 py-0.5 text-[9px] font-mono text-chart-1 border border-chart-1/20 shrink-0">
        {v.key}
        </code>
        <div className="min-w-0">
        <p className="text-xs font-medium">{v.label}</p>
        <p className="text-[9px] text-muted-foreground">{v.description}</p>
        </div>
       </button>
       ))}
      </div>
      </PopoverContent>
     </Popover>
     </div>
    </div>
    <Textarea
     rows={6}
     value={formBody}
     onChange={(e) => setFormBody(e.target.value)}
     placeholder="عزيزي {customer_name}، تم إصدار فاتورة رقم {invoice_number} بمبلغ {amount} {currency} واستحقاق {due_date}. - {company_name}"
     className="font-mono text-xs leading-relaxed resize-none"
    />
    </div>

    {/* Character Counter */}
    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
    <div className="flex items-center justify-between">
     <span className="text-xs font-medium">عدد الأحرف وأجزاء الرسالة</span>
     <div className="flex items-center gap-1.5">
     {smsInfo.isUnicode && (
      <Badge variant="outline" className="text-[9px] border-chart-2/30 text-chart-2 bg-chart-2/5">
      Unicode
      </Badge>
     )}
     </div>
    </div>
    <div className="flex items-center gap-4">
     <div className="flex-1">
     <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-muted-foreground">
      {smsInfo.chars} / {smsInfo.isUnicode ? SMS_UNICODE_CHARS_PER_PART : SMS_CHARS_PER_PART} حرف
      </span>
      <span className="text-xs font-medium text-primary">
      {smsInfo.parts} {smsInfo.parts === 1 ? 'رسالة' : smsInfo.parts === 2 ? 'رسالتان' : 'رسائل'}
      </span>
     </div>
     <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
      className={`h-full rounded-full transition-all duration-300 ${
       smsInfo.parts > 1
       ? 'bg-chart-2/50'
       : 'bg-chart-3/50'
      }`}
      style={{
       width: `${Math.min(100, (smsInfo.chars / (smsInfo.isUnicode ? SMS_UNICODE_CHARS_PER_PART : SMS_CHARS_PER_PART)) * 100)}%`,
      }}
      />
     </div>
     </div>
    </div>
    <p className="text-[9px] text-muted-foreground">
     {smsInfo.isUnicode
     ? `النص يحتوي على أحرف عربية — كل جزء حتى ${SMS_UNICODE_CHARS_PER_PART} حرف`
     : `كل جزء رسالة حتى ${SMS_CHARS_PER_PART} حرف — النص الإنجليزي فقط`
     }
     {smsInfo.parts > 1 && ' — سيتم تقسيم الرسالة إلى أجزاء متعددة'}
    </p>
    </div>

    {/* Inline Quick Variables */}
    <div className="rounded-lg border border-chart-1/20 bg-chart-1/5 p-2.5 space-y-1.5">
    <p className="text-xs font-medium text-chart-1 flex items-center gap-1">
     <Variable className="h-3 w-3" />
     إدراج سريع للمتغيرات
    </p>
    <div className="flex flex-wrap gap-1">
     {TEMPLATE_VARIABLES.map((v) => (
     <button
      key={v.key}
      type="button"
      className="rounded border border-chart-1/20 bg-card px-1.5 py-0.5 text-[9px] font-mono text-chart-1 hover:bg-chart-1/10 transition-colors"
      onClick={() => insertVariable(v.key)}
     >
      {v.key}
     </button>
     ))}
    </div>
    <p className="text-[9px] text-chart-1">اضغط على متغير لإضافته إلى نص الرسالة</p>
    </div>

    {/* Live Preview */}
    {formBody && (
    <div className="rounded-lg border border-chart-3/20 bg-chart-3/5 p-3 space-y-1.5">
     <p className="text-xs font-medium text-chart-3 flex items-center gap-1">
     <Eye className="h-3 w-3" />
     معاينة مباشرة
     </p>
     <div className="rounded-md bg-card border border-chart-3/20/50 p-2.5">
     <p className="text-xs leading-relaxed">{previewRendered}</p>
     </div>
     <div className="flex items-center gap-2 text-[9px] text-chart-3">
     <CheckCircle2 className="h-3 w-3" />
     المعاينة تعرض المتغيرات كما هي — سيتم استبدالها بالبيانات الفعلية عند الإرسال
     </div>
    </div>
    )}

    {editingDoc && (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
     <p className="text-xs font-medium text-primary">
     جاري تعديل: {editingDoc.template_name || editingDoc.name}
     </p>
    </div>
    )}
   </div>
   </ScrollArea>

   <DialogFooter className="border-t pt-3">
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
  <DialogContent dir="rtl" className="sm:max-w-lg">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Eye className="h-4 w-4" />
    معاينة القالب
   </DialogTitle>
   </DialogHeader>
   <div className="space-y-4">
   {/* Phone Mockup */}
   <div className="flex justify-center">
    <div className="w-72 rounded-2xl border-2 border-border bg-muted p-3 shadow-lg">
    <div className="rounded-xl bg-card p-3 space-y-2">
     <div className="flex items-center justify-between text-xs text-muted-foreground">
     <span>رسالة جديدة</span>
     <span>{new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}</span>
     </div>
     <div className="rounded-lg bg-chart-3/10 p-2.5">
     <p className="text-xs leading-relaxed text-chart-3">{previewText}</p>
     </div>
     <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
     <MessageSquare className="h-2.5 w-2.5" />
     {(() => {
      const info = countSmsParts(previewText);
      return `${info.chars} حرف • ${info.parts} رسالة`;
     })()}
     </div>
    </div>
    </div>
   </div>

   {/* Original Template */}
   <div className="space-y-1.5">
    <Label className="text-sm font-medium text-muted-foreground">نص القالب الأصلي</Label>
    <div className="rounded-lg border border-border/40 bg-muted/30 p-2.5">
    <p className="text-xs font-mono leading-relaxed" dir="ltr">{previewOriginal}</p>
    </div>
   </div>

   {/* Sample Data Used */}
   <div className="space-y-1.5">
    <Label className="text-sm font-medium text-muted-foreground">المتغيرات المستخدمة في المعاينة</Label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
    {Object.entries(PREVIEW_FALLBACK_DATA).slice(0, 6).map(([key, value]) => (
     <div key={key} className="flex items-center gap-1 text-[9px]">
     <code className="rounded bg-chart-1/5 px-1 font-mono text-chart-1">{key}</code>
     <span className="text-muted-foreground">←</span>
     <span className="truncate font-mono text-muted-foreground">{value}</span>
     </div>
    ))}
    </div>
   </div>
   </div>
   <DialogFooter>
   <Button
    variant="outline"
    size="sm"
    onClick={async () => {
    try {
     await navigator.clipboard.writeText(previewText);
     toast.success('تم نسخ المعاينة');
    } catch {
     toast.error('فشل النسخ');
    }
    }}
   >
    <Copy className="h-3.5 w-3.5 ms-1" />
    نسخ النص
   </Button>
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
   <AlertDialogTitle>تأكيد حذف القالب</AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف القالب «{toDelete?.template_name || toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
    قد تكون هناك قواعد إرسال تلقائي مرتبطة بهذا القالب.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction
    variant="destructive"
    onClick={confirmDelete}
    disabled={deleteMut.isPending}
   >
    {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
