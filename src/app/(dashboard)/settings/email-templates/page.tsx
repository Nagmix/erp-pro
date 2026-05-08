'use client';

<<<<<<< HEAD
import { useMemo, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
=======
import { useMemo, useSyncExternalStore, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
import {
  Mail,
  Eye,
  Info,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import { toast } from 'sonner';

/* ─── ERPNext Email Template DocType ─── */
type EmailTemplate = {
  name: string;
  subject?: string;
  response?: string;
  reference_doctype?: string;
  use_html?: number;
  owner?: string;
  creation?: string;
  modified?: string;
};

=======
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Eye,
  FileText,
  Info,
} from 'lucide-react';

/* ─── Types ─── */
type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  doctype: string;
  attachPdf: boolean;
  createdAt: string;
};

const LS_KEY = 'erp_email_templates';

>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  'Sales Invoice': { name: 'SINV-001', customer_name: 'شركة النور التجارية', grand_total: '15,000', due_date: '2025-02-15', posting_date: '2025-01-15', outstanding_amount: '15,000', currency: 'YER' },
  'Purchase Invoice': { name: 'PINV-001', supplier_name: 'مؤسسة الأمل', grand_total: '8,500', due_date: '2025-02-20', posting_date: '2025-01-20', currency: 'YER' },
  'Payment Entry': { name: 'PE-001', party_name: 'شركة النور التجارية', paid_amount: '5,000', posting_date: '2025-01-25', reference_no: 'REF-123', mode_of_payment: 'تحويل بنكي' },
  'Quotation': { name: 'QTN-001', customer_name: 'شركة الأمل', grand_total: '25,000', valid_till: '2025-03-01', posting_date: '2025-01-15' },
  'Sales Order': { name: 'SO-001', customer_name: 'مؤسسة الفجر', grand_total: '18,000', delivery_date: '2025-02-10', posting_date: '2025-01-15' },
  'Delivery Note': { name: 'DN-001', customer_name: 'شركة النور', posting_date: '2025-01-20' },
};

<<<<<<< HEAD
=======
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as EmailTemplate[]) : [];
  } catch {
    return [];
  }
}

>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
function renderPreview(html: string, doctype: string): string {
  const sample = SAMPLE_DATA[doctype] ?? {};
  let rendered = html;
  for (const [key, value] of Object.entries(sample)) {
<<<<<<< HEAD
    // Support both {{ doc.field }} and {{ doc.field }} (Jinja syntax)
    rendered = rendered.replaceAll(`{{ doc.${key} }}`, value);
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    rendered = rendered.replaceAll(`{{doc.${key}}}`, value);
  }
  return rendered;
}

<<<<<<< HEAD
/* ─── Form state type ─── */
type FormState = {
  templateName: string;
  subject: string;
  response: string;
  reference_doctype: string;
  use_html: boolean;
};

const emptyForm: FormState = {
  templateName: '',
  subject: '',
  response: '',
  reference_doctype: 'Sales Invoice',
  use_html: true,
};

