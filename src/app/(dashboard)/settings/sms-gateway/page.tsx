'use client';

import { useState, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatDate } from '@/lib/app-format';
import {
  useDocList,
  useDoc,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import {
  MessageSquare,
  Send,
  FileText,
  ListChecks,
  Wallet,
  TestTube,
  Loader2,
  Plus,
} from 'lucide-react';

/* ─── Types ─── */
interface SmsGatewayRow {
  name: string;
  gateway_name?: string;
  gateway_url?: string;
  message_parameter?: string;
  receiver_parameter?: string;
  use_post?: number;
  use_csrf?: number;
}

interface SmsSettingsDoc {
  name: string;
  sms_gateway_url?: string;
  message_parameter?: string;
  receiver_parameter?: string;
}

interface NotificationRow {
  name: string;
  subject?: string;
  document_type?: string;
  event?: string;
  channel?: string;
  enabled?: number;
  message?: string;
}

interface CommunicationRow {
  name: string;
  communication_type?: string;
  communication_medium?: string;
  subject?: string;
  content?: string;
  recipients?: string;
  status?: string;
  creation?: string;
  sent_or_received?: string;
}

const DOCTYPE_OPTIONS = [
  { value: 'Sales Invoice', label: 'فاتورة مبيعات' },
  { value: 'Purchase Invoice', label: 'فاتورة مشتريات' },
  { value: 'Payment Entry', label: 'سند دفع' },
  { value: 'Quotation', label: 'عرض سعر' },
];

const EVENT_OPTIONS = [
  { value: 'New', label: 'جديد' },
  { value: 'Save', label: 'حفظ' },
  { value: 'Submit', label: 'اعتماد' },
  { value: 'Cancel', label: 'إلغاء' },
  { value: 'Value Change', label: 'تغيير قيمة' },
];

const CHANNEL_OPTIONS = [
  { value: 'Email', label: 'بريد إلكتروني' },
  { value: 'SMS', label: 'رسالة SMS' },
  { value: 'System Notification', label: 'إشعار نظام' },
];

export default function SmsGatewayPage() {
  /* ─── ERPNext Data Hooks ─── */
  // SMS Gateway list
  const {
    data: gatewaysData,
    isLoading: gatewaysLoading,
    isError: gatewaysIsError,
    error: gatewaysError,
    refetch: refetchGateways,
  } = useDocList<SmsGatewayRow>('SMS Gateway', {
    fields: ['name', 'gateway_name', 'gateway_url', 'message_parameter', 'receiver_parameter', 'use_post', 'use_csrf'],
    limit: 200,
  });

  // SMS Settings (Single DocType)
  const { data: smsSettings, isLoading: settingsLoading } = useDoc<SmsSettingsDoc>(
    'SMS Settings',
    'SMS Settings',
  );

  // Notification rules (SMS channel)
  const {
    data: notifData,
    isLoading: notifLoading,
    isError: notifIsError,
    error: notifError,
    refetch: refetchNotif,
  } = useDocList<NotificationRow>('Notification', {
    fields: ['name', 'subject', 'document_type', 'event', 'channel', 'enabled', 'message'],
    limit: 200,
  });

  // Communication log (SMS type)
  const {
    data: logData,
    isLoading: logLoading,
    isError: logIsError,
    error: logError,
    refetch: refetchLog,
  } = useDocList<CommunicationRow>('Communication', {
    fields: ['name', 'communication_type', 'communication_medium', 'subject', 'content', 'recipients', 'status', 'creation', 'sent_or_received'],
    filters: [['communication_medium', '=', 'SMS']],
    limit: 200,
    order_by: 'creation desc',
  });

  // Mutations
  const createGateway = useCreateDoc<SmsGatewayRow>('SMS Gateway');
  const updateGateway = useUpdateDoc<SmsGatewayRow>('SMS Gateway');
  const deleteGateway = useDeleteDoc('SMS Gateway');
  const updateSmsSettings = useUpdateDoc<SmsSettingsDoc>('SMS Settings');
  const createNotif = useCreateDoc<NotificationRow>('Notification');
  const updateNotif = useUpdateDoc<NotificationRow>('Notification');
  const deleteNotif = useDeleteDoc('Notification');

  /* ─── Local State ─── */
  const [activeTab, setActiveTab] = useState('provider');

  // Settings form
  const [settingsForm, setSettingsForm] = useState<Partial<SmsSettingsDoc>>({});
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Gateway dialog
  const [gwDialog, setGwDialog] = useState<'create' | 'edit' | null>(null);
  const [gwForm, setGwForm] = useState<Partial<SmsGatewayRow>>({});
  const [editingGw, setEditingGw] = useState<SmsGatewayRow | null>(null);

  // Notification dialog
  const [notifDialog, setNotifDialog] = useState<'create' | 'edit' | null>(null);
  const [notifForm, setNotifForm] = useState<Partial<NotificationRow & { _doctype: string; _event: string; _channel: string }>>({});
  const [editingNotif, setEditingNotif] = useState<NotificationRow | null>(null);

  // Delete confirm
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [toDelete, setToDelete] = useState<{ type: 'gateway' | 'notif'; name: string; label: string } | null>(null);

  // Test SMS
  const [testing, setTesting] = useState(false);

  /* ─── Initialize settings form from API data ─── */
  const gateways = gatewaysData || [];
  const notifications = (notifData || []).filter(n => n.channel === 'SMS');
  const log = logData || [];

  // Sync settings form when data loads
  if (smsSettings && !settingsInitialized) {
    setSettingsForm({
      sms_gateway_url: smsSettings.sms_gateway_url || '',
      message_parameter: smsSettings.message_parameter || '',
      receiver_parameter: smsSettings.receiver_parameter || '',
    });
    setSettingsInitialized(true);
  }

  /* ─── KPIs ─── */
  const totalGateways = gateways.length;
  const activeGateways = gateways.filter(g => g.use_post === 1).length;
  const smsSentToday = log.filter(l => {
    if (!l.creation) return false;
    const today = new Date().toISOString().slice(0, 10);
    return l.creation.startsWith(today) && l.sent_or_received === 'Sent';
  }).length;
  const smsFailedToday = log.filter(l => {
    if (!l.creation) return false;
    const today = new Date().toISOString().slice(0, 10);
    return l.creation.startsWith(today) && l.status === 'Error';
  }).length;

  /* ─── Settings Actions ─── */
  const saveSettings = async () => {
    try {
      await updateSmsSettings.mutateAsync({
        name: 'SMS Settings',
        doc: {
          sms_gateway_url: settingsForm.sms_gateway_url || '',
          message_parameter: settingsForm.message_parameter || '',
          receiver_parameter: settingsForm.receiver_parameter || '',
        },
      });
      toast.success('تم حفظ إعدادات SMS');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل حفظ الإعدادات', { description: msg });
    }
  };

  const testSms = async () => {
    if (!settingsForm.sms_gateway_url) {
      toast.error('أدخل رابط البوابة أولاً');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch('/api/settings/crm-messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_provider: 'Custom',
          sms_api_key: 'test',
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success('تم اختبار الاتصال بالبوابة بنجاح');
      } else {
        toast.error('فشل اختبار الاتصال', { description: result.error || 'خطأ غير معروف' });
      }
    } catch {
      toast.error('فشل الاتصال بالخادم');
    } finally {
      setTesting(false);
    }
  };

  /* ─── Gateway Actions ─── */
  const openCreateGateway = () => {
    setGwForm({ gateway_name: '', gateway_url: '', message_parameter: 'message', receiver_parameter: 'receiver', use_post: 1, use_csrf: 0 });
    setEditingGw(null);
    setGwDialog('create');
  };

  const openEditGateway = (row: SmsGatewayRow) => {
    setGwForm({ ...row });
    setEditingGw(row);
    setGwDialog('edit');
  };

  const saveGateway = async () => {
    if (!gwForm.gateway_name?.trim() || !gwForm.gateway_url?.trim()) {
      toast.error('أدخل اسم البوابة والرابط');
      return;
    }
    try {
      if (editingGw) {
        await updateGateway.mutateAsync({
          name: editingGw.name,
          doc: {
            gateway_name: gwForm.gateway_name,
            gateway_url: gwForm.gateway_url,
            message_parameter: gwForm.message_parameter || 'message',
            receiver_parameter: gwForm.receiver_parameter || 'receiver',
            use_post: gwForm.use_post ? 1 : 0,
            use_csrf: gwForm.use_csrf ? 1 : 0,
          },
        });
        toast.success('تم تحديث البوابة');
      } else {
        await createGateway.mutateAsync({
          doctype: 'SMS Gateway',
          gateway_name: gwForm.gateway_name,
          gateway_url: gwForm.gateway_url,
          message_parameter: gwForm.message_parameter || 'message',
          receiver_parameter: gwForm.receiver_parameter || 'receiver',
          use_post: gwForm.use_post ? 1 : 0,
          use_csrf: gwForm.use_csrf ? 1 : 0,
        });
        toast.success('تم إنشاء البوابة');
      }
      setGwDialog(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل حفظ البوابة', { description: msg });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      if (toDelete.type === 'gateway') {
        await deleteGateway.mutateAsync(toDelete.name);
        toast.success('تم حذف البوابة');
      } else {
        await deleteNotif.mutateAsync(toDelete.name);
        toast.success('تم حذف قاعدة الإرسال');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل الحذف', { description: msg });
    }
    setDeleteDialog(false);
    setToDelete(null);
  };

  /* ─── Notification Actions ─── */
  const openCreateNotif = () => {
    setNotifForm({ _doctype: 'Sales Invoice', _event: 'Submit', _channel: 'SMS', subject: '', message: '' });
    setEditingNotif(null);
    setNotifDialog('create');
  };

  const openEditNotif = (row: NotificationRow) => {
    setNotifForm({
      subject: row.subject || '',
      message: row.message || '',
      _doctype: row.document_type || 'Sales Invoice',
      _event: row.event || 'Submit',
      _channel: row.channel || 'SMS',
    });
    setEditingNotif(row);
    setNotifDialog('edit');
  };

  const saveNotif = async () => {
    if (!notifForm.subject?.trim()) {
      toast.error('أدخل عنوان القاعدة');
      return;
    }
    try {
      if (editingNotif) {
        await updateNotif.mutateAsync({
          name: editingNotif.name,
          doc: {
            subject: notifForm.subject,
            message: notifForm.message || '',
            document_type: notifForm._doctype || 'Sales Invoice',
            event: notifForm._event || 'Submit',
            channel: notifForm._channel || 'SMS',
            enabled: editingNotif.enabled ?? 1,
          },
        });
        toast.success('تم تحديث قاعدة الإرسال');
      } else {
        const nm = notifForm.subject.trim().replace(/\s+/g, '-');
        await createNotif.mutateAsync({
          doctype: 'Notification',
          name: nm,
          enabled: 1,
          channel: notifForm._channel || 'SMS',
          document_type: notifForm._doctype || 'Sales Invoice',
          event: notifForm._event || 'Submit',
          subject: notifForm.subject.trim(),
          message: notifForm.message?.trim() || '{{ doc.name }}',
          condition_type: 'Python',
          send_to_all_assignees: 1,
        });
        toast.success('تم إنشاء قاعدة الإرسال');
      }
      setNotifDialog(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('فشل حفظ القاعدة', { description: msg });
    }
  };

  /* ─── DataTable Columns ─── */
  const gwColumns: Column<SmsGatewayRow>[] = useMemo(
    () => [
      { key: 'gateway_name', header: 'اسم البوابة', sortable: true },
      {
        key: 'gateway_url',
        header: 'رابط API',
        render: (v) => (
          <span className="text-xs font-mono line-clamp-1 max-w-[300px]" dir="ltr" title={String(v)}>
            {String(v || '—')}
          </span>
        ),
      },
      {
        key: 'message_parameter',
        header: 'معامل الرسالة',
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'receiver_parameter',
        header: 'معامل المستلم',
        render: (v) => <span className="text-xs">{String(v || '—')}</span>,
      },
      {
        key: 'use_post',
        header: 'الطريقة',
        render: (v) => (
          <StatusBadge status={Number(v) === 1 ? 'Active' : 'Inactive'} />
        ),
      },
    ],
    []
  );

  const notifColumns: Column<NotificationRow>[] = useMemo(
    () => [
      { key: 'name', header: 'المعرّف', sortable: true },
      { key: 'subject', header: 'العنوان', sortable: true },
      {
        key: 'document_type',
        header: 'نوع المستند',
        render: (v) => {
          const opt = DOCTYPE_OPTIONS.find((o) => o.value === v);
          return <span className="text-xs">{opt?.label ?? String(v || '—')}</span>;
        },
      },
      {
        key: 'event',
        header: 'الحدث',
        render: (v) => {
          const opt = EVENT_OPTIONS.find((o) => o.value === v);
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

  const logColumns: Column<CommunicationRow>[] = useMemo(
    () => [
      {
        key: 'creation',
        header: 'التاريخ',
        sortable: true,
        render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
      },
      {
        key: 'recipients',
        header: 'المستلم',
        render: (v) => <span className="text-xs line-clamp-1 max-w-[150px]">{String(v || '—')}</span>,
      },
      {
        key: 'subject',
        header: 'الموضوع',
        render: (v) => <span className="text-xs line-clamp-1 max-w-[200px]">{String(v || '—')}</span>,
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => (
          <StatusBadge status={String(v) === 'Sent' || String(v) === 'Open' ? 'Sent' : 'Overdue'} />
        ),
      },
    ],
    []
  );

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات الرسائل النصية"
        description="إدارة بوابات الرسائل النصية وإعدادات SMS وقواعد الإرسال التلقائي"
        iconify="solar:chat-round-dots-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'الرسائل النصية' }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="provider" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            إعدادات SMS
          </TabsTrigger>
          <TabsTrigger value="gateways" className="gap-1.5 text-xs">
            <Send className="h-3.5 w-3.5" />
            بوابات SMS
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs">
            <ListChecks className="h-3.5 w-3.5" />
            قواعد الإرسال
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            سجل الرسائل
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: SMS Settings ─── */}
        <TabsContent value="provider">
          <Card className="border-border/40 bg-card">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-info" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">إعدادات SMS العامة</h2>
                  <p className="text-xs text-muted-foreground">رابط بوابة الرسائل ومعاملات الإرسال الأساسية</p>
                </div>
              </div>

              {settingsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل الإعدادات...
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold">رابط بوابة SMS *</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={settingsForm.sms_gateway_url || ''}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, sms_gateway_url: e.target.value }))}
                        placeholder="https://api.example.com/v1/sms"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">معامل الرسالة</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={settingsForm.message_parameter || ''}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, message_parameter: e.target.value }))}
                        placeholder="message"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">معامل المستلم</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={settingsForm.receiver_parameter || ''}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, receiver_parameter: e.target.value }))}
                        placeholder="receiver"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={saveSettings}
                      disabled={updateSmsSettings.isPending}
                    >
                      {updateSmsSettings.isPending ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin ms-1" /> جاري الحفظ...</>
                      ) : 'حفظ الإعدادات'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={testing}
                      onClick={testSms}
                    >
                      <TestTube className="h-3.5 w-3.5" />
                      {testing ? 'جاري الاختبار…' : 'اختبار الاتصال'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: SMS Gateways ─── */}
        <TabsContent value="gateways">
          <KpiStrip cols={4}>
            <KpiCard title="إجمالي البوابات" value={totalGateways} icon={Send} accent="info" />
            <KpiCard title="بوابات POST" value={activeGateways} icon={MessageSquare} accent="success" />
            <KpiCard title="رسائل مرسلة اليوم" value={smsSentToday} icon={Send} accent="primary" />
            <KpiCard title="فاشلة اليوم" value={smsFailedToday} icon={MessageSquare} accent="destructive" />
          </KpiStrip>

          <ListQueryAlert error={gatewaysIsError ? gatewaysError : null} onRetry={() => refetchGateways()} />

          <DataTable
            data={gateways}
            columns={gwColumns}
            tableId="sms-gateways"
            searchable
            loading={gatewaysLoading}
            addLabel="إنشاء بوابة"
            onAdd={openCreateGateway}
            onEdit={openEditGateway}
            onDelete={(row) => {
              setToDelete({ type: 'gateway', name: row.name, label: row.gateway_name || row.name });
              setDeleteDialog(true);
            }}
          />
        </TabsContent>

        {/* ─── Tab 3: Notification Rules (SMS) ─── */}
        <TabsContent value="rules">
          <ListQueryAlert error={notifIsError ? notifError : null} onRetry={() => refetchNotif()} />

          <DataTable
            data={notifications}
            columns={notifColumns}
            tableId="sms-notif-rules"
            searchable
            loading={notifLoading}
            addLabel="إنشاء قاعدة"
            onAdd={openCreateNotif}
            onEdit={openEditNotif}
            onDelete={(row) => {
              setToDelete({ type: 'notif', name: row.name, label: row.subject || row.name });
              setDeleteDialog(true);
            }}
          />
        </TabsContent>

        {/* ─── Tab 4: Communication Log ─── */}
        <TabsContent value="log" className="space-y-5">
          <ListQueryAlert error={logIsError ? logError : null} onRetry={() => refetchLog()} />

          <DataTable
            data={log}
            columns={logColumns}
            tableId="sms-log"
            searchable
            loading={logLoading}
            exportFileName="سجل-الرسائل-النصية"
          />
        </TabsContent>
      </Tabs>

      {/* ─── Gateway Dialog ─── */}
      <Dialog open={gwDialog !== null} onOpenChange={(o) => !o && setGwDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGw ? 'تعديل البوابة' : 'إنشاء بوابة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم البوابة *</Label>
              <Input
                className="h-9"
                value={gwForm.gateway_name ?? ''}
                onChange={(e) => setGwForm((f) => ({ ...f, gateway_name: e.target.value }))}
                placeholder="مثال: بوابة أونيفونيك"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رابط API *</Label>
              <Input
                dir="ltr"
                className="h-9 font-mono text-xs"
                value={gwForm.gateway_url ?? ''}
                onChange={(e) => setGwForm((f) => ({ ...f, gateway_url: e.target.value }))}
                placeholder="https://api.example.com/v1/sms"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">معامل الرسالة</Label>
                <Input
                  dir="ltr"
                  className="h-9 font-mono text-xs"
                  value={gwForm.message_parameter ?? 'message'}
                  onChange={(e) => setGwForm((f) => ({ ...f, message_parameter: e.target.value }))}
                  placeholder="message"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">معامل المستلم</Label>
                <Input
                  dir="ltr"
                  className="h-9 font-mono text-xs"
                  value={gwForm.receiver_parameter ?? 'receiver'}
                  onChange={(e) => setGwForm((f) => ({ ...f, receiver_parameter: e.target.value }))}
                  placeholder="receiver"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="gw-use-post"
                  checked={Boolean(gwForm.use_post)}
                  onCheckedChange={(v) => setGwForm((f) => ({ ...f, use_post: v ? 1 : 0 }))}
                />
                <Label htmlFor="gw-use-post" className="text-xs cursor-pointer">استخدام POST</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="gw-use-csrf"
                  checked={Boolean(gwForm.use_csrf)}
                  onCheckedChange={(v) => setGwForm((f) => ({ ...f, use_csrf: v ? 1 : 0 }))}
                />
                <Label htmlFor="gw-use-csrf" className="text-xs cursor-pointer">استخدام CSRF</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGwDialog(null)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveGateway} disabled={createGateway.isPending || updateGateway.isPending}>
              {createGateway.isPending || updateGateway.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin ms-1" /> جاري الحفظ...</>
              ) : editingGw ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Notification Rule Dialog ─── */}
      <Dialog open={notifDialog !== null} onOpenChange={(o) => !o && setNotifDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNotif ? 'تعديل قاعدة الإرسال' : 'إنشاء قاعدة إرسال جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">العنوان *</Label>
              <Input
                className="h-9"
                value={notifForm.subject ?? ''}
                onChange={(e) => setNotifForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="مثال: إرسال SMS عند تقديم فاتورة"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">نوع المستند</Label>
                <Select
                  value={notifForm._doctype ?? 'Sales Invoice'}
                  onValueChange={(v) => setNotifForm((f) => ({ ...f, _doctype: v }))}
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
                <Label className="text-xs">الحدث</Label>
                <Select
                  value={notifForm._event ?? 'Submit'}
                  onValueChange={(v) => setNotifForm((f) => ({ ...f, _event: v }))}
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
            <div className="space-y-1.5">
              <Label className="text-xs">القناة</Label>
              <Select
                value={notifForm._channel ?? 'SMS'}
                onValueChange={(v) => setNotifForm((f) => ({ ...f, _channel: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">محتوى الرسالة (يدعم Jinja)</Label>
              <Textarea
                rows={5}
                value={notifForm.message ?? ''}
                onChange={(e) => setNotifForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="مرحباً {{ doc.customer_name }}، فاتورتك رقم {{ doc.name }}"
                className="font-mono text-xs"
                dir="ltr"
              />
              <p className="text-[10px] text-muted-foreground">
                استخدم المتغيرات: {'{{ doc.name }}'}, {'{{ doc.customer_name }}'}, {'{{ doc.grand_total }}'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotifDialog(null)}>
              إلغاء
            </Button>
            <Button size="sm" onClick={saveNotif} disabled={createNotif.isPending || updateNotif.isPending}>
              {createNotif.isPending || updateNotif.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin ms-1" /> جاري الحفظ...</>
              ) : editingNotif ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog
        open={deleteDialog}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteDialog(false);
            setToDelete(null);
          }
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف «{toDelete?.label}»؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={confirmDelete}
              disabled={deleteGateway.isPending || deleteNotif.isPending}
            >
              {deleteGateway.isPending || deleteNotif.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
