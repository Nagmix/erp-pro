'use client';

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
 Printer,
 Plus,
 Eye,
 ArrowUp,
 ArrowDown,
 LayoutTemplate,
 FileText,
 Save,
 GripVertical,
 Loader2,
 Trash2,
 ChevronDown,
 Settings2,
 X,
 Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
 apiGetPrintFormats,
 apiCreatePrintFormat,
 apiGetPrintFormatBuilder,
 apiSavePrintFormatBuilder,
 type PrintFormat,
 type PrintFormatField,
 type PrintFormatSection,
 type DocTypeFieldDef,
 type PrintFormatBuilderData,
} from '@/lib/client/api';

// ============================================================
// Constants
// ============================================================

const COMMON_DOCTYPES = [
 { value: 'Sales Invoice', label: 'فاتورة مبيعات' },
 { value: 'Purchase Invoice', label: 'فاتورة مشتريات' },
 { value: 'Payment Entry', label: 'سند دفع' },
 { value: 'Journal Entry', label: 'قيد يومي' },
 { value: 'Quotation', label: 'عرض سعر' },
 { value: 'Sales Order', label: 'أمر بيع' },
 { value: 'Purchase Order', label: 'أمر شراء' },
 { value: 'Delivery Note', label: 'إشعار تسليم' },
 { value: 'Expense Claim', label: 'مطالبة مصروفات' },
 { value: 'Stock Entry', label: 'قيد مخزون' },
];

const ALIGNMENT_OPTIONS = [
 { value: 'right', label: 'يمين' },
 { value: 'center', label: 'وسط' },
 { value: 'left', label: 'يسار' },
] as const;

// ============================================================
// Helper functions
// ============================================================

