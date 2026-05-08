'use client';

import { useMemo, useSyncExternalStore, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
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

function renderPreview(html: string, doctype: string): string {
  const sample = SAMPLE_DATA[doctype] ?? {};
  let rendered = html;
  for (const [key, value] of Object.entries(sample)) {
    rendered = rendered.replaceAll(`{{doc.${key}}}`, value);
  }
  return rendered;
}

const emptySubscribe = () => () => {};

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => loadTemplates());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<Partial<EmailTemplate>>({});

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<EmailTemplate | null>(null);

  // ─── Actions ───
  const openCreate = () => {
    setForm({ name: '', subject: '', htmlContent: '', doctype: 'Sales Invoice', attachPdf: false });
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: EmailTemplate) => {
    setForm({ ...row });
    setEditing(row);
    setDialogOpen(true);
  };

  const saveTemplate = () => {
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
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const updated = templates.filter((t) => t.id !== toDelete.id);
    setTemplates(updated);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setDeleteOpen(false);
    setToDelete(null);
    toast({ title: 'تم حذف القالب' });
  };

  const openPreview = (row: EmailTemplate) => {
    setPreviewHtml(renderPreview(row.htmlContent, row.doctype));
    setPreviewOpen(true);
  };

  const previewCurrentForm = () => {
    const doctype = form.doctype ?? 'Sales Invoice';
    setPreviewHtml(renderPreview(form.htmlContent ?? '', doctype));
    setPreviewOpen(true);
  };

  // ─── Columns ───
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

      <DataTable
        data={templates}
        columns={columns}
        tableId="email-templates"
        searchable
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
                        className="rounded bg-purple-50 px-1 py-0.5 text-[9px] font-mono text-purple-700 border border-purple-200"
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
              {editing ? 'تعديل القالب' : 'إنشاء قالب جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم القالب *</Label>
                <Input
                  className="h-9"
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
                value={form.subject ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="فاتورة مبيعات {{doc.name}} — {{doc.customer_name}}"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">محتوى HTML *</Label>
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
                value={form.htmlContent ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                placeholder={`<div style="font-family: system-ui, sans-serif; direction: rtl;">\n  <h2>فاتورة مبيعات</h2>\n  <p>العميل: {{doc.customer_name}}</p>\n  <p>رقم الفاتورة: {{doc.name}}</p>\n  <p>الإجمالي: {{doc.grand_total}}</p>\n</div>`}
                className="font-mono text-xs"
              />
            </div>

            {/* Inline variables hint for selected doctype */}
            <div className="rounded-lg border border-purple-200/40 bg-purple-50/50 p-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-purple-700">متغيرات {DOCTYPE_OPTIONS.find((o) => o.value === form.doctype)?.label ?? ''}</p>
              <div className="flex flex-wrap gap-1">
                {currentVariables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="rounded border border-purple-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-purple-700 hover:bg-purple-100 transition-colors"
                    onClick={() => {
                      const insertion = `{{${v}}}`;
                      setForm((f) => ({ ...f, htmlContent: (f.htmlContent ?? '') + insertion }));
                    }}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-purple-600">اضغط على متغير لإضافته إلى المحتوى</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="attach-pdf"
                checked={form.attachPdf ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, attachPdf: v === true }))}
              />
              <Label htmlFor="attach-pdf" className="text-xs cursor-pointer">
                إرفاق PDF المستند مع البريد
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveTemplate}>
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
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={confirmDelete}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
