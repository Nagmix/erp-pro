'use client';

<<<<<<< HEAD
import { useCallback, useMemo, useState } from 'react';
=======
import { useCallback, useMemo, useSyncExternalStore, useState } from 'react';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
import { Skeleton } from '@/components/ui/skeleton';
=======
import { Checkbox } from '@/components/ui/checkbox';
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
  useDoc,
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
  useErpMethodCall,
} from '@/lib/client/hooks';
import {
=======
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
  MessageSquare,
  Send,
  FileText,
  ListChecks,
  Wallet,
  TestTube,
<<<<<<< HEAD
  Loader2,
  ExternalLink,
  Info,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

/* ─── ERPNext DocType Types ─── */

/** SMS Settings — Single DocType */
type SmsSettingsDoc = {
  name: string;
  gateway_url?: string;
  message_parameter?: string;
  sender_parameter?: string;
  receiver_parameter?: string;
  username?: string;
  password?: string;
  sender_id?: string;
};

/** SMS Message — Log entries */
type SmsMessageDoc = {
  name: string;
  sender_name?: string;
  receiver_list?: string;
  message?: string;
  creation?: string;
  sent_on?: string;
  status?: string;
};

/** Notification — used as SMS templates (channel = SMS) */
type NotificationDoc = {
  name: string;
  subject?: string;
  document_type?: string;
  event?: string;
  channel?: string;
  message?: string;
  enabled?: number;
};

/* ─── Provider Presets ─── */

type ProviderPresetKey = 'unifonic' | 'twilio' | 'vonage' | 'sms_misr' | 'custom';

const PROVIDER_PRESETS: Record<
  ProviderPresetKey,
  { label: string; gateway_url: string; message_parameter: string; sender_parameter: string; receiver_parameter: string }
> = {
  unifonic: {
    label: 'Unifonic',
    gateway_url: 'https://api.unifonic.com/v1/messages',
    message_parameter: 'Body',
    sender_parameter: 'SenderID',
    receiver_parameter: 'Recipient',
  },
  twilio: {
    label: 'Twilio',
    gateway_url: 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json',
    message_parameter: 'Body',
    sender_parameter: 'From',
    receiver_parameter: 'To',
  },
  vonage: {
    label: 'Vonage',
    gateway_url: 'https://rest.nexmo.com/sms/json',
    message_parameter: 'text',
    sender_parameter: 'from',
    receiver_parameter: 'to',
  },
  sms_misr: {
    label: 'SMS Misr',
    gateway_url: 'https://smsmisr.com/api/webapi/',
    message_parameter: 'message',
    sender_parameter: 'sender',
    receiver_parameter: 'mobile',
  },
  custom: {
    label: 'مخصص',
    gateway_url: '',
    message_parameter: 'message',
    sender_parameter: 'sender',
    receiver_parameter: 'receiver',
  },
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
};

const DOCTYPE_OPTIONS = [
  { value: 'Sales Invoice', label: 'فاتورة مبيعات' },
  { value: 'Purchase Invoice', label: 'فاتورة مشتريات' },
  { value: 'Payment Entry', label: 'سند دفع' },
  { value: 'Quotation', label: 'عرض سعر' },
<<<<<<< HEAD
  { value: 'Sales Order', label: 'أمر بيع' },
  { value: 'Purchase Order', label: 'أمر شراء' },
];

const EVENT_OPTIONS = [
  { value: 'New', label: 'عند الإنشاء' },
  { value: 'Save', label: 'عند الحفظ' },
  { value: 'Submit', label: 'عند التقديم' },
  { value: 'Cancel', label: 'عند الإلغاء' },
  { value: 'Value Change', label: 'تغيير قيمة' },
  { value: 'Days After', label: 'بعد أيام' },
  { value: 'Days Before', label: 'قبل أيام' },
];

/* ─── Helper ─── */
function detectProvider(doc: SmsSettingsDoc): ProviderPresetKey {
  const url = (doc.gateway_url || '').toLowerCase();
  if (url.includes('unifonic')) return 'unifonic';
  if (url.includes('twilio')) return 'twilio';
  if (url.includes('nexmo') || url.includes('vonage')) return 'vonage';
  if (url.includes('smsmisr')) return 'sms_misr';
  return 'custom';
}

/* ═══════════════════════════════════════════════════════════════
   SMS Gateway Settings Page
   ═══════════════════════════════════════════════════════════════ */

export default function SmsGatewayPage() {
  const { toast } = useToast();

  /* ─── Data Queries ─── */

  // Provider config — SMS Settings single doctype
  const settingsQuery = useDoc<SmsSettingsDoc>('SMS Settings', 'SMS Settings');
  const updateSettingsMut = useUpdateDoc<SmsSettingsDoc>('SMS Settings');

  // SMS Templates — Notification doctype filtered by channel=SMS
  const templatesQuery = useDocList<NotificationDoc>('Notification', {
    fields: ['name', 'subject', 'document_type', 'event', 'channel', 'message', 'enabled'],
    filters: [['channel', '=', 'SMS']],
    limit: 200,
    order_by: 'modified desc',
  });
  const createNotifMut = useCreateDoc('Notification');
  const updateNotifMut = useUpdateDoc('Notification');
  const deleteNotifMut = useDeleteDoc('Notification');

  // SMS Log — SMS Message doctype
  const logQuery = useDocList<SmsMessageDoc>('SMS Message', {
    fields: ['name', 'sender_name', 'receiver_list', 'message', 'creation', 'sent_on', 'status'],
    limit: 200,
    order_by: 'creation desc',
  });

  // Send SMS method
  const sendSmsMut = useErpMethodCall<{ message: string }>(['SMS Message']);

  /* ─── Provider Form State ─── */

  // Track only user modifications (dirty fields) on top of server data
  const [formDraft, setFormDraft] = useState<Record<string, string>>({});
  const [presetManuallySet, setPresetManuallySet] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ProviderPresetKey>('custom');
  const [testPhone, setTestPhone] = useState('');

  // Compute displayed form values: server data + local overrides
  const providerForm: SmsSettingsDoc = useMemo(() => {
    const server = settingsQuery.data || {};
    return {
      name: 'SMS Settings',
      gateway_url: '',
      message_parameter: 'message',
      sender_parameter: 'sender',
      receiver_parameter: 'receiver',
      username: '',
      password: '',
      sender_id: '',
      ...server,
      ...(Object.fromEntries(Object.entries(formDraft)) as Partial<SmsSettingsDoc>),
    };
  }, [settingsQuery.data, formDraft]);

  // Derive preset from server data (computed, not effect-driven)
  const detectedPreset = useMemo(
    () => (settingsQuery.data ? detectProvider(settingsQuery.data) : 'custom'),
    [settingsQuery.data]
  );
  // Use the detected preset unless user has manually changed it
  const activePreset = presetManuallySet ? selectedPreset : detectedPreset;

  const updateFormField = useCallback((field: string, value: string) => {
    setFormDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Auto-fill preset fields
  const applyPreset = useCallback(
    (key: ProviderPresetKey) => {
      setSelectedPreset(key);
      setPresetManuallySet(true);
      const preset = PROVIDER_PRESETS[key];
      if (key !== 'custom') {
        setFormDraft((prev) => ({
          ...prev,
          gateway_url: preset.gateway_url,
          message_parameter: preset.message_parameter,
          sender_parameter: preset.sender_parameter,
          receiver_parameter: preset.receiver_parameter,
        }));
      }
    },
    []
  );

  /* ─── Template Dialog State ─── */

  const [tplDialog, setTplDialog] = useState<'create' | 'edit' | null>(null);
  const [tplForm, setTplForm] = useState<Partial<NotificationDoc>>({});
  const [editingTpl, setEditingTpl] = useState<NotificationDoc | null>(null);

  /* ─── Delete Confirm State ─── */

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<NotificationDoc | null>(null);

  /* ─── Actions ─── */

  // Save provider config
  const saveConfig = useCallback(() => {
    updateSettingsMut.mutate(
      { name: 'SMS Settings', doc: providerForm },
      {
        onSuccess: () => {
          toast({ title: 'تم حفظ إعدادات المزود' });
          settingsQuery.refetch();
        },
        onError: (err: Error) => {
          toast({ title: err.message || 'فشل حفظ الإعدادات', variant: 'destructive' });
        },
      }
    );
  }, [updateSettingsMut, providerForm, toast, settingsQuery]);

  // Test SMS
  const testSms = useCallback(() => {
    if (!testPhone.trim()) {
      toast({ title: 'أدخل رقم الهاتف للاختبار', variant: 'destructive' });
      return;
    }
    sendSmsMut.mutate(
      {
        method: 'frappe.core.doctype.sms_settings.sms_settings.send_sms',
        args: {
          receiver_list: [testPhone.trim()],
          msg: 'رسالة اختبار من ERP Pro',
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'تم إرسال رسالة الاختبار' });
          logQuery.refetch();
        },
        onError: (err: Error) => {
          toast({ title: err.message || 'فشل إرسال رسالة الاختبار', variant: 'destructive' });
        },
      }
    );
  }, [testPhone, sendSmsMut, toast, logQuery]);

  // ─── Template Actions ───

  const openCreateTemplate = useCallback(() => {
    setTplForm({
      subject: '',
      document_type: 'Sales Invoice',
      event: 'Submit',
      message: '',
      enabled: 1,
    });
    setEditingTpl(null);
    setTplDialog('create');
  }, []);

  const openEditTemplate = useCallback((row: NotificationDoc) => {
    setTplForm({ ...row });
    setEditingTpl(row);
    setTplDialog('edit');
  }, []);

  const saveTemplate = useCallback(() => {
    if (!tplForm.subject?.trim() || !tplForm.message?.trim()) {
      toast({ title: 'أدخل عنوان القالب ومحتوى الرسالة', variant: 'destructive' });
      return;
    }

    const doc: Record<string, unknown> = {
      doctype: 'Notification',
      channel: 'SMS',
      subject: tplForm.subject.trim(),
      document_type: tplForm.document_type || 'Sales Invoice',
      event: tplForm.event || 'Submit',
      message: tplForm.message.trim(),
      enabled: tplForm.enabled ?? 1,
      send_to_all_assignees: 1,
    };

    if (editingTpl) {
      updateNotifMut.mutate(
        { name: editingTpl.name, doc },
        {
          onSuccess: () => {
            toast({ title: 'تم تحديث القالب' });
            setTplDialog(null);
          },
          onError: (err: Error) => {
            toast({ title: err.message || 'فشل تحديث القالب', variant: 'destructive' });
          },
        }
      );
    } else {
      const nm = tplForm.subject!.trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      doc.name = nm || `sms-tpl-${Date.now()}`;
      createNotifMut.mutate(doc, {
        onSuccess: () => {
          toast({ title: 'تم إنشاء القالب' });
          setTplDialog(null);
        },
        onError: (err: Error) => {
          toast({ title: err.message || 'فشل إنشاء القالب', variant: 'destructive' });
        },
      });
    }
  }, [tplForm, editingTpl, createNotifMut, updateNotifMut, toast]);

  const confirmDeleteTemplate = useCallback(() => {
    if (!toDelete) return;
    deleteNotifMut.mutate(toDelete.name, {
      onSuccess: () => {
        toast({ title: 'تم حذف القالب' });
        setDeleteOpen(false);
        setToDelete(null);
      },
      onError: (err: Error) => {
        toast({ title: err.message || 'فشل حذف القالب', variant: 'destructive' });
      },
    });
  }, [toDelete, deleteNotifMut, toast]);

  /* ─── KPIs from SMS Log ─── */

  const logRows = logQuery.data || [];
  const sentCount = logRows.filter((l) => l.status === 'Sent').length;
  const failedCount = logRows.filter((l) => l.status === 'Error' || l.status === 'Failed').length;
  const queuedCount = logRows.filter((l) => l.status === 'Queued').length;
  const totalCost = logRows.length * 0.05; // estimated

  /* ─── DataTable Columns ─── */

  const tplColumns: Column<NotificationDoc>[] = useMemo(
    () => [
      { key: 'name', header: 'المعرّف', sortable: true },
      {
        key: 'subject',
        header: 'العنوان',
        sortable: true,
        render: (v) => <span className="text-xs font-medium">{String(v || '—')}</span>,
      },
      {
        key: 'document_type',
        header: 'نوع المستند',
        render: (v) => {
          const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v || '—')}</span>;
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        },
      },
      {
        key: 'event',
        header: 'الحدث',
        render: (v) => {
          const opt = EVENT_OPTIONS.find((o) => o.value === v);
<<<<<<< HEAD
          return <span className="text-xs">{opt?.label ?? String(v || '—')}</span>;
        },
      },
      {
        key: 'enabled',
        header: 'الحالة',
        render: (v) => (
          <StatusBadge status={Number(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    []
  );

  const logColumns: Column<SmsMessageDoc>[] = useMemo(
    () => [
      {
        key: 'creation',
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        header: 'التاريخ',
        sortable: true,
        render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
      },
<<<<<<< HEAD
      {
        key: 'receiver_list',
        header: 'المستلم',
        render: (v) => <span className="text-xs font-mono" dir="ltr">{String(v || '—')}</span>,
      },
      {
        key: 'message',
        header: 'الرسالة',
        render: (v) => (
          <span className="text-xs line-clamp-2 max-w-[300px]" title={String(v)}>
            {String(v || '—')}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => {
          const statusMap: Record<string, string> = {
            Sent: 'Sent',
            Queued: 'Open',
            Error: 'Overdue',
            Failed: 'Overdue',
          };
          return <StatusBadge status={statusMap[String(v)] || 'Open'} />;
        },
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
      },
    ],
    []
  );

<<<<<<< HEAD
  /* ─── Render ─── */
=======
  if (!mounted) return null;
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات الرسائل النصية"
<<<<<<< HEAD
        description="إدارة مزود خدمة الرسائل النصية والقوالب وسجل الإرسال عبر ERPNext"
=======
        description="إدارة مزود خدمة الرسائل النصية والقوالب وقواعد الإرسال التلقائي"
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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

<<<<<<< HEAD
        {/* ─── Tab 1: Provider Config ─── */}
=======
        {/* ─── Tab 1: Provider ─── */}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        <TabsContent value="provider">
          <Card className="border-border/40 bg-card">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-info" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">مزود الخدمة</h2>
<<<<<<< HEAD
                  <p className="text-xs text-muted-foreground">
                    إعدادات بوابة SMS في ERPNext (SMS Settings)
                  </p>
                </div>
              </div>

              {settingsQuery.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : settingsQuery.isError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive font-medium">فشل تحميل الإعدادات</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(settingsQuery.error as Error)?.message || 'تعذر الاتصال بالخادم'}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 text-xs"
                    onClick={() => settingsQuery.refetch()}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : (
                <>
                  {/* Provider Preset */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">مزود الخدمة</Label>
                      <Select
                        value={activePreset}
                        onValueChange={(v) => applyPreset(v as ProviderPresetKey)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
                            <SelectItem key={key} value={key}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">معرّف المرسل</Label>
                      <Input
                        className="h-9"
                        value={providerForm.sender_id || ''}
                        onChange={(e) =>
                          updateFormField('sender_id', e.target.value)
                        }
                        placeholder="ERP-PRO"
                      />
                    </div>
                  </div>

                  {/* Gateway URL */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">رابط البوابة (Gateway URL) *</Label>
                    <Input
                      dir="ltr"
                      className="h-9 font-mono text-xs"
                      value={providerForm.gateway_url || ''}
                      onChange={(e) =>
                        updateFormField('gateway_url', e.target.value)
                      }
                      placeholder="https://api.example.com/v1/sms"
                    />
                  </div>

                  {/* API Parameters */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">معامل الرسالة</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={providerForm.message_parameter || ''}
                        onChange={(e) =>
                          updateFormField('message_parameter', e.target.value)
                        }
                        placeholder="message"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">معامل المرسل</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={providerForm.sender_parameter || ''}
                        onChange={(e) =>
                          updateFormField('sender_parameter', e.target.value)
                        }
                        placeholder="sender"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">معامل المستلم</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={providerForm.receiver_parameter || ''}
                        onChange={(e) =>
                          updateFormField('receiver_parameter', e.target.value)
                        }
                        placeholder="receiver"
                      />
                    </div>
                  </div>

                  {/* Auth */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">اسم المستخدم</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={providerForm.username || ''}
                        onChange={(e) =>
                          updateFormField('username', e.target.value)
                        }
                        placeholder="username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">كلمة المرور</Label>
                      <Input
                        dir="ltr"
                        type="password"
                        className="h-9 font-mono text-xs"
                        value={providerForm.password || ''}
                        onChange={(e) =>
                          updateFormField('password', e.target.value)
                        }
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={saveConfig}
                      disabled={updateSettingsMut.isPending}
                    >
                      {updateSettingsMut.isPending && (
                        <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" />
                      )}
                      حفظ الإعدادات
                    </Button>
                  </div>

                  {/* Test SMS */}
                  <div className="border-t border-border/40 pt-4 space-y-2">
                    <Label className="text-xs font-semibold">اختبار إرسال SMS</Label>
                    <div className="flex flex-wrap gap-2 items-end">
                      <Input
                        dir="ltr"
                        className="max-w-xs h-9 text-sm font-mono"
                        placeholder="966500000000"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={sendSmsMut.isPending}
                        onClick={testSms}
                      >
                        {sendSmsMut.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <TestTube className="h-3.5 w-3.5" />
                        )}
                        {sendSmsMut.isPending ? 'جاري الإرسال…' : 'إرسال رسالة اختبار'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Templates ─── */}
        <TabsContent value="templates">
          <DataTable
<<<<<<< HEAD
            data={templatesQuery.data || []}
            columns={tplColumns}
            tableId="sms-templates"
            searchable
            loading={templatesQuery.isLoading}
            error={templatesQuery.isError ? (templatesQuery.error as Error) : null}
            onRetry={() => templatesQuery.refetch()}
=======
            data={templates}
            columns={tplColumns}
            tableId="sms-templates"
            searchable
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            addLabel="إنشاء قالب"
            onAdd={openCreateTemplate}
            onEdit={openEditTemplate}
            onDelete={(row) => {
<<<<<<< HEAD
              setToDelete(row);
              setDeleteOpen(true);
=======
              setToDelete({ id: row.id, name: row.name });
              setDeleteType('template');
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            }}
          />

          {/* Variables help */}
          <Card className="mt-4 border-dashed border-border/50 bg-muted/20">
            <CardContent className="p-4">
<<<<<<< HEAD
              <h3 className="text-xs font-semibold mb-2">المتغيرات المتاحة (Jinja)</h3>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {['{{ doc.name }}', '{{ doc.customer }}', '{{ doc.grand_total }}', '{{ doc.posting_date }}', '{{ doc.due_date }}', '{{ doc.company }}'].map(
=======
              <h3 className="text-xs font-semibold mb-2">المتغيرات المتاحة</h3>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {['{{customer_name}}', '{{invoice_no}}', '{{amount}}', '{{date}}', '{{due_date}}', '{{company_name}}'].map(
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
                يتم استخدام صيغة Jinja في قوالب ERPNext. استبدل المتغيرات بحقول المستند الفعلي.
=======
                أدخل المتغيرات بين أقواس مزدوجة في محتوى الرسالة وسيتم استبدالها تلقائياً عند الإرسال.
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Rules ─── */}
        <TabsContent value="rules">
<<<<<<< HEAD
          <Card className="border-border/40 bg-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="h-4 w-4 text-info" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">قواعد الإرسال الآلي</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    في ERPNext، تُدار قواعد إرسال SMS الآلية من خلال نظام الإشعارات (Notification).
                    كل إشعار يربط الحدث (مثل تقديم فاتورة) برسالة SMS تلقائية.
                    يمكنك إنشاء وتعديل هذه القواعد من صفحة قواعد الإرسال.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
                <h3 className="text-xs font-semibold">قوالب SMS النشطة كقواعد إرسال</h3>
                {templatesQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (templatesQuery.data || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد قوالب SMS نشطة حالياً</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(templatesQuery.data || []).map((tpl) => (
                      <div
                        key={tpl.name}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{tpl.subject || tpl.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {DOCTYPE_OPTIONS.find((o) => o.value === tpl.document_type)?.label || tpl.document_type || '—'}
                            {' · '}
                            {EVENT_OPTIONS.find((o) => o.value === tpl.event)?.label || tpl.event || '—'}
                          </p>
                        </div>
                        <StatusBadge
                          status={Number(tpl.enabled) === 1 ? 'Active' : 'Inactive'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                  <Link href="/settings/notification-rules">
                    <ExternalLink className="h-3.5 w-3.5" />
                    فتح صفحة قواعد الإرسال
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={openCreateTemplate}
                >
                  <FileText className="h-3.5 w-3.5" />
                  إنشاء قالب SMS جديد
                </Button>
              </div>
            </CardContent>
          </Card>
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
        </TabsContent>

        {/* ─── Tab 4: Balance / Log ─── */}
        <TabsContent value="balance" className="space-y-5">
          <KpiStrip cols={4}>
            <KpiCard
<<<<<<< HEAD
=======
              title="الرصيد المتبقي"
              value={balance}
              icon={Wallet}
              accent="info"
            />
            <KpiCard
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
              title="في قائمة الانتظار"
              value={queuedCount}
              icon={Wallet}
              accent="warning"
            />
            <KpiCard
              title="التكلفة التقديرية"
              value={formatCurrency(totalCost)}
              icon={Wallet}
              accent="info"
=======
              title="التكلفة الإجمالية"
              value={formatCurrency(totalCost)}
              icon={Wallet}
              accent="warning"
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            />
          </KpiStrip>

          <DataTable
<<<<<<< HEAD
            data={logRows}
            columns={logColumns}
            tableId="sms-log"
            searchable
            loading={logQuery.isLoading}
            error={logQuery.isError ? (logQuery.error as Error) : null}
            onRetry={() => logQuery.refetch()}
=======
            data={log}
            columns={logColumns}
            tableId="sms-log"
            searchable
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            exportFileName="سجل-الرسائل-النصية"
          />
        </TabsContent>
      </Tabs>

      {/* ─── Template Dialog ─── */}
      <Dialog open={tplDialog !== null} onOpenChange={(o) => !o && setTplDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
<<<<<<< HEAD
            <DialogTitle>{editingTpl ? 'تعديل القالب' : 'إنشاء قالب SMS جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">عنوان القالب *</Label>
              <Input
                className="h-9"
                value={tplForm.subject ?? ''}
                onChange={(e) => setTplForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="مثال: إشعار فاتورة مبيعات"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">نوع المستند</Label>
                <Select
                  value={tplForm.document_type ?? 'Sales Invoice'}
                  onValueChange={(v) => setTplForm((f) => ({ ...f, document_type: v }))}
=======
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
              <div className="space-y-1.5">
<<<<<<< HEAD
                <Label className="text-xs">الحدث</Label>
                <Select
                  value={tplForm.event ?? 'Submit'}
                  onValueChange={(v) => setTplForm((f) => ({ ...f, event: v }))}
=======
                <Label className="text-xs">الحدث *</Label>
                <Select
                  value={ruleForm.event ?? 'on_submit'}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, event: v }))}
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
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
<<<<<<< HEAD
            <div className="space-y-1.5">
              <Label className="text-xs">محتوى الرسالة * (Jinja)</Label>
              <Textarea
                rows={5}
                value={tplForm.message ?? ''}
                onChange={(e) => setTplForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="مرحباً {{ doc.customer }}، فاتورتك رقم {{ doc.name }} بمبلغ {{ doc.grand_total }}"
                className="font-mono text-xs"
                dir="ltr"
              />
              <p className="text-[10px] text-muted-foreground">
                استخدم صيغة Jinja: {'{{ doc.name }}'}, {'{{ doc.customer }}'}, {'{{ doc.grand_total }}'}, {'{{ doc.posting_date }}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTplDialog(null)}>
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={saveTemplate}
              disabled={createNotifMut.isPending || updateNotifMut.isPending}
            >
              {(createNotifMut.isPending || updateNotifMut.isPending) && (
                <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" />
              )}
              {editingTpl ? 'تحديث' : 'إنشاء'}
=======
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
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog
<<<<<<< HEAD
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteOpen(false);
=======
        open={deleteType !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteType(null);
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            setToDelete(null);
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
<<<<<<< HEAD
              هل أنت متأكد من حذف «{toDelete?.subject || toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
=======
              هل أنت متأكد من حذف «{toDelete?.name}»؟ لا يمكن التراجع عن هذا الإجراء.
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
<<<<<<< HEAD
              onClick={confirmDeleteTemplate}
              disabled={deleteNotifMut.isPending}
            >
              {deleteNotifMut.isPending ? 'جاري الحذف…' : 'حذف'}
=======
              onClick={deleteType === 'template' ? confirmDeleteTemplate : confirmDeleteRule}
            >
              حذف
>>>>>>> b42e1aa (feat: الفجوات المتبقية - 9 صفحات جديدة)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
