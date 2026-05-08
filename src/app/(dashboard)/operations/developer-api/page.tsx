'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/erp/page-header';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type ApiKeyRow = { id: string; label: string; key: string; scopes: string[]; createdAt: string; revokedAt?: string };
type WebhookRow = { id: string; event: string; url: string; createdAt: string };
type DeliveryRow = { id: string; event: string; status: string; attempts: number; lastError?: string };

export default function DeveloperApiPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [openapi, setOpenapi] = useState<Record<string, unknown> | null>(null);
  const [keyLabel, setKeyLabel] = useState('');
  const [scopes, setScopes] = useState('read,reports');
  const [event, setEvent] = useState('doc.created');
  const [url, setUrl] = useState('');
  const [payload, setPayload] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [k, h, o] = await Promise.all([
        fetch('/api/developer/api-keys').then((r) => r.json()),
        fetch('/api/developer/webhooks').then((r) => r.json()),
        fetch('/api/developer/openapi').then((r) => r.json()),
      ]);
      queueMicrotask(() => {
        setKeys(k.data || []);
        setHooks(h.data?.hooks || []);
        setDeliveries(h.data?.deliveries || []);
        setOpenapi(o.data || null);
      });
    } catch {
      toast({ title: 'تعذر تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    if (!keyLabel.trim()) {
      toast({ title: 'أدخل اسم المفتاح', variant: 'destructive' });
      return;
    }
    setCreatingKey(true);
    try {
      const res = await fetch('/api/developer/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: keyLabel, scopes: scopes.split(',').map((s) => s.trim()).filter(Boolean) }),
      });
      if (!res.ok) {
        toast({ title: 'تعذر إنشاء المفتاح', variant: 'destructive' });
        return;
      }
      setKeyLabel('');
      toast({ title: 'تم إنشاء مفتاح الواجهة البرمجية' });
      void load();
    } catch {
      toast({ title: 'حدث خطأ أثناء إنشاء المفتاح', variant: 'destructive' });
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/developer/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        toast({ title: 'تعذر إلغاء المفتاح', variant: 'destructive' });
        return;
      }
      toast({ title: 'تم إلغاء المفتاح' });
      void load();
    } catch {
      toast({ title: 'حدث خطأ أثناء إلغاء المفتاح', variant: 'destructive' });
    }
  };

  const createWebhook = async () => {
    if (!event.trim() || !url.trim()) {
      toast({ title: 'أدخل اسم الحدث ورابط الاستقبال', variant: 'destructive' });
      return;
    }
    setCreatingWebhook(true);
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, url }),
      });
      if (!res.ok) {
        toast({ title: 'تعذر إنشاء خطاف الويب', variant: 'destructive' });
        return;
      }
      setUrl('');
      toast({ title: 'تم إنشاء خطاف الويب' });
      void load();
    } catch {
      toast({ title: 'حدث خطأ أثناء إنشاء خطاف الويب', variant: 'destructive' });
    } finally {
      setCreatingWebhook(false);
    }
  };

  const testDispatch = async () => {
    let parsed: unknown = {};
    try {
      parsed = payload ? JSON.parse(payload) : {};
    } catch {
      toast({ title: 'بيانات الإرسال ليست JSON صالح', variant: 'destructive' });
      return;
    }
    setDispatching(true);
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload: parsed }),
      });
      if (!res.ok) {
        toast({ title: 'فشل الإرسال التجريبي', variant: 'destructive' });
        return;
      }
      toast({ title: 'تم الإرسال التجريبي بنجاح' });
      void load();
    } catch {
      toast({ title: 'حدث خطأ أثناء الإرسال التجريبي', variant: 'destructive' });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="واجهة برمجة التطبيقات (API)"
        description="إدارة مفاتيح الواجهة البرمجية وخطافات الويب ومراقبة التسليم"
        iconify="solar:code-square-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'واجهة برمجة التطبيقات' }]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">إدارة مفاتيح API</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">اسم المفتاح</Label>
                  <Input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="مفتاح تطبيق الجوال" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">النطاقات المسموحة (مفصولة بفاصلة)</Label>
                  <Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="قراءة,كتابة,تقارير" className="h-10" />
                </div>
                <Button size="sm" onClick={createKey} className="gap-2" disabled={creatingKey}>
                  {creatingKey && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  إنشاء مفتاح
                </Button>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {keys.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">لا توجد مفاتيح بعد</p>
                  )}
                  {keys.map((key) => (
                    <div key={key.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{key.label} {key.revokedAt ? '(ملغى)' : ''}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{key.key}</p>
                      <p className="text-xs text-muted-foreground">النطاقات: {(key.scopes || []).join(', ')}</p>
                      {!key.revokedAt ? <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => revokeKey(key.id)}>إلغاء</Button> : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">ربط الويب (Webhooks)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">اسم الحدث</Label>
                  <Input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="حدث الفاتورة" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">رابط الاستقبال</Label>
                  <Input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-semibold">بيانات الإرسال (JSON)</Label>
                  <Textarea rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} placeholder='{"key": "value"}' />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={createWebhook} className="gap-2" disabled={creatingWebhook}>
                    {creatingWebhook && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    إضافة خطاف الويب
                  </Button>
                  <Button size="sm" variant="outline" onClick={testDispatch} className="gap-2" disabled={dispatching}>
                    {dispatching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    اختبار الإرسال
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {hooks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">لا توجد خطافات ويب بعد</p>
                  )}
                  {hooks.map((hook) => (
                    <div key={hook.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{hook.event}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{hook.url}</p>
                    </div>
                  ))}
                </div>
                {deliveries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">سجل التسليم</p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {deliveries.slice(0, 8).map((d) => (
                        <div key={d.id} className="rounded-md border p-2 text-xs">
                          {d.event} | {d.status} | المحاولات: {d.attempts} {d.lastError ? `| خطأ: ${d.lastError}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">واجهة OpenAPI</CardTitle></CardHeader>
            <CardContent>
              <a href="/api/developer/openapi" target="_blank" className="text-xs text-primary underline mb-2 block">فتح مواصفات OpenAPI</a>
              <Textarea rows={14} readOnly value={JSON.stringify(openapi, null, 2)} className="font-mono text-xs" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
