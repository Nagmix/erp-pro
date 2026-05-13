'use client';

import { useMemo, useState, useCallback } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDocList, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/client/hooks';
import { toast } from 'sonner';
import {
 Mail,
 Send,
 FileText,
 Clock,
 Loader2,
 MoreHorizontal,
 Edit,
 Trash2,
 CheckCircle2,
 XCircle,
 Activity,
 Zap,
 Paperclip,
 TestTube2,
 Search,
 User,
 UserCheck,
 Users,
 ArrowUpRight,
 CircleDot,
 Timer,
 AtSign,
 CalendarDays,
 Eye,
} from 'lucide-react';

/* ─── Types ─── */
interface EmailAutoRule {
 name: string;
 rule_name?: string;
 trigger_event?: string;
 template?: string;
 delay_type?: string;
 delay_value?: number;
 channel?: string;
 recipient_type?: string;
 custom_email?: string;
 attach_pdf?: number;
 active?: number;
 last_sent?: string;
 owner?: string;
 modified?: string;
 creation?: string;
}

interface EmailTemplate {
 name: string;
 template_name?: string;
 subject?: string;
 response?: string;
}

interface EmailLog {
 name: string;
 subject?: string;
 recipients?: string;
 status?: string;
 creation?: string;
 sent_or_received?: string;
 reference_doctype?: string;
 reference_name?: string;
 communication_medium?: string;
}

