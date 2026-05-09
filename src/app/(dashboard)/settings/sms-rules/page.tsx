'use client';

import { useMemo, useState, useCallback } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
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
  Zap,
  Send,
  FileText,
  Clock,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Bell,
  MessageSquare,
  Smartphone,
  Users,
  CheckCircle2,
  XCircle,
  Activity,
  CalendarDays,
  ArrowUpRight,
  CircleDot,
  Phone,
  User,
  UserCheck,
  Timer,
  MessageCircle,
  Radio,
} from 'lucide-react';

/* ─── Types ─── */
interface SmsAutoRule {
  name: string;
  rule_name?: string;
  trigger_event?: string;
  template?: string;
  delay_type?: string;
  delay_value?: number;
  active?: number;
  send_via?: string;
  target?: string;
  owner?: string;
  modified?: string;
  creation?: string;
}

interface SmsLog {
  name: string;
  communication_type?: string;
  communication_medium?: string;
  subject?: string;
  content?: string;
  recipients?: string;
  status?: string;
  creation?: string;
  sent_or_received?: string;
  reference_doctype?: string;
  reference_name?: string;
}

interface SmsTemplate {
  name: string;
  template_name?: string;
  body?: string;
  category?: string;
}

/* ─── Constants ─── */
const TRIGGER_EVENTS = [
  { value: 'invoice_created', label: 'إنشاء فاتورة', icon: FileText, color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'invoice_paid', label: 'دفع فاتورة', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'invoice_overdue', label: 'فاتورة متأخرة', icon: Clock, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: 'quote_created', label: 'إنشاء عرض سعر', icon: FileText, color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'credit_note_created', label: 'إنشاء إشعار دائن', icon: FileText, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'appointment_reminder', label: 'تذكير موعد', icon: CalendarDays, color: 'bg-amber-100 text-amber-700 border-amber-200' },
] as const;

const DELAY_TYPES = [
  { value: 'immediate', label: 'فوري', description: 'إرسال الرسالة مباشرةً عند وقوع الحدث' },
  { value: 'minutes', label: 'دقائق', description: 'الانتظار عدداً من الدقائق قبل الإرسال' },
  { value: 'hours', label: 'ساعات', description: 'الانتظار عدداً من الساعات قبل الإرسال' },
  { value: 'days', label: 'أيام', description: 'الانتظار عدداً من الأيام قبل الإرسال' },
] as const;

const SEND_VIA_OPTIONS = [
  { value: 'sms', label: 'رسالة SMS', icon: Smartphone, color: 'bg-sky-100 text-sky-700' },
  { value: 'whatsapp', label: 'واتساب', icon: Phone, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'both', label: 'SMS + واتساب', icon: Radio, color: 'bg-amber-100 text-amber-700' },
] as const;

const TARGET_OPTIONS = [
  { value: 'customer', label: 'العميل', icon: User, color: 'bg-sky-100 text-sky-700' },
  { value: 'employee', label: 'الموظف', icon: UserCheck, color: 'bg-violet-100 text-violet-700' },
  { value: 'both', label: 'العميل + الموظف', icon: Users, color: 'bg-amber-100 text-amber-700' },
] as const;

/* ─── Helpers ─── */
function getTriggerInfo(event: string) {
  return TRIGGER_EVENTS.find(t => t.value === event) ?? TRIGGER_EVENTS[0];
}

function getDelayInfo(type: string) {
  return DELAY_TYPES.find(d => d.value === type) ?? DELAY_TYPES[0];
}

function getSendViaInfo(via: string) {
  return SEND_VIA_OPTIONS.find(s => s.value === via) ?? SEND_VIA_OPTIONS[0];
}