export default function EmailTemplatesPage() {
  /* ─── ERPNext API hooks ─── */
  const list = useDocList<EmailTemplate>('Email Template', {
    fields: ['name', 'subject', 'response', 'reference_doctype', 'use_html', 'owner', 'creation', 'modified'],
    limit: 200,
    order_by: 'modified desc',
  });
  const createMut = useCreateDoc('Email Template');
  const updateMut = useUpdateDoc('Email Template');
  const deleteMut = useDeleteDoc('Email Template');

  const templates = list.data ?? [];

  /* ─── Dialog state ─── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
=======
const emptySubscribe = () => () => {};

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => loadTemplates());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<Partial<EmailTemplate>>({});
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

<<<<<<< HEAD
  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const total = templates.length;
    const withDoctype = templates.filter((t) => t.reference_doctype).length;
    const htmlTemplates = templates.filter((t) => Number(t.use_html) === 1).length;
    return { total, withDoctype, htmlTemplates };
  }, [templates]);

  /* ─── Actions ─── */
  const openCreate = () => {
    setForm({ ...emptyForm });
=======
  // ─── Actions ───
  const openCreate = () => {
    setForm({ name: '', subject: '', htmlContent: '', doctype: 'Sales Invoice', attachPdf: false });
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: EmailTemplate) => {
<<<<<<< HEAD
    setForm({
      templateName: row.name ?? '',
      subject: row.subject ?? '',
      response: row.response ?? '',
      reference_doctype: row.reference_doctype ?? 'Sales Invoice',
      use_html: Number(row.use_html) === 1,
    });
=======
    setForm({ ...row });
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    setEditing(row);
    setDialogOpen(true);
  };

  const saveTemplate = () => {
<<<<<<< HEAD
    if (!form.templateName.trim() || !form.subject.trim() || !form.response.trim()) {
      toast.error('أدخل اسم القالب والموضوع والمحتوى');
      return;
    }

    const doc: Record<string, unknown> = {
      doctype: 'Email Template',
      subject: form.subject.trim(),
      response: form.response.trim(),
      reference_doctype: form.reference_doctype || undefined,
      use_html: form.use_html ? 1 : 0,
    };

    if (editing) {
      // Update existing template
      updateMut.mutate(
        { name: editing.name, doc },
        {
          onSuccess: () => {
            toast.success('تم تحديث القالب');
            setDialogOpen(false);
          },
          onError: (err) => {
            toast.error(`فشل التحديث: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
          },
        }
      );
    } else {
      // Create new template — name is the document ID in ERPNext
      createMut.mutate(
        { ...doc, name: form.templateName.trim() },
        {
          onSuccess: () => {
            toast.success('تم إنشاء القالب');
            setDialogOpen(false);
          },
          onError: (err) => {
            toast.error(`فشل الإنشاء: ${err instanceof Error ? err.message : 'تحقق من الصلاحيات أو من عدم تكرار الاسم'}`);
          },
        }
      );
    }
=======
    if (!form.name?.trim() || !form.subject?.trim() || !form.htmlContent?.trim()) {
      toast({ title: 'أدخل اسم القالب والموضوع والمحتوى', variant: 'destructive' });
      return;
    }
    let updated: EmailTemplate[];
    if (editing) {
      updated = templates.map((t) =>
        t.id === editing.id
          ? {
              ...t,
              name: form.name!,
              subject: form.subject!,
              htmlContent: form.htmlContent!,
              doctype: form.doctype ?? 'Sales Invoice',
              attachPdf: form.attachPdf ?? false,
            }
          : t
      );
    } else {
      updated = [
        ...templates,
        {
          id: uid(),
          name: form.name!,
          subject: form.subject!,
          htmlContent: form.htmlContent!,
          doctype: form.doctype ?? 'Sales Invoice',
          attachPdf: form.attachPdf ?? false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    setTemplates(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setDialogOpen(false);
    toast({ title: editing ? 'تم تحديث القالب' : 'تم إنشاء القالب' });
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
  };

  const confirmDelete = () => {
    if (!toDelete) return;
<<<<<<< HEAD
    deleteMut.mutate(toDelete.name, {
      onSuccess: () => {
        toast.success('تم حذف القالب');
        setDeleteOpen(false);
        setToDelete(null);
      },
      onError: (err) => {
        toast.error(`فشل الحذف: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
      },
    });
  };

  const openPreview = (row: EmailTemplate) => {
    setPreviewHtml(renderPreview(row.response ?? '', row.reference_doctype ?? 'Sales Invoice'));
=======
    const updated = templates.filter((t) => t.id !== toDelete.id);
    setTemplates(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setDeleteOpen(false);
    setToDelete(null);
    toast({ title: 'تم حذف القالب' });
  };

  const openPreview = (row: EmailTemplate) => {
    setPreviewHtml(renderPreview(row.htmlContent, row.doctype));
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
    setPreviewOpen(true);
  };

  const previewCurrentForm = () => {
<<<<<<< HEAD
    const doctype = form.reference_doctype ?? 'Sales Invoice';
    setPreviewHtml(renderPreview(form.response ?? '', doctype));
    setPreviewOpen(true);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  /* ─── Columns ─── */
=======
    const doctype = form.doctype ?? 'Sales Invoice';
    setPreviewHtml(renderPreview(form.htmlContent ?? '', doctype));
    setPreviewOpen(true);
  };

  // ─── Columns ───
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
          <span className="text-xs line-clamp-1 max-w-[250px]">{String(v ?? '—')}</span>
        ),
      },
      {
        key: 'reference_doctype',
        header: 'نوع المستند',
        render: (v) => {
          const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? (v ? String(v) : '—')}</span>;
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
        key: 'modified',
        header: 'آخر تعديل',
=======
          <span className="text-xs line-clamp-1 max-w-[250px]">{String(v)}</span>
        ),
      },
      {
        key: 'doctype',
        header: 'نوع المستند',
        render: (v) => {
          const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v)}</span>;
        },
      },
      {
        key: 'attachPdf',
        header: 'مرفق PDF',
        render: (v) => (
          <span className="text-xs">{v ? 'نعم' : 'لا'}</span>
        ),
      },
      {
        key: 'createdAt',
        header: 'تاريخ الإنشاء',
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        sortable: true,
        render: (v) => {
          if (!v) return '—';
          return <span className="text-xs">{new Date(String(v)).toLocaleDateString('ar-YE')}</span>;
        },
      },
    ],
    []
  );

  // ─── Variables for current doctype ───
