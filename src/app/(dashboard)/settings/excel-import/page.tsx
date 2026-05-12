'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DataTable, type Column } from '@/components/erp/data-table';
import {
 Upload,
 FileSpreadsheet,
 ChevronLeft,
 ChevronRight,
 Download,
 AlertCircle,
 CheckCircle2,
 XCircle,
 Loader2,
 Trash2,
 FileText,
} from 'lucide-react';
import { useCreateDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { formatDate, formatNumber } from '@/lib/core/helpers';
import { cn } from '@/lib/utils';

// ── Types ──
interface DoctypeConfig {
 label: string;
 doctype: string;
 requiredFields: string[];
 optionalFields: string[];
}

interface ImportHistory {
 id: string;
 date: string;
 doctype: string;
 records: number;
 success: number;
 failed: number;
}

const DOCTYPE_OPTIONS: DoctypeConfig[] = [
 {
 label: 'الأصول',
 doctype: 'Asset',
 requiredFields: ['item_code', 'asset_name', 'gross_purchase_amount', 'asset_category'],
 optionalFields: ['company', 'purchase_date', 'location', 'custodian', 'cost_center'],
 },
 {
 label: 'المصروفات',
 doctype: 'Expense Claim',
 requiredFields: ['employee', 'expense_date', 'expenses'],
 optionalFields: ['company', 'remark', 'paying_account', 'cost_center'],
 },
 {
 label: 'القيود اليومية',
 doctype: 'Journal Entry',
 requiredFields: ['posting_date', 'accounts'],
 optionalFields: ['company', 'user_remark', 'cheque_no', 'cheque_date'],
 },
 {
 label: 'سندات القبض والصرف',
 doctype: 'Payment Entry',
 requiredFields: ['payment_type', 'posting_date', 'party_type', 'party', 'paid_amount'],
 optionalFields: ['company', 'mode_of_payment', 'reference_no', 'reference_date', 'bank_account'],
 },
 {
 label: 'الأصناف',
 doctype: 'Item',
 requiredFields: ['item_code', 'item_name', 'item_group'],
 optionalFields: ['stock_uom', 'is_stock_item', 'standard_rate', 'description', 'brand'],
 },
 {
 label: 'العملاء',
 doctype: 'Customer',
 requiredFields: ['customer_name'],
 optionalFields: ['customer_group', 'territory', 'tax_id', 'email_id', 'phone'],
 },
 {
 label: 'الموردون',
 doctype: 'Supplier',
 requiredFields: ['supplier_name'],
 optionalFields: ['supplier_group', 'tax_id', 'email_id', 'phone', 'country'],
 },
 {
 label: 'الموظفون',
 doctype: 'Employee',
 requiredFields: ['first_name', 'date_of_birth', 'gender'],
 optionalFields: ['last_name', 'company', 'department', 'designation', 'cell_number', 'personal_email'],
 },
];

const FIELD_LABELS: Record<string, string> = {
 item_code: 'رمز الصنف',
 item_name: 'اسم الصنف',
 item_group: 'مجموعة الصنف',
 stock_uom: 'وحدة القياس',
 is_stock_item: 'مخزني',
 standard_rate: 'السعر القياسي',
 description: 'الوصف',
 brand: 'العلامة التجارية',
 asset_name: 'اسم الأصل',
 gross_purchase_amount: 'مبلغ الشراء',
 asset_category: 'فئة الأصل',
 company: 'الشركة',
 purchase_date: 'تاريخ الشراء',
 location: 'الموقع',
 custodian: 'الحارس',
 cost_center: 'مركز التكلفة',
 employee: 'الموظف',
 expense_date: 'تاريخ المصروف',
 expenses: 'المصروفات',
 remark: 'ملاحظة',
 paying_account: 'حساب الدفع',
 posting_date: 'تاريخ القيد',
 accounts: 'الحسابات',
 user_remark: 'ملاحظة المستخدم',
 cheque_no: 'رقم الشيك',
 cheque_date: 'تاريخ الشيك',
 payment_type: 'نوع الدفع',
 party_type: 'نوع الطرف',
 party: 'الطرف',
 paid_amount: 'المبلغ المدفوع',
 mode_of_payment: 'طريقة الدفع',
 reference_no: 'رقم المرجع',
 reference_date: 'تاريخ المرجع',
 bank_account: 'الحساب البنكي',
 customer_name: 'اسم العميل',
 customer_group: 'مجموعة العميل',
 territory: 'المنطقة',
 tax_id: 'الرقم الضريبي',
 email_id: 'البريد الإلكتروني',
 phone: 'الهاتف',
 supplier_name: 'اسم المورد',
 supplier_group: 'مجموعة المورد',
 country: 'الدولة',
 first_name: 'الاسم الأول',
 last_name: 'الاسم الأخير',
 date_of_birth: 'تاريخ الميلاد',
 gender: 'الجنس',
 department: 'القسم',
 designation: 'المسمى الوظيفي',
 cell_number: 'رقم الجوال',
 personal_email: 'البريد الشخصي',
};

const HISTORY_KEY = 'erp_import_history';

function loadHistory(): ImportHistory[] {
 if (typeof window === 'undefined') return [];
 try {
 const raw = localStorage.getItem(HISTORY_KEY);
 return raw ? JSON.parse(raw) : [];
 } catch {
 return [];
 }
}

function saveHistory(history: ImportHistory[]) {
 if (typeof window === 'undefined') return;
 localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

type Step = 1 | 2 | 3;

export default function ExcelImportPage() {
 const [step, setStep] = useState<Step>(1);
 const [selectedDoctype, setSelectedDoctype] = useState<string>('');
 const [file, setFile] = useState<File | null>(null);
 const [fileData, setFileData] = useState<string[][]>([]);
 const [fileHeaders, setFileHeaders] = useState<string[]>([]);
 const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
 const [importing, setImporting] = useState(false);
 const [importProgress, setImportProgress] = useState(0);
 const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({
 success: 0,
 failed: 0,
 errors: [],
 });
 const [importDone, setImportDone] = useState(false);
 const [history, setHistory] = useState<ImportHistory[]>([]);
 const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

 const createDoc = useCreateDoc('Item'); // Will be dynamically called

 useEffect(() => {
 setHistory(loadHistory());
 }, []);

 const doctypeConfig = useMemo(
 () => DOCTYPE_OPTIONS.find((d) => d.doctype === selectedDoctype),
 [selectedDoctype]
 );

 const allFields = useMemo(() => {
 if (!doctypeConfig) return [];
 return [...doctypeConfig.requiredFields, ...doctypeConfig.optionalFields];
 }, [doctypeConfig]);

 // ── File parsing ──
 const handleFileDrop = useCallback(async (f: File) => {
 setFile(f);
 try {
  const text = await f.text();
  const isCsv = f.name.endsWith('.csv');
  const rows = parseCsvText(text, isCsv);
  if (rows.length > 0) {
  setFileHeaders(rows[0]);
  setFileData(rows.slice(1));
  // Auto-map by matching header names to field names
  const mapping: Record<string, string> = {};
  rows[0].forEach((header) => {
   const normalized = header.trim().toLowerCase().replace(/\s+/g, '_');
   const match = allFields.find(
   (f) => f.toLowerCase() === normalized || FIELD_LABELS[f]?.toLowerCase() === header.trim().toLowerCase()
   );
   if (match) mapping[header] = match;
  });
  setColumnMapping(mapping);
  }
 } catch (e) {
  toast.error('خطأ في قراءة الملف', { description: (e as Error).message });
 }
 }, [allFields, toast]);

 // ── CSV template download ──
 const downloadTemplate = useCallback(() => {
 if (!doctypeConfig) return;
 const headers = [...doctypeConfig.requiredFields, ...doctypeConfig.optionalFields].map(
  (f) => FIELD_LABELS[f] || f
 );
 const csv = headers.join(',') + '\n';
 const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `template_${doctypeConfig.doctype.toLowerCase()}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 }, [doctypeConfig]);

 // ── Import execution ──
 const handleImport = useCallback(async () => {
 if (!doctypeConfig || fileData.length === 0) return;
 setImporting(true);
 setImportProgress(0);
 setImportDone(false);
 const results = { success: 0, failed: 0, errors: [] as string[] };

 // Build mapped rows
 const mappedRows: Record<string, unknown>[] = fileData.map((row, idx) => {
  const doc: Record<string, unknown> = {};
  fileHeaders.forEach((header, colIdx) => {
  const field = columnMapping[header];
  if (field && row[colIdx] !== undefined && row[colIdx] !== '') {
   doc[field] = row[colIdx];
  }
  });
  return doc;
 });

 // Validate required fields
 for (let i = 0; i < mappedRows.length; i++) {
  const missing = doctypeConfig.requiredFields.filter(
  (f) => mappedRows[i][f] === undefined || mappedRows[i][f] === ''
  );
  if (missing.length > 0) {
  results.errors.push(`صف ${i + 2}: حقول مطلوبة ناقصة — ${missing.map((m) => FIELD_LABELS[m] || m).join(', ')}`);
  }
 }

 // Import each row
 for (let i = 0; i < mappedRows.length; i++) {
  try {
  const missing = doctypeConfig.requiredFields.filter(
   (f) => mappedRows[i][f] === undefined || mappedRows[i][f] === ''
  );
  if (missing.length > 0) {
   results.failed++;
   continue;
  }
  const doc = mappedRows[i];
  doc.doctype = doctypeConfig.doctype;
  await createDoc.mutateAsync(doc);
  results.success++;
  } catch (e) {
  results.failed++;
  results.errors.push(`صف ${i + 2}: ${(e as Error).message}`);
  }
  setImportProgress(Math.round(((i + 1) / mappedRows.length) * 100));
  // Small delay for UX
  await new Promise((r) => setTimeout(r, 50));
 }

 setImportResults(results);
 setImportDone(true);
 setImporting(false);

 // Save to history
 const entry: ImportHistory = {
  id: Date.now().toString(),
  date: new Date().toISOString(),
  doctype: doctypeConfig.label,
  records: mappedRows.length,
  success: results.success,
  failed: results.failed,
 };
 const updated = [entry, ...history];
 setHistory(updated);
 saveHistory(updated);
 }, [doctypeConfig, fileData, fileHeaders, columnMapping, createDoc, history]);

 // ── Column mapping update ──
 const updateMapping = useCallback((fileCol: string, erpField: string) => {
 setColumnMapping((prev) => ({ ...prev, [fileCol]: erpField }));
 }, []);

 // ── Preview data (first 5 rows) ──
 const previewRows = useMemo(() => fileData.slice(0, 5), [fileData]);

 // ── Matching stats ──
 const requiredMatched = useMemo(() => {
 if (!doctypeConfig) return 0;
 const mappedFields = new Set(Object.values(columnMapping));
 return doctypeConfig.requiredFields.filter((f) => mappedFields.has(f)).length;
 }, [doctypeConfig, columnMapping]);

 const optionalMatched = useMemo(() => {
 if (!doctypeConfig) return 0;
 const mappedFields = new Set(Object.values(columnMapping));
 return doctypeConfig.optionalFields.filter((f) => mappedFields.has(f)).length;
 }, [doctypeConfig, columnMapping]);

 // ── History columns ──
 const historyColumns: Column<ImportHistory>[] = useMemo(
 () => [
  {
  key: 'date',
  header: 'التاريخ',
  sortable: true,
  render: (v) => formatDate(String(v)),
  },
  {
  key: 'doctype',
  header: 'نوع المستند',
  sortable: true,
  },
  {
  key: 'records',
  header: 'السجلات',
  render: (v) => <span className="tabular-nums">{formatNumber(Number(v))}</span>,
  },
  {
  key: 'success',
  header: 'نجاح',
  render: (v) => (
   <Badge variant="outline" className="border-success/30 text-success text-[10px]">
   {Number(v)}
   </Badge>
  ),
  },
  {
  key: 'failed',
  header: 'فشل',
  render: (v) =>
   Number(v) > 0 ? (
   <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px]">
    {Number(v)}
   </Badge>
   ) : (
   <Badge variant="outline" className="border-border/40 text-muted-foreground text-[10px]">
    0
   </Badge>
   ),
  },
 ],
 []
 );

 const canGoNext = useMemo(() => {
 if (step === 1) return !!selectedDoctype;
 if (step === 2) return file !== null && fileData.length > 0;
 return true;
 }, [step, selectedDoctype, file, fileData]);

 const handleClearHistory = useCallback(() => {
 setHistory([]);
 saveHistory([]);
 setDeleteTarget(null);
 toast.success('تم مسح السجل');
 }, [toast]);

 return (
 <div className="erp-page-enter space-y-5" dir="rtl">
  <PageHeader
  title="استيراد البيانات"
  description="استيراد البيانات من ملفات Excel و CSV"
  iconify="solar:upload-bold-duotone"
  accent="primary"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'استيراد البيانات' }]}
  />

  {/* Step indicator */}
  <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
  <div className="flex items-center justify-center gap-2">
   {[
   { num: 1, label: 'اختيار نوع المستند' },
   { num: 2, label: 'رفع الملف' },
   { num: 3, label: 'مراجعة واستيراد' },
   ].map((s, i) => (
   <div key={s.num} className="flex items-center gap-2">
    <button
    type="button"
    onClick={() => { if (s.num < step || canGoNext) setStep(s.num as Step); }}
    className={cn(
     'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
     step === s.num
     ? 'bg-primary text-primary-foreground'
     : s.num < step
     ? 'bg-primary/10 text-primary'
     : 'bg-muted text-muted-foreground'
    )}
    >
    <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] bg-background/20">
     {s.num < step ? '✓' : s.num}
    </span>
    {s.label}
    </button>
    {i < 2 && <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />}
   </div>
   ))}
  </div>
  </div>

  {/* Step 1: Choose doctype */}
  {step === 1 && (
  <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-4">
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
   <div className="space-y-2">
    <Label className="text-sm font-medium">نوع المستند <span className="text-destructive text-xs">*</span></Label>
    <Select value={selectedDoctype} onValueChange={setSelectedDoctype}>
    <SelectTrigger className="h-9">
     <SelectValue placeholder="اختر نوع المستند..." />
    </SelectTrigger>
    <SelectContent>
     {DOCTYPE_OPTIONS.map((d) => (
     <SelectItem key={d.doctype} value={d.doctype}>
      {d.label}
     </SelectItem>
     ))}
    </SelectContent>
    </Select>
   </div>
   {doctypeConfig && (
    <div className="flex items-end">
    <Button
     type="button"
     variant="outline"
     className="gap-1.5"
     onClick={downloadTemplate}
    >
     <Download className="h-3.5 w-3.5" />
     تحميل القالب
    </Button>
    </div>
   )}
   </div>

   {doctypeConfig && (
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
    <div className="space-y-2">
    <h4 className="text-xs font-bold text-destructive">الحقول المطلوبة</h4>
    <div className="flex flex-wrap gap-1.5">
     {doctypeConfig.requiredFields.map((f) => (
     <Badge key={f} variant="outline" className="border-destructive/30 text-[10px] gap-1">
      <span className="text-destructive">*</span>
      {FIELD_LABELS[f] || f}
     </Badge>
     ))}
    </div>
    </div>
    <div className="space-y-2">
    <h4 className="text-xs font-bold text-muted-foreground">الحقول الاختيارية</h4>
    <div className="flex flex-wrap gap-1.5">
     {doctypeConfig.optionalFields.map((f) => (
     <Badge key={f} variant="secondary" className="text-[10px]">
      {FIELD_LABELS[f] || f}
     </Badge>
     ))}
    </div>
    </div>
   </div>
   )}
  </div>
  )}

  {/* Step 2: Upload file & map columns */}
  {step === 2 && (
  <div className="space-y-4">
   {/* Drop zone */}
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
   <div
    className={cn(
    'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
    file ? 'border-success/40 bg-success/5' : 'border-border/50 hover:border-primary/40 hover:bg-primary/5'
    )}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileDrop(f);
    }}
   >
    <Upload className="h-9 w-10 mx-auto text-muted-foreground mb-3" />
    <p className="text-sm font-semibold mb-1">اسحب الملف وأفلته هنا</p>
    <p className="text-xs text-muted-foreground mb-3">الصيغ المدعومة: .xlsx, .csv</p>
    <div>
    <Input
     type="file"
     accept=".csv,.xlsx,.xls"
     className="max-w-xs mx-auto h-9 text-xs"
     dir="ltr"
     onChange={(e) => {
     const f = e.target.files?.[0];
     if (f) handleFileDrop(f);
     }}
    />
    </div>
    {file && (
    <div className="mt-3 flex items-center justify-center gap-2 text-success text-xs">
     <FileSpreadsheet className="h-4 w-4" />
     <span className="font-medium">{file.name}</span>
     <span className="text-muted-foreground">({formatNumber(fileData.length)} صف)</span>
    </div>
    )}
   </div>
   </div>

   {/* Preview table */}
   {fileHeaders.length > 0 && (
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-3">
    <h3 className="text-sm font-bold flex items-center gap-2">
    <FileText className="h-4 w-4 text-primary" />
    معاينة البيانات (أول 5 صفوف)
    </h3>
    <div className="overflow-x-auto max-h-72 overflow-y-auto">
    <table className="w-full text-xs border border-border/30 rounded-lg">
     <thead className="bg-muted/50 sticky top-0">
     <tr>
      <th className="px-3 py-2 text-start border-b border-border/30 font-semibold">#</th>
      {fileHeaders.map((h, i) => (
      <th key={i} className="px-3 py-2 text-start border-b border-border/30 font-semibold min-w-[100px]">
       {h}
      </th>
      ))}
     </tr>
     </thead>
     <tbody>
     {previewRows.map((row, ri) => (
      <tr key={ri} className="border-b border-border/20 hover:bg-muted/20">
      <td className="px-3 py-1.5 text-muted-foreground">{ri + 1}</td>
      {fileHeaders.map((_, ci) => (
       <td key={ci} className="px-3 py-1.5 truncate max-w-[150px]">
       {row[ci] || '—'}
       </td>
      ))}
      </tr>
     ))}
     </tbody>
    </table>
    </div>
   </div>
   )}

   {/* Column mapping */}
   {fileHeaders.length > 0 && doctypeConfig && (
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-3">
    <h3 className="text-sm font-bold flex items-center gap-2">
    ربط الأعمدة
    <Badge variant="secondary" className="text-[10px]">
     {Object.values(columnMapping).filter(Boolean).length} / {fileHeaders.length} مربوط
    </Badge>
    </h3>
    <div className="space-y-2">
    {fileHeaders.map((header) => {
     const isRequired = doctypeConfig.requiredFields.includes(columnMapping[header] || '');
     return (
     <div key={header} className="flex items-center gap-3 py-1.5 border-b border-border/20 last:border-0">
      <div className="min-w-[140px]">
      <span className="text-xs font-medium">{header}</span>
      </div>
      <ChevronLeft className="h-3 w-3 text-muted-foreground shrink-0" />
      <Select
      value={columnMapping[header] || '__none__'}
      onValueChange={(v) => updateMapping(header, v === '__none__' ? '' : v)}
      >
      <SelectTrigger className="h-8 text-xs flex-1 max-w-xs">
       <SelectValue placeholder="اختر الحقل..." />
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="__none__">— غير مربوط —</SelectItem>
       <SelectItem value="_required_header" disabled className="text-[10px] text-muted-foreground font-bold">
       ── الحقول المطلوبة ──
       </SelectItem>
       {doctypeConfig.requiredFields.map((f) => (
       <SelectItem key={f} value={f}>
        {FIELD_LABELS[f] || f} *
       </SelectItem>
       ))}
       <SelectItem value="_optional_header" disabled className="text-[10px] text-muted-foreground font-bold">
       ── الحقول الاختيارية ──
       </SelectItem>
       {doctypeConfig.optionalFields.map((f) => (
       <SelectItem key={f} value={f}>
        {FIELD_LABELS[f] || f}
       </SelectItem>
       ))}
      </SelectContent>
      </Select>
      {isRequired && <span className="text-destructive text-[10px]">*</span>}
     </div>
     );
    })}
    </div>
   </div>
   )}
  </div>
  )}

  {/* Step 3: Review & Import */}
  {step === 3 && (
  <div className="space-y-4">
   {/* Summary */}
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5">
   <h3 className="text-sm font-bold mb-3">ملخص الاستيراد</h3>
   </div>

   {/* Validation warnings */}
   {doctypeConfig && fileData.length > 0 && (
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-3">
    <h3 className="text-sm font-bold flex items-center gap-2">
    <AlertCircle className="h-4 w-4 text-warning" />
    نتائج التحقق
    </h3>
    {requiredMatched < (doctypeConfig?.requiredFields.length || 0) ? (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/30 text-xs">
     <AlertCircle className="h-4 w-4 text-warning shrink-0" />
     <span>
     بعض الحقول المطلوبة غير مربوطة ({doctypeConfig.requiredFields.length - requiredMatched} حقول).
     الصفوف التي لا تحتوي على هذه الحقول سيتم تخطيها.
     </span>
    </div>
    ) : (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/30 text-xs">
     <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
     <span>جميع الحقول المطلوبة مربوطة بنجاح</span>
    </div>
    )}
   </div>
   )}

   {/* Import progress */}
   {(importing || importDone) && (
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-3">
    <h3 className="text-sm font-bold">سير الاستيراد</h3>
    <Progress value={importProgress} className="h-2" />
    <div className="flex items-center justify-between text-xs text-muted-foreground">
    <span>{importProgress}%</span>
    <span>
     {importDone ? 'تم الانتهاء' : importing ? 'جارٍ الاستيراد...' : ''}
    </span>
    </div>
   </div>
   )}

   {/* Import results */}
   {importDone && (
   <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-3">
    <h3 className="text-sm font-bold">نتائج الاستيراد</h3>
    {importResults.errors.length > 0 && (
    <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
     {importResults.errors.slice(0, 20).map((err, i) => (
     <div key={i} className="flex items-start gap-2 text-xs text-destructive/80 p-1.5 rounded bg-destructive/5">
      <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
      <span>{err}</span>
     </div>
     ))}
     {importResults.errors.length > 20 && (
     <p className="text-[10px] text-muted-foreground text-center">
      ... و {importResults.errors.length - 20} خطأ آخر
     </p>
     )}
    </div>
    )}
   </div>
   )}

   {/* Import button */}
   {!importDone && !importing && (
   <Button className="gap-1.5 min-w-[160px]" size="lg" onClick={handleImport}>
    <Upload className="h-4 w-4" />
    بدء الاستيراد ({fileData.length} سجل)
   </Button>
   )}
   {importing && (
   <Button disabled className="gap-1.5 min-w-[160px]" size="lg">
    <Loader2 className="h-4 w-4 animate-spin" />
    جارٍ الاستيراد...
   </Button>
   )}
   {importDone && (
   <Button
    variant="outline"
    className="gap-1.5"
    onClick={() => {
    setStep(1);
    setSelectedDoctype('');
    setFile(null);
    setFileData([]);
    setFileHeaders([]);
    setColumnMapping({});
    setImportDone(false);
    setImportResults({ success: 0, failed: 0, errors: [] });
    setImportProgress(0);
    }}
   >
    استيراد جديد
   </Button>
   )}
  </div>
  )}

  {/* Navigation buttons */}
  <div className="flex items-center justify-between">
  <div>
   {step > 1 && (
   <Button variant="ghost" className="gap-1" onClick={() => setStep((step - 1) as Step)}>
    <ChevronRight className="h-3.5 w-3.5" />
    السابق
   </Button>
   )}
  </div>
  <div>
   {step < 3 && (
   <Button className="gap-1" disabled={!canGoNext} onClick={() => setStep((step + 1) as Step)}>
    التالي
    <ChevronLeft className="h-3.5 w-3.5" />
   </Button>
   )}
  </div>
  </div>

  {/* Import History */}
  <div className="rounded-xl border border-border/40 bg-card p-4 lg:p-5 space-y-3">
  <div className="flex items-center justify-between">
   <h3 className="text-sm font-bold flex items-center gap-2">
   <FileText className="h-4 w-4 text-primary" />
   سجل الاستيراد
   </h3>
   {history.length > 0 && (
   <Button
    variant="ghost"
    size="sm"
    className="text-xs text-destructive gap-1"
    onClick={() => setDeleteTarget('all')}
   >
    <Trash2 className="h-3 w-3" />
    مسح السجل
   </Button>
   )}
  </div>
  <DataTable
   data={history}
   columns={historyColumns}
   searchable={false}
   loading={false}
   tableId="import-history"
   exportFileName="import-history.csv"
   printTitle="سجل الاستيراد"
  />
  </div>

  {/* Clear history confirmation */}
  <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
  <DialogContent dir="rtl" className="max-w-sm">
   <DialogHeader>
   <DialogTitle>تأكيد مسح السجل</DialogTitle>
   </DialogHeader>
   <p className="text-sm text-muted-foreground">
   هل أنت متأكد من مسح سجل الاستيراد بالكامل؟ لا يمكن التراجع عن هذا الإجراء.
   </p>
   <div className="flex items-center justify-end gap-2 pt-3">
   <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
   <Button variant="destructive" size="sm" onClick={handleClearHistory}>مسح</Button>
   </div>
  </DialogContent>
  </Dialog>
 </div>
 );
}

// ── CSV/TSV parser ──
function parseCsvText(text: string, isCsv: boolean): string[][] {
 const lines = text.split(/\r?\n/).filter((l) => l.trim());
 return lines.map((line) => {
 if (isCsv) {
  // Simple CSV parser (handles quoted fields)
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
  const ch = line[i];
  if (ch === '"') {
   inQuotes = !inQuotes;
  } else if (ch === ',' && !inQuotes) {
   result.push(current.trim());
   current = '';
  } else {
   current += ch;
  }
  }
  result.push(current.trim());
  return result;
 }
 return line.split('\t').map((c) => c.trim());
 });
}
