'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogDescription,
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
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/erp/empty-state';
import {
 Route,
 Plus,
 Search,
 Edit,
 Trash2,
 MoreHorizontal,
 RefreshCw,
 Loader2,
 ArrowRightLeft,
 FileText,
 Receipt,
 CreditCard,
 BookOpen,
 Settings2,
 CheckCircle2,
 Zap,
} from 'lucide-react';
import { toast } from 'sonner';

/* ──────────────────────────────────────────── */
/* Types & Constants       */
/* ──────────────────────────────────────────── */

type RoutingRule = {
 id: string;
 document_type: string;
 default_account: string;
 company: string;
 createdAt?: string;
 updatedAt?: string;
};

const DOCUMENT_TYPES = [
 { value: 'Sales Invoice', label: 'فاتورة مبيعات', icon: Receipt },
 { value: 'Purchase Invoice', label: 'فاتورة شراء', icon: FileText },
 { value: 'Payment Entry', label: 'قيد دفع', icon: CreditCard },
 { value: 'Journal Entry', label: 'قيد يومية', icon: BookOpen },
 { value: 'Sales Order', label: 'أمر مبيعات', icon: FileText },
 { value: 'Purchase Order', label: 'أمر شراء', icon: FileText },
 { value: 'Delivery Note', label: 'إشعار تسليم', icon: FileText },
 { value: 'Purchase Receipt', label: 'إيصال استلام', icon: FileText },
 { value: 'Stock Entry', label: 'قيد مخزون', icon: ArrowRightLeft },
 { value: 'Expense Claim', label: 'مطالبة مصروفات', icon: CreditCard },
] as const;

const QUICK_SETUP_TEMPLATES: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
 { document_type: 'Sales Invoice', default_account: 'إيراد المبيعات', company: '' },
 { document_type: 'Purchase Invoice', default_account: 'مصروف المشتريات', company: '' },
 { document_type: 'Payment Entry', default_account: 'النقدية أو البنك', company: '' },
 { document_type: 'Journal Entry', default_account: '', company: '' },
];

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
 DOCUMENT_TYPES.map((d) => [d.value, d.label])
);

type RuleFormData = {
 document_type: string;
 default_account: string;
 company: string;
};

const emptyForm: RuleFormData = {
 document_type: '',
 default_account: '',
 company: '',
};

/* ──────────────────────────────────────────── */
/* Main Component        */
/* ──────────────────────────────────────────── */