function generateSectionId(): string {
 return `section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function groupFieldsBySection(fields: DocTypeFieldDef[]): { group: string; fields: DocTypeFieldDef[] }[] {
 const groups: Map<string, DocTypeFieldDef[]> = new Map();
 for (const f of fields) {
 const g = f.field_group || 'عام';
 if (!groups.has(g)) groups.set(g, []);
 groups.get(g)!.push(f);
 }
 return Array.from(groups.entries()).map(([group, fields]) => ({ group, fields }));
}

function buildInitialSections(docTypeFields: DocTypeFieldDef[]): PrintFormatSection[] {
 const groups = groupFieldsBySection(docTypeFields);
 return groups.map((g) => ({
 id: generateSectionId(),
 label: g.group,
 visible: true,
 fields: g.fields.map((f) => ({
  fieldname: f.fieldname,
  label: f.label || f.fieldname,
  fieldtype: f.fieldtype,
  visible: !f.hidden,
  width: undefined,
  alignment: 'right',
 })),
 }));
}

// ============================================================
// Sub-Components
// ============================================================

function FieldRow({
 field,
 onToggleVisible,
 onSetAlignment,
 onMoveUp,
 onMoveDown,
 canMoveUp,
 canMoveDown,
 onRemove,
}: {
 field: PrintFormatField;
 onToggleVisible: () => void;
 onSetAlignment: (a: PrintFormatField['alignment']) => void;
 onMoveUp: () => void;
 onMoveDown: () => void;
 canMoveUp: boolean;
 canMoveDown: boolean;
 onRemove: () => void;
}) {
 const [expanded, setExpanded] = useState(false);

 return (
 <div className={cn(
  'rounded-lg border border-border/50 bg-background transition-all',
  !field.visible && 'opacity-50'
 )}>
  <div className="flex items-center gap-2 px-3 py-2">
  <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  <Switch
   checked={field.visible}
   onCheckedChange={onToggleVisible}
   className="scale-75"
   dir="ltr"
  />
  <span className={cn(
   'flex-1 text-xs font-medium truncate',
   !field.visible && 'line-through text-muted-foreground'
  )}>
   {field.label}
  </span>
  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 font-mono">
   {field.fieldtype}
  </Badge>
  <button
   type="button"
   onClick={() => setExpanded(!expanded)}
   className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
  >
   <Settings2 className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
  </button>
  <button type="button" onClick={onRemove} className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors">
   <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
  </button>
  <div className="flex flex-col gap-0.5 shrink-0">
   <button
   type="button"
   onClick={onMoveUp}
   disabled={!canMoveUp}
   className="p-0.5 rounded hover:bg-muted disabled:opacity-25 transition-colors"
   >
   <ArrowUp className="h-3 w-3" />
   </button>
   <button
   type="button"
   onClick={onMoveDown}
   disabled={!canMoveDown}
   className="p-0.5 rounded hover:bg-muted disabled:opacity-25 transition-colors"
   >
   <ArrowDown className="h-3 w-3" />
   </button>
  </div>
  </div>
  {expanded && (
  <div className="px-3 pb-2 pt-1 border-t border-border/30 space-y-2">
   <div className="flex items-center gap-3">
   <Label className="text-xs min-w-[40px]">المحاذاة</Label>
   <Select
    value={field.alignment || 'right'}
    onValueChange={(v) => onSetAlignment(v as PrintFormatField['alignment'])}
   >
    <SelectTrigger className="h-7 text-xs w-28">
    <SelectValue />
    </SelectTrigger>
    <SelectContent>
    {ALIGNMENT_OPTIONS.map((opt) => (
     <SelectItem key={opt.value} value={opt.value}>
     {opt.label}
     </SelectItem>
    ))}
    </SelectContent>
   </Select>
   </div>
   <div className="flex items-center gap-3">
   <Label className="text-xs min-w-[40px]">العرض</Label>
   <Input
    type="number"
    min={10}
    max={100}
    value={field.width ?? ''}
    onChange={(e) => {
    const v = e.target.value;
    onSetAlignment(field.alignment); // trigger re-render
    // We handle width separately
    }}
    placeholder="تلقائي"
    className="h-7 text-xs w-28"
   />
   </div>
  </div>
  )}
 </div>
 );
}

function SectionCard({
 section,
 sectionIndex,
 totalSections,
 onToggleVisible,
 onRename,
 onMoveUp,
 onMoveDown,
 onToggleFieldVisible,
 onSetFieldAlignment,
 onMoveFieldUp,
 onMoveFieldDown,
 onRemoveField,
 onRemoveSection,
}: {
 section: PrintFormatSection;
 sectionIndex: number;
 totalSections: number;
 onToggleVisible: () => void;
 onRename: (name: string) => void;
 onMoveUp: () => void;
 onMoveDown: () => void;
 onToggleFieldVisible: (fieldIndex: number) => void;
 onSetFieldAlignment: (fieldIndex: number, alignment: PrintFormatField['alignment']) => void;
 onMoveFieldUp: (fieldIndex: number) => void;
 onMoveFieldDown: (fieldIndex: number) => void;
 onRemoveField: (fieldIndex: number) => void;
 onRemoveSection: () => void;
}) {
 const [collapsed, setCollapsed] = useState(false);
 const [editing, setEditing] = useState(false);
 const [editLabel, setEditLabel] = useState(section.label);

 const visibleCount = section.fields.filter((f) => f.visible).length;

 return (
 <Card className={cn(
  'border border-border/50 shadow-sm transition-all',
  !section.visible && 'opacity-60'
 )}>
  <CardHeader className="p-3 pb-2">
  <div className="flex items-center gap-2">
   <button
   type="button"
   onClick={() => setCollapsed(!collapsed)}
   className="p-0.5 rounded hover:bg-muted transition-colors"
   >
   <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed && '-rotate-90')} />
   </button>
   {editing ? (
   <Input
    value={editLabel}
    onChange={(e) => setEditLabel(e.target.value)}
    onBlur={() => { onRename(editLabel); setEditing(false); }}
    onKeyDown={(e) => { if (e.key === 'Enter') { onRename(editLabel); setEditing(false); } }}
    className="h-7 text-xs flex-1"
    autoFocus
   />
   ) : (
   <CardTitle
    className="text-sm font-semibold flex-1 cursor-pointer hover:text-primary transition-colors"
    onClick={() => setEditing(true)}
   >
    {section.label}
   </CardTitle>
   )}
   <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
   {visibleCount}/{section.fields.length}
   </Badge>
   <Switch
   checked={section.visible}
   onCheckedChange={onToggleVisible}
   className="scale-75"
   dir="ltr"
   />
   <button type="button" onClick={() => setEditing(true)} className="p-0.5 rounded hover:bg-muted transition-colors">
   <Pencil className="h-3 w-3 text-muted-foreground" />
   </button>
   <button type="button" onClick={onRemoveSection} className="p-0.5 rounded hover:bg-destructive/10 transition-colors">
   <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
   </button>
   <div className="flex flex-col gap-0.5">
   <button
    type="button"
    onClick={onMoveUp}
    disabled={sectionIndex === 0}
    className="p-0.5 rounded hover:bg-muted disabled:opacity-25 transition-colors"
   >
    <ArrowUp className="h-3 w-3" />
   </button>
   <button
    type="button"
    onClick={onMoveDown}
    disabled={sectionIndex === totalSections - 1}
    className="p-0.5 rounded hover:bg-muted disabled:opacity-25 transition-colors"
   >
    <ArrowDown className="h-3 w-3" />
   </button>
   </div>
  </div>
  </CardHeader>
  {!collapsed && (
  <CardContent className="p-3 pt-1 space-y-1.5">
   {section.fields.length === 0 ? (
   <p className="text-xs text-muted-foreground text-center py-3">
    لا توجد حقول في هذا القسم
   </p>
   ) : (
   section.fields.map((field, fi) => (
    <FieldRow
    key={field.fieldname}
    field={field}
    onToggleVisible={() => onToggleFieldVisible(fi)}
    onSetAlignment={(a) => onSetFieldAlignment(fi, a)}
    onMoveUp={() => onMoveFieldUp(fi)}
    onMoveDown={() => onMoveFieldDown(fi)}
    canMoveUp={fi > 0}
    canMoveDown={fi < section.fields.length - 1}
    onRemove={() => onRemoveField(fi)}
    />
   ))
   )}
  </CardContent>
  )}
 </Card>
 );
}

function PreviewPanel({ sections, formatName }: { sections: PrintFormatSection[]; formatName: string }) {
 const visibleSections = sections.filter((s) => s.visible);

 return (
 <div className="bg-card text-card-foreground rounded-lg border border-border/30 p-5 min-h-[300px] shadow-inner" dir="rtl">
  <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
  <div>
   <h3 className="text-sm font-bold text-foreground">{formatName || 'تنسيق طباعة'}</h3>
   <p className="text-xs text-muted-foreground">معاينة تقريبية — قد تختلف عن المخرج النهائي</p>
  </div>
  <Printer className="h-5 w-5 text-muted-foreground" />
  </div>

  {visibleSections.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
   <Eye className="h-8 w-8 mb-2" />
   <p className="text-xs">لا توجد أقسام مرئية للمعاينة</p>
  </div>
  ) : (
  <div className="space-y-4">
   {visibleSections.map((section) => {
   const visibleFields = section.fields.filter((f) => f.visible);
   if (visibleFields.length === 0) return null;

   return (
    <div key={section.id} className="space-y-2">
    <h4 className="text-xs font-semibold text-muted-foreground border-b border-border/30 pb-1">
     {section.label}
    </h4>
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
     {visibleFields.map((field) => (
     <div key={field.fieldname} className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground min-w-[80px]">{field.label}:</span>
      <span
      className={cn(
       'text-xs text-foreground bg-muted/50 rounded px-1.5 py-0.5',
       field.fieldtype === 'Currency' && 'font-mono',
       field.fieldtype === 'Int' && 'font-mono',
       field.fieldtype === 'Float' && 'font-mono',
       field.fieldtype === 'Date' && 'font-mono text-muted-foreground',
      )}
      style={{
       textAlign: field.alignment || 'right',
       width: field.width ? `${field.width}%` : undefined,
      }}
      >
      {field.fieldtype === 'Currency' ? '0.00'
       : field.fieldtype === 'Date' ? '1447/09/01'
       : field.fieldtype === 'Int' || field.fieldtype === 'Float' ? '0'
       : field.fieldtype === 'Check' ? '☐'
       : field.fieldtype === 'Link' ? '—'
       : field.fieldtype === 'Small Text' || field.fieldtype === 'Text' ? 'نص'
       : '—'}
      </span>
     </div>
     ))}
    </div>
    </div>
   );
   })}
  </div>
  )}
 </div>
 );
}

// ============================================================
// Main Page
// ============================================================

export default function PrintFormatBuilderPage() {
 // State
 const [selectedDocType, setSelectedDocType] = useState('');
 const [formats, setFormats] = useState<PrintFormat[]>([]);
 const [selectedFormat, setSelectedFormat] = useState<string>('');
 const [sections, setSections] = useState<PrintFormatSection[]>([]);
 const [docTypeFields, setDocTypeFields] = useState<DocTypeFieldDef[]>([]);
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [createOpen, setCreateOpen] = useState(false);
 const [newFormatName, setNewFormatName] = useState('');
 const [previewOpen, setPreviewOpen] = useState(false);

 // Load print formats for a DocType
 const loadFormats = useCallback(async (doctype: string) => {
 if (!doctype) return;
 setLoading(true);
 try {
  const result = await apiGetPrintFormats(doctype);
  setFormats(result);
 } catch (err) {
  toast.error((err as Error).message || 'فشل تحميل تنسيقات الطباعة');
  setFormats([]);
 } finally {
  setLoading(false);
 }
 }, []);

 // Handler: DocType changed via select
 const handleDocTypeChange = useCallback(async (doctype: string) => {
 setSelectedDocType(doctype);
 setSelectedFormat('');
 setSections([]);
 setDocTypeFields([]);
 if (!doctype) return;
 await loadFormats(doctype);
 }, [loadFormats]);

 // Handler: Format selection changed via select
 const handleFormatChange = useCallback(async (formatName: string) => {
 setSelectedFormat(formatName);
 if (!formatName) return;
 setLoading(true);
 try {
  const data = await apiGetPrintFormatBuilder(formatName);
  if (data) {
  setDocTypeFields(data.docTypeFields || []);
  if (data.sections && data.sections.length > 0) {
   setSections(data.sections);
  } else if (data.docTypeFields && data.docTypeFields.length > 0) {
   setSections(buildInitialSections(data.docTypeFields));
  } else {
   setSections([]);
  }
  }
 } catch (err) {
  toast.error((err as Error).message || 'فشل تحميل بيانات المنشئ');
 } finally {
  setLoading(false);
 }
 }, []);

 // Available fields (not yet in any section)
 const usedFieldnames = useMemo(() => {
 const set = new Set<string>();
 for (const s of sections) {
  for (const f of s.fields) {
  set.add(f.fieldname);
  }
 }
 return set;
 }, [sections]);

 const availableFields = useMemo(() => {
 return docTypeFields.filter((f) => !usedFieldnames.has(f.fieldname));
 }, [docTypeFields, usedFieldnames]);

 const groupedAvailable = useMemo(() => groupFieldsBySection(availableFields), [availableFields]);

 // Section operations
 const addSection = useCallback(() => {
 setSections((prev) => [
  ...prev,
  {
  id: generateSectionId(),
  label: 'قسم جديد',
  visible: true,
  fields: [],
  },
 ]);
 }, []);

 const removeSection = useCallback((sectionIndex: number) => {
 setSections((prev) => prev.filter((_, i) => i !== sectionIndex));
 }, []);

 const renameSection = useCallback((sectionIndex: number, name: string) => {
 setSections((prev) =>
  prev.map((s, i) => (i === sectionIndex ? { ...s, label: name } : s))
 );
 }, []);

 const toggleSectionVisible = useCallback((sectionIndex: number) => {
 setSections((prev) =>
  prev.map((s, i) => (i === sectionIndex ? { ...s, visible: !s.visible } : s))
 );
 }, []);

 const moveSectionUp = useCallback((sectionIndex: number) => {
 if (sectionIndex === 0) return;
 setSections((prev) => {
  const next = [...prev];
  [next[sectionIndex - 1], next[sectionIndex]] = [next[sectionIndex], next[sectionIndex - 1]];
  return next;
 });
 }, []);

 const moveSectionDown = useCallback((sectionIndex: number) => {
 setSections((prev) => {
  if (sectionIndex >= prev.length - 1) return prev;
  const next = [...prev];
  [next[sectionIndex], next[sectionIndex + 1]] = [next[sectionIndex + 1], next[sectionIndex]];
  return next;
 });
 }, []);

 // Field operations within sections
 const toggleFieldVisible = useCallback((sectionIndex: number, fieldIndex: number) => {
 setSections((prev) =>
  prev.map((s, si) => {
  if (si !== sectionIndex) return s;
  return {
   ...s,
   fields: s.fields.map((f, fi) =>
   fi === fieldIndex ? { ...f, visible: !f.visible } : f
   ),
  };
  })
 );
 }, []);

 const setFieldAlignment = useCallback((sectionIndex: number, fieldIndex: number, alignment: PrintFormatField['alignment']) => {
 setSections((prev) =>
  prev.map((s, si) => {
  if (si !== sectionIndex) return s;
  return {
   ...s,
   fields: s.fields.map((f, fi) =>
   fi === fieldIndex ? { ...f, alignment } : f
   ),
  };
  })
 );
 }, []);

 const moveFieldUp = useCallback((sectionIndex: number, fieldIndex: number) => {
 setSections((prev) =>
  prev.map((s, si) => {
  if (si !== sectionIndex) return s;
  if (fieldIndex === 0) return s;
  const next = [...s.fields];
  [next[fieldIndex - 1], next[fieldIndex]] = [next[fieldIndex], next[fieldIndex - 1]];
  return { ...s, fields: next };
  })
 );
 }, []);

 const moveFieldDown = useCallback((sectionIndex: number, fieldIndex: number) => {
 setSections((prev) =>
  prev.map((s, si) => {
  if (si !== sectionIndex) return s;
  if (fieldIndex >= s.fields.length - 1) return s;
  const next = [...s.fields];
  [next[fieldIndex], next[fieldIndex + 1]] = [next[fieldIndex + 1], next[fieldIndex]];
  return { ...s, fields: next };
  })
 );
 }, []);

 const removeField = useCallback((sectionIndex: number, fieldIndex: number) => {
 setSections((prev) =>
  prev.map((s, si) => {
  if (si !== sectionIndex) return s;
  return { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIndex) };
  })
 );
 }, []);

 // Add a field from available list to a section
 const addFieldToSection = useCallback((sectionIndex: number, field: DocTypeFieldDef) => {
 const newField: PrintFormatField = {
  fieldname: field.fieldname,
  label: field.label || field.fieldname,
  fieldtype: field.fieldtype,
  visible: true,
  alignment: 'right',
 };
 setSections((prev) =>
  prev.map((s, si) => {
  if (si !== sectionIndex) return s;
  return { ...s, fields: [...s.fields, newField] };
  })
 );
 }, []);

 // Save format
 const saveFormat = useCallback(async () => {
 if (!selectedFormat) {
  toast.error('اختر تنسيق طباعة أولاً');
  return;
 }
 setSaving(true);
 try {
  await apiSavePrintFormatBuilder(selectedFormat, sections);
  toast.success('تم حفظ تنسيق الطباعة بنجاح');
 } catch (err) {
  toast.error((err as Error).message || 'فشل حفظ التنسيق');
 } finally {
  setSaving(false);
 }
 }, [selectedFormat, sections]);

 // Create new format
 const createFormat = useCallback(async () => {
 if (!newFormatName.trim() || !selectedDocType) {
  toast.error('اسم التنسيق ونوع المستند مطلوبان');
  return;
 }
 setLoading(true);
 try {
  await apiCreatePrintFormat({
  name: newFormatName.trim(),
  doc_type: selectedDocType,
  standard: 'No',
  custom_format: 1,
  print_format_builder: 1,
  });
  toast.success('تم إنشاء تنسيق الطباعة');
  setCreateOpen(false);
  setNewFormatName('');
  await loadFormats(selectedDocType);
 } catch (err) {
  toast.error((err as Error).message || 'فشل إنشاء التنسيق');
 } finally {
  setLoading(false);
 }
 }, [newFormatName, selectedDocType, loadFormats]);

 return (
 <div className="erp-page-enter space-y-5" dir="rtl">
  <PageHeader
  title="منشئ تنسيقات الطباعة"
  description="صمم تنسيقات الطباعة بصرياً لأنواع المستندات المختلفة. اختر الحقول والأقسام وترتيبها وطريقة عرضها."
  iconify="solar:document-bold-duotone"
  accent="info"
  breadcrumbs={[
   { label: 'الإعدادات', href: '/settings' },
   { label: 'منشئ تنسيقات الطباعة' },
  ]}
  actions={
   <div className="flex flex-wrap gap-2">
   <Button
    variant="outline"
    size="sm"
    onClick={() => setPreviewOpen(true)}
    disabled={sections.length === 0}
    className="gap-1.5"
   >
    <Eye className="h-3.5 w-3.5" />
    معاينة
   </Button>
   <Button
    size="sm"
    onClick={saveFormat}
    disabled={!selectedFormat || saving}
    className="gap-1.5"
   >
    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
    حفظ التنسيق
   </Button>
   </div>
  }
  />

  {/* Top Controls */}
  <div className="flex flex-wrap items-end gap-3">
  <div className="space-y-1.5 min-w-[200px]">
   <Label className="text-xs">نوع المستند (DocType)</Label>
   <Select value={selectedDocType} onValueChange={handleDocTypeChange}>
   <SelectTrigger className="h-9 text-xs">
    <SelectValue placeholder="اختر نوع المستند" />
   </SelectTrigger>
   <SelectContent>
    {COMMON_DOCTYPES.map((dt) => (
    <SelectItem key={dt.value} value={dt.value}>
     {dt.label}
     <span className="text-muted-foreground ms-2 text-[9px]" dir="ltr">({dt.value})</span>
    </SelectItem>
    ))}
   </SelectContent>
   </Select>
  </div>

  <div className="space-y-1.5 min-w-[200px]">
   <Label className="text-xs">تنسيق الطباعة</Label>
   <Select
   value={selectedFormat}
   onValueChange={handleFormatChange}
   disabled={!selectedDocType || formats.length === 0}
   >
   <SelectTrigger className="h-9 text-xs">
    <SelectValue placeholder={formats.length === 0 ? 'لا توجد تنسيقات' : 'اختر تنسيق'} />
   </SelectTrigger>
   <SelectContent>
    {formats.map((f) => (
    <SelectItem key={f.name} value={f.name}>
     {f.name}
     {f.standard === 'Yes' && (
     <Badge variant="secondary" className="ms-2 text-[8px] px-1 py-0">قياسي</Badge>
     )}
    </SelectItem>
    ))}
   </SelectContent>
   </Select>
  </div>

  <Button
   variant="outline"
   size="sm"
   onClick={() => setCreateOpen(true)}
   disabled={!selectedDocType}
   className="h-9 gap-1.5"
  >
   <Plus className="h-3.5 w-3.5" />
   تنسيق جديد
  </Button>
  </div>

  {/* Loading indicator */}
  {loading && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
   <Loader2 className="h-5 w-5 animate-spin" />
   جاري التحميل...
  </div>
  )}

  {/* Main Content — only shown when a format is selected */}
  {!loading && selectedFormat && (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
   {/* Available Fields Panel (Right in RTL) */}
   <div className="lg:col-span-3 space-y-3">
   <Card className="border-border/40">
    <CardHeader className="p-4 pb-2">
    <div className="flex items-center gap-2">
     <FileText className="h-4 w-4 text-primary" />
     <CardTitle className="text-sm">الحقول المتاحة</CardTitle>
     <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ms-auto">
     {availableFields.length}
     </Badge>
    </div>
    </CardHeader>
    <CardContent className="p-4 pt-2">
    {availableFields.length === 0 ? (
     <p className="text-xs text-muted-foreground text-center py-4">
     {docTypeFields.length === 0
      ? 'اختر نوع مستند أولاً'
      : 'تمت إضافة جميع الحقول'}
     </p>
    ) : (
     <ScrollArea className="max-h-96">
     <div className="space-y-3">
      {groupedAvailable.map((g) => (
      <div key={g.group} className="space-y-1">
       <p className="text-xs font-medium text-muted-foreground">{g.group}</p>
       {g.fields.map((f) => (
       <div
        key={f.fieldname}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/60 transition-colors cursor-pointer group"
       >
        <span className="flex-1 text-xs truncate">{f.label}</span>
        <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono shrink-0">
        {f.fieldtype}
        </Badge>
        {sections.length > 0 && (
        <Select
         onValueChange={(v) => {
         const si = parseInt(v, 10);
         addFieldToSection(si, f);
         }}
        >
         <SelectTrigger className="h-5 w-5 p-0 border-0 bg-transparent opacity-0 group-hover:opacity-100 transition-opacity">
         <Plus className="h-3 w-3" />
         </SelectTrigger>
         <SelectContent>
         {sections.map((s, si) => (
          <SelectItem key={s.id} value={String(si)}>
          {s.label}
          </SelectItem>
         ))}
         </SelectContent>
        </Select>
        )}
       </div>
       ))}
      </div>
      ))}
     </div>
     </ScrollArea>
    )}
    </CardContent>
   </Card>
   </div>

   {/* Layout Editor (Left in RTL — main area) */}
   <div className="lg:col-span-6 space-y-3">
   <Card className="border-border/40">
    <CardHeader className="p-4 pb-2">
    <div className="flex items-center gap-2">
     <LayoutTemplate className="h-4 w-4 text-primary" />
     <CardTitle className="text-sm">تخطيط التنسيق</CardTitle>
     <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ms-auto">
     {sections.length} أقسام
     </Badge>
    </div>
    </CardHeader>
    <CardContent className="p-4 pt-2 space-y-3">
    {sections.length === 0 ? (
     <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
     <LayoutTemplate className="h-8 w-8 mb-2" />
     <p className="text-xs">لا توجد أقسام بعد</p>
     <p className="text-xs">أضف قسماً جديداً أو اختر تنسيقاً يحتوي على بيانات</p>
     </div>
    ) : (
     <ScrollArea className="max-h-[600px]">
     <div className="space-y-3">
      {sections.map((section, si) => (
      <SectionCard
       key={section.id}
       section={section}
       sectionIndex={si}
       totalSections={sections.length}
       onToggleVisible={() => toggleSectionVisible(si)}
       onRename={(name) => renameSection(si, name)}
       onMoveUp={() => moveSectionUp(si)}
       onMoveDown={() => moveSectionDown(si)}
       onToggleFieldVisible={(fi) => toggleFieldVisible(si, fi)}
       onSetFieldAlignment={(fi, a) => setFieldAlignment(si, fi, a)}
       onMoveFieldUp={(fi) => moveFieldUp(si, fi)}
       onMoveFieldDown={(fi) => moveFieldDown(si, fi)}
       onRemoveField={(fi) => removeField(si, fi)}
       onRemoveSection={() => removeSection(si)}
      />
      ))}
     </div>
     </ScrollArea>
    )}

    <Separator />

    <Button
     variant="outline"
     size="sm"
     onClick={addSection}
     className="w-full gap-1.5"
    >
     <Plus className="h-3.5 w-3.5" />
     إضافة قسم جديد
    </Button>
    </CardContent>
   </Card>
   </div>

   {/* Live Preview Panel */}
   <div className="lg:col-span-3 space-y-3">
   <Card className="border-border/40">
    <CardHeader className="p-4 pb-2">
    <div className="flex items-center gap-2">
     <Eye className="h-4 w-4 text-primary" />
     <CardTitle className="text-sm">معاينة مباشرة</CardTitle>
    </div>
    </CardHeader>
    <CardContent className="p-4 pt-2">
    <PreviewPanel sections={sections} formatName={selectedFormat} />
    </CardContent>
   </Card>
   </div>
  </div>
  )}

  {/* Empty state when no format is selected */}
  {!loading && !selectedFormat && selectedDocType && (
  <Card className="border-border/40">
   <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
   <Printer className="h-12 w-12 mb-4 opacity-30" />
   <p className="text-sm font-medium mb-1">اختر تنسيق طباعة أو أنشئ جديداً</p>
   <p className="text-xs">اختر نوع المستند أولاً، ثم اختر تنسيقاً موجوداً أو أنشئ تنسيقاً جديداً للبدء</p>
   </CardContent>
  </Card>
  )}

  {/* Empty state when no doctype is selected */}
  {!loading && !selectedDocType && (
  <Card className="border-border/40">
   <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
   <LayoutTemplate className="h-12 w-12 mb-4 opacity-30" />
   <p className="text-sm font-medium mb-1">اختر نوع المستند للبدء</p>
   <p className="text-xs">اختر نوع المستند (DocType) من القائمة أعلاه لعرض تنسيقات الطباعة المتاحة</p>
   </CardContent>
  </Card>
  )}

  {/* Create Format Dialog */}
  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
  <DialogContent dir="rtl" className="max-w-md">
   <DialogHeader>
   <DialogTitle>إنشاء تنسيق طباعة جديد</DialogTitle>
   </DialogHeader>
   <div className="space-y-3 py-2">
   <div className="space-y-1">
    <Label className="text-xs">اسم التنسيق</Label>
    <Input
    value={newFormatName}
    onChange={(e) => setNewFormatName(e.target.value)}
    placeholder="مثال: فاتورة مخصصة"
    />
   </div>
   <div className="space-y-1">
    <Label className="text-xs">نوع المستند</Label>
    <Input value={selectedDocType} disabled className="bg-muted" />
   </div>
   <p className="text-xs text-muted-foreground">
    سيتم إنشاء التنسيق كتنسيق مخصص مع تفعيل منشئ التنسيقات تلقائياً.
   </p>
   </div>
   <DialogFooter className="gap-2 flex-row-reverse justify-start sm:justify-start">
   <Button onClick={createFormat} disabled={loading || !newFormatName.trim()}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء'}
   </Button>
   <Button variant="outline" onClick={() => setCreateOpen(false)}>
    إلغاء
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* Full Preview Dialog */}
  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent dir="rtl" className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
   <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
   <DialogTitle className="text-start">معاينة: {selectedFormat}</DialogTitle>
   <p className="text-xs text-muted-foreground text-start font-normal">
    هذه معاينة تقريبية — التنسيق النهائي قد يختلف عند الطباعة الفعلية من المستند.
   </p>
   </DialogHeader>
   <div className="flex-1 min-h-[400px] overflow-auto px-6 pb-6">
   <PreviewPanel sections={sections} formatName={selectedFormat} />
   </div>
  </DialogContent>
  </Dialog>
 </div>
 );
}
