'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDocList, useCreateDoc } from '@/lib/client/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpdateDoc } from '@/lib/client/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

type LogRow = {
  name: string;
  subject?: string;
  for_user?: string;
  type?: string;
  creation?: string;
  read?: number | boolean;
  document_type?: string;
  document_name?: string;
};

interface CrmMessagingSettings {
  sms_provider: string;
  sms_api_key: string;
  wa_provider: string;
  wa_api_key: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  auto_reply_template: string;
  rule_invoice: boolean;
  rule_due: boolean;
  rule_renew: boolean;
  rule_appointment: boolean;
}

type ChannelStatus = {
  sms: 'connected' | 'disconnected';
  whatsapp: 'connected' | 'disconnected';
  smtp: 'connected' | 'disconnected';
};

const defaultSettings: CrmMessagingSettings = {
  sms_provider: '',
  sms_api_key: '',
  wa_provider: '',
  wa_api_key: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_password: '',
  auto_reply_template: 'مرحباً {{customer_name}}، تذكير بفاتورتك {{invoice_no}}',
  rule_invoice: true,
  rule_due: true,
  rule_renew: true,
  rule_appointment: true,
};

const MASK = '••••••••';

function validateSettings(s: CrmMessagingSettings): string[] {
  const errors: string[] = [];
  if (s.sms_provider.trim() && !s.sms_api_key.trim()) {
    errors.push('مفتاح API لـ SMS مطلوب عند تحديد مزود SMS');
  }
  if (s.wa_provider.trim() && !s.wa_api_key.trim()) {
    errors.push('مفتاح API لواتساب مطلوب عند تحديد مزود واتساب');
  }
  if (s.smtp_host.trim()) {
    if (!s.smtp_user.trim()) {
      errors.push('مستخدم البريد مطلوب عند تحديد خادم بريد');
    }
    if (!s.smtp_password.trim()) {
      errors.push('كلمة مرور البريد مطلوبة عند تحديد خادم بريد');
    }
    const port = Number(s.smtp_port);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('منفذ البريد يجب أن يكون رقمًا بين 1 و 65535');
    }
  }
  if (s.auto_reply_template.trim().length === 0) {
    errors.push('قالب الرد التلقائي لا يمكن أن يكون فارغًا');
  }
  return errors;
}

function StatusBadge({ status, label }: { status: 'connected' | 'disconnected'; label: string }) {
  return status === 'connected' ? (
    <Badge variant="default" className="text-[10px] gap-1 bg-chart-3 hover:bg-chart-3">
      <Wifi className="h-3 w-3" />
      {label} — متصل
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-[10px] gap-1">
      <WifiOff className="h-3 w-3" />
      {label} — غير متصل
    </Badge>
  );
}