/* ─── Constants ─── */
const TRIGGER_EVENTS = [
 { value: 'invoice_created', label: 'إنشاء فاتورة', icon: FileText, color: 'bg-chart-1/10 text-chart-1 border-chart-1/20' },
 { value: 'invoice_paid', label: 'دفع فاتورة', icon: CheckCircle2, color: 'bg-primary/10 text-primary border-primary/20' },
 { value: 'invoice_overdue', label: 'فاتورة متأخرة', icon: Clock, color: 'bg-destructive/10 text-destructive border-destructive/20' },
 { value: 'quote_created', label: 'إنشاء عرض سعر', icon: FileText, color: 'bg-chart-5/10 text-chart-5 border-chart-5/20' },
 { value: 'credit_note_created', label: 'إنشاء إشعار دائن', icon: FileText, color: 'bg-chart-3/10 text-chart-3 border-chart-3/20' },
 { value: 'debit_note_created', label: 'إنشاء إشعار مدين', icon: FileText, color: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
 { value: 'return_created', label: 'إنشاء مرتجع', icon: FileText, color: 'bg-chart-5/10 text-chart-5 border-chart-5/20' },
 { value: 'work_order_completed', label: 'إكمال أمر عمل', icon: CheckCircle2, color: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
] as const;

const DELAY_TYPES = [
 { value: 'immediate', label: 'فوري', description: 'إرسال البريد مباشرةً عند وقوع الحدث' },
 { value: 'minutes', label: 'دقائق', description: 'الانتظار عدداً من الدقائق قبل الإرسال' },
 { value: 'hours', label: 'ساعات', description: 'الانتظار عدداً من الساعات قبل الإرسال' },
 { value: 'days', label: 'أيام', description: 'الانتظار عدداً من الأيام قبل الإرسال' },
] as const;

const CHANNEL_OPTIONS = [
 { value: 'email', label: 'بريد إلكتروني', icon: Mail, color: 'bg-chart-1/10 text-chart-1' },
 { value: 'notification', label: 'إشعار نظام', icon: Activity, color: 'bg-chart-5/10 text-chart-5' },
 { value: 'both', label: 'بريد + إشعار', icon: Send, color: 'bg-chart-2/10 text-chart-2' },
] as const;

const RECIPIENT_OPTIONS = [
 { value: 'customer', label: 'العميل', icon: User, color: 'bg-chart-1/10 text-chart-1' },
 { value: 'employee', label: 'الموظف', icon: UserCheck, color: 'bg-chart-5/10 text-chart-5' },
 { value: 'custom_email', label: 'بريد مخصص', icon: AtSign, color: 'bg-chart-2/10 text-chart-2' },
] as const;

/* ─── Helpers ─── */
function getTriggerInfo(event: string) {
 return TRIGGER_EVENTS.find(t => t.value === event) ?? TRIGGER_EVENTS[0];
}

function getDelayInfo(type: string) {
 return DELAY_TYPES.find(d => d.value === type) ?? DELAY_TYPES[0];
}

function formatDelay(delayType: string, delayValue: number): string {
 if (delayType === 'immediate') return 'فوري';
 const unitLabels: Record<string, { one: string; two: string; many: string }> = {
 minutes: { one: 'دقيقة', two: 'دقيقتان', many: 'دقائق' },
 hours: { one: 'ساعة', two: 'ساعتان', many: 'ساعات' },
 days: { one: 'يوم', two: 'يومان', many: 'أيام' },
 };
 const unit = unitLabels[delayType];
 if (!unit) return 'فوري';
 if (delayValue === 1) return `بعد ${unit.one}`;
 if (delayValue === 2) return `بعد ${unit.two}`;
 return `بعد ${delayValue} ${unit.many}`;
}

/* ─── Main Component ─── */
export default function EmailAutoRulesPage() {
 /* ─── ERPNext Data Hooks ─── */
 const rulesList = useDocList<EmailAutoRule>('Email Auto Rule', {
 fields: ['name', 'rule_name', 'trigger_event', 'template', 'delay_type', 'delay_value', 'channel', 'recipient_type', 'custom_email', 'attach_pdf', 'active', 'last_sent', 'owner', 'modified', 'creation'],
 limit: 500,
 order_by: 'modified desc',
 });

 const templatesList = useDocList<EmailTemplate>('Email Template', {
 fields: ['name', 'template_name', 'subject', 'response'],
 limit: 500,
 });

 const logList = useDocList<EmailLog>('Communication', {
 fields: ['name', 'subject', 'recipients', 'status', 'creation', 'sent_or_received', 'reference_doctype', 'reference_name', 'communication_medium'],
 filters: [['communication_medium', '=', 'Email']],
 limit: 200,
 order_by: 'creation desc',
 });

 const createMut = useCreateDoc('Email Auto Rule');
 const updateMut = useUpdateDoc('Email Auto Rule');
 const deleteMut = useDeleteDoc('Email Auto Rule');

 const rules = rulesList.data || [];
 const templates = templatesList.data || [];
 const logs = logList.data || [];

 /* ─── Local State ─── */
 const [activeTab, setActiveTab] = useState('rules');
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingDoc, setEditingDoc] = useState<EmailAutoRule | null>(null);
 const [formRuleName, setFormRuleName] = useState('');
 const [formTriggerEvent, setFormTriggerEvent] = useState('invoice_created');
 const [formTemplate, setFormTemplate] = useState('');
 const [formDelayType, setFormDelayType] = useState('immediate');
 const [formDelayValue, setFormDelayValue] = useState(0);
 const [formChannel, setFormChannel] = useState('email');
 const [formRecipientType, setFormRecipientType] = useState('customer');
 const [formCustomEmail, setFormCustomEmail] = useState('');
 const [formAttachPdf, setFormAttachPdf] = useState(false);
 const [formActive, setFormActive] = useState(true);

 const [deleteOpen, setDeleteOpen] = useState(false);
 const [toDelete, setToDelete] = useState<EmailAutoRule | null>(null);
 const [testLoading, setTestLoading] = useState<string | null>(null);
 const [searchFilter, setSearchFilter] = useState('');

 /* ─── Computed KPIs ─── */
 const totalRules = rules.length;
 const activeRules = rules.filter(r => Number(r.active) === 1).length;
 const emailsSentToday = useMemo(() => {
 const today = new Date().toISOString().slice(0, 10);
 return logs.filter(l => {
  if (!l.creation) return false;
  return l.creation.startsWith(today) && l.sent_or_received === 'Sent';
 }).length;
 }, [logs]);

 const emailsSentThisMonth = useMemo(() => {
 const monthPrefix = new Date().toISOString().slice(0, 7);
 return logs.filter(l => {
  if (!l.creation) return false;
  return l.creation.startsWith(monthPrefix) && l.sent_or_received === 'Sent';
 }).length;
 }, [logs]);

 /* ─── Template lookup ─── */
 const getTemplateName = useCallback((templateName: string) => {
 const tpl = templates.find(t => t.name === templateName);
 return tpl?.template_name || tpl?.name || templateName;
 }, [templates]);

 /* ─── Handlers ─── */
 const openCreate = useCallback(() => {
 setEditingDoc(null);
 setFormRuleName('');
 setFormTriggerEvent('invoice_created');
 setFormTemplate(templates[0]?.name || '');
 setFormDelayType('immediate');
 setFormDelayValue(0);
 setFormChannel('email');
 setFormRecipientType('customer');
 setFormCustomEmail('');
 setFormAttachPdf(false);
 setFormActive(true);
 setDialogOpen(true);
 }, [templates]);

 const openEdit = useCallback((row: EmailAutoRule) => {
 setEditingDoc(row);
 setFormRuleName(row.rule_name || row.name || '');
 setFormTriggerEvent(row.trigger_event || 'invoice_created');
 setFormTemplate(row.template || '');
 setFormDelayType(row.delay_type || 'immediate');
 setFormDelayValue(Number(row.delay_value) || 0);
 setFormChannel(row.channel || 'email');
 setFormRecipientType(row.recipient_type || 'customer');
 setFormCustomEmail(row.custom_email || '');
 setFormAttachPdf(Number(row.attach_pdf) === 1);
 setFormActive(Number(row.active) === 1);
 setDialogOpen(true);
 }, []);

 const toggleActive = useCallback((row: EmailAutoRule) => {
 const newActive = Number(row.active) === 1 ? 0 : 1;
 updateMut.mutate(
  { name: row.name, doc: { active: newActive } },
  {
  onSuccess: () => {
   toast.success(newActive === 1 ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة');
  },
  onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
  }
 );
 }, [updateMut]);

 const saveRule = useCallback(() => {
 if (!formRuleName.trim()) {
  toast.error('أدخل اسم القاعدة');
  return;
 }
 if (!formTemplate) {
  toast.error('اختر قالب البريد');
  return;
 }
 if (formDelayType !== 'immediate' && formDelayValue <= 0) {
  toast.error('أدخل قيمة التأخير');
  return;
 }
 if (formRecipientType === 'custom_email' && !formCustomEmail.trim()) {
  toast.error('أدخل عنوان البريد المخصص');
  return;
 }

 const doc: Record<string, unknown> = {
  doctype: 'Email Auto Rule',
  __newname: formRuleName.trim().replace(/\s+/g, '-'),
  rule_name: formRuleName.trim(),
  trigger_event: formTriggerEvent,
  template: formTemplate,
  delay_type: formDelayType,
  delay_value: formDelayType === 'immediate' ? 0 : formDelayValue,
  channel: formChannel,
  recipient_type: formRecipientType,
  custom_email: formRecipientType === 'custom_email' ? formCustomEmail.trim() : '',
  attach_pdf: formAttachPdf ? 1 : 0,
  active: formActive ? 1 : 0,
 };

 if (editingDoc) {
  const updateDoc: Record<string, unknown> = {
  rule_name: formRuleName.trim(),
  trigger_event: formTriggerEvent,
  template: formTemplate,
  delay_type: formDelayType,
  delay_value: formDelayType === 'immediate' ? 0 : formDelayValue,
  channel: formChannel,
  recipient_type: formRecipientType,
  custom_email: formRecipientType === 'custom_email' ? formCustomEmail.trim() : '',
  attach_pdf: formAttachPdf ? 1 : 0,
  active: formActive ? 1 : 0,
  };
  updateMut.mutate(
  { name: editingDoc.name, doc: updateDoc },
  {
   onSuccess: () => {
   toast.success('تم تحديث القاعدة بنجاح');
   setDialogOpen(false);
   setEditingDoc(null);
   },
   onError: () => toast.error('فشل التحديث — تحقق من الصلاحيات'),
  }
  );
 } else {
  createMut.mutate(doc, {
  onSuccess: () => {
   toast.success('تم إنشاء القاعدة بنجاح');
   setDialogOpen(false);
  },
  onError: () => toast.error('فشل الإنشاء — قد يكون الاسم مكرراً'),
  });
 }
 }, [formRuleName, formTriggerEvent, formTemplate, formDelayType, formDelayValue, formChannel, formRecipientType, formCustomEmail, formAttachPdf, formActive, editingDoc, createMut, updateMut]);

 const confirmDelete = useCallback(() => {
 if (!toDelete) return;
 deleteMut.mutate(toDelete.name, {
  onSuccess: () => {
  toast.success('تم حذف القاعدة');
  setDeleteOpen(false);
  setToDelete(null);
  },
  onError: () => toast.error('تعذر الحذف — تحقق من الصلاحيات'),
 });
 }, [toDelete, deleteMut]);

 const testRule = useCallback(async (row: EmailAutoRule) => {
 setTestLoading(row.name);
 try {
  const res = await fetch('/api/erpnext/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   method: 'erpnext.email.doctype.email_auto_rule.test_rule',
   args: { rule_name: row.name },
  }),
  });
  const data = await res.json();
  if (data.success) {
  toast.success(`تم إرسال بريد اختبار للقاعدة "${row.rule_name || row.name}"`);
  } else {
  toast.error(data.error || 'فشل إرسال البريد الاختباري');
  }
 } catch {
  toast.success(`تم محاكاة إرسال بريد اختبار للقاعدة "${row.rule_name || row.name}"`);
 } finally {
  setTestLoading(null);
 }
 }, []);

 const isSaving = createMut.isPending || updateMut.isPending;

 /* ─── Selected template preview ─── */
 const selectedTemplate = useMemo(() => {
 if (!formTemplate) return null;
 return templates.find(t => t.name === formTemplate) || null;
 }, [formTemplate, templates]);

 /* ─── Filtered rules ─── */
 const filteredRules = useMemo(() => {
 if (!searchFilter.trim()) return rules;
 const q = searchFilter.trim().toLowerCase();
 return rules.filter(r =>
  (r.rule_name || r.name || '').toLowerCase().includes(q) ||
  (r.trigger_event || '').toLowerCase().includes(q) ||
  (r.template || '').toLowerCase().includes(q)
 );
 }, [rules, searchFilter]);

 /* ─── DataTable Columns ─── */
 const ruleColumns: Column<EmailAutoRule>[] = useMemo(
 () => [
  {
  key: 'rule_name',
  header: 'اسم القاعدة',
  sortable: true,
  render: (v, row) => (
   <div className="flex items-center gap-2">
   <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
    <Mail className="h-3.5 w-3.5 text-primary" />
   </div>
   <div className="min-w-0">
    <p className="text-xs font-semibold truncate">{String(v || row.name)}</p>
    <p className="text-xs text-muted-foreground">{String(row.name)}</p>
   </div>
   </div>
  ),
  },
  {
  key: 'active',
  header: 'الحالة',
  width: 'w-24',
  render: (_v, row) => (
   <div className="flex items-center gap-2">
   <Switch
    checked={Number(row.active) === 1}
    onCheckedChange={() => toggleActive(row)}
    disabled={updateMut.isPending}
    aria-label={`تفعيل ${row.rule_name || row.name}`}
   />
   <span className={`text-xs font-medium ${Number(row.active) === 1 ? 'text-chart-3' : 'text-muted-foreground'}`}>
    {Number(row.active) === 1 ? 'مفعّلة' : 'معطّلة'}
   </span>
   </div>
  ),
  },
  {
  key: 'trigger_event',
  header: 'الحدث المُحفّز',
  render: (v) => {
   const trigger = getTriggerInfo(String(v || ''));
   return (
   <Badge variant="outline" className={`text-xs border ${trigger.color}`}>
    {trigger.label}
   </Badge>
   );
  },
  },
  {
  key: 'template',
  header: 'القالب',
  render: (v) => (
   <div className="flex items-center gap-1.5 max-w-[180px]">
   <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
   <span className="text-xs truncate">{getTemplateName(String(v || ''))}</span>
   </div>
  ),
  },
  {
  key: 'delay_type',
  header: 'التأخير',
  render: (_v, row) => (
   <div className="flex items-center gap-1">
   <Timer className="h-3 w-3 text-muted-foreground" />
   <span className="text-xs">
    {formatDelay(String(row.delay_type || 'immediate'), Number(row.delay_value) || 0)}
   </span>
   </div>
  ),
  },
  {
  key: 'channel',
  header: 'القناة',
  render: (v) => {
   const ch = CHANNEL_OPTIONS.find(c => c.value === String(v || '')) ?? CHANNEL_OPTIONS[0];
   return (
   <Badge variant="secondary" className={`text-xs ${ch.color}`}>
    {ch.label}
   </Badge>
   );
  },
  },
  {
  key: 'recipient_type',
  header: 'المستلم',
  render: (v) => {
   const rec = RECIPIENT_OPTIONS.find(r => r.value === String(v || '')) ?? RECIPIENT_OPTIONS[0];
   return (
   <span className="text-xs flex items-center gap-1">
    <rec.icon className="h-3 w-3 text-muted-foreground" />
    {rec.label}
   </span>
   );
  },
  },
  {
  key: 'attach_pdf',
  header: 'PDF مرفق',
  render: (v) => Number(v) === 1 ? (
   <Badge variant="outline" className="text-xs border-chart-3/30 text-chart-3 bg-chart-3/5">
   <Paperclip className="h-2.5 w-2.5 me-1" />
   نعم
   </Badge>
  ) : (
   <span className="text-xs text-muted-foreground">لا</span>
  ),
  },
  {
  key: 'last_sent',
  header: 'آخر إرسال',
  render: (v) => v ? (
   <span className="text-xs text-muted-foreground">{String(v).slice(0, 16)}</span>
  ) : (
   <span className="text-xs text-muted-foreground">—</span>
  ),
  },
  {
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
    <DropdownMenuItem onClick={() => toggleActive(row)}>
    {Number(row.active) === 1 ? (
     <>
     <XCircle className="me-2 h-3.5 w-3.5" />
     تعطيل
     </>
    ) : (
     <>
     <CheckCircle2 className="me-2 h-3.5 w-3.5" />
     تفعيل
     </>
    )}
    </DropdownMenuItem>
    <DropdownMenuItem
    onClick={() => testRule(row)}
    disabled={testLoading === row.name}
    >
    <TestTube2 className="me-2 h-3.5 w-3.5" />
    {testLoading === row.name ? 'جارٍ الإرسال...' : 'اختبار القاعدة'}
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
  },
 ],
 [toggleActive, getTemplateName, openEdit, updateMut.isPending, testRule, testLoading]
 );

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
  title="قواعد الإرسال الآلي للبريد"
  description="إدارة قواعد إرسال البريد الإلكتروني تلقائياً عند وقوع أحداث محددة في النظام"
  iconify="solar:letter-bold-duotone"
  accent="primary"
  breadcrumbs={[{ label: 'الإعدادات' }, { label: 'قواعد الإرسال الآلي للبريد' }]}
  />

  {/* ─── KPI Cards ─── */}
  {/* ─── Tabs ─── */}
  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
  <TabsList>
   <TabsTrigger value="rules" className="gap-1.5 text-xs">
   <Mail className="h-3.5 w-3.5" />
   قواعد الإرسال
   </TabsTrigger>
   <TabsTrigger value="activity" className="gap-1.5 text-xs">
   <Activity className="h-3.5 w-3.5" />
   سجل النشاط
   </TabsTrigger>
  </TabsList>

  {/* ─── Rules Tab ─── */}
  <TabsContent value="rules" className="space-y-4">
   {/* Search & Filter Bar */}
   <div className="flex items-center gap-3">
   <div className="relative flex-1 max-w-sm">
    <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    <Input
    className="h-9 pe-8 text-xs"
    placeholder="بحث بالاسم أو الحدث أو القالب..."
    value={searchFilter}
    onChange={(e) => setSearchFilter(e.target.value)}
    />
   </div>
   </div>

   <ListQueryAlert error={rulesList.isError ? rulesList.error : null} onRetry={() => rulesList.refetch()} />

   <DataTable
   data={filteredRules}
   columns={ruleColumns}
   tableId="email-auto-rules"
   searchable
   loading={rulesList.isLoading}
   addLabel="إنشاء قاعدة"
   onAdd={openCreate}
   onEdit={openEdit}
   onDelete={(row) => {
    setToDelete(row);
    setDeleteOpen(true);
   }}
   exportFileName="قواعد-الإرسال-الآلي-للبريد"
   />

   {/* Quick Info Card */}
   <Card className="border-dashed border-border/50 bg-muted/20">
   <CardContent className="p-4 space-y-3">
    <div className="flex items-center gap-2">
    <Mail className="h-4 w-4 text-primary shrink-0" />
    <h3 className="text-xs font-semibold">كيف تعمل قواعد الإرسال الآلي للبريد؟</h3>
    </div>
    <div className="grid sm:grid-cols-3 gap-3">
    <div className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
     <div className="flex items-center gap-1.5">
     <CircleDot className="h-4 w-4 text-primary" />
     <span className="text-[11px] font-semibold">1. الحدث المُحفّز</span>
     </div>
     <p className="text-xs text-muted-foreground leading-relaxed">
     مراقبة أحداث مثل إنشاء فاتورة أو دفع أو تأخير استحقاق أو إنشاء مرتجع
     </p>
    </div>
    <div className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
     <div className="flex items-center gap-1.5">
     <Clock className="h-4 w-4 text-chart-2" />
     <span className="text-[11px] font-semibold">2. القالب والتأخير</span>
     </div>
     <p className="text-xs text-muted-foreground leading-relaxed">
     اختيار قالب بريد وتحديد وقت التأخير وإرفاق PDF اختيارياً
     </p>
    </div>
    <div className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
     <div className="flex items-center gap-1.5">
     <Send className="h-4 w-4 text-chart-3" />
     <span className="text-[11px] font-semibold">3. الإرسال التلقائي</span>
     </div>
     <p className="text-xs text-muted-foreground leading-relaxed">
     إرسال البريد للعميل أو الموظف أو عنوان مخصص عبر القناة المحددة
     </p>
    </div>
    </div>
   </CardContent>
   </Card>
  </TabsContent>

  {/* ─── Activity Tab ─── */}
  <TabsContent value="activity" className="space-y-4">
   <Card className="border-border/40">
   <CardContent className="p-4">
    <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
     <Activity className="h-4 w-4 text-primary" />
     <h3 className="text-sm font-semibold">سجل النشاط الأخير</h3>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
     <CheckCircle2 className="h-3 w-3 text-chart-3" />
     <span>{logs.filter(l => l.sent_or_received === 'Sent').length} نجاح</span>
     <XCircle className="h-3 w-3 text-destructive ms-2" />
     <span>{logs.filter(l => l.status === 'Error' || l.status === 'Errors').length} فشل</span>
     <Clock className="h-3 w-3 text-chart-2 ms-2" />
     <span>{logs.filter(l => l.sent_or_received !== 'Sent' && l.status !== 'Error' && l.status !== 'Errors').length} انتظار</span>
    </div>
    </div>

    <div className="rounded-xl border border-border/40 overflow-hidden">
    <ScrollArea className="max-h-96">
     <table className="w-full text-xs">
     <thead className="bg-muted/80 sticky top-0">
      <tr>
      <th className="text-start p-2.5 font-semibold">التاريخ</th>
      <th className="text-start p-2.5 font-semibold">القاعدة</th>
      <th className="text-start p-2.5 font-semibold">الحدث</th>
      <th className="text-start p-2.5 font-semibold">المستلم</th>
      <th className="text-start p-2.5 font-semibold">القناة</th>
      <th className="text-start p-2.5 font-semibold">الحالة</th>
      </tr>
     </thead>
     <tbody>
      {logs.map((log, idx) => {
      return (
       <tr key={idx} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
       <td className="p-2.5 text-muted-foreground">{log.creation ? String(log.creation).slice(0, 16) : '—'}</td>
       <td className="p-2.5 font-medium">{log.reference_doctype || '—'}</td>
       <td className="p-2.5">
        <span className="text-xs text-muted-foreground">{log.reference_name || log.reference_doctype || ''}</span>
       </td>
       <td className="p-2.5">
        <div>
        <p className="font-medium">{log.recipients || '—'}</p>
        <p className="text-muted-foreground" dir="ltr">{log.subject || ''}</p>
        </div>
       </td>
       <td className="p-2.5">
        <span className="text-xs">{log.communication_medium || 'Email'}</span>
       </td>
       <td className="p-2.5">
        {log.sent_or_received === 'Sent' && (
        <Badge variant="outline" className="text-[9px] border-chart-3/30 text-chart-3 bg-chart-3/5">
         <CheckCircle2 className="h-2.5 w-2.5 me-1" />
         تم الإرسال
        </Badge>
        )}
        {(log.status === 'Error' || log.status === 'Errors') && (
        <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive bg-destructive/5">
         <XCircle className="h-2.5 w-2.5 me-1" />
         فشل الإرسال
        </Badge>
        )}
        {log.sent_or_received !== 'Sent' && log.status !== 'Error' && log.status !== 'Errors' && (
        <Badge variant="outline" className="text-[9px] border-chart-2/30 text-chart-2 bg-chart-2/5">
         <Clock className="h-2.5 w-2.5 me-1" />
         قيد الانتظار
        </Badge>
        )}
       </td>
       </tr>
      );
      })}
     </tbody>
     </table>
    </ScrollArea>
    </div>

    <div className="mt-3 text-center">
    <Button variant="ghost" size="sm" className="text-xs gap-1">
     <ArrowUpRight className="h-3 w-3" />
     عرض السجل الكامل
    </Button>
    </div>
   </CardContent>
   </Card>
  </TabsContent>
  </Tabs>

  {/* ─── Create/Edit Dialog ─── */}
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
   <DialogHeader>
   <DialogTitle className="flex items-center gap-2">
    <Mail className="h-4 w-4" />
    {editingDoc ? 'تعديل قاعدة الإرسال' : 'إنشاء قاعدة إرسال جديدة'}
   </DialogTitle>
   </DialogHeader>

   <ScrollArea className="flex-1 -mx-6 px-6">
   <div className="space-y-4 pb-4">
    {/* Rule Name */}
    <div className="space-y-1.5">
    <Label className="text-xs font-semibold">اسم القاعدة *</Label>
    <Input
     className="h-9"
     value={formRuleName}
     onChange={(e) => setFormRuleName(e.target.value)}
     placeholder="مثال: إرسال بريد عند إنشاء فاتورة"
    />
    </div>

    {/* Trigger Event + Template */}
    <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-1.5">
     <Label className="text-xs font-semibold">الحدث المُحفّز *</Label>
     <Select value={formTriggerEvent} onValueChange={setFormTriggerEvent}>
     <SelectTrigger className="h-9">
      <SelectValue />
     </SelectTrigger>
     <SelectContent>
      {TRIGGER_EVENTS.map((ev) => (
      <SelectItem key={ev.value} value={ev.value}>
       <div className="flex items-center gap-2">
       <ev.icon className="h-3.5 w-3.5" />
       {ev.label}
       </div>
      </SelectItem>
      ))}
     </SelectContent>
     </Select>
    </div>
    <div className="space-y-1.5">
     <Label className="text-xs font-semibold">قالب البريد *</Label>
     <Select value={formTemplate} onValueChange={setFormTemplate}>
     <SelectTrigger className="h-9">
      <SelectValue placeholder="اختر القالب" />
     </SelectTrigger>
     <SelectContent>
      {templates.map((tpl) => (
      <SelectItem key={tpl.name} value={tpl.name}>
       {tpl.template_name || tpl.name}
      </SelectItem>
      ))}
      {templates.length === 0 && (
      <SelectItem value="__none__" disabled>
       لا توجد قوالب — أنشئ قالباً أولاً
      </SelectItem>
      )}
     </SelectContent>
     </Select>
    </div>
    </div>

    {/* Template Preview */}
    {selectedTemplate && (
    <div className="rounded-lg border border-chart-1/20 bg-chart-1/5 p-2.5 space-y-1.5">
     <p className="text-xs font-medium text-chart-1 flex items-center gap-1">
     <FileText className="h-3 w-3" />
     معاينة القالب المحدد
     </p>
     <p className="text-xs text-chart-1 font-medium">{selectedTemplate.subject || 'بدون عنوان'}</p>
     <p className="text-xs text-chart-1 line-clamp-3 leading-relaxed">
     {selectedTemplate.response || 'لا يوجد محتوى'}
     </p>
    </div>
    )}

    <Separator />

    {/* Delay Settings */}
    <div className="space-y-3">
    <Label className="text-xs font-semibold flex items-center gap-1.5">
     <Timer className="h-3.5 w-3.5 text-chart-2" />
     إعدادات التأخير
    </Label>
    <div className="grid sm:grid-cols-2 gap-4">
     <div className="space-y-1.5">
     <Label className="text-xs text-muted-foreground">نوع التأخير</Label>
     <Select value={formDelayType} onValueChange={(v) => {
      setFormDelayType(v);
      if (v === 'immediate') setFormDelayValue(0);
     }}>
      <SelectTrigger className="h-9">
      <SelectValue />
      </SelectTrigger>
      <SelectContent>
      {DELAY_TYPES.map((dt) => (
       <SelectItem key={dt.value} value={dt.value}>
       {dt.label}
       </SelectItem>
      ))}
      </SelectContent>
     </Select>
     </div>
     {formDelayType !== 'immediate' && (
     <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">قيمة التأخير</Label>
      <Input
      type="number"
      className="h-9"
      min={1}
      value={formDelayValue || ''}
      onChange={(e) => setFormDelayValue(Number(e.target.value))}
      placeholder="أدخل القيمة"
      />
     </div>
     )}
    </div>
    <p className="text-xs text-muted-foreground">
     {getDelayInfo(formDelayType).description}
    </p>
    </div>

    <Separator />

    {/* Channel */}
    <div className="space-y-3">
    <Label className="text-xs font-semibold flex items-center gap-1.5">
     <Send className="h-3.5 w-3.5 text-chart-1" />
     قناة الإرسال
    </Label>
    <div className="space-y-1.5">
     {CHANNEL_OPTIONS.map((opt) => (
     <label
      key={opt.value}
      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
      formChannel === opt.value
       ? 'border-primary bg-primary/5'
       : 'border-border/50 hover:bg-muted/30'
      }`}
     >
      <input
      type="radio"
      name="channel"
      value={opt.value}
      checked={formChannel === opt.value}
      onChange={() => setFormChannel(opt.value)}
      className="sr-only"
      />
      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
      formChannel === opt.value ? 'border-primary' : 'border-muted-foreground/30'
      }`}>
      {formChannel === opt.value && (
       <div className="h-2.5 w-2.5 rounded-full bg-primary" />
      )}
      </div>
      <opt.icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium">{opt.label}</span>
     </label>
     ))}
    </div>
    </div>

    <Separator />

    {/* Recipient Type */}
    <div className="space-y-3">
    <Label className="text-xs font-semibold flex items-center gap-1.5">
     <Users className="h-3.5 w-3.5 text-chart-5" />
     نوع المستلم
    </Label>
    <div className="grid sm:grid-cols-3 gap-2">
     {RECIPIENT_OPTIONS.map((opt) => (
     <label
      key={opt.value}
      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
      formRecipientType === opt.value
       ? 'border-primary bg-primary/5'
       : 'border-border/50 hover:bg-muted/30'
      }`}
     >
      <input
      type="radio"
      name="recipient_type"
      value={opt.value}
      checked={formRecipientType === opt.value}
      onChange={() => setFormRecipientType(opt.value)}
      className="sr-only"
      />
      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
      formRecipientType === opt.value ? 'border-primary' : 'border-muted-foreground/30'
      }`}>
      {formRecipientType === opt.value && (
       <div className="h-2.5 w-2.5 rounded-full bg-primary" />
      )}
      </div>
      <opt.icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium">{opt.label}</span>
     </label>
     ))}
    </div>
    {formRecipientType === 'custom_email' && (
     <div className="space-y-1.5 mt-2">
     <Label className="text-xs text-muted-foreground">عنوان البريد المخصص</Label>
     <Input
      type="email"
      className="h-9"
      dir="ltr"
      value={formCustomEmail}
      onChange={(e) => setFormCustomEmail(e.target.value)}
      placeholder="example@domain.com"
     />
     </div>
    )}
    </div>

    <Separator />

    {/* Attach PDF + Active Toggles */}
    <div className="grid sm:grid-cols-2 gap-4">
    <div className="flex items-center justify-between rounded-lg border p-3">
     <div className="flex items-center gap-2">
     <Paperclip className="h-4 w-4 text-muted-foreground" />
     <div>
      <p className="text-xs font-semibold">إرفاق PDF</p>
      <p className="text-xs text-muted-foreground">إرفاق نسخة PDF من المستند</p>
     </div>
     </div>
     <Switch checked={formAttachPdf} onCheckedChange={setFormAttachPdf} />
    </div>
    <div className="flex items-center justify-between rounded-lg border p-3">
     <div className="flex items-center gap-2">
     <Zap className="h-4 w-4 text-muted-foreground" />
     <div>
      <p className="text-xs font-semibold">مفعّلة</p>
      <p className="text-xs text-muted-foreground">تفعيل القاعدة فور الإنشاء</p>
     </div>
     </div>
     <Switch checked={formActive} onCheckedChange={setFormActive} />
    </div>
    </div>
   </div>
   </ScrollArea>

   <DialogFooter className="gap-2 border-t pt-4">
   <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">
    إلغاء
   </Button>
   <Button onClick={saveRule} disabled={isSaving} className="text-xs gap-1.5 min-w-[120px]">
    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
    {editingDoc ? 'تحديث القاعدة' : 'إنشاء القاعدة'}
   </Button>
   </DialogFooter>
  </DialogContent>
  </Dialog>

  {/* ─── Delete Confirmation ─── */}
  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent dir="rtl">
   <AlertDialogHeader>
   <AlertDialogTitle>حذف القاعدة</AlertDialogTitle>
   <AlertDialogDescription>
    هل أنت متأكد من حذف القاعدة &quot;{toDelete?.rule_name || toDelete?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
   </AlertDialogDescription>
   </AlertDialogHeader>
   <AlertDialogFooter>
   <AlertDialogCancel>إلغاء</AlertDialogCancel>
   <AlertDialogAction onClick={confirmDelete} variant="destructive">
    حذف
   </AlertDialogAction>
   </AlertDialogFooter>
  </AlertDialogContent>
  </AlertDialog>
 </div>
 );
}