<<<<<<< HEAD
  const currentVariables = VARIABLES_BY_DOCTYPE[form.reference_doctype ?? 'Sales Invoice'] ?? [];

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

      <PageHeader
        title="قوالب البريد الإلكتروني"
        description="إنشاء وإدارة قوالب البريد الإلكتروني للمستندات والفواتير — محفوظة في نظام ERPNext"
        iconify="solar:letter-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'قوالب البريد' }]}
      />

      {/* KPI Cards */}
      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي القوالب"
          value={kpis.total}
          icon={Mail}
          accent="primary"
          compact
        />
        <KpiCard
          title="مرتبطة بنوع مستند"
          value={kpis.withDoctype}
          icon={FileText}
          accent="info"
          compact
        />
        <KpiCard
          title="قوالب HTML"
          value={kpis.htmlTemplates}
          icon={Eye}
          accent="success"
          compact
        />
      </KpiStrip>

=======
  const currentVariables = VARIABLES_BY_DOCTYPE[form.doctype ?? 'Sales Invoice'] ?? [];

  if (!mounted) return null;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="قوالب البريد الإلكتروني"
        description="إنشاء وإدارة قوالب البريد الإلكتروني للمستندات والفواتير"
        iconify="solar:letter-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'قوالب البريد' }]}
      />

>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
      <DataTable
        data={templates}
        columns={columns}
        tableId="email-templates"
        searchable
<<<<<<< HEAD
        loading={list.isLoading}
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        addLabel="إنشاء قالب"
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={(row) => {
          setToDelete(row);
          setDeleteOpen(true);
        }}
        onView={(row) => openPreview(row)}
      />

      {/* Variables Help Section */}
      <Card className="border-dashed border-border/50 bg-muted/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-purple-600 shrink-0" />
<<<<<<< HEAD
            <h3 className="text-xs font-semibold">المتغيرات المتاحة حسب نوع المستند (Jinja)</h3>
=======
            <h3 className="text-xs font-semibold">المتغيرات المتاحة حسب نوع المستند</h3>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
                        className="rounded bg-purple-50 px-1 py-0.5 text-[9px] font-mono text-purple-700 border border-purple-200"
                      >
<<<<<<< HEAD
                        {`{{ ${v} }}`}
=======
                        {`{{${v}}}`}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                      </code>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
<<<<<<< HEAD
            أدخل المتغيرات بين أقواس مزدوجة في الموضوع أو المحتوى وسيتم استبدالها بقيم المستند عند الإرسال. يستخدم ERPNext محرك Jinja.
