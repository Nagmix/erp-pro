'use client';

import { useCallback, useMemo, useSyncExternalStore, useState } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { formatCurrency, formatDate } from '@/lib/app-format';
import {
  MessageSquare,
  Send,
  FileText,
  ListChecks,
  Wallet,
  TestTube,
} from 'lucide-react';

/* ─── localStorage Keys ─── */
const LS_PROVIDER = 'erp_sms_provider_config';
const LS_TEMPLATES = 'erp_sms_templates';
const LS_RULES = 'erp_sms_rules';
const LS_LOG = 'erp_sms_log';

/* ─── Types ─── */
type SmsProvider = 'Twilio' | 'Vonage' | 'Unifonic' | 'SMS Misr' | 'Custom';
type ProviderConfig = {
  provider: SmsProvider;
  apiKey: string;
  apiSecret: string;
  senderId: string;
  baseUrl: string;
};
type SmsTemplate = {
  id: string;
  name: string;
  content: string;
  doctype: string;
};
type SmsRule = {
  id: string;
  name: string;
  doctype: string;
  event: string;
  templateId: string;
  recipient: string;
  delay: number;
  active: boolean;
};
type SmsLogEntry = {
  id: string;
  date: string;
  recipient: string;
  template: string;
  status: 'ناجح' | 'فاشل';
  cost: number;
};

const DOCTYPE_OPTIONS = [
  { value: 'Sales Invoice', label: 'فاتورة مبيعات' },
  { value: 'Purchase Invoice', label: 'فاتورة مشتريات' },
  { value: 'Payment Entry', label: 'سند دفع' },
  { value: 'Quotation', label: 'عرض سعر' },
];

const EVENT_OPTIONS = [
  { value: 'on_submit', label: 'عند التقديم' },
  { value: 'on_cancel', label: 'عند الإلغاء' },
  { value: 'on_create', label: 'عند الإنشاء' },
];

const RECIPIENT_OPTIONS = [
  { value: 'Customer', label: 'العميل' },
  { value: 'Supplier', label: 'المورد' },
  { value: 'Contact', label: 'جهة الاتصال' },
];

const PROVIDERS: SmsProvider[] = ['Twilio', 'Vonage', 'Unifonic', 'SMS Misr', 'Custom'];

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

const defaultProvider: ProviderConfig = {
  provider: 'Unifonic',
  apiKey: '',
  apiSecret: '',
  senderId: '',
  baseUrl: '',
};

const emptySubscribe = () => () => {};

