'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { PageHeader, PageShell, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  Code,
  LayoutTemplate,
  Mail,
  BookOpen,
  CodeXml,
  Calendar,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

/* ──────────────────────────────────────────── */
/*  Types & Constants                          */
/* ──────────────────────────────────────────── */

type RichTemplate = {
  id: string;
  template_name: string;
  module: string;
  subject: string;
  response: string;
  use_html: boolean;
  owner: string;
  modified: string;
  createdAt?: string;
};

const MODULES = [
  'المبيعات',
  'المشتريات',
  'المحاسبة',
  'المخزون',
  'الموارد البشرية',
  'التصنيع',
  'عام',
] as const;

const MODULE_ICONS: Record<string, typeof FileText> = {
  'المبيعات': FileText,
  'المشتريات': FileText,
  'المحاسبة': BookOpen,
  'المخزون': LayoutTemplate,
  'الموارد البشرية': User,
  'التصنيع': Code,
  'عام': FileText,
};

const MODULE_COLORS: Record<string, string> = {
  'المبيعات': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/25',
  'المشتريات': 'bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-sky-500/25',
  'المحاسبة': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/25',
  'المخزون': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-500/25',
  'الموارد البشرية': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 ring-pink-500/25',
  'التصنيع': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-orange-500/25',
  'عام': 'bg-muted text-muted-foreground ring-border/40',
};

type TemplateFormData = {
  template_name: string;
  module: string;
  subject: string;
  response: string;
  use_html: boolean;
};

const emptyForm: TemplateFormData = {
  template_name: '',
  module: 'عام',
  subject: '',
  response: '',
  use_html: false,
};

/* ──────────────────────────────────────────── */
/*  Main Component                             */
/* ──────────────────────────────────────────── */

