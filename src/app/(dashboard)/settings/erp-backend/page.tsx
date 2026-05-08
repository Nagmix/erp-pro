'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { CSRF_HEADER } from '@/lib/auth/csrf-constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Status = {
  backendHost: string;
  ping: boolean;
  hasApiToken: boolean;
  hasLocalFile: boolean;
};

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const needle = 'erp_csrf=';
  for (const part of document.cookie.split(';')) {
    const c = part.trim();
    if (c.startsWith(needle)) return decodeURIComponent(c.slice(needle.length));
  }
  return null;
}

export default function ErpBackendSettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [host, setHost] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [adminUser, setAdminUser] = useState('Administrator');
  const [frappeKeyUser, setFrappeKeyUser] = useState('Administrator');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/settings/frappe-backend?refresh=1', { credentials: 'include' });
    const j = (await r.json()) as { success?: boolean; data?: Status };
    if (j.success && j.data) {
      const payload = j.data;
      queueMicrotask(() => {
        setStatus(payload);
        setHost(payload.backendHost || '');
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveManual() {
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = readCsrfCookie();
      if (csrf) headers[CSRF_HEADER] = csrf;
      if (setupSecret.trim()) headers['x-frappe-setup-secret'] = setupSecret.trim();
      const r = await fetch('/api/settings/frappe-backend', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          action: 'save',
          backendHost: host.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
          apiSecret: apiSecret.trim() || undefined,
        }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string; data?: { ping?: boolean } };
      if (!r.ok || !j.success) {
        toast.error(j.error || 'فشل الحفظ');
        return;
      }
      toast.success(j.data?.ping ? 'تم الحفظ والاتصال بالخادم ناجح' : 'تم الحفظ، يرجى التحقق من تشغيل الخادم');
      setApiKey('');
      setApiSecret('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function bootstrapAuto() {
    if (!host.trim() || !adminPassword) {
      toast.message('أدخل عنوان الخادم وكلمة مرور المدير');
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const csrf = readCsrfCookie();
      if (csrf) headers[CSRF_HEADER] = csrf;
      if (setupSecret.trim()) headers['x-frappe-setup-secret'] = setupSecret.trim();
      const r = await fetch('/api/settings/frappe-backend', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          action: 'bootstrap',
          backendHost: host.trim(),
          adminUser: adminUser.trim(),
          adminPassword,
          frappeUser: frappeKeyUser.trim() || 'Administrator',
        }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string; data?: { message?: string } };
      if (!r.ok || !j.success) {
        toast.error(j.error || 'فشل الربط التلقائي');
        return;
      }
      toast.success(j.data?.message || 'تم توليد المفاتيح والحفظ');
      setAdminPassword('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعداد ربط الخادم"
        description="يتم استخدام عنوان الخادم ومفاتيح الواجهة البرمجية على مستوى الخادم فقط. يمكنك ضبط الربط من هذه الشاشة أو من متغيرات البيئة."
        iconify="solar:server-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'إعداد ربط الخادم' }]}
      />
      <div className="max-w-2xl space-y-5">

      {status && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">الحالة:</span>{' '}
            {status.ping ? (
              <span className="text-green-700 dark:text-green-400">متصل (اختبار الاتصال)</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400">لا يوجد استجابة من الخادم</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">مفاتيح الواجهة البرمجية:</span>{' '}
            {status.hasApiToken ? 'مفعّلة' : 'غير مفعّلة (سيُستخدم sid المسؤول عند الطلب)'}
          </div>
          <div>
            <span className="text-muted-foreground">ملف محلي:</span>{' '}
            {status.hasLocalFile ? 'نعم' : 'لا يوجد'}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label className="text-xs">عنوان الخادم</Label>
          <Input
            dir="ltr"
            className="font-mono text-sm"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="http://127.0.0.1:8000"
          />
        </div>
        <div>
          <Label className="text-xs">رأس التهيئة الأولى (اختياري)</Label>
          <Input
            dir="ltr"
            type="password"
            className="font-mono text-sm"
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            placeholder="مثال: مفتاح_الإعداد_السري"
          />
          <p className="text-xs text-muted-foreground mt-1">
            يُستخدم هذا الرمز فقط قبل أول تسجيل دخول لتفعيل الاتصال بالخادم.
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">ربط تلقائي (تسجيل دخول وتوليد مفاتيح الواجهة البرمجية)</h2>
        <p className="text-xs text-muted-foreground">
          ينفذ النظام تسجيل الدخول ثم توليد المفاتيح ويحفظ النتيجة محلياً. يتطلب صلاحية مدير النظام أو رمز التهيئة أعلاه.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">مستخدم تسجيل الدخول (usr)</Label>
            <Input dir="ltr" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">كلمة المرور (مرة واحدة)</Label>
            <Input
              dir="ltr"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">المستخدم المستهدف لتوليد المفاتيح</Label>
            <Input dir="ltr" value={frappeKeyUser} onChange={(e) => setFrappeKeyUser(e.target.value)} />
          </div>
        </div>
        <Button type="button" size="sm" disabled={loading} onClick={() => void bootstrapAuto()}>
          توليد المفاتيح وحفظها تلقائياً
        </Button>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">حفظ يدوي (مفاتيح من مصدر آخر)</h2>
        <div className="grid gap-2">
          <div>
            <Label className="text-xs">مفتاح الواجهة البرمجية</Label>
            <Input dir="ltr" className="font-mono text-xs" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">السر البرمجي</Label>
            <Input
              dir="ltr"
              type="password"
              className="font-mono text-xs"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={() => void saveManual()}>
          حفظ العنوان والمفاتيح
        </Button>
      </div>
      </div>
    </div>
  );
}