export default function SmsGatewayPage() {
  const { toast } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Provider config
  const [config, setConfig] = useState<ProviderConfig>(() => loadJson(LS_PROVIDER, defaultProvider));
  const [testing, setTesting] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<SmsTemplate[]>(() => loadJson(LS_TEMPLATES, []));
  const [tplDialog, setTplDialog] = useState<'create' | 'edit' | null>(null);
  const [tplForm, setTplForm] = useState<Partial<SmsTemplate>>({});
  const [editingTpl, setEditingTpl] = useState<SmsTemplate | null>(null);

  // Rules
  const [rules, setRules] = useState<SmsRule[]>(() => loadJson(LS_RULES, []));
  const [ruleDialog, setRuleDialog] = useState<'create' | 'edit' | null>(null);
  const [ruleForm, setRuleForm] = useState<Partial<SmsRule>>({});
  const [editingRule, setEditingRule] = useState<SmsRule | null>(null);

  // Log
  const [log, setLog] = useState<SmsLogEntry[]>(() => loadJson(LS_LOG, []));

  // Delete confirm
  const [deleteType, setDeleteType] = useState<'template' | 'rule' | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  // ─── Provider Actions ───
  const saveConfig = useCallback(() => {
    saveJson(LS_PROVIDER, config);
    toast({ title: 'تم حفظ إعدادات المزود' });
  }, [config, toast]);

  const testSms = useCallback(async () => {
    if (!config.apiKey) {
      toast({ title: 'أدخل مفتاح API أولاً', variant: 'destructive' });
      return;
    }
    setTesting(true);
    // Simulate test SMS
    await new Promise((r) => setTimeout(r, 1500));
    const newLog: SmsLogEntry = {
      id: uid(),
      date: new Date().toISOString(),
      recipient: '966500000000',
      template: 'رسالة اختبار',
      status: Math.random() > 0.2 ? 'ناجح' : 'فاشل',
      cost: 0.05,
    };
    const updated = [newLog, ...log];
    setLog(updated);
    saveJson(LS_LOG, updated);
    setTesting(false);
    toast({ title: newLog.status === 'ناجح' ? 'تم إرسال رسالة الاختبار بنجاح' : 'فشل إرسال رسالة الاختبار' });
  }, [config.apiKey, log, toast]);

  // ─── Template Actions ───
  const openCreateTemplate = () => {
    setTplForm({ name: '', content: '', doctype: 'Sales Invoice' });
    setEditingTpl(null);
    setTplDialog('create');
  };

  const openEditTemplate = (row: SmsTemplate) => {
    setTplForm({ ...row });
    setEditingTpl(row);
    setTplDialog('edit');
  };

  const saveTemplate = () => {
    if (!tplForm.name?.trim() || !tplForm.content?.trim()) {
      toast({ title: 'أدخل اسم القالب ومحتوى الرسالة', variant: 'destructive' });
      return;
    }
    let updated: SmsTemplate[];
    if (editingTpl) {
      updated = templates.map((t) =>
        t.id === editingTpl.id
          ? { ...t, name: tplForm.name!, content: tplForm.content!, doctype: tplForm.doctype ?? 'Sales Invoice' }
          : t
      );
    } else {
      updated = [
        ...templates,
        { id: uid(), name: tplForm.name!, content: tplForm.content!, doctype: tplForm.doctype ?? 'Sales Invoice' },
      ];
    }
    setTemplates(updated);
    saveJson(LS_TEMPLATES, updated);
    setTplDialog(null);
    toast({ title: editingTpl ? 'تم تحديث القالب' : 'تم إنشاء القالب' });
  };

  const confirmDeleteTemplate = () => {
    if (!toDelete) return;
    const updated = templates.filter((t) => t.id !== toDelete.id);
    setTemplates(updated);
    saveJson(LS_TEMPLATES, updated);
    setDeleteType(null);
    setToDelete(null);
    toast({ title: 'تم حذف القالب' });
  };

  // ─── Rule Actions ───
  const openCreateRule = () => {
    setRuleForm({ name: '', doctype: 'Sales Invoice', event: 'on_submit', templateId: '', recipient: 'Customer', delay: 0, active: true });
    setEditingRule(null);
    setRuleDialog('create');
  };

  const openEditRule = (row: SmsRule) => {
    setRuleForm({ ...row });
    setEditingRule(row);
    setRuleDialog('edit');
  };

  const saveRule = () => {
    if (!ruleForm.name?.trim() || !ruleForm.templateId) {
      toast({ title: 'أدخل اسم القاعدة واختر القالب', variant: 'destructive' });
      return;
    }
    let updated: SmsRule[];
    const data: SmsRule = {
      id: editingRule?.id ?? uid(),
      name: ruleForm.name!,
      doctype: ruleForm.doctype ?? 'Sales Invoice',
      event: ruleForm.event ?? 'on_submit',
      templateId: ruleForm.templateId!,
      recipient: ruleForm.recipient ?? 'Customer',
      delay: ruleForm.delay ?? 0,
      active: ruleForm.active ?? true,
    };
    if (editingRule) {
      updated = rules.map((r) => (r.id === editingRule.id ? data : r));
    } else {
      updated = [...rules, data];
    }
    setRules(updated);
    saveJson(LS_RULES, updated);
    setRuleDialog(null);
    toast({ title: editingRule ? 'تم تحديث القاعدة' : 'تم إنشاء القاعدة' });
  };

  const confirmDeleteRule = () => {
    if (!toDelete) return;
    const updated = rules.filter((r) => r.id !== toDelete.id);
    setRules(updated);
    saveJson(LS_RULES, updated);
    setDeleteType(null);
    setToDelete(null);
    toast({ title: 'تم حذف القاعدة' });
  };

  // ─── KPIs ───
  const balance = 1000 - log.filter((l) => l.status === 'ناجح').length;
  const sentCount = log.filter((l) => l.status === 'ناجح').length;
  const failedCount = log.filter((l) => l.status === 'فاشل').length;
  const totalCost = log.reduce((s, l) => s + l.cost, 0);

  // ─── DataTable Columns ───
  const tplColumns: Column<SmsTemplate>[] = useMemo(
    () => [
      { key: 'name', header: 'اسم القالب', sortable: true },
      {
        key: 'doctype',
        header: 'نوع المستند',
        render: (v) => {
          const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v)}</span>;
        },
      },
      {
        key: 'content',
        header: 'محتوى الرسالة',
        render: (v) => (
          <span className="text-xs line-clamp-2 max-w-[300px]" title={String(v)}>
            {String(v)}
          </span>
        ),
      },
    ],
    []
  );

  const ruleColumns: Column<SmsRule>[] = useMemo(
    () => [
      { key: 'name', header: 'اسم القاعدة', sortable: true },
      {
        key: 'doctype',
        header: 'نوع المستند',
        render: (v) => {
          const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v)}</span>;
        },
      },
      {
        key: 'event',
        header: 'الحدث',
        render: (v) => {
          const opt = EVENT_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v)}</span>;
        },
      },
      {
        key: 'templateId',
        header: 'القالب',
        render: (v) => {
          const tpl = templates.find((t) => t.id === v);
          return <span className="text-xs">{tpl?.name ?? String(v)}</span>;
        },
      },
      {
        key: 'active',
        header: 'الحالة',
        render: (v) => (
          <StatusBadge status={v ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    [templates]
  );

  const logColumns: Column<SmsLogEntry>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
      },
      { key: 'recipient', header: 'المستلم' },
      { key: 'template', header: 'القالب' },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => (
          <StatusBadge status={v === 'ناجح' ? 'Sent' : 'Overdue'} />
        ),
      },
      {
        key: 'cost',
        header: 'التكلفة',
        render: (v) => <span className="text-xs">{formatCurrency(Number(v))}</span>,
      },
    ],
    []
  );

  if (!mounted) return null;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات الرسائل النصية"
        description="إدارة مزود خدمة الرسائل النصية والقوالب وقواعد الإرسال التلقائي"
        iconify="solar:chat-round-dots-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'الرسائل النصية' }]}
      />

      <Tabs defaultValue="provider" className="space-y-4">
        <TabsList>
          <TabsTrigger value="provider" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            مزود الخدمة
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            قوالب الرسائل
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" />
            قواعد الإرسال
          </TabsTrigger>
          <TabsTrigger value="balance" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            رصيد الرسائل
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Provider ─── */}
        <TabsContent value="provider">
          <Card className="border-border/40 bg-card">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-info" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">مزود الخدمة</h2>
                  <p className="text-xs text-muted-foreground">اختر مزود الرسائل النصية وأدخل بيانات الربط</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">مزود الخدمة *</Label>
                  <Select
                    value={config.provider}
                    onValueChange={(v) =>
                      setConfig((c) => ({ ...c, provider: v as SmsProvider }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">معرّف المرسل</Label>
                  <Input
                    className="h-9"
                    value={config.senderId}
                    onChange={(e) => setConfig((c) => ({ ...c, senderId: e.target.value }))}
                    placeholder="ERP-PRO"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">مفتاح API *</Label>
                  <Input
                    dir="ltr"
                    className="h-9 font-mono text-xs"
                    value={config.apiKey}
                    onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
                    placeholder="API Key"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">سرّ API</Label>
                  <Input
                    dir="ltr"
                    type="password"
                    className="h-9 font-mono text-xs"
                    value={config.apiSecret}
                    onChange={(e) => setConfig((c) => ({ ...c, apiSecret: e.target.value }))}
                    placeholder="API Secret"
                  />
                </div>
              </div>

              {config.provider === 'Custom' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">رابط API الأساسي</Label>
                  <Input
                    dir="ltr"
                    className="h-9 font-mono text-xs"
                    value={config.baseUrl}
                    onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                    placeholder="https://api.example.com/v1/sms"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={saveConfig}>
                  حفظ الإعدادات
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={testing}
                  onClick={testSms}
                >
                  <TestTube className="h-3.5 w-3.5" />
                  {testing ? 'جاري الإرسال…' : 'إرسال رسالة اختبار'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Templates ─── */}
        <TabsContent value="templates">
          <DataTable
            data={templates}
            columns={tplColumns}
            tableId="sms-templates"
            searchable
            addLabel="إنشاء قالب"
            onAdd={openCreateTemplate}
            onEdit={openEditTemplate}
            onDelete={(row) => {
              setToDelete({ id: row.id, name: row.name });
              setDeleteType('template');
            }}
          />

          {/* Variables help */}
          <Card className="mt-4 border-dashed border-border/50 bg-muted/20">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold mb-2">المتغيرات المتاحة</h3>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {['{{customer_name}}', '{{invoice_no}}', '{{amount}}', '{{date}}', '{{due_date}}', '{{company_name}}'].map(
                  (v) => (
                    <code
                      key={v}
                      className="rounded bg-background px-1.5 py-0.5 font-mono text-primary border border-border/40"
                    >
                      {v}
                    </code>
                  )
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                أدخل المتغيرات بين أقواس مزدوجة في محتوى الرسالة وسيتم استبدالها تلقائياً عند الإرسال.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Rules ─── */}
        <TabsContent value="rules">
          <DataTable
            data={rules}
            columns={ruleColumns}
            tableId="sms-rules"
            searchable
            addLabel="إنشاء قاعدة"
            onAdd={openCreateRule}
            onEdit={openEditRule}
            onDelete={(row) => {
              setToDelete({ id: row.id, name: row.name });
              setDeleteType('rule');
            }}
          />
        </TabsContent>

        {/* ─── Tab 4: Balance / Log ─── */}
        <TabsContent value="balance" className="space-y-5">
          <KpiStrip cols={4}>
            <KpiCard
              title="الرصيد المتبقي"
              value={balance}
              icon={Wallet}
              accent="info"
            />
            <KpiCard
              title="الرسائل المرسلة"
              value={sentCount}
              icon={Send}
              accent="success"
            />
            <KpiCard
              title="الرسائل الفاشلة"
              value={failedCount}
              icon={MessageSquare}
              accent="destructive"
            />
            <KpiCard
              title="التكلفة الإجمالية"
              value={formatCurrency(totalCost)}
              icon={Wallet}
              accent="warning"
            />
          </KpiStrip>

          <DataTable
            data={log}
            columns={logColumns}
            tableId="sms-log"
            searchable
            exportFileName="سجل-الرسائل-النصية"
          />
        </TabsContent>
      </Tabs>

      {/* ─── Template Dialog ─── */}
      <Dialog open={tplDialog !== null} onOpenChange={(o) => !o && setTplDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTpl ? 'تعديل القالب' : 'إنشاء قالب جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم القالب *</Label>
              <Input
                className="h-9"
                value={tplForm.name ?? ''}
                onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: إشعار فاتورة مبيعات"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">نوع المستند</Label>
              <Select
                value={tplForm.doctype ?? 'Sales Invoice'}
                onValueChange={(v) => setTplForm((f) => ({ ...f, doctype: v }))}
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
            <div className="space-y-1.5">
              <Label className="text-xs">محتوى الرسالة *</Label>
              <Textarea
                rows={5}
                value={tplForm.content ?? ''}
                onChange={(e) => setTplForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="مرحباً {{customer_name}}، فاتورتك رقم {{invoice_no}} بمبلغ {{amount}} مستحقة في {{due_date}}"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                استخدم المتغيرات: {'{{customer_name}}'}, {'{{invoice_no}}'}, {'{{amount}}'}, {'{{date}}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTplDialog(null)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveTemplate}>
              {editingTpl ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Rule Dialog ─── */}
      <Dialog open={ruleDialog !== null} onOpenChange={(o) => !o && setRuleDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'تعديل القاعدة' : 'إنشاء قاعدة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم القاعدة *</Label>
              <Input
                className="h-9"
                value={ruleForm.name ?? ''}
                onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: إرسال SMS عند تقديم فاتورة"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">نوع المستند *</Label>
                <Select
                  value={ruleForm.doctype ?? 'Sales Invoice'}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, doctype: v }))}
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
              <div className="space-y-1.5">
                <Label className="text-xs">الحدث *</Label>
                <Select
                  value={ruleForm.event ?? 'on_submit'}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, event: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">قالب الرسالة *</Label>
                <Select
                  value={ruleForm.templateId ?? ''}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, templateId: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="اختر القالب" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">المستلم *</Label>
                <Select
                  value={ruleForm.recipient ?? 'Customer'}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, recipient: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">التأخير (دقائق)</Label>
                <Input
                  className="h-9"
                  type="number"
                  dir="ltr"
                  min={0}
                  value={ruleForm.delay ?? 0}
                  onChange={(e) => setRuleForm((f) => ({ ...f, delay: Number(e.target.value) }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Checkbox
                  id="rule-active"
                  checked={ruleForm.active ?? true}
                  onCheckedChange={(v) => setRuleForm((f) => ({ ...f, active: v === true }))}
                />
                <Label htmlFor="rule-active" className="text-xs cursor-pointer">
                  نشط
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRuleDialog(null)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveRule}>
              {editingRule ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog
        open={deleteType !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteType(null);
            setToDelete(null);
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف «{toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={deleteType === 'template' ? confirmDeleteTemplate : confirmDeleteRule}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
