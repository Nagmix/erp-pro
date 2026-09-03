'use client';

import { useMemo, useState } from 'react';
import { formatDate } from '@/lib/core/helpers';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { ConfirmationDialog } from '@/components/erp/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
 Plus,
 FileText,
 CheckCircle2,
 XCircle,
 Eye,
 ShoppingCart,
 Store,
 Loader2,
} from 'lucide-react';
import { useCreateDoc, useDeleteDoc, useDocList, useUpdateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/client/sanitize';

/* ─── Types ─── */
type TermsRow = {
 name: string;
 title?: string;
 terms?: string;
 buying?: number;
 selling?: number;
 disabled?: number;
 modified?: string;
};

/* ─── Filter options ─── */
const TYPE_FILTER_OPTIONS = [
 { value: 'all', label: 'الكل' },
 { value: 'buying', label: 'المشتريات' },
 { value: 'selling', label: 'المبيعات' },
] as const;

const STATUS_FILTER_OPTIONS = [
 { value: 'all', label: 'الكل' },
 { value: 'active', label: 'نشط' },
 { value: 'disabled', label: 'معطل' },
] as const;

/* ─── Helpers ─── */
function stripHtml(html: string): string {
 if (typeof DOMParser !== 'undefined') {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 return doc.body.textContent || '';
 }
 return html.replace(/<[^>]*>/g, '');
}

/* ─── Main Component ─── */
export default function TermsSettingsPage() {
 /* ─── State ─── */
 const [dialogOpen, setDialogOpen] = useState(false);
 const [previewOpen, setPreviewOpen] = useState(false);
 const [previewContent, setPreviewContent] = useState<{ title: string; terms: string }>({ title: '', terms: '' });
 const [deleteOpen, setDeleteOpen] = useState(false);
 const [toDelete, setToDelete] = useState<TermsRow | null>(null);

 // Form state
 const [editingDoc, setEditingDoc] = useState<TermsRow | null>(null);
 const [formName, setFormName] = useState('');
 const [formTerms, setFormTerms] = useState('');
 const [formBuying, setFormBuying] = useState(false);
 const [formSelling, setFormSelling] = useState(false);
 const [formDisabled, setFormDisabled] = useState(false);

 // Filters
 const [typeFilter, setTypeFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 /* ─── Data ─── */
 const list = useDocList<TermsRow>('Terms and Conditions', {
 fields: ['name', 'title', 'terms', 'buying', 'selling', 'disabled', 'modified'],
 limit: 500,
 order_by: 'modified desc',
 });

 const createMut = useCreateDoc('Terms and Conditions');
 const updateMut = useUpdateDoc('Terms and Conditions');
 const deleteMut = useDeleteDoc('Terms and Conditions');

 const rows = list.data || [];

 /* ─── Filtered data ─── */
 const filteredRows = useMemo(() => {
 return rows.filter((row) => {
  if (typeFilter === 'buying' && Number(row.buying) !== 1) return false;
  if (typeFilter === 'selling' && Number(row.selling) !== 1) return false;
  if (statusFilter === 'active' && Number(row.disabled) === 1) return false;
  if (statusFilter === 'disabled' && Number(row.disabled) !== 1) return false;
  return true;
 });
 }, [rows, typeFilter, statusFilter]);

 /* ─── KPI calculations ─── */
 const totalActive = useMemo(() => rows.filter((r) => Number(r.disabled) !== 1).length, [rows]);
 const totalDisabled = useMemo(() => rows.filter((r) => Number(r.disabled) === 1).length, [rows]);
 const totalBuying = useMemo(() => rows.filter((r) => Number(r.buying) === 1).length, [rows]);
 const totalSelling = useMemo(() => rows.filter((r) => Number(r.selling) === 1).length, [rows]);

 /* ─── Dialog handlers ─── */
 const openCreateDialog = () => {
 setEditingDoc(null);
 setFormName('');
 setFormTerms('');
 setFormBuying(false);
 setFormSelling(false);
 setFormDisabled(false);
 setDialogOpen(true);
 };

 const openEditDialog = (row: TermsRow) => {
 setEditingDoc(row);
 setFormName(row.title || row.name);
 setFormTerms(row.terms || '');
 setFormBuying(Number(row.buying) === 1);
 setFormSelling(Number(row.selling) === 1);
 setFormDisabled(Number(row.disabled) === 1);
 setDialogOpen(true);
 };

 const openPreview = (row: TermsRow) => {
 setPreviewContent({ title: row.title || row.name, terms: row.terms || '' });
 setPreviewOpen(true);
 };

 const submitForm = () => {
 const trimmedName = formName.trim();
 if (!trimmedName) {
  toast.error('اسم الشروط مطلوب');
  return;
 }
 if (!formTerms.trim()) {
  toast.error('نص الشروط مطلوب');
  return;
 }

 const doc: Record<string, unknown> = {
  doctype: 'Terms and Conditions',
  title: trimmedName,
  terms: formTerms.trim(),
  buying: formBuying ? 1 : 0,
  selling: formSelling ? 1 : 0,
  disabled: formDisabled ? 1 : 0,
 };

 if (editingDoc) {
  updateMut.mutate(
  { name: editingDoc.name, doc },
  {
   onSuccess: () => {
   toast.success('تم تحديث الشروط بنجاح');
   setDialogOpen(false);
   setEditingDoc(null);
   },
   onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
  }
  );
 } else {
  createMut.mutate(doc, {
  onSuccess: () => {
   toast.success('تم إنشاء الشروط بنجاح');
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
  toast.success('تم حذف الشروط');
  setDeleteOpen(false);
  setToDelete(null);
  },
  onError: () => toast.error('تعذر الحذف — تحقق من الصلاحيات'),
 });
 };

 const isSaving = createMut.isPending || updateMut.isPending;

 /* ─── Table columns ─── */
 const columns: Column<TermsRow>[] = useMemo(
 () => [
  {
  key: 'name',
  header: 'المعرّف',
  sortable: true,
  width: 'w-40',
  render: (v, row) => (
   <div className="flex items-center gap-2">
   <span className="font-medium text-xs truncate max-w-[140px]">{String(v)}</span>
   {Number(row.disabled) === 1 && (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-muted text-muted-foreground">
    معطل
    </Badge>
   )}
   </div>
  ),
  },
  {
  key: 'title',
  header: 'العنوان',
  sortable: true,
  render: (v, row) => (
   <span className="text-xs">{String(v || row.name)}</span>
  ),
  },
  {
  key: 'terms',
  header: 'معاينة الشروط',
  render: (v) => {
   const text = stripHtml(String(v || ''));
   return (
   <span className="text-xs text-muted-foreground line-clamp-2 max-w-[280px] leading-relaxed" title={text}>
    {text.length > 120 ? text.slice(0, 120) + '…' : text || '—'}
   </span>
   );
  },
  },
  {
  key: 'buying',
  header: 'المشتريات',
  width: 'w-28',
  render: (v) =>
   Number(v) === 1 ? (
   <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-chart-3/30 text-chart-3 bg-chart-3/5">
    <ShoppingCart className="h-3 w-3" />
    مشتريات
   </Badge>
   ) : (
   <span className="text-xs text-muted-foreground">—</span>
   ),
  },
  {
  key: 'selling',
  header: 'المبيعات',
  width: 'w-28',
  render: (v) =>
   Number(v) === 1 ? (
   <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 border-chart-1/30 text-chart-1 bg-chart-1/5">
    <Store className="h-3 w-3" />
    مبيعات
   </Badge>
   ) : (
   <span className="text-xs text-muted-foreground">—</span>
   ),
  },
  {
  key: 'disabled',
  header: 'الحالة',
  width: 'w-24',
  render: (v) =>
   Number(v) === 1 ? (
   <div className="flex items-center gap-1">
    <XCircle className="h-3.5 w-3.5 text-destructive" />
    <span className="text-xs text-destructive">معطل</span>
   </div>
   ) : (
   <div className="flex items-center gap-1">
    <CheckCircle2 className="h-3.5 w-3.5 text-chart-3" />
    <span className="text-xs text-chart-3">نشط</span>
   </div>
   ),
  },
  {
  key: 'modified',
  header: 'آخر تعديل',
  sortable: true,
  width: 'w-32',
  render: (v) => {
   if (!v) return <span className="text-xs text-muted-foreground">—</span>;
   const d = new Date(String(v));
   return <span className="text-xs text-muted-foreground">{formatDate(d.toISOString())}</span>;
  },
  },
 ],
 []
 );

 /* ─── Render ─── */
 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="الشروط والأحكام"
  description="إدارة شروط وأحكام المستندات والعقود — إنشاء وتعديل وحذف مع تصفية حسب النوع والحالة"
  iconify="solar:document-text-bold-duotone"
  accent="amber"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الشروط والأحكام' }]}
  actions={
   <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
   <DialogTrigger asChild>
    <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
    <Plus className="h-3.5 w-3.5" />
    شروط جديدة
    </Button>
   </DialogTrigger>
   <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
    <DialogTitle className="flex items-center gap-2">
     <FileText className="h-4 w-4" />
     {editingDoc ? 'تعديل الشروط' : 'إنشاء شروط جديدة'}
    </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-2">
    {/* Name field */}
    <div className="space-y-1.5">
     <Label className="text-xs font-semibold">اسم الشروط *</Label>
     <Input
     value={formName}
     onChange={(e) => setFormName(e.target.value)}
     placeholder="مثال: شروط الدفع عند الاستلام"
     />
    </div>

    {/* Terms text */}
    <div className="space-y-1.5">
     <Label className="text-xs font-semibold">نص الشروط *</Label>
     <Textarea
     rows={8}
     value={formTerms}
     onChange={(e) => setFormTerms(e.target.value)}
     placeholder="أدخل نص الشروط والأحكام هنا... يدعم تنسيق HTML"
     className="font-mono text-xs"
     />
     <p className="text-[10px] text-muted-foreground">
     يمكنك استخدام تنسيق HTML للنص (مثل &lt;b&gt; و &lt;ul&gt;)
     </p>
    </div>

    {/* Checkboxes row */}
    <div className="grid sm:grid-cols-3 gap-4 rounded-lg border border-border/40 bg-muted/30 p-3">
     <div className="flex items-center gap-2">
     <Checkbox
      id="chk-buying"
      checked={formBuying}
      onCheckedChange={(v) => setFormBuying(v === true)}
     />
     <Label htmlFor="chk-buying" className="text-xs cursor-pointer flex items-center gap-1">
      <ShoppingCart className="h-3 w-3 text-chart-3" />
      للمشتريات
     </Label>
     </div>
     <div className="flex items-center gap-2">
     <Checkbox
      id="chk-selling"
      checked={formSelling}
      onCheckedChange={(v) => setFormSelling(v === true)}
     />
     <Label htmlFor="chk-selling" className="text-xs cursor-pointer flex items-center gap-1">
      <Store className="h-3 w-3 text-chart-1" />
      للمبيعات
     </Label>
     </div>
     <div className="flex items-center gap-2">
     <Checkbox
      id="chk-disabled"
      checked={formDisabled}
      onCheckedChange={(v) => setFormDisabled(v === true)}
     />
     <Label htmlFor="chk-disabled" className="text-xs cursor-pointer">
      معطل
     </Label>
     </div>
    </div>

    {editingDoc && (
     <div className="rounded-lg border border-chart-2/20 bg-chart-2/5 p-2.5 space-y-1">
     <p className="text-[10px] font-semibold text-chart-2">
      جاري تعديل: {editingDoc.title || editingDoc.name}
     </p>
     </div>
    )}
    </div>
    <DialogFooter>
    <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
     إلغاء
    </Button>
    <Button size="sm" onClick={submitForm} disabled={isSaving}>
     {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
     {editingDoc ? 'تحديث' : 'إنشاء'}
    </Button>
    </DialogFooter>
   </DialogContent>
   </Dialog>
  }
  />

  {/* KPI Strip */}
  {/* Filters bar */}
  <Card className="border-border/40 bg-card">
  <CardContent className="p-3 flex flex-wrap items-center gap-3">
   <span className="text-xs font-semibold text-muted-foreground">تصفية:</span>
   <div className="flex items-center gap-2">
   <Label className="text-xs text-muted-foreground">النوع</Label>
   <Select value={typeFilter} onValueChange={setTypeFilter}>
    <SelectTrigger className="h-8 w-32 text-xs" dir="rtl">
    <SelectValue />
    </SelectTrigger>
    <SelectContent dir="rtl">
    {TYPE_FILTER_OPTIONS.map((opt) => (
     <SelectItem key={opt.value} value={opt.value}>
     {opt.label}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>
   </div>
   <div className="flex items-center gap-2">
   <Label className="text-xs text-muted-foreground">الحالة</Label>
   <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="h-8 w-32 text-xs" dir="rtl">
    <SelectValue />
    </SelectTrigger>
    <SelectContent dir="rtl">
    {STATUS_FILTER_OPTIONS.map((opt) => (
     <SelectItem key={opt.value} value={opt.value}>
     {opt.label}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>
   </div>
   {(typeFilter !== 'all' || statusFilter !== 'all') && (
   <Button
    variant="ghost"
    size="sm"
    className="h-7 text-[10px] text-muted-foreground"
    onClick={() => {
    setTypeFilter('all');
    setStatusFilter('all');
    }}
   >
    إعادة تعيين الفلاتر
   </Button>
   )}
   <span className="text-[10px] text-muted-foreground ms-auto">
   عرض {filteredRows.length} من {rows.length}
   </span>
  </CardContent>
  </Card>

  <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

  <DataTable
  data={filteredRows}
  columns={columns}
  tableId="terms-and-conditions"
  searchable
  loading={list.isLoading}
  pageSize={12}
  onAdd={openCreateDialog}
  addLabel="شروط جديدة"
  onEdit={openEditDialog}
  onDelete={(row) => {
   setToDelete(row);
   setDeleteOpen(true);
  }}
  onView={openPreview}
  exportFileName="شروط-وأحكام"
  />

  {/* Preview Dialog */}
  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Eye className="h-4 w-4" />
    معاينة الشروط
   </DialogTitle>
   </DialogHeader>
   <div className="space-y-3">
   <h3 className="text-sm font-semibold">{previewContent.title}</h3>
   <div className="rounded-lg border border-border/40 bg-card p-4 overflow-y-auto max-h-[60vh]">
    {previewContent.terms ? (
    <div
     className="prose prose-sm max-w-none text-foreground text-xs leading-relaxed"
     dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent.terms) }}
    />
    ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
     لا يوجد محتوى للمعاينة
    </p>
    )}
   </div>
   </div>
  </DialogContent>
  </Dialog>

  {/* Delete Confirmation */}
  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف الشروط «{toDelete?.title || toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء وقد تؤثر على المستندات المرتبطة.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction
    variant="destructive"
    onClick={confirmDelete}
    disabled={deleteMut.isPending}
   >
    {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>

  {/* Help section */}
  <Card className="border-dashed border-border/50 bg-muted/20">
  <CardContent className="p-4 space-y-2">
   <div className="flex items-center gap-2">
   <FileText className="h-4 w-4 text-chart-2 shrink-0" />
   <h3 className="text-xs font-semibold">حول الشروط والأحكام</h3>
   </div>
   <p className="text-xs text-muted-foreground leading-relaxed">
   الشروط والأحكام تُستخدم في المستندات مثل عروض الأسعار وأوامر البيع والشراء والفواتير.
   يمكنك ربط شروط محددة بالمشتريات أو المبيعات، وسيتم عرضها تلقائياً عند إنشاء المستندات المناسبة.
   تعطيل الشروط لا يحذفها بل يمنع ظهورها في الاختيارات الجديدة.
   </p>
  </CardContent>
  </Card>
 </div>
 );
}