export default function AccountRoutingPage() {
 const [rules, setRules] = useState<RoutingRule[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterCompany, setFilterCompany] = useState<string>('all');
 const [filterDocType, setFilterDocType] = useState<string>('all');

 // Dialog state
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
 const [formData, setFormData] = useState<RuleFormData>(emptyForm);
 const [saving, setSaving] = useState(false);

 // Delete confirmation
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [ruleToDelete, setRuleToDelete] = useState<RoutingRule | null>(null);

 // Quick setup dialog
 const [quickSetupOpen, setQuickSetupOpen] = useState(false);
 const [quickSetupCompany, setQuickSetupCompany] = useState('');

 /* ── Load rules ── */
 const loadRules = useCallback(async () => {
 setLoading(true);
 try {
  const res = await fetch('/api/settings/account-routing');
  const j = await res.json();
  if (j?.success && Array.isArray(j.data)) {
  setRules(j.data);
  }
 } catch {
  toast.error('فشل تحميل قواعد التوجيه');
 } finally {
  setLoading(false);
 }
 }, []);

 useEffect(() => {
 let cancelled = false;
 (async () => {
  if (cancelled) return;
  setLoading(true);
  try {
  const res = await fetch('/api/settings/account-routing');
  const j = await res.json();
  if (!cancelled && j?.success && Array.isArray(j.data)) {
   setRules(j.data);
  }
  } catch {
  if (!cancelled) toast.error('فشل تحميل قواعد التوجيه');
  } finally {
  if (!cancelled) setLoading(false);
  }
 })();
 return () => { cancelled = true; };
 }, []);

 /* ── Unique companies from rules ── */
 const companies = useMemo(() => {
 const set = new Set(rules.map((r) => r.company).filter(Boolean));
 return Array.from(set).sort();
 }, [rules]);

 /* ── Filtered rules ── */
 const filteredRules = useMemo(() => {
 let result = rules;
 if (searchQuery.trim()) {
  const q = searchQuery.trim().toLowerCase();
  result = result.filter(
  (r) =>
   r.document_type.toLowerCase().includes(q) ||
   r.default_account.toLowerCase().includes(q) ||
   r.company.toLowerCase().includes(q)
  );
 }
 if (filterCompany !== 'all') {
  result = result.filter((r) => r.company === filterCompany);
 }
 if (filterDocType !== 'all') {
  result = result.filter((r) => r.document_type === filterDocType);
 }
 return result;
 }, [rules, searchQuery, filterCompany, filterDocType]);

 /* ── Stats ── */
 const stats = useMemo(() => {
 const total = rules.length;
 const docTypes = new Set(rules.map((r) => r.document_type)).size;
 const companiesCount = new Set(rules.map((r) => r.company)).size;
 const coveredDocTypes = DOCUMENT_TYPES.filter((dt) =>
  rules.some((r) => r.document_type === dt.value)
 ).length;
 return { total, docTypes, companiesCount, coveredDocTypes };
 }, [rules]);

 /* ── Dialog handlers ── */
 const openCreateDialog = useCallback(() => {
 setEditingRule(null);
 setFormData(emptyForm);
 setDialogOpen(true);
 }, []);

 const openEditDialog = useCallback((rule: RoutingRule) => {
 setEditingRule(rule);
 setFormData({
  document_type: rule.document_type,
  default_account: rule.default_account,
  company: rule.company,
 });
 setDialogOpen(true);
 }, []);

 const handleSaveRule = useCallback(async () => {
 if (!formData.document_type.trim()) {
  toast.error('يرجى اختيار نوع المستند');
  return;
 }
 if (!formData.default_account.trim()) {
  toast.error('يرجى إدخال الحساب الافتراضي');
  return;
 }
 if (!formData.company.trim()) {
  toast.error('يرجى إدخال اسم الشركة');
  return;
 }

 setSaving(true);
 try {
  if (editingRule) {
  const res = await fetch('/api/settings/account-routing', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
   _action: 'update',
   id: editingRule.id,
   ...formData,
   }),
  });
  const j = await res.json();
  if (!j?.success) throw new Error(j?.error || 'فشل التحديث');
  toast.success('تم تحديث قاعدة التوجيه');
  } else {
  const res = await fetch('/api/settings/account-routing', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(formData),
  });
  const j = await res.json();
  if (!j?.success) throw new Error(j?.error || 'فشل الإنشاء');
  toast.success('تم إنشاء قاعدة التوجيه');
  }
  setDialogOpen(false);
  loadRules();
 } catch (e) {
  toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
 } finally {
  setSaving(false);
 }
 }, [editingRule, formData, loadRules]);

 /* ── Delete handler ── */
 const handleDeleteRule = useCallback(async () => {
 if (!ruleToDelete) return;
 try {
  const res = await fetch('/api/settings/account-routing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ _action: 'delete', id: ruleToDelete.id }),
  });
  const j = await res.json();
  if (j?.success) {
  toast.success('تم حذف قاعدة التوجيه');
  loadRules();
  } else {
  toast.error(j?.error || 'فشل الحذف');
  }
 } catch {
  toast.error('فشل الاتصال بالخادم');
 }
 setDeleteDialogOpen(false);
 setRuleToDelete(null);
 }, [ruleToDelete, loadRules]);

 /* ── Quick Setup ── */
 const handleQuickSetup = useCallback(async () => {
 if (!quickSetupCompany.trim()) {
  toast.error('يرجى إدخال اسم الشركة');
  return;
 }
 setSaving(true);
 try {
  let created = 0;
  for (const tpl of QUICK_SETUP_TEMPLATES) {
  const exists = rules.some(
   (r) => r.document_type === tpl.document_type && r.company === quickSetupCompany
  );
  if (!exists) {
   const res = await fetch('/api/settings/account-routing', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({
    document_type: tpl.document_type,
    default_account: tpl.default_account,
    company: quickSetupCompany,
   }),
   });
   const j = await res.json();
   if (j?.success) created++;
  }
  }
  if (created > 0) {
  toast.success(`تم إنشاء ${created} قاعدة توجيه`);
  } else {
  toast.info('جميع القواعد موجودة مسبقاً');
  }
  setQuickSetupOpen(false);
  setQuickSetupCompany('');
  loadRules();
 } catch {
  toast.error('فشل الإعداد السريع');
 } finally {
  setSaving(false);
 }
 }, [quickSetupCompany, rules, loadRules]);

 /* ── Loading state ── */
 if (loading && rules.length === 0) {
 return (
  <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
   title="توجيه الحسابات"
   description="ربط حسابات دفتر الأستاذ الافتراضية بأنواع المستندات المختلفة"
   iconify="solar:graph-new-up-bold-duotone"
   accent="primary"
   breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'توجيه الحسابات' }]}
  />
  <div className="flex items-center justify-center py-20">
   <Loader2 className="h-8 w-8 animate-spin text-primary" />
   <span className="ms-3 text-sm text-muted-foreground">جاري تحميل البيانات…</span>
  </div>
  </div>
 );
 }

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  {/* ── Header ── */}
  <PageHeader
  title="توجيه الحسابات"
  description="ربط حسابات دفتر الأستاذ الافتراضية بأنواع المستندات المختلفة — أساس الترحيل التلقائي للعمليات"
  iconify="solar:graph-new-up-bold-duotone"
  accent="primary"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'توجيه الحسابات' }]}
  actions={
   <div className="flex items-center gap-2">
   <Button variant="outline" size="sm" className="gap-1.5" onClick={loadRules} disabled={loading}>
    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    تحديث
   </Button>
   <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuickSetupOpen(true)}>
    <Zap className="h-3.5 w-3.5" />
    إعداد سريع
   </Button>
   <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
    <Plus className="h-3.5 w-3.5" />
    قاعدة جديدة
   </Button>
   </div>
  }
  />

  {/* ── Stats ── */}
  {/* ── Search & Filters ── */}
  <Card className="border-border/40 shadow-sm">
  <CardContent className="p-4">
   <div className="flex flex-col sm:flex-row gap-3">
   <div className="relative flex-1">
    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
    placeholder="بحث بنوع المستند أو الحساب أو الشركة..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="ps-9 h-9 text-sm"
    />
   </div>
   <Select value={filterDocType} onValueChange={setFilterDocType}>
    <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
    <FileText className="h-3.5 w-3.5 ms-1 text-muted-foreground" />
    <SelectValue placeholder="نوع المستند" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">جميع الأنواع</SelectItem>
    {DOCUMENT_TYPES.map((dt) => (
     <SelectItem key={dt.value} value={dt.value}>
     {dt.label}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>
   <Select value={filterCompany} onValueChange={setFilterCompany}>
    <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
    <SelectValue placeholder="الشركة" />
    </SelectTrigger>
    <SelectContent>
    <SelectItem value="all">جميع الشركات</SelectItem>
    {companies.map((c) => (
     <SelectItem key={c} value={c}>
     {c}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>
   </div>
  </CardContent>
  </Card>

  {/* ── Rules Table ── */}
  <PageShell padded={false}>
  <div className="overflow-x-auto">
   <Table>
   <TableHeader>
    <TableRow className="bg-muted/40 hover:bg-muted/40">
    <TableHead className="text-xs font-semibold ps-4">نوع المستند</TableHead>
    <TableHead className="text-xs font-semibold">الحساب الافتراضي</TableHead>
    <TableHead className="text-xs font-semibold">الشركة</TableHead>
    <TableHead className="text-center text-xs font-semibold pe-4">إجراءات</TableHead>
    </TableRow>
   </TableHeader>
   <TableBody>
    {filteredRules.length === 0 ? (
    <TableRow>
     <TableCell colSpan={4} className="py-12">
     <EmptyState
      title="لا توجد قواعد توجيه"
      description={
      searchQuery || filterCompany !== 'all' || filterDocType !== 'all'
       ? 'لا توجد نتائج مطابقة للفلاتر الحالية'
       : 'أضف قواعد توجيه لربط الحسابات بأنواع المستندات'
      }
      icon={Route}
      actionLabel="إضافة قاعدة"
      onAction={openCreateDialog}
      className="min-h-[180px]"
     />
     </TableCell>
    </TableRow>
    ) : (
    filteredRules.map((rule) => (
     <TableRow
     key={rule.id}
     className="hover:bg-muted/20 transition-colors"
     >
     <TableCell className="ps-4">
      <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
       <FileText className="h-3.5 w-3.5" />
      </div>
      <div>
       <p className="text-sm font-medium">{DOC_TYPE_LABELS[rule.document_type] || rule.document_type}</p>
       <p className="text-[10px] text-muted-foreground" dir="ltr">{rule.document_type}</p>
      </div>
      </div>
     </TableCell>
     <TableCell>
      <Badge variant="outline" className="text-xs border-0 bg-muted/50 font-mono">
      {rule.default_account}
      </Badge>
     </TableCell>
     <TableCell>
      <span className="text-sm">{rule.company}</span>
     </TableCell>
     <TableCell className="pe-4 text-center">
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
       <Button variant="ghost" size="icon" className="h-8 w-8">
       <MoreHorizontal className="h-3.5 w-3.5" />
       </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
       <DropdownMenuItem onClick={() => openEditDialog(rule)}>
       <Edit className="me-2 h-3.5 w-3.5" />
       تعديل
       </DropdownMenuItem>
       <DropdownMenuItem
       onClick={() => {
        setRuleToDelete(rule);
        setDeleteDialogOpen(true);
       }}
       className="text-destructive focus:text-destructive"
       >
       <Trash2 className="me-2 h-3.5 w-3.5" />
       حذف
       </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
     </TableCell>
     </TableRow>
    ))
    )}
   </TableBody>
   </Table>
  </div>
  {filteredRules.length > 0 && (
   <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
   <span>عرض {filteredRules.length} من {rules.length} قاعدة</span>
   {(searchQuery || filterCompany !== 'all' || filterDocType !== 'all') && (
    <Button
    variant="ghost"
    size="sm"
    className="h-7 text-xs gap-1"
    onClick={() => {
     setSearchQuery('');
     setFilterCompany('all');
     setFilterDocType('all');
    }}
    >
    مسح الفلاتر
    </Button>
   )}
   </div>
  )}
  </PageShell>

  {/* ── Quick Setup Dialog ── */}
  <Dialog open={quickSetupOpen} onOpenChange={setQuickSetupOpen}>
  <DialogContent className="sm:max-w-[500px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Zap className="h-5 w-5 text-chart-2" />
    إعداد سريع
   </DialogTitle>
   <DialogDescription>
    إنشاء قواعد توجيه تلقائية لأنواع المستندات الشائعة
   </DialogDescription>
   </DialogHeader>
   <div className="space-y-4 py-2">
   <div className="space-y-2">
    <Label className="text-sm font-medium">اسم الشركة <span className="text-destructive">*</span></Label>
    <Input
    placeholder="مثال: شركة النور التجارية"
    value={quickSetupCompany}
    onChange={(e) => setQuickSetupCompany(e.target.value)}
    />
   </div>
   <div className="space-y-2">
    <Label className="text-sm font-medium">سيتم إنشاء القواعد التالية:</Label>
    <div className="space-y-2 p-3 rounded-lg border border-border/40 bg-muted/10">
    {QUICK_SETUP_TEMPLATES.map((tpl) => (
     <div key={tpl.document_type} className="flex items-center gap-2 text-xs">
     <ArrowRightLeft className="h-3 w-3 text-primary shrink-0" />
     <span className="font-medium">{DOC_TYPE_LABELS[tpl.document_type] || tpl.document_type}</span>
     <span className="text-muted-foreground">→</span>
     <span className="font-mono text-muted-foreground">{tpl.default_account}</span>
     </div>
    ))}
    </div>
    <p className="text-[10px] text-muted-foreground">
    القواعد الموجودة مسبقاً لن يتم تكرارها
    </p>
   </div>
   </div>
   <DialogFooter>
   <Button variant="outline" onClick={() => setQuickSetupOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={() => void handleQuickSetup()} disabled={saving || !quickSetupCompany.trim()}>
    {saving ? <Loader2 className="h-4 w-4 animate-spin ms-1" /> : <Zap className="h-4 w-4 ms-1" />}
    إنشاء القواعد
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Create / Edit Dialog ── */}
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="sm:max-w-[480px]" dir="rtl">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    {editingRule ? (
    <>
     <Edit className="h-5 w-5 text-chart-1" />
     تعديل قاعدة التوجيه
    </>
    ) : (
    <>
     <Plus className="h-5 w-5 text-chart-1" />
     إنشاء قاعدة توجيه جديدة
    </>
    )}
   </DialogTitle>
   <DialogDescription>
    {editingRule ? 'تعديل بيانات قاعدة التوجيه' : 'ربط حساب افتراضي بنوع مستند'}
   </DialogDescription>
   </DialogHeader>
   <div className="space-y-4 py-2">
   <div className="space-y-2">
    <Label className="text-sm font-medium">نوع المستند <span className="text-destructive">*</span></Label>
    <Select
    value={formData.document_type}
    onValueChange={(v) => setFormData((prev) => ({ ...prev, document_type: v }))}
    >
    <SelectTrigger className="h-9 text-sm">
     <SelectValue placeholder="اختر نوع المستند" />
    </SelectTrigger>
    <SelectContent>
     {DOCUMENT_TYPES.map((dt) => (
     <SelectItem key={dt.value} value={dt.value}>
      {dt.label}
     </SelectItem>
     ))}
    </SelectContent>
    </Select>
   </div>
   <div className="space-y-2">
    <Label className="text-sm font-medium">الحساب الافتراضي <span className="text-destructive">*</span></Label>
    <Input
    placeholder="مثال: إيراد المبيعات"
    value={formData.default_account}
    onChange={(e) => setFormData((prev) => ({ ...prev, default_account: e.target.value }))}
    />
    <p className="text-[10px] text-muted-foreground">اسم حساب دفتر الأستاذ الافتراضي</p>
   </div>
   <div className="space-y-2">
    <Label className="text-sm font-medium">الشركة <span className="text-destructive">*</span></Label>
    <Input
    placeholder="مثال: شركة النور التجارية"
    value={formData.company}
    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
    />
    <p className="text-[10px] text-muted-foreground">الشركة التي تنطبق عليها القاعدة</p>
   </div>
   </div>
   <DialogFooter>
   <Button variant="outline" onClick={() => setDialogOpen(false)}>
    إلغاء
   </Button>
   <Button onClick={() => void handleSaveRule()} disabled={saving}>
    {saving && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
    {editingRule ? 'تحديث' : 'إنشاء'}
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ── Delete Confirmation ── */}
  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle>حذف قاعدة التوجيه</AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف قاعدة التوجيه لـ &quot;{ruleToDelete ? DOC_TYPE_LABELS[ruleToDelete.document_type] || ruleToDelete.document_type : ''}&quot;؟
    لا يمكن التراجع عن هذا الإجراء.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction
    onClick={() => void handleDeleteRule()}
    variant="destructive"
   >
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