function getTargetInfo(target: string) {
  return TARGET_OPTIONS.find(t => t.value === target) ?? TARGET_OPTIONS[0];
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

function formatEventLabel(event: string): string {
  return getTriggerInfo(event).label;
}

function formatSendViaLabel(via: string): string {
  return getSendViaInfo(via).label;
}

function formatTargetLabel(target: string): string {
  return getTargetInfo(target).label;
}



/* ─── Main Component ─── */
export default function SmsAutoRulesPage() {
  /* ─── ERPNext Data Hooks ─── */
  const rulesList = useDocList<SmsAutoRule>('SMS Auto Rule', {
    fields: ['name', 'rule_name', 'trigger_event', 'template', 'delay_type', 'delay_value', 'active', 'send_via', 'target', 'owner', 'modified', 'creation'],
    limit: 500,
    order_by: 'modified desc',
  });

  const templatesList = useDocList<SmsTemplate>('SMS Template', {
    fields: ['name', 'template_name', 'body', 'category'],
    limit: 500,
  });

  const logList = useDocList<SmsLog>('Communication', {
    fields: ['name', 'communication_type', 'communication_medium', 'subject', 'content', 'recipients', 'status', 'creation', 'sent_or_received', 'reference_doctype', 'reference_name'],
    filters: [['communication_medium', '=', 'SMS']],
    limit: 200,
    order_by: 'creation desc',
  });

  const createMut = useCreateDoc('SMS Auto Rule');
  const updateMut = useUpdateDoc('SMS Auto Rule');
  const deleteMut = useDeleteDoc('SMS Auto Rule');

  const rules = rulesList.data || [];
  const templates = templatesList.data || [];
  const logs = logList.data || [];

  /* ─── Local State ─── */
  const [activeTab, setActiveTab] = useState('rules');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SmsAutoRule | null>(null);
  const [formRuleName, setFormRuleName] = useState('');
  const [formTriggerEvent, setFormTriggerEvent] = useState('invoice_created');
  const [formTemplate, setFormTemplate] = useState('');
  const [formDelayType, setFormDelayType] = useState('immediate');
  const [formDelayValue, setFormDelayValue] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formSendVia, setFormSendVia] = useState('sms');
  const [formTarget, setFormTarget] = useState('customer');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SmsAutoRule | null>(null);

  /* ─── Computed KPIs ─── */
  const totalRules = rules.length;
  const activeRules = rules.filter(r => Number(r.active) === 1).length;
  const messagesSentToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return logs.filter(l => {
      if (!l.creation) return false;
      return l.creation.startsWith(today) && l.sent_or_received === 'Sent';
    }).length;
  }, [logs]);

  const messagesSentThisMonth = useMemo(() => {
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
    setFormActive(true);
    setFormSendVia('sms');
    setFormTarget('customer');
    setDialogOpen(true);
  }, [templates]);

  const openEdit = useCallback((row: SmsAutoRule) => {
    setEditingDoc(row);
    setFormRuleName(row.rule_name || row.name || '');
    setFormTriggerEvent(row.trigger_event || 'invoice_created');
    setFormTemplate(row.template || '');
    setFormDelayType(row.delay_type || 'immediate');
    setFormDelayValue(Number(row.delay_value) || 0);
    setFormActive(Number(row.active) === 1);
    setFormSendVia(row.send_via || 'sms');
    setFormTarget(row.target || 'customer');
    setDialogOpen(true);
  }, []);

  const toggleActive = useCallback((row: SmsAutoRule) => {
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
      toast.error('اختر قالب الرسالة');
      return;
    }
    if (formDelayType !== 'immediate' && formDelayValue <= 0) {
      toast.error('أدخل قيمة التأخير');
      return;
    }

    const doc: Record<string, unknown> = {
      doctype: 'SMS Auto Rule',
      __newname: formRuleName.trim().replace(/\s+/g, '-'),
      rule_name: formRuleName.trim(),
      trigger_event: formTriggerEvent,
      template: formTemplate,
      delay_type: formDelayType,
      delay_value: formDelayType === 'immediate' ? 0 : formDelayValue,
      active: formActive ? 1 : 0,
      send_via: formSendVia,
      target: formTarget,
    };

    if (editingDoc) {
      const updateDoc: Record<string, unknown> = {
        rule_name: formRuleName.trim(),
        trigger_event: formTriggerEvent,
        template: formTemplate,
        delay_type: formDelayType,
        delay_value: formDelayType === 'immediate' ? 0 : formDelayValue,
        active: formActive ? 1 : 0,
        send_via: formSendVia,
        target: formTarget,
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
  }, [formRuleName, formTriggerEvent, formTemplate, formDelayType, formDelayValue, formActive, formSendVia, formTarget, editingDoc, createMut, updateMut]);

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

  const isSaving = createMut.isPending || updateMut.isPending;

  /* ─── DataTable Columns ─── */
  const ruleColumns: Column<SmsAutoRule>[] = useMemo(
    () => [
      {
        key: 'rule_name',
        header: 'اسم القاعدة',
        sortable: true,
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{String(v || row.name)}</p>
              <p className="text-[10px] text-muted-foreground">{String(row.name)}</p>
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
            <span className={`text-[10px] font-medium ${Number(row.active) === 1 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
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
            <Badge variant="outline" className={`text-[10px] border ${trigger.color}`}>
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
            <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
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
        key: 'send_via',
        header: 'وسيلة الإرسال',
        render: (v) => {
          const via = getSendViaInfo(String(v || ''));
          return (
            <Badge variant="secondary" className={`text-[10px] ${via.color}`}>
              {via.label}
            </Badge>
          );
        },
      },
      {
        key: 'target',
        header: 'المستهدف',
        render: (v) => {
          const target = getTargetInfo(String(v || ''));
          return (
            <span className="text-xs flex items-center gap-1">
              <target.icon className="h-3 w-3 text-muted-foreground" />
              {target.label}
            </span>
          );
        },
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
    [toggleActive, getTemplateName, openEdit, updateMut.isPending]
  );



  /* ─── Selected template preview ─── */
  const selectedTemplate = useMemo(() => {
    if (!formTemplate) return null;
    return templates.find(t => t.name === formTemplate) || null;
  }, [formTemplate, templates]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="قواعد الإرسال التلقائي"
        description="إدارة قواعد إرسال الرسائل النصية تلقائياً عند وقوع أحداث محددة في النظام"
        iconify="solar:bolt-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'قواعد SMS التلقائية' }]}
      />

      {/* ─── KPI Cards ─── */}
      <KpiStrip cols={4}>
        <KpiCard title="إجمالي القواعد" value={totalRules} icon={Zap} accent="primary" description="جميع قواعد الإرسال المسجلة" />
        <KpiCard title="قواعد مفعّلة" value={activeRules} icon={CheckCircle2} accent="success" description="قواعد تعمل حالياً" />
        <KpiCard title="رسائل اليوم" value={messagesSentToday} icon={Send} accent="info" description="رسائل مرسلة اليوم" />
        <KpiCard title="رسائل الشهر" value={messagesSentThisMonth} icon={Activity} accent="warning" description="إجمالي رسائل الشهر الحالي" />
      </KpiStrip>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" />
            قواعد الإرسال
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            سجل النشاط
          </TabsTrigger>
        </TabsList>

        {/* ─── Rules Tab ─── */}
        <TabsContent value="rules" className="space-y-4">
          <ListQueryAlert error={rulesList.isError ? rulesList.error : null} onRetry={() => rulesList.refetch()} />

          <DataTable
            data={rules}
            columns={ruleColumns}
            tableId="sms-auto-rules"
            searchable
            loading={rulesList.isLoading}
            addLabel="إنشاء قاعدة"
            onAdd={openCreate}
            onEdit={openEdit}
            onDelete={(row) => {
              setToDelete(row);
              setDeleteOpen(true);
            }}
            exportFileName="قواعد-الإرسال-التلقائي"
          />

          {/* Quick Info Card */}
          <Card className="border-dashed border-border/50 bg-muted/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning shrink-0" />
                <h3 className="text-xs font-semibold">كيف تعمل قواعد الإرسال التلقائي؟</h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="h-4 w-4 text-primary" />
                    <span className="text-[11px] font-semibold">١. الحدث المُحفّز</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    يتم مراقبة أحداث مثل إنشاء فاتورة أو دفع أو تأخير استحقاق
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-[11px] font-semibold">٢. التأخير والقالب</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    اختيار قالب رسالة وتحديد وقت التأخير قبل الإرسال
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-background p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-emerald-500" />
                    <span className="text-[11px] font-semibold">٣. الإرسال التلقائي</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    إرسال الرسالة عبر SMS أو واتساب للعميل أو الموظف
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
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>{logs.filter(l => l.sent_or_received === 'Sent').length} نجاح</span>
                  <XCircle className="h-3 w-3 text-rose-500 ms-2" />
                  <span>{logs.filter(l => l.status === 'Error' || l.status === 'Errors').length} فشل</span>
                  <Clock className="h-3 w-3 text-amber-500 ms-2" />
                  <span>{logs.filter(l => l.sent_or_received !== 'Sent' && l.status !== 'Error' && l.status !== 'Errors').length} انتظار</span>
                </div>
              </div>

              {/* Activity Log Table */}
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <ScrollArea className="max-h-96">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/80 sticky top-0">
                      <tr>
                        <th className="text-start p-2.5 font-semibold">التاريخ</th>
                        <th className="text-start p-2.5 font-semibold">القاعدة</th>
                        <th className="text-start p-2.5 font-semibold">الحدث</th>
                        <th className="text-start p-2.5 font-semibold">المستلم</th>
                        <th className="text-start p-2.5 font-semibold">الوسيلة</th>
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
                              <span className="text-[10px] text-muted-foreground">{log.subject || ''}</span>
                            </td>
                            <td className="p-2.5">
                              <div>
                                <p className="font-medium">{log.recipients || '—'}</p>
                                <p className="text-muted-foreground" dir="ltr">{log.content ? String(log.content).slice(0, 30) : ''}</p>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span className="text-[10px]">{log.communication_medium || 'SMS'}</span>
                            </td>
                            <td className="p-2.5">
                              {log.sent_or_received === 'Sent' && (
                                <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700 bg-emerald-50">
                                  <CheckCircle2 className="h-2.5 w-2.5 me-1" />
                                  تم الإرسال
                                </Badge>
                              )}
                              {(log.status === 'Error' || log.status === 'Errors') && (
                                <Badge variant="outline" className="text-[9px] border-rose-300 text-rose-700 bg-rose-50">
                                  <XCircle className="h-2.5 w-2.5 me-1" />
                                  فشل
                                </Badge>
                              )}
                              {log.sent_or_received !== 'Sent' && log.status !== 'Error' && log.status !== 'Errors' && (
                                <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700 bg-amber-50">
                                  <Clock className="h-2.5 w-2.5 me-1" />
                                  انتظار
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
              <Zap className="h-4 w-4" />
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
                  placeholder="مثال: إرسال SMS عند إنشاء فاتورة"
                  disabled={!!editingDoc}
                />
                {editingDoc && (
                  <p className="text-[10px] text-muted-foreground">لا يمكن تغيير اسم القاعدة بعد الإنشاء</p>
                )}
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
                  <Label className="text-xs font-semibold">قالب الرسالة *</Label>
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
                <div className="rounded-lg border border-sky-200/40 bg-sky-50/50 p-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-sky-700 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    معاينة القالب المحدد
                  </p>
                  <p className="text-[10px] text-sky-600 line-clamp-3 leading-relaxed">
                    {selectedTemplate.body || 'لا يوجد محتوى'}
                  </p>
                  {selectedTemplate.category && (
                    <Badge variant="outline" className="text-[9px]">
                      {selectedTemplate.category}
                    </Badge>
                  )}
                </div>
              )}

              <Separator />

              {/* Delay Settings */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-amber-500" />
                  إعدادات التأخير
                </Label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">نوع التأخير</Label>
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
                      <Label className="text-[10px] text-muted-foreground">قيمة التأخير</Label>
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
                <p className="text-[10px] text-muted-foreground">
                  {getDelayInfo(formDelayType).description}
                </p>
              </div>

              <Separator />

              {/* Send Via + Target */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-sky-500" />
                    وسيلة الإرسال
                  </Label>
                  <div className="space-y-1.5">
                    {SEND_VIA_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          formSendVia === opt.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="send_via"
                          value={opt.value}
                          checked={formSendVia === opt.value}
                          onChange={() => setFormSendVia(opt.value)}
                          className="sr-only"
                        />
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          formSendVia === opt.value ? 'border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {formSendVia === opt.value && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <opt.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-violet-500" />
                    المستهدف
                  </Label>
                  <div className="space-y-1.5">
                    {TARGET_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          formTarget === opt.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="target"
                          value={opt.value}
                          checked={formTarget === opt.value}
                          onChange={() => setFormTarget(opt.value)}
                          className="sr-only"
                        />
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          formTarget === opt.value ? 'border-primary' : 'border-muted-foreground/30'
                        }`}>
                          {formTarget === opt.value && (
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <opt.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                    formActive ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    {formActive ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">
                      {formActive ? 'القاعدة مفعّلة' : 'القاعدة معطّلة'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formActive
                        ? 'سيتم إرسال الرسائل تلقائياً عند وقوع الحدث'
                        : 'لن يتم إرسال أي رسائل حتى يتم التفعيل'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formActive}
                  onCheckedChange={setFormActive}
                  aria-label="تفعيل القاعدة"
                />
              </div>

              {/* Rule Summary */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-primary">ملخص القاعدة</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">الحدث:</span>
                    <span className="font-medium">{formatEventLabel(formTriggerEvent)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">التأخير:</span>
                    <span className="font-medium">{formatDelay(formDelayType, formDelayValue)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">الوسيلة:</span>
                    <span className="font-medium">{formatSendViaLabel(formSendVia)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">المستهدف:</span>
                    <span className="font-medium">{formatTargetLabel(formTarget)}</span>
                  </div>
                </div>
              </div>

              {editingDoc && (
                <div className="rounded-lg border border-amber-200/40 bg-amber-50/50 p-2.5">
                  <p className="text-[10px] font-semibold text-amber-700">
                    جاري تعديل: {editingDoc.rule_name || editingDoc.name}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveRule} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
              {editingDoc ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف القاعدة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف القاعدة «{toDelete?.rule_name || toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
              لن يتم إرسال أي رسائل مرتبطة بهذه القاعدة بعد الحذف.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={confirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 animate-spin ms-1" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