export default function CrmMessagesPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const forUser = user?.name?.trim() ?? '';
  const qc = useQueryClient();

  const [settings, setSettings] = useState<CrmMessagingSettings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>({
    sms: 'disconnected',
    whatsapp: 'disconnected',
    smtp: 'disconnected',
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const fetchSettings = useCallback(() => {
    fetch('/api/settings/crm-messaging')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
        if (data.status) {
          setChannelStatus(data.status);
        }
        setSettingsLoaded(true);
      })
      .catch(() => {
        setSettingsLoaded(true);
        toast.error('تعذر تحميل إعدادات الرسائل');
      });
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = <K extends keyof CrmMessagingSettings>(key: K, value: CrmMessagingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (s: CrmMessagingSettings) => {
      const errors = validateSettings(s);
      if (errors.length > 0) {
        throw new Error(errors.join(' | '));
      }
      const payload: Record<string, unknown> = { ...s };
      if (payload.sms_api_key === MASK) delete payload.sms_api_key;
      if (payload.wa_api_key === MASK) delete payload.wa_api_key;
      if (payload.smtp_password === MASK) delete payload.smtp_password;

      const res = await fetch('/api/settings/crm-messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل حفظ الإعدادات');
      return data;
    },
    onSuccess: (data) => {
      toast.success('تم حفظ إعدادات الرسائل بنجاح');
      if (data.data) {
        setSettings(prev => ({ ...prev, ...data.data }));
      }
      if (data.status) {
        setChannelStatus(data.status);
      }
    },
    onError: (err: Error) => {
      const msg = err.message || 'فشل حفظ الإعدادات';
      if (msg.includes(' | ')) {
        setValidationErrors(msg.split(' | '));
      }
      toast.error(msg);
    },
  });

  const handleSaveSettings = () => {
    const errors = validateSettings(settings);
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(errors[0]);
      return;
    }
    setValidationErrors([]);
    saveMutation.mutate(settings);
  };

  const logs = useDocList<LogRow>('Notification Log', {
    fields: ['name', 'subject', 'for_user', 'type', 'creation', 'read', 'document_type', 'document_name'],
    ...(forUser ? { filters: [['for_user', '=', forUser]] as string[][] } : {}),
    limit: 200,
    order_by: 'creation desc',
    enabled: Boolean(isAuthenticated && forUser),
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (name: string) => apiUpdateDoc('Notification Log', name, { read: 1 }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['docList', 'Notification Log'] });
    },
    onError: () => toast.error('تعذر التحديث'),
  });

  const cols: Column<LogRow>[] = [
    { key: 'subject', header: 'العنوان', sortable: true },
    { key: 'document_type', header: 'نوع المستند', render: (v) => <span className="text-xs">{String(v || '—')}</span> },
    { key: 'document_name', header: 'رقم المستند', render: (v) => <span className="font-mono text-xs">{String(v || '—')}</span> },
    {
      key: 'read',
      header: 'مقروء',
      render: (_v, row) => {
        const unread = row.read === 0 || row.read === false;
        return unread ? (
          <Badge variant="secondary" className="text-[10px]">جديد</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">نعم</Badge>
        );
      },
    },
    { key: 'creation', header: 'التاريخ' },
    {
      key: '_mark',
      header: '',
      width: 'w-24',
      render: (_v, row) => {
        const unread = row.read === 0 || row.read === false;
        if (!unread) return <span className="text-[10px] text-muted-foreground">—</span>;
        return (
          <Button dir="rtl"
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px]"
            disabled={markRead.isPending}
            onClick={() => markRead.mutate(row.name)}
          >
            مقروء
          </Button>
        );
      },
    },
  ];

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <PageHeader
        title="الرسائل والإشعارات"
        description="إعداد قنوات الرسائل وقواعد الإرسال الآلي وسجل الإشعارات"
        iconify="solar:chat-round-dots-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'الرسائل' }]}
      />

      <div className="flex flex-wrap gap-2">
        <StatusBadge status={channelStatus.sms} label="SMS" />
        <StatusBadge status={channelStatus.whatsapp} label="واتساب" />
        <StatusBadge status={channelStatus.smtp} label="البريد" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">إعداد القنوات</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">مزود SMS</Label>
              <Input value={settings.sms_provider} onChange={(e) => updateSetting('sms_provider', e.target.value)} placeholder="مثال: Unifonic" />
            </div>
            <div>
              <Label className="text-xs">مفتاح API (SMS)</Label>
              <Input dir="ltr" value={settings.sms_api_key} onChange={(e) => updateSetting('sms_api_key', e.target.value)} placeholder="مفتاح API" type="password" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">مزود WhatsApp</Label>
              <Input value={settings.wa_provider} onChange={(e) => updateSetting('wa_provider', e.target.value)} placeholder="مثال: Meta" />
            </div>
            <div>
              <Label className="text-xs">مفتاح API (WhatsApp)</Label>
              <Input dir="ltr" value={settings.wa_api_key} onChange={(e) => updateSetting('wa_api_key', e.target.value)} placeholder="مفتاح API" type="password" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">خادم البريد</Label>
              <Input dir="ltr" value={settings.smtp_host} onChange={(e) => updateSetting('smtp_host', e.target.value)} placeholder="smtp.example.com" />
            </div>
            <div>
              <Label className="text-xs">المنفذ</Label>
              <Input dir="ltr" value={settings.smtp_port} onChange={(e) => updateSetting('smtp_port', e.target.value)} placeholder="587" />
            </div>
            <div>
              <Label className="text-xs">المستخدم</Label>
              <Input dir="ltr" value={settings.smtp_user} onChange={(e) => updateSetting('smtp_user', e.target.value)} placeholder="user@example.com" />
            </div>
          </div>
          <div>
            <Label className="text-xs">كلمة مرور البريد</Label>
            <Input dir="ltr" value={settings.smtp_password} onChange={(e) => updateSetting('smtp_password', e.target.value)} placeholder="••••••••" type="password" />
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">قالب ورسائل تلقائية</p>
          <Textarea rows={4} value={settings.auto_reply_template} onChange={(e) => updateSetting('auto_reply_template', e.target.value)} />
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.rule_invoice} onChange={(e) => updateSetting('rule_invoice', e.target.checked)} />
              عند إنشاء فاتورة
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.rule_due} onChange={(e) => updateSetting('rule_due', e.target.checked)} />
              عند قرب الاستحقاق
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.rule_renew} onChange={(e) => updateSetting('rule_renew', e.target.checked)} />
              عند تجديد اشتراك
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.rule_appointment} onChange={(e) => updateSetting('rule_appointment', e.target.checked)} />
              عند تعيين موعد
            </label>
          </div>

          {validationErrors.length > 0 && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 space-y-1">
              {validationErrors.map((err, i) => (
                <p key={i} className="text-xs text-destructive">{err}</p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSaveSettings} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin ms-1" /> جاري الحفظ...</> : 'حفظ الإعدادات'}
            </Button>
            {settingsLoaded && (
              <span className="text-[10px] text-muted-foreground">
                {channelStatus.sms === 'connected' || channelStatus.whatsapp === 'connected' || channelStatus.smtp === 'connected'
                  ? '✓ قناة واحدة على الأقل متصلة'
                  : '⚠ لا توجد قناة متصلة'}
              </span>
            )}
          </div>
        </div>
      </div>
      <ListQueryAlert error={logs.isError ? logs.error : null} onRetry={() => logs.refetch()} />
      {!forUser ? (
        <p className="text-sm text-muted-foreground">سجّل الدخول لعرض سجل الإشعارات الموجه إليك.</p>
      ) : (
        <DataTable data={logs.data || []} columns={cols} searchable loading={logs.isLoading} tableId="crm-notification-log" />
      )}
    </div>
  );
}
