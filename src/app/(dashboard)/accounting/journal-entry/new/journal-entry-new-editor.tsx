'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, GripVertical, Plus, Trash2, Upload } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/core/helpers';
import { useCreateDoc } from '@/lib/client/hooks';
import { useToast } from '@/hooks/use-toast';
import { buildJournalEntry, type JournalLineInput } from '@/lib/erp/erpnext-payloads';
import { parseJournalImportXlsx } from '@/lib/erp/parse-journal-import-xlsx';

function newJournalRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `je-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function SortableJournalLine({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.75 : 1,
      }}
      className="flex border-b border-border/40"
    >
      <button
        type="button"
        className="shrink-0 w-9 flex items-start justify-center pt-3 text-muted-foreground hover:bg-muted/50 touch-none cursor-grab active:cursor-grabbing"
        aria-label="سحب لإعادة ترتيب البنود"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { DEFAULT_JOURNAL_NAMING_SERIES } from '@/lib/erp/doc-defaults';

const journalSchema = z.object({
  posting_date: z.string().min(1, 'تاريخ القيد مطلوب'),
  voucher_type: z.string().min(1, 'نوع القيد مطلوب'),
  user_remark: z.string(),
  title: z.string().min(1, 'عنوان القيد مطلوب'),
});

type JournalFormData = z.infer<typeof journalSchema>;

function JournalLineRow({
  line,
  index,
  updateLine,
  removeLine,
  canRemove,
}: {
  line: JournalLineInput;
  index: number;
  updateLine: (i: number, f: keyof JournalLineInput, v: string | number) => void;
  removeLine: (i: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="px-3 py-2 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        <div className="md:col-span-3">
          <ErpLinkCombobox
            doctype="Account"
            value={line.account}
            onChange={(v) => updateLine(index, 'account', v)}
            placeholder="الحساب *"
          />
        </div>
        <div className="md:col-span-2">
          <Select value={line.party_type} onValueChange={(v) => updateLine(index, 'party_type', v === '_none' ? '' : v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="الطرف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">-</SelectItem>
              <SelectItem value="Customer">عميل</SelectItem>
              <SelectItem value="Supplier">مورد</SelectItem>
              <SelectItem value="Employee">موظف</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {line.party_type ? (
          <div className="md:col-span-2">
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
              className="h-8 text-xs"
            />
          </div>
        ) : (
          <div className="md:col-span-2" />
        )}
        <div className="md:col-span-2">
          <Input
            className="h-8 text-xs"
            type="number"
            dir="ltr"
            placeholder="مدين"
            value={line.debit || ''}
            onChange={(e) => updateLine(index, 'debit', Number(e.target.value) || 0)}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            className="h-8 text-xs"
            type="number"
            dir="ltr"
            placeholder="دائن"
            value={line.credit || ''}
            onChange={(e) => updateLine(index, 'credit', Number(e.target.value) || 0)}
          />
        </div>
        <div className="md:col-span-1 flex justify-end">
          {canRemove && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(index)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end pb-1">
        <div className="md:col-span-5">
          <Label className="text-[10px] text-muted-foreground mb-1 block">مركز التكلفة</Label>
          <ErpLinkCombobox
            doctype="Cost Center"
            value={line.cost_center}
            onChange={(v) => updateLine(index, 'cost_center', v)}
            placeholder="مركز التكلفة"
            className="h-8 text-xs"
          />
        </div>
        <div className="md:col-span-3">
          <Label className="text-[10px] text-muted-foreground mb-1 block" title="سعر صرف عملة الحساب (1 = محلي)">
            سعر الصرف
          </Label>
          <Input
            className="h-8 text-xs"
            type="number"
            dir="ltr"
            step="any"
            min={0}
            placeholder="1"
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

export function JournalEntryNewEditor() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<JournalLineInput[]>([emptyLine(), emptyLine()]);
  const { company: defaultCompany, isLoading: compLoading } = useDefaultCompanyName();
  const form = useForm<JournalFormData>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      posting_date: new Date().toISOString().split('T')[0],
      voucher_type: 'Journal Entry',
      user_remark: '',
      title: '',
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
      toast({ title: 'لا بيانات في الملف', variant: 'destructive' });
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
      toast({ title: `تم استيراد ${out.length} بنداً` });
    }
  };

  const importLinesFromXlsxBuffer = async (buffer: ArrayBuffer) => {
    try {
      const out = await parseJournalImportXlsx(buffer);
      if (!out.length) {
        toast({ title: 'لم يُستخرج أي بند من ملف Excel — تحقق من الصف الأول (عناوين أو أعمدة)', variant: 'destructive' });
        return;
      }
      setLines(out);
      toast({ title: `تم استيراد ${out.length} بنداً من Excel` });
    } catch {
      toast({ title: 'تعذّر قراءة ملف Excel', variant: 'destructive' });
    }
  };

  const handleCreate = (formData: JournalFormData) => {
    if (lines.every((l) => !l.account)) {
      toast({ title: 'يرجى إدخال حساب واحد على الأقل', variant: 'destructive' });
      return;
    }
    if (difference !== 0) {
      toast({ title: 'يجب أن يتساوى مجموع المدين مع مجموع الدائن', variant: 'destructive' });
      return;
    }
    if (!defaultCompany) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    const payload = buildJournalEntry({
      company: defaultCompany,
      posting_date: formData.posting_date,
      voucher_type: formData.voucher_type,
      title: formData.title,
      user_remark: formData.user_remark,
      lines,
    });
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء القيد بنجاح' });
        form.reset();
        setLines([emptyLine(), emptyLine()]);
        void queryClient.invalidateQueries({ queryKey: ['docList', 'Journal Entry'] });
        router.push('/accounting/journal-entry');
        router.refresh();
      },
      onError: () => toast({ title: 'حدث خطأ أثناء إنشاء القيد', variant: 'destructive' }),
    });
  };

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col" dir="rtl">
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

      <header className="flex flex-col gap-3 border-b border-border/40 bg-card/80 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/accounting/journal-entry" aria-label="العودة">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">قيد يومية جديد</h1>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              بنود ديناميكية وتحقق توازن مدين/دائن قبل الحفظ
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]" dir="ltr">
            {DEFAULT_JOURNAL_NAMING_SERIES}
          </Badge>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => importFileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            استيراد CSV / Excel
          </Button>
        </div>
      </header>

      <form onSubmit={form.handleSubmit(handleCreate)} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="header" className="w-full max-w-5xl mx-auto">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
              <TabsTrigger value="header" className="text-xs">
                رأس القيد
              </TabsTrigger>
              <TabsTrigger value="lines" className="text-xs">
                بنود دفتر الأستاذ
              </TabsTrigger>
              <TabsTrigger value="balance" className="text-xs">
                التوازن
              </TabsTrigger>
            </TabsList>

            <TabsContent value="header" className="mt-4 space-y-4 outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">تاريخ القيد *</Label>
                  <Input type="date" dir="ltr" {...form.register('posting_date')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">نوع القيد</Label>
                  <Select value={form.watch('voucher_type')} onValueChange={(v) => form.setValue('voucher_type', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Journal Entry">قيد يومية</SelectItem>
                      <SelectItem value="Opening Entry">قيد افتتاحي</SelectItem>
                      <SelectItem value="Closing Entry">قيد إقفال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">العنوان *</Label>
                  <Input placeholder="عنوان القيد..." {...form.register('title')} />
                  {form.formState.errors.title && (
                    <p className="text-[10px] text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">ملاحظات</Label>
                  <Input placeholder="وصف القيد..." {...form.register('user_remark')} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lines" className="mt-4 outline-none">
              <div className="rounded-xl border border-border/40 overflow-hidden bg-card">
                <div className="bg-muted/50 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">بنود القيد</span>
                  <span className="text-[10px] text-muted-foreground">اسحب ⋮ لإعادة ترتيب الصفوف — يُحفظ الترتيب كـ idx على الخادم</span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleJournalDragEnd}>
                  <SortableContext items={lines.map((l) => l._rid!)} strategy={verticalListSortingStrategy}>
                    {lines.map((line, idx) => (
                      <SortableJournalLine key={line._rid} id={line._rid!}>
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
                <div className="px-3 py-2 flex justify-center border-t border-border/40">
                  <Button type="button" variant="ghost" size="sm" className="text-xs gap-1" onClick={addLine}>
                    <Plus className="h-3 w-3" />
                    إضافة بند
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                صيغة الاستيراد: الحساب، نوع_الطرف، الطرف، مدين، دائن، مركز_تكلفة، ملاحظة، سعر_صرف
              </p>
            </TabsContent>

            <TabsContent value="balance" className="mt-4 outline-none">
              <div
                className={`rounded-xl p-4 border ${
                  difference === 0 ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200/50' : 'bg-destructive/5 border-destructive/30'
                }`}
              >
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">إجمالي المدين</span>
                  <span className="text-blue-600 font-bold tabular-nums">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="font-semibold">إجمالي الدائن</span>
                  <span className="text-orange-600 font-bold tabular-nums">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-border/40">
                  <span className="font-semibold">الفرق</span>
                  <span className={`font-bold tabular-nums ${difference === 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {difference === 0 ? 'متوازن ✓' : formatCurrency(Math.abs(difference))}
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/40 bg-card/95 px-4 py-3">
          <Button type="button" variant="ghost" asChild>
            <Link href="/accounting/journal-entry">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending || difference !== 0 || compLoading} className="min-w-[140px]">
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ كمسودة'}
          </Button>
        </div>
      </form>
    </div>
  );
}
