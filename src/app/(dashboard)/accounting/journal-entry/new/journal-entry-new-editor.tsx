'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Equal,
  GripVertical,
  Hash,
  Info,
  Landmark,
  MessageSquare,
  Plus,
  Receipt,
  Scale,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/erp/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/core/helpers';
import { useCreateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { buildJournalEntry, type JournalLineInput } from '@/lib/erp/erpnext-payloads';
import { parseJournalImportXlsx } from '@/lib/erp/parse-journal-import-xlsx';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { DEFAULT_JOURNAL_NAMING_SERIES } from '@/lib/erp/doc-defaults';
import { NamingSeriesSelect } from '@/components/erp/naming-series-select';

/* ─── helpers ─── */

function newJournalRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `je-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

const emptyLine = (): JournalLineInput => ({
  _rid: newJournalRowId(),
  account: '',
  party_type: '',
  party: '',
  debit: 0,
  credit: 0,
  cost_center: '',
  remarks: '',
});

/* ─── zod schema ─── */

const journalSchema = z.object({
  posting_date: z.string().min(1, 'تاريخ القيد مطلوب'),
  voucher_type: z.string().min(1, 'نوع القيد مطلوب'),
  user_remark: z.string(),
  title: z.string().min(1, 'عنوان القيد مطلوب'),
  reference_number: z.string().optional(),
  is_opening: z.boolean().optional(),
  multi_currency: z.boolean().optional(),
});

type JournalFormData = z.infer<typeof journalSchema>;

/* ─── Section fieldset header component ─── */

function SectionFieldset({
  legend,
  icon: Icon,
  title,
  accent = 'primary',
  children,
}: {
  legend: string;
  icon: React.ElementType;
  title: string;
  accent?: 'primary' | 'info' | 'success' | 'warning' | 'destructive';
  children: ReactNode;
}) {
  const accentMap: Record<string, string> = {
    primary: 'from-primary/[0.04] via-transparent to-transparent',
    info: 'from-info/[0.04] via-transparent to-transparent',
    success: 'from-success/[0.04] via-transparent to-transparent',
    warning: 'from-warning/[0.04] via-transparent to-transparent',
    destructive: 'from-destructive/[0.04] via-transparent to-transparent',
  };
  const iconBgMap: Record<string, string> = {
    primary: 'bg-primary/10',
    info: 'bg-info/10',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    destructive: 'bg-destructive/10',
  };
  const iconTextMap: Record<string, string> = {
    primary: 'text-primary',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <fieldset className="rounded-2xl border border-border/40 overflow-hidden">
      <legend className="sr-only">{legend}</legend>
      <div className={`bg-gradient-to-l ${accentMap[accent]} px-4 py-2.5 border-b border-border/30`}>
        <h4 className="text-[12px] font-bold text-foreground/70 flex items-center gap-2">
          <span className={`h-5 w-5 rounded-md ${iconBgMap[accent]} flex items-center justify-center`}>
            <Icon className={`h-3 w-3 ${iconTextMap[accent]}`} />
          </span>
          {title}
        </h4>
      </div>
      <div className="p-4 space-y-4 bg-card/50">
        {children}
      </div>
    </fieldset>
  );
}

/* ─── Form field with icon label ─── */

function FormField({
  label,
  icon: Icon,
  error,
  children,
  required,
  hint,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <span className="h-6 w-6 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        {label}
        {required && <span className="text-destructive text-xs me-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground/60 pe-8">{hint}</p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] text-destructive font-medium flex items-center gap-1 pe-8"
          >
            <Info className="h-3 w-3 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sortable wrapper ─── */

function SortableJournalLine({ id, children, index }: { id: string; children: ReactNode; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.75 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
      className="group"
    >
      <div
        className={`flex items-stretch border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors ${
          index % 2 === 0 ? 'bg-background' : 'bg-muted/[0.03]'
        }`}
      >
        <button
          type="button"
          className="shrink-0 w-8 flex items-start justify-center pt-3 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 touch-none cursor-grab active:cursor-grabbing transition-colors"
          aria-label="سحب لإعادة ترتيب البنود"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ─── Journal line row ─── */

function JournalLineRow({
  line,
  index,
  updateLine,
  removeLine,
  canRemove,
}: {
  line: JournalLineInput;
  index: number;
  updateLine: (i: number, field: keyof JournalLineInput, v: string | number) => void;
  removeLine: (i: number) => void;
  canRemove: boolean;
}) {
  // Determine the border indicator color based on debit vs credit
  const borderIndicator = line.debit > line.credit
    ? 'border-s-4 border-s-chart-1'
    : line.credit > line.debit
      ? 'border-s-4 border-s-orange-500'
      : 'border-s-4 border-s-transparent';

  return (
    <div className={`px-3 py-2.5 space-y-2 ${borderIndicator}`}>
      {/* Desktop: Row 1: Account + Party */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        <div className="md:col-span-4">
          <ErpLinkCombobox
            doctype="Account"
            value={line.account}
            onChange={(v) => updateLine(index, 'account', v)}
            placeholder="الحساب *"
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <Select value={line.party_type || '_none'} onValueChange={(v) => updateLine(index, 'party_type', v === '_none' ? '' : v)}>
            <SelectTrigger className="h-9 text-xs w-full">
              <SelectValue placeholder="الطرف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— بدون طرف —</SelectItem>
              <SelectItem value="Customer">عميل</SelectItem>
              <SelectItem value="Supplier">مورد</SelectItem>
              <SelectItem value="Employee">موظف</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {line.party_type ? (
          <div className="md:col-span-3">
            <ErpLinkCombobox
              doctype={line.party_type === 'Customer' ? 'Customer' : line.party_type === 'Supplier' ? 'Supplier' : 'Employee'}
              value={line.party}
              displayKey={
                line.party_type === 'Customer'
                  ? 'customer_name'
                  : line.party_type === 'Supplier'
                    ? 'supplier_name'
                    : 'employee_name'
              }
              onChange={(v) => updateLine(index, 'party', v)}
              placeholder="اسم الطرف"
              className="w-full"
            />
          </div>
        ) : (
          <div className="md:col-span-3 hidden md:block" />
        )}
        <div className="md:col-span-3 flex items-start gap-1.5">
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => removeLine(index)}
              aria-label="حذف البند"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Desktop: Row 2: Debit + Credit + Cost Center + Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        <div className="md:col-span-2">
          <CurrencyInput
            value={line.debit || null}
            onValueChange={(v) => updateLine(index, 'debit', v ?? 0)}
            placeholder="مدين"
            className="h-9 text-xs font-mono tabular-nums"
          />
        </div>
        <div className="md:col-span-2">
          <CurrencyInput
            value={line.credit || null}
            onValueChange={(v) => updateLine(index, 'credit', v ?? 0)}
            placeholder="دائن"
            className="h-9 text-xs font-mono tabular-nums"
          />
        </div>
        <div className="md:col-span-3">
          <ErpLinkCombobox
            doctype="Cost Center"
            value={line.cost_center}
            onChange={(v) => updateLine(index, 'cost_center', v)}
            placeholder="مركز التكلفة"
            showCreateShortcut={false}
            className="w-full"
          />
        </div>
        <div className="md:col-span-3">
          <Input
            className="h-9 text-xs"
            placeholder="ملاحظة البند"
            value={line.remarks || ''}
            onChange={(e) => updateLine(index, 'remarks', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            className="h-9 text-xs font-mono tabular-nums"
            type="number"
            dir="ltr"
            step="any"
            min={0}
            placeholder="سعر الصرف"
            value={
              line.exchange_rate != null && !Number.isNaN(Number(line.exchange_rate)) && Number(line.exchange_rate) !== 1
                ? line.exchange_rate
                : ''
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === '' || raw === '.') {
                updateLine(index, 'exchange_rate', 1);
                return;
              }
              const n = Number(raw);
              updateLine(index, 'exchange_rate', Number.isFinite(n) && n > 0 ? n : 1);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */

export function JournalEntryNewEditor() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<JournalLineInput[]>([emptyLine(), emptyLine()]);
  const [namingSeries, setNamingSeries] = useState(DEFAULT_JOURNAL_NAMING_SERIES);
  const { company: defaultCompany, isLoading: compLoading } = useDefaultCompanyName();
  const form = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      posting_date: new Date().toISOString().split('T')[0],
      voucher_type: 'Journal Entry',
      user_remark: '',
      title: '',
      reference_number: '',
      is_opening: false,
      multi_currency: false,
    },
  });
  const createMutation = useCreateDoc('Journal Entry');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {})
  );

  const handleJournalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLines((prev) => {
      const oldIndex = prev.findIndex((x) => x._rid === active.id);
      const newIndex = prev.findIndex((x) => x._rid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const totalDebit = useMemo(() => lines.reduce((s, l) => s + l.debit, 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((s, l) => s + l.credit, 0), [lines]);
  const difference = useMemo(() => totalDebit - totalCredit, [totalDebit, totalCredit]);
  const isBalanced = difference === 0 && (totalDebit > 0 || totalCredit > 0);

  const updateLine = (index: number, field: keyof JournalLineInput, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev];
      (updated[index] as unknown as Record<string, string | number>)[field] = value;
      return updated;
    });
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (index: number) => {
    if (lines.length > 2) setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const importLinesFromFile = (text: string) => {
    const rows = text.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 1) {
      toast.error('لا بيانات في الملف');
      return;
    }
    const out: JournalLineInput[] = [];
    for (const r of rows) {
      const p = r.split(/[,\t;]/).map((x) => x.trim().replace(/^"|"$/g, ''));
      if (p.length < 4) continue;
      const fxRaw = p[7] != null && String(p[7]).trim() !== '' ? parseFloat(String(p[7])) : 1;
      out.push({
        _rid: newJournalRowId(),
        account: p[0] || '',
        party_type: p[1] || '',
        party: p[2] || '',
        debit: parseFloat(p[3]!) || 0,
        credit: parseFloat(p[4]!) || 0,
        cost_center: p[5] || '',
        remarks: p[6] || '',
        exchange_rate: Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : 1,
      });
    }
    if (out.length) {
      setLines(out);
      toast.success(`تم استيراد ${out.length} بنداً`);
    }
  };

  const importLinesFromXlsxBuffer = async (buffer: ArrayBuffer) => {
    try {
      const out = await parseJournalImportXlsx(buffer);
      if (!out.length) {
        toast.error('لم يُستخرج أي بند من ملف Excel — تحقق من الصف الأول (عناوين أو أعمدة)');
        return;
      }
      setLines(out);
      toast.success(`تم استيراد ${out.length} بنداً من Excel`);
    } catch {
      toast.error('تعذّر قراءة ملف Excel');
    }
  };

  const handleCreate = (formData: JournalFormData) => {
    if (lines.every((l) => !l.account)) {
      toast.error('يرجى إدخال حساب واحد على الأقل');
      return;
    }
    if (difference !== 0) {
      toast.error('يجب أن يتساوى مجموع المدين مع مجموع الدائن');
      return;
    }
    if (!defaultCompany) {
      toast.error('تعذر تحديد الشركة');
      return;
    }
    const payload = buildJournalEntry({
      company: defaultCompany,
      posting_date: formData.posting_date,
      voucher_type: formData.is_opening ? 'Opening Entry' : formData.voucher_type,
      title: formData.title,
      user_remark: formData.user_remark,
      naming_series: namingSeries,
      is_opening: formData.is_opening ? 1 : 0,
      lines,
    });
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('تم إنشاء القيد بنجاح');
        form.reset();
        setLines([emptyLine(), emptyLine()]);
        void queryClient.invalidateQueries({ queryKey: ['docList', 'Journal Entry'] });
        router.push('/accounting/journal-entry');
        router.refresh();
      },
      onError: (err: Error) => toast.error('حدث خطأ أثناء إنشاء القيد', { description: err?.message || '' }),
    });
  };

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col" dir="rtl">
      {/* Hidden file input */}
      <input
        ref={importFileRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const name = f.name.toLowerCase();
          if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            void f.arrayBuffer().then((buf) => void importLinesFromXlsxBuffer(buf));
          } else {
            void f.text().then(importLinesFromFile);
          }
          e.target.value = '';
        }}
      />

      {/* ─── Page Header (Premium Gradient) ─── */}
      <header className="relative flex flex-col gap-3 border-b border-border/40 bg-gradient-to-l from-primary/[0.08] via-primary/[0.03] to-transparent px-4 py-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--primary),0.06),transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 hover:bg-primary/10" asChild>
            <Link href="/accounting/journal-entry" aria-label="العودة">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/15 shadow-sm shadow-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl flex items-center gap-2">
                قيد يومية جديد
                <Sparkles className="h-4 w-4 text-primary/50 hidden sm:block" />
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                أدخل بيانات القيد وتأكد من توازن المدين والدائن قبل الحفظ
              </p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <NamingSeriesSelect
            doctype="Journal Entry"
            value={namingSeries}
            onChange={setNamingSeries}
            defaultSeries={DEFAULT_JOURNAL_NAMING_SERIES}
          />
          <Button type="button" size="sm" variant="outline" className="gap-1.5 hover:bg-primary/5 hover:border-primary/20" onClick={() => importFileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">استيراد CSV / Excel</span>
            <span className="sm:hidden">استيراد</span>
          </Button>
        </div>
      </header>

      {/* ─── Form ─── */}
      <form onSubmit={form.handleSubmit(handleCreate)} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="w-full max-w-5xl mx-auto space-y-5">

            {/* ── Section 1: Basic Info ── */}
            <SectionFieldset legend="المعلومات الأساسية" icon={Receipt} title="المعلومات الأساسية" accent="primary">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="تاريخ القيد" icon={CalendarDays} error={form.formState.errors.posting_date?.message} required hint="تاريخ ترحيل القيد">
                  <DatePicker value={form.watch('posting_date')} onChange={(v) => form.setValue('posting_date', v)} className="h-9" />
                </FormField>
                <FormField label="نوع القيد" icon={Landmark} error={form.formState.errors.voucher_type?.message} required hint="نوع السند المحاسبي">
                  <Select dir="rtl" value={form.watch('voucher_type')} onValueChange={(v) => form.setValue('voucher_type', v)}>
                    <SelectTrigger className="h-9 text-start">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="Journal Entry">قيد يومية</SelectItem>
                      <SelectItem value="Opening Entry">قيد افتتاحي</SelectItem>
                      <SelectItem value="Closing Entry">قيد إقفال</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="عنوان القيد" icon={Tag} error={form.formState.errors.title?.message} required hint="وصف مختصر للقيد">
                  <Input placeholder="مثال: تسوية أرصدة نهاية الشهر" className="h-9" {...form.register('title')} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors flex-1">
                    <Checkbox
                      checked={form.watch('is_opening') || false}
                      onCheckedChange={(checked) => form.setValue('is_opening', !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">قيد افتتاحي</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        يُستخدم لترصيد الحسابات في بداية الفترة
                      </span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors flex-1">
                    <Checkbox
                      checked={form.watch('multi_currency') || false}
                      onCheckedChange={(checked) => form.setValue('multi_currency', !!checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">تعدد العملات</span>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        تفعيل حقول سعر الصرف لكل بند
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </SectionFieldset>

            {/* ── Section 2: Journal Lines ── */}
            <SectionFieldset legend="بنود القيد" icon={Scale} title="بنود القيد — مدين / دائن" accent="info">
              {/* Lines table container */}
              <div className="rounded-xl border border-border/40 overflow-hidden bg-background">
                {/* Table header — darker, more visually distinct */}
                <div className="bg-muted/60 border-b-2 border-border/50 px-3 py-2.5">
                  {/* Desktop headers */}
                  <div className="hidden md:grid md:grid-cols-12 gap-2 items-center text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                    <span className="col-span-4">الحساب</span>
                    <span className="col-span-2">الطرف</span>
                    <span className="col-span-3">اسم الطرف</span>
                    <span className="col-span-3" />
                  </div>
                  <div className="hidden md:grid md:grid-cols-12 gap-2 items-center text-[11px] font-bold text-foreground/60 uppercase tracking-wider mt-1">
                    <span className="col-span-2 flex items-center gap-1">
                      <ArrowUp className="h-3 w-3 text-chart-1" />
                      مدين
                    </span>
                    <span className="col-span-2 flex items-center gap-1">
                      <ArrowDown className="h-3 w-3 text-orange-500" />
                      دائن
                    </span>
                    <span className="col-span-3">مركز التكلفة</span>
                    <span className="col-span-3">ملاحظة</span>
                    <span className="col-span-2">سعر الصرف</span>
                  </div>
                  {/* Mobile headers — simplified */}
                  <div className="md:hidden text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <ArrowUp className="h-3 w-3 text-chart-1" />
                        مدين
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowDown className="h-3 w-3 text-orange-500" />
                        دائن
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drag-and-drop lines */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleJournalDragEnd}>
                  <SortableContext items={lines.map((l) => l._rid!)} strategy={verticalListSortingStrategy}>
                    {lines.map((line, idx) => (
                      <SortableJournalLine key={line._rid} id={line._rid!} index={idx}>
                        <JournalLineRow
                          line={line}
                          index={idx}
                          updateLine={updateLine}
                          removeLine={removeLine}
                          canRemove={lines.length > 2}
                        />
                      </SortableJournalLine>
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Add row button — more prominent */}
                <div className="px-3 py-3 flex justify-center border-t border-dashed border-border/40 bg-muted/20">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 text-primary hover:text-primary hover:bg-primary/10 hover:border-primary/30 font-semibold shadow-sm min-w-[160px] justify-center"
                    onClick={addLine}
                  >
                    <Plus className="h-4 w-4" />
                    إضافة بند
                  </Button>
                </div>
              </div>

              {/* Balance summary — enhanced with icons and better visual prominence */}
              <motion.div
                key={isBalanced ? 'balanced' : difference !== 0 ? 'unbalanced' : 'empty'}
                initial={{ opacity: 0.7, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`rounded-xl border-2 overflow-hidden transition-colors duration-300 ${
                  isBalanced
                    ? 'bg-emerald-500/[0.04] border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                    : difference !== 0
                      ? 'bg-destructive/[0.04] border-destructive/30 shadow-sm shadow-destructive/5'
                      : 'bg-muted/30 border-border/40'
                }`}
              >
                <div className="px-4 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                    {/* Total Debit */}
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                        <ArrowUp className="h-3 w-3 text-chart-1" />
                        إجمالي المدين
                      </p>
                      <p className="text-xl font-bold tabular-nums text-chart-1" dir="ltr">{formatCurrency(totalDebit)}</p>
                    </div>

                    {/* Total Credit */}
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                        <ArrowDown className="h-3 w-3 text-orange-500" />
                        إجمالي الدائن
                      </p>
                      <p className="text-xl font-bold tabular-nums text-orange-600" dir="ltr">{formatCurrency(totalCredit)}</p>
                    </div>

                    {/* Difference */}
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1">
                        <Equal className="h-3 w-3" />
                        الفرق
                      </p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={difference}
                          initial={{ scale: 1.1, opacity: 0.5 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className={`text-xl font-bold tabular-nums ${difference === 0 ? 'text-emerald-600' : 'text-destructive'}`}
                          dir="ltr"
                        >
                          {difference === 0 ? '0.00' : formatCurrency(Math.abs(difference))}
                        </motion.p>
                      </AnimatePresence>
                    </div>

                    {/* Balance status badge — more prominent */}
                    <div className="flex justify-center">
                      <AnimatePresence mode="wait">
                        {isBalanced ? (
                          <motion.div
                            key="balanced"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 gap-1.5 px-4 py-1.5 text-xs font-bold shadow-sm shadow-emerald-500/10">
                              <CheckCircle2 className="h-4 w-4" />
                              متوازن ✓
                            </Badge>
                          </motion.div>
                        ) : difference !== 0 ? (
                          <motion.div
                            key="unbalanced"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 20 }}
                          >
                            <Badge variant="destructive" className="gap-1.5 px-4 py-1.5 text-xs font-bold shadow-sm">
                              <XCircle className="h-4 w-4" />
                              غير متوازن
                            </Badge>
                          </motion.div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground gap-1.5 px-4 py-1.5 text-xs">
                            <ChevronDown className="h-3.5 w-3.5" />
                            في انتظار الإدخال
                          </Badge>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>

              <p className="text-[11px] text-muted-foreground/60">
                صيغة الاستيراد: الحساب، نوع_الطرف، الطرف، مدين، دائن، مركز_تكلفة، ملاحظة، سعر_صرف — اسحب ⋮ لإعادة ترتيب البنود
              </p>
            </SectionFieldset>

            {/* ── Section 3: Additional Info ── */}
            <SectionFieldset legend="معلومات إضافية" icon={MessageSquare} title="معلومات إضافية" accent="success">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="ملاحظات عامة" icon={MessageSquare} hint="وصف تفصيلي للقيد يظهر في الطباعة">
                  <Textarea
                    placeholder="أدخل وصفاً للقيد أو سبب إعداده..."
                    className="min-h-[80px] text-sm resize-none"
                    {...form.register('user_remark')}
                  />
                </FormField>
                <div className="space-y-4">
                  <FormField label="رقم المرجع" icon={Hash} hint="رقم مرجعي اختياري لربط القيد بمستند خارجي">
                    <Input
                      placeholder="مثال: INV-2025-001"
                      className="h-9"
                      {...form.register('reference_number')}
                    />
                  </FormField>
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/30">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <Info className="h-3 w-3 inline-block me-1 -mt-0.5" />
                      تأكد من توازن مجموع المدين مع مجموع الدائن قبل الحفظ.
                      يمكنك إعادة ترتيب البنود بالسحب والإفلات.
                    </p>
                  </div>
                </div>
              </div>
            </SectionFieldset>

          </div>
        </div>

        {/* ─── Action Bar (Glass effect) ─── */}
        <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-2 border-t border-border/40 bg-card/80 backdrop-blur-xl px-4 py-3 sm:px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 gap-1.5 text-[11px] font-bold px-3 py-1 shadow-sm shadow-emerald-500/5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">القيد متوازن</span>
                <span className="sm:hidden">متوازن</span>
              </Badge>
            ) : difference !== 0 ? (
              <Badge variant="destructive" className="gap-1.5 text-[11px] font-bold px-3 py-1 shadow-sm">
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فرق: {formatCurrency(Math.abs(difference))}</span>
                <span className="sm:hidden">فرق</span>
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" asChild className="text-muted-foreground">
              <Link href="/accounting/journal-entry">إلغاء</Link>
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !isBalanced || compLoading}
              className={`min-w-[140px] gap-1.5 transition-all duration-200 ${
                isBalanced && !createMutation.isPending
                  ? 'bg-primary hover:bg-primary/90 shadow-md shadow-primary/20'
                  : ''
              }`}
            >
              {createMutation.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Receipt className="h-3.5 w-3.5" />
                  حفظ القيد
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
