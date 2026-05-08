'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTable, type Column } from '@/components/erp/data-table';
import { useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import { Save, Loader2 } from 'lucide-react';

type LoginRow = { name: string; owner?: string; status?: string; creation?: string };
const columns: Column<LoginRow>[] = [
  { key: 'owner', header: 'المستخدم' },
  { key: 'status', header: 'الحالة' },
  { key: 'creation', header: 'التاريخ' },
];

export default function SecuritySettingsPage() {
  const [minPassword, setMinPassword] = useState('10');
  const [sessionHours, setSessionHours] = useState('8');
  const [ipRestriction, setIpRestriction] = useState(false);
  const [allowedIps, setAllowedIps] = useState('');
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState(false);

  const logins = useDocList<LoginRow>('Activity Log', {
    fields: ['name', 'owner', 'status', 'creation'],
    filters: [['operation', 'like', '%Login%']],
    limit: 100,
    order_by: 'creation desc',
  });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoadingPrefs(true));
    fetch('/api/settings/security')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.success || !j.data) return;
        const d = j.data as {
          minPasswordLength: number;
          sessionHours: number;
          ipRestriction: boolean;
          allowedIps: string;
        };
        queueMicrotask(() => {
          if (cancelled) return;
          setMinPassword(String(d.minPasswordLength ?? 10));
          setSessionHours(String(d.sessionHours ?? 8));
          setIpRestriction(Boolean(d.ipRestriction));
          setAllowedIps(String(d.allowedIps ?? ''));
        });
      })
      .catch(() => toast.error('تعذر تحميل تفضيلات الأمان'))
      .finally(() => {
        if (!cancelled) queueMicrotask(() => setLoadingPrefs(false));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savePrefs = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minPasswordLength: Number(minPassword) || 10,
          sessionHours: Number(sessionHours) || 8,
          ipRestriction,
          allowedIps,
        }),
      });
      const j = await res.json();
      if (!j?.success) throw new Error(j?.error || 'فشل الحفظ');
      toast.success('تم حفظ تفضيلات الأمان (طبقة الواجهة)');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [minPassword, sessionHours, ipRestriction, allowedIps]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إعدادات الأمان"
        description="سياسة كلمات المرور ومدة الجلسة وتقييد IP (محلياً في ERP Pro)؛ وسجل الدخول من النظام"
        iconify="solar:shield-keyhole-bold-duotone"
        accent="destructive"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الأمان' }]}
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            disabled={loadingPrefs || saving}
            onClick={() => void savePrefs()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            حفظ
          </Button>
        }
      />

      <PageShell>
        {loadingPrefs ? (
          <p className="text-sm text-muted-foreground">جاري تحميل التفضيلات…</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">الحد الأدنى لطول كلمة المرور (واجهة)</Label>
              <Input type="number" value={minPassword} onChange={(e) => setMinPassword(e.target.value)} min={6} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">مدة الجلسة المعروضة (ساعات)</Label>
              <Input type="number" value={sessionHours} onChange={(e) => setSessionHours(e.target.value)} min={1} />
            </div>
          </div>
        )}
      </PageShell>

      <PageShell>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">تقييد IP (مرجعي للواجهة)</Label>
            <Switch checked={ipRestriction} onCheckedChange={setIpRestriction} disabled={loadingPrefs} />
          </div>
          {ipRestriction && (
            <Input
              dir="ltr"
              value={allowedIps}
              onChange={(e) => setAllowedIps(e.target.value)}
              placeholder="192.168.1.10,10.0.0.0/24"
            />
          )}
        </div>
      </PageShell>

      <div className="space-y-2">
        <p className="text-sm font-bold flex items-center gap-2">
          <span className="inline-block h-4 w-1 rounded-full bg-gradient-to-b from-primary to-info" />
          سجل الدخول
        </p>
        <DataTable data={logins.data || []} columns={columns} searchable loading={logins.isLoading} />
      </div>
    </div>
  );
}