=======
            أدخل المتغيرات بين أقواس مزدوجة في الموضوع أو المحتوى وسيتم استبدالها بقيم المستند عند الإرسال.
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
          </p>
        </CardContent>
      </Card>

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {editing ? 'تعديل القالب' : 'إنشاء قالب جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم القالب *</Label>
                <Input
                  className="h-9"
<<<<<<< HEAD
                  dir="ltr"
                  value={form.templateName}
                  onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
                  placeholder="مثال: Sales Invoice Notification"
                  disabled={!!editing}
                />
                {editing && (
                  <p className="text-[10px] text-muted-foreground">لا يمكن تغيير اسم القالب بعد الإنشاء</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نوع المستند المرتبط</Label>
                <Select
                  value={form.reference_doctype ?? 'Sales Invoice'}
                  onValueChange={(v) => setForm((f) => ({ ...f, reference_doctype: v }))}
=======
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: إشعار فاتورة مبيعات"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نوع المستند</Label>
                <Select
                  value={form.doctype ?? 'Sales Invoice'}
                  onValueChange={(v) => setForm((f) => ({ ...f, doctype: v }))}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCTYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">الموضوع *</Label>
              <Input
                className="h-9"
<<<<<<< HEAD
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="فاتورة مبيعات {{ doc.name }} — {{ doc.customer_name }}"
=======
                value={form.subject ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="فاتورة مبيعات {{doc.name}} — {{doc.customer_name}}"
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
<<<<<<< HEAD
                <Label className="text-xs">محتوى البريد *</Label>
=======
                <Label className="text-xs">محتوى HTML *</Label>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
                value={form.response}
                onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
                placeholder={`<div style="font-family: system-ui, sans-serif; direction: rtl;">\n  <h2>فاتورة مبيعات</h2>\n  <p>العميل: {{ doc.customer_name }}</p>\n  <p>رقم الفاتورة: {{ doc.name }}</p>\n  <p>الإجمالي: {{ doc.grand_total }}</p>\n</div>`}
=======
                value={form.htmlContent ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                placeholder={`<div style="font-family: system-ui, sans-serif; direction: rtl;">\n  <h2>فاتورة مبيعات</h2>\n  <p>العميل: {{doc.customer_name}}</p>\n  <p>رقم الفاتورة: {{doc.name}}</p>\n  <p>الإجمالي: {{doc.grand_total}}</p>\n</div>`}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                className="font-mono text-xs"
              />
            </div>

            {/* Inline variables hint for selected doctype */}
            <div className="rounded-lg border border-purple-200/40 bg-purple-50/50 p-2.5 space-y-1">
<<<<<<< HEAD
              <p className="text-[10px] font-semibold text-purple-700">متغيرات {DOCTYPE_OPTIONS.find((o) => o.value === form.reference_doctype)?.label ?? ''}</p>
=======
              <p className="text-[10px] font-semibold text-purple-700">متغيرات {DOCTYPE_OPTIONS.find((o) => o.value === form.doctype)?.label ?? ''}</p>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
              <div className="flex flex-wrap gap-1">
                {currentVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="rounded border border-purple-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-purple-700 hover:bg-purple-100 transition-colors"
                    onClick={() => {
<<<<<<< HEAD
                      const insertion = `{{ ${v} }}`;
                      setForm((f) => ({ ...f, response: (f.response ?? '') + insertion }));
                    }}
                  >
                    {`{{ ${v} }}`}
=======
                      const insertion = `{{${v}}}`;
                      setForm((f) => ({ ...f, htmlContent: (f.htmlContent ?? '') + insertion }));
                    }}
                  >
                    {`{{${v}}}`}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-purple-600">اضغط على متغير لإضافته إلى المحتوى</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
<<<<<<< HEAD
                id="use-html"
                checked={form.use_html}
                onCheckedChange={(v) => setForm((f) => ({ ...f, use_html: v === true }))}
              />
              <Label htmlFor="use-html" className="text-xs cursor-pointer">
                تفعيل وضع HTML للمحتوى
=======
                id="attach-pdf"
                checked={form.attachPdf ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, attachPdf: v === true }))}
              />
              <Label htmlFor="attach-pdf" className="text-xs cursor-pointer">
                إرفاق PDF المستند مع البريد
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
<<<<<<< HEAD
            <Button size="sm" onClick={saveTemplate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
=======
            <Button size="sm" onClick={saveTemplate}>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
              {editing ? 'تحديث' : 'إنشاء'}
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
          <div className="rounded-lg border border-border/40 bg-white p-4">
            {previewHtml ? (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
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
<<<<<<< HEAD
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={confirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
=======
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={confirmDelete}>
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