export default function RichTemplatesPage() {
  const [templates, setTemplates] = useState<RichTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RichTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<RichTemplate | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<RichTemplate | null>(null);

  /* ── Load templates ── */
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/rich-templates');
      const j = await res.json();
      if (j?.success && Array.isArray(j.data)) {
        setTemplates(j.data);
      }
    } catch {
      toast.error('فشل تحميل القوالب');
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
        const res = await fetch('/api/settings/rich-templates');
        const j = await res.json();
        if (!cancelled && j?.success && Array.isArray(j.data)) {
          setTemplates(j.data);
        }
      } catch {
        if (!cancelled) toast.error('فشل تحميل القوالب');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Filtered templates ── */
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.template_name.toLowerCase().includes(q) ||
          t.module.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.owner.toLowerCase().includes(q)
      );
    }
    if (filterModule !== 'all') {
      result = result.filter((t) => t.module === filterModule);
    }
    return result;
  }, [templates, searchQuery, filterModule]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const total = templates.length;
    const htmlCount = templates.filter((t) => t.use_html).length;
    const modules = new Set(templates.map((t) => t.module)).size;
    const recentCount = (() => {
      const now = new Date();
      const week = 7 * 24 * 60 * 60 * 1000;
      return templates.filter((t) => {
        if (!t.modified) return false;
        return now.getTime() - new Date(t.modified).getTime() < week;
      }).length;
    })();
    return { total, htmlCount, modules, recentCount };
  }, [templates]);

  /* ── Dialog handlers ── */
  const openCreateDialog = useCallback(() => {
    setEditingTemplate(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((template: RichTemplate) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      module: template.module,
      subject: template.subject,
      response: template.response,
      use_html: template.use_html,
    });
    setDialogOpen(true);
  }, []);

  const openPreviewDialog = useCallback((template: RichTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!formData.template_name.trim()) {
      toast.error('يرجى إدخال اسم القالب');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        const res = await fetch('/api/settings/rich-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _action: 'update',
            id: editingTemplate.id,
            ...formData,
          }),
        });
        const j = await res.json();
        if (!j?.success) throw new Error(j?.error || 'فشل التحديث');
        toast.success('تم تحديث القالب');
      } else {
        const res = await fetch('/api/settings/rich-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const j = await res.json();
        if (!j?.success) throw new Error(j?.error || 'فشل الإنشاء');
        toast.success('تم إنشاء القالب');
      }
      setDialogOpen(false);
      loadTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [editingTemplate, formData, loadTemplates]);

  /* ── Delete handler ── */
  const handleDeleteTemplate = useCallback(async () => {
    if (!templateToDelete) return;
    try {
      const res = await fetch('/api/settings/rich-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'delete', id: templateToDelete.id }),
      });
      const j = await res.json();
      if (j?.success) {
        toast.success('تم حذف القالب');
        loadTemplates();
      } else {
        toast.error(j?.error || 'فشل الحذف');
      }
    } catch {
      toast.error('فشل الاتصال بالخادم');
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  }, [templateToDelete, loadTemplates]);

  /* ── Format date ── */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  /* ── Loading ── */
  if (loading && templates.length === 0) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="القوالب الغنية"
          description="إدارة قوالب البريد الإلكتروني والمستندات بتنسيق نص غني أو HTML"
          iconify="solar:document-text-bold-duotone"
          accent="info"
          breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'القوالب الغنية' }]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ms-3 text-sm text-muted-foreground">جاري تحميل القوالب…</span>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      {/* ── Header ── */}
      <PageHeader
        title="القوالب الغنية"
        description="إدارة قوالب البريد الإلكتروني والمستندات بتنسيق نص غني أو HTML — يدعم متغيرات Jinja"
        iconify="solar:document-text-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'القوالب الغنية' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={loadTemplates} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button variant="outline" size="sm" className="" asChild>
              <Link href="/settings/print-templates">
                <FileText className="h-3.5 w-3.5 ms-1" />
                قوالب الطباعة
              </Link>
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openCreateDialog}>
              <Plus className="h-3.5 w-3.5" />
              قالب جديد
            </Button>
          </div>
        }
      />

      {/* ── Stats ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="إجمالي القوالب"
          value={stats.total}
          icon={LayoutTemplate}
          accent="info"
          description="جميع القوالب المسجلة"
        />
        <KpiCard
          title="قوالب HTML"
          value={stats.htmlCount}
          icon={CodeXml}
          accent="warning"
          description="قوالب بتنسيق HTML"
        />
        <KpiCard
          title="الوحدات المغطاة"
          value={stats.modules}
          icon={BookOpen}
          accent="success"
          description="وحدات ذات قوالب"
        />
        <KpiCard
          title="معدّلة مؤخراً"
          value={stats.recentCount}
          icon={Calendar}
          accent="primary"
          description="خلال آخر 7 أيام"
        />
      </KpiStrip>

      {/* ── Search & Filter ── */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الوحدة أو الموضوع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 h-9 text-sm"
              />
            </div>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                <BookOpen className="h-3.5 w-3.5 ms-1 text-muted-foreground" />
                <SelectValue placeholder="الوحدة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الوحدات</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Templates Table ── */}
      <PageShell padded={false}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold ps-4">اسم القالب</TableHead>
                <TableHead className="text-xs font-semibold">الوحدة</TableHead>
                <TableHead className="text-xs font-semibold">الموضوع</TableHead>
                <TableHead className="text-center text-xs font-semibold">HTML</TableHead>
                <TableHead className="text-xs font-semibold">المالك</TableHead>
                <TableHead className="text-xs font-semibold">آخر تعديل</TableHead>
                <TableHead className="text-center text-xs font-semibold pe-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12">
                    <EmptyState
                      title="لا توجد قوالب"
                      description={
                        searchQuery || filterModule !== 'all'
                          ? 'لا توجد نتائج مطابقة للفلاتر الحالية'
                          : 'أضف قالب جديد للبريد الإلكتروني أو المستندات'
                      }
                      icon={LayoutTemplate}
                      actionLabel="إنشاء قالب"
                      onAction={openCreateDialog}
                      className="min-h-[180px]"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => {
                  const ModuleIcon = MODULE_ICONS[template.module] || FileText;
                  const moduleColor = MODULE_COLORS[template.module] || MODULE_COLORS['عام'];
                  return (
                    <TableRow
                      key={template.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="ps-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
                            <LayoutTemplate className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{template.template_name}</p>
                            <p className="text-[10px] text-muted-foreground" dir="ltr">{template.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] border-0 ring-1 ring-inset ${moduleColor}`}>
                          <ModuleIcon className="h-2.5 w-2.5 me-1" />
                          {template.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {template.subject || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {template.use_html ? (
                          <Badge variant="outline" className="text-[10px] border-0 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <CodeXml className="h-2.5 w-2.5 me-0.5" />
                            HTML
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-0 bg-muted/50 text-muted-foreground">
                            نص
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {template.owner}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(template.modified)}
                      </TableCell>
                      <TableCell className="pe-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => openPreviewDialog(template)}>
                              <Eye className="me-2 h-3.5 w-3.5" />
                              معاينة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Edit className="me-2 h-3.5 w-3.5" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setTemplateToDelete(template);
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {filteredTemplates.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 text-xs text-muted-foreground">
            <span>عرض {filteredTemplates.length} من {templates.length} قالب</span>
            {(searchQuery || filterModule !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setSearchQuery('');
                  setFilterModule('all');
                }}
              >
                مسح الفلاتر
              </Button>
            )}
          </div>
        )}
      </PageShell>

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplate ? (
                <>
                  <Edit className="h-5 w-5 text-sky-600" />
                  تعديل القالب
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-sky-600" />
                  إنشاء قالب جديد
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'تعديل بيانات القالب ومحتواه' : 'إنشاء قالب جديد للبريد الإلكتروني أو المستندات'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm font-medium">اسم القالب <span className="text-destructive">*</span></Label>
              <Input
                placeholder="مثال: تأكيد طلب مبيعات"
                value={formData.template_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, template_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">الوحدة</Label>
                <Select
                  value={formData.module}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, module: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">استخدام HTML</Label>
                <div className="flex items-center gap-2 h-9">
                  <Checkbox
                    id="use-html"
                    checked={formData.use_html}
                    onCheckedChange={(v) => setFormData((prev) => ({ ...prev, use_html: !!v }))}
                  />
                  <Label htmlFor="use-html" className="text-xs cursor-pointer">
                    تفعيل تنسيق HTML
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">الموضوع</Label>
              <Input
                placeholder="مثال: تأكيد الطلب {{ doc.name }}"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                dir="auto"
              />
              <p className="text-[10px] text-muted-foreground">يدعم متغيرات Jinja مثل {'{{ doc.name }}'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">المحتوى (الاستجابة)</Label>
              <Textarea
                placeholder={formData.use_html ? '<p>مرحباً {{ doc.customer_name }},</p>' : 'مرحباً {{ doc.customer_name }},\n\nتم تأكيد طلبك...'}
                value={formData.response}
                onChange={(e) => setFormData((prev) => ({ ...prev, response: e.target.value }))}
                className="min-h-[200px] text-sm font-mono"
                dir="auto"
              />
              <p className="text-[10px] text-muted-foreground">
                {formData.use_html
                  ? 'يمكنك استخدام أكواد HTML مع متغيرات Jinja'
                  : 'نص عادي مع دعم متغيرات Jinja'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void handleSaveTemplate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
              {editingTemplate ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[650px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              معاينة القالب
            </DialogTitle>
            <DialogDescription>
              {previewTemplate?.template_name}
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 py-2">
              {/* Template metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">الوحدة</span>
                  <Badge variant="outline" className={`text-[10px] border-0 ring-1 ring-inset ${MODULE_COLORS[previewTemplate.module] || MODULE_COLORS['عام']}`}>
                    {previewTemplate.module}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">التنسيق</span>
                  <Badge variant="outline" className={`text-[10px] border-0 ${previewTemplate.use_html ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-muted/50 text-muted-foreground'}`}>
                    {previewTemplate.use_html ? 'HTML' : 'نص عادي'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">الموضوع</span>
                  <p className="text-xs font-medium">{previewTemplate.subject || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">المالك</span>
                  <p className="text-xs">{previewTemplate.owner}</p>
                </div>
              </div>

              {/* Template content */}
              <div className="space-y-2">
                <span className="text-xs font-semibold">المحتوى:</span>
                {previewTemplate.use_html ? (
                  <div
                    className="p-4 rounded-lg border border-border/40 bg-white dark:bg-muted/20 text-sm leading-relaxed overflow-auto max-h-[350px]"
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: previewTemplate.response || '<p class="text-muted-foreground">لا محتوى</p>' }}
                  />
                ) : (
                  <div className="p-4 rounded-lg border border-border/40 bg-white dark:bg-muted/20 overflow-auto max-h-[350px]">
                    <div
                      className="max-w-none space-y-3 text-start text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pe-6 [&_ol]:list-decimal [&_ol]:pe-6 [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded"
                      dir="rtl"
                    >
                      <ReactMarkdown>{previewTemplate.response || '*لا محتوى*'}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              إغلاق
            </Button>
            {previewTemplate && (
              <Button onClick={() => {
                setPreviewOpen(false);
                openEditDialog(previewTemplate);
              }}>
                <Edit className="h-4 w-4 ms-1" />
                تعديل
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف القالب &quot;{templateToDelete?.template_name}&quot;؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteTemplate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
