'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDocList } from '@/lib/client/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import {
  Loader2,
  Key,
  Webhook,
  FileText,
  Terminal,
  Play,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Database,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';

type ApiKeyRow = { id: string; label: string; key: string; scopes: string[]; createdAt: string; revokedAt?: string };
type WebhookRow = { id: string; event: string; url: string; createdAt: string; enabled?: boolean };
type DeliveryRow = { id: string; event: string; status: string; attempts: number; lastError?: string; timestamp?: string };

/** نقاط النهاية المتاحة للعرض في مركز التوثيق */
const API_ENDPOINTS = [
  { method: 'GET', path: '/api/resource/{doctype}', description: 'قائمة السجلات', category: 'المستندات' },
  { method: 'GET', path: '/api/resource/{doctype}/{name}', description: 'تفاصيل سجل', category: 'المستندات' },
  { method: 'POST', path: '/api/resource/{doctype}', description: 'إنشاء سجل جديد', category: 'المستندات' },
  { method: 'PUT', path: '/api/resource/{doctype}/{name}', description: 'تحديث سجل', category: 'المستندات' },
  { method: 'DELETE', path: '/api/resource/{doctype}/{name}', description: 'حذف سجل', category: 'المستندات' },
  { method: 'POST', path: '/api/method/{method}', description: 'استدعاء دالة خادم', category: 'الدوال' },
  { method: 'POST', path: '/api/resource/{doctype}/{name}/submit', description: 'ترحيل مستند', category: 'سير العمل' },
  { method: 'POST', path: '/api/resource/{doctype}/{name}/cancel', description: 'إلغاء مستند', category: 'سير العمل' },
  { method: 'GET', path: '/api/developer/openapi', description: 'مواصفات OpenAPI', category: 'المطور' },
  { method: 'GET', path: '/api/developer/api-keys', description: 'عرض مفاتيح API', category: 'المطور' },
  { method: 'POST', path: '/api/developer/api-keys', description: 'إنشاء مفتاح جديد', category: 'المطور' },
  { method: 'GET', path: '/api/developer/webhooks', description: 'عرض خطافات الويب', category: 'المطور' },
  { method: 'POST', path: '/api/developer/webhooks', description: 'إنشاء خطاف ويب', category: 'المطور' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-primary/10 text-emerald-800 dark:bg-chart-3/10 dark:text-emerald-300',
  POST: 'bg-chart-1/10 text-sky-800 dark:bg-chart-1/10 dark:text-sky-300',
  PUT: 'bg-chart-2/10 text-amber-800 dark:bg-chart-2/10 dark:text-amber-300',
  DELETE: 'bg-destructive/10 text-rose-800 dark:bg-destructive/10 dark:text-rose-300',
  PATCH: 'bg-chart-5/10 text-purple-800 dark:bg-chart-5/10 dark:text-purple-300',
};

/** تحديد نجاح حالة التسليم — يدعم القيم من المخزن المحلي (delivered/failed/queued) والقيم القديمة (Success/success) */
function isDeliverySuccess(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'delivered' || s === 'success';
}

export default function DeveloperApiPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [localHooks, setLocalHooks] = useState<WebhookRow[]>([]);
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
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [editWebhookId, setEditWebhookId] = useState<string | null>(null);
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [editWebhookEvent, setEditWebhookEvent] = useState('');

  // ── اختبار API ──
  const [testMethod, setTestMethod] = useState('GET');
  const [testEndpoint, setTestEndpoint] = useState('/api/resource/Company');
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // ── ERPNext Webhooks ──
  const erpNextWebhooksQuery = useDocList<Record<string, unknown>>('Webhook', {
    fields: ['name', 'webhook_doctype', 'webhook_doctype_event', 'enabled', 'request_url', 'creation'],
    limit: 50,
  });

  const erpNextWebhooks = useMemo(() => {
    if (!erpNextWebhooksQuery.data) return [];
    return erpNextWebhooksQuery.data.map((w) => ({
      id: String(w.name ?? ''),
      event: String(w.webhook_doctype_event ?? w.webhook_doctype ?? ''),
      url: String(w.request_url ?? ''),
      createdAt: String(w.creation ?? ''),
      enabled: w.enabled === 1 || w.enabled === true,
      source: 'erpnext' as const,
    }));
  }, [erpNextWebhooksQuery.data]);

  const load = useCallback(async () => {
    try {
      const [k, h, o] = await Promise.all([
        fetch('/api/developer/api-keys').then((r) => r.json()),
        fetch('/api/developer/webhooks').then((r) => r.json()),
        fetch('/api/developer/openapi').then((r) => r.json()),
      ]);
      queueMicrotask(() => {
        setKeys(k.data || []);
        setLocalHooks(h.data?.hooks || []);
        setDeliveries(h.data?.deliveries || []);
        setOpenapi(o.data || null);
      });
    } catch {
      toast.error('تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── KPIs ──
  const activeKeys = useMemo(() => keys.filter((k) => !k.revokedAt).length, [keys]);
  const revokedKeys = useMemo(() => keys.filter((k) => k.revokedAt).length, [keys]);
  const totalLocalWebhooks = localHooks.length;
  const totalErpWebhooks = erpNextWebhooks.length;
  const totalWebhooks = totalLocalWebhooks + totalErpWebhooks;
  const recentDeliveries = deliveries.length;

  // ── إنشاء مفتاح ──
  const createKey = async () => {
    if (!keyLabel.trim()) {
      toast.error('أدخل اسم المفتاح');
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
        toast.error('تعذر إنشاء المفتاح');
        return;
      }
      setKeyLabel('');
      toast.success('تم إنشاء مفتاح الواجهة البرمجية');
      void load();
    } catch {
      toast.error('حدث خطأ أثناء إنشاء المفتاح');
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      const res = await fetch(`/api/developer/api-keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('تعذر إلغاء المفتاح');
        return;
      }
      toast.success('تم إلغاء المفتاح');
      void load();
    } catch {
      toast.error('حدث خطأ أثناء إلغاء المفتاح');
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success('تم النسخ إلى الحافظة');
  };

  // ── إنشاء خطاف ويب ──
  const createWebhook = async () => {
    if (!event.trim() || !url.trim()) {
      toast.error('أدخل اسم الحدث ورابط الاستقبال');
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
        toast.error('تعذر إنشاء خطاف الويب');
        return;
      }
      setUrl('');
      toast.success('تم إنشاء خطاف الويب');
      void load();
    } catch {
      toast.error('حدث خطأ أثناء إنشاء خطاف الويب');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/developer/webhooks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('تعذر حذف خطاف الويب');
        return;
      }
      toast.success('تم حذف خطاف الويب');
      void load();
    } catch {
      toast.error('حدث خطأ أثناء حذف خطاف الويب');
    }
  };

  const updateWebhook = async () => {
    if (!editWebhookId || !editWebhookUrl.trim() || !editWebhookEvent.trim()) return;
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editWebhookId, event: editWebhookEvent, url: editWebhookUrl }),
      });
      if (!res.ok) {
        toast.error('تعذر تحديث خطاف الويب');
        return;
      }
      setEditWebhookId(null);
      toast.success('تم تحديث خطاف الويب');
      void load();
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  // ── اختبار إرسال ──
  const testDispatch = async () => {
    let parsed: unknown = {};
    try {
      parsed = payload ? JSON.parse(payload) : {};
    } catch {
      toast.error('بيانات الإرسال ليست JSON صالح');
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
        toast.error('فشل الإرسال التجريبي');
        return;
      }
      toast.success('تم الإرسال التجريبي بنجاح');
      void load();
    } catch {
      toast.error('حدث خطأ أثناء الإرسال التجريبي');
    } finally {
      setDispatching(false);
    }
  };

  // ── اختبار API endpoint ──
  const testApiEndpoint = async () => {
    setTestLoading(true);
    setTestResponse('');
    try {
      const opts: RequestInit = { method: testMethod, headers: {} };
      if (['POST', 'PUT', 'PATCH'].includes(testMethod) && testBody.trim()) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = testBody;
      }
      const res = await fetch(testEndpoint, opts);
      const text = await res.text();
      let formatted: string;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        formatted = text;
      }
      setTestResponse(`الحالة: ${res.status} ${res.statusText}\n\n${formatted}`);
    } catch (err) {
      setTestResponse(`خطأ: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="واجهة برمجة التطبيقات (API)"
          description="إدارة مفاتيح الواجهة البرمجية وخطافات الويب ومراقبة التسليم"
          iconify="solar:code-square-bold-duotone"
          accent="primary"
          breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'واجهة برمجة التطبيقات' }]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="واجهة برمجة التطبيقات (API)"
        description="إدارة مفاتيح الواجهة البرمجية وخطافات الويب ومراقبة التسليم"
        iconify="solar:code-square-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'التشغيل', href: '/operations' }, { label: 'واجهة برمجة التطبيقات' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void erpNextWebhooksQuery.refetch()}>
              <Database className="h-3.5 w-3.5" />
              تحديث ERPNext
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void load()}>
              <RefreshCw className="h-3.5 w-3.5" />
              تحديث
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      <KpiStrip cols={4}>
        <KpiCard
          title="مفاتيح نشطة"
          value={activeKeys}
          icon={Key}
          accent="success"
          description={`${revokedKeys} مُلغى من ${keys.length} إجمالي`}
        />
        <KpiCard
          title="خطافات الويب"
          value={totalWebhooks}
          icon={Webhook}
          accent="primary"
          description={`${totalLocalWebhooks} محلي · ${totalErpWebhooks} ERPNext`}
        />
        <KpiCard
          title="سجلات التسليم"
          value={recentDeliveries}
          icon={FileText}
          accent="warning"
          description="محاولات إرسال"
        />
        <KpiCard
          title="نقاط النهاية"
          value={API_ENDPOINTS.length}
          icon={Zap}
          accent="info"
          description="نقاط متاحة للوصول"
        />
      </KpiStrip>

      <Tabs defaultValue="keys" dir="rtl" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 w-full">
          <TabsTrigger value="keys" className="gap-1.5 text-xs">
            <Key className="h-3.5 w-3.5" /> المفاتيح
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5 text-xs">
            <Webhook className="h-3.5 w-3.5" /> خطافات الويب
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> التوثيق
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5 text-xs">
            <Play className="h-3.5 w-3.5" /> اختبار
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs">
            <Terminal className="h-3.5 w-3.5" /> السجلات
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ مفاتيح API ═══════════ */}
        <TabsContent value="keys" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إنشاء مفتاح جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">اسم المفتاح</Label>
                  <Input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} placeholder="مفتاح تطبيق الجوال" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">النطاقات المسموحة (مفصولة بفاصلة)</Label>
                  <Input value={scopes} onChange={(e) => setScopes(e.target.value)} placeholder="قراءة,كتابة,تقارير" className="h-10" />
                </div>
              </div>
              <Button size="sm" onClick={createKey} className="gap-2" disabled={creatingKey}>
                {creatingKey && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                إنشاء مفتاح
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">المفاتيح الحالية ({keys.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">لا توجد مفاتيح بعد</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {keys.map((key) => (
                    <div key={key.id} className={`rounded-lg border p-3 text-sm transition-colors ${key.revokedAt ? 'opacity-50 bg-muted/30' : 'border-border/40 hover:border-border/60'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{key.label}</p>
                            {key.revokedAt ? (
                              <Badge variant="secondary" className="text-[10px]">ملغى</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/20">نشط</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <code className="text-[11px] text-muted-foreground font-mono" dir="ltr">
                              {visibleKeys.has(key.id) ? key.key : `${key.key.slice(0, 8)}${'•'.repeat(16)}`}
                            </code>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => toggleKeyVisibility(key.id)}>
                              {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyToClipboard(key.key)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">النطاقات: {(key.scopes || []).join(', ')}</p>
                        </div>
                        {!key.revokedAt && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => void revokeKey(key.id)}>
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ خطافات الويب ═══════════ */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة خطاف ويب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">اسم الحدث</Label>
                  <Input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="حدث الفاتورة" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">رابط الاستقبال</Label>
                  <Input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" className="h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">بيانات الإرسال (JSON)</Label>
                <Textarea rows={3} value={payload} onChange={(e) => setPayload(e.target.value)} placeholder='{"key": "value"}' />
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
            </CardContent>
          </Card>

          {/* Local Webhooks */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  خطافات الويب المحلية ({localHooks.length})
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">محلي</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {localHooks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">لا توجد خطافات ويب محلية بعد</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {localHooks.map((hook) => (
                    <div key={hook.id} className="rounded-lg border border-border/40 p-3 text-sm hover:border-border/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">{hook.event}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono mt-1" dir="ltr">{hook.url}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditWebhookId(hook.id);
                              setEditWebhookEvent(hook.event);
                              setEditWebhookUrl(hook.url);
                            }}
                          >
                            <Code2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => void deleteWebhook(hook.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ERPNext Webhooks */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  خطافات الويب من ERPNext ({erpNextWebhooks.length})
                </CardTitle>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Database className="h-2.5 w-2.5" />
                  ERPNext
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {erpNextWebhooksQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : erpNextWebhooksQuery.isError ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">تعذر تحميل خطافات الويب من ERPNext</p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => void erpNextWebhooksQuery.refetch()}>
                    <RefreshCw className="h-3 w-3" />
                    إعادة المحاولة
                  </Button>
                </div>
              ) : erpNextWebhooks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">لا توجد خطافات ويب في ERPNext بعد</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {erpNextWebhooks.map((hook) => (
                    <div key={hook.id} className="rounded-lg border border-border/40 p-3 text-sm hover:border-border/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">{hook.event}</Badge>
                            {hook.enabled ? (
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/20">مفعّل</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">معطّل</Badge>
                            )}
                          </div>
                          {hook.url && (
                            <p className="text-[11px] text-muted-foreground font-mono mt-1" dir="ltr">{hook.url}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono" dir="ltr">
                            {hook.id}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] gap-1">
                          <Database className="h-2.5 w-2.5" />
                          ERPNext
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ مركز التوثيق ═══════════ */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                نقاط النهاية المتاحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {API_ENDPOINTS.map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border/40 p-2.5 text-sm hover:border-border/60 transition-colors">
                    <Badge className={`text-[10px] font-bold px-2 py-0.5 border-0 ${METHOD_COLORS[ep.method] || 'bg-muted'}`}>
                      {ep.method}
                    </Badge>
                    <code className="text-xs font-mono flex-1" dir="ltr">{ep.path}</code>
                    <span className="text-xs text-muted-foreground">{ep.description}</span>
                    <Badge variant="outline" className="text-[10px]">{ep.category}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* أمثلة برمجية */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                أمثلة برمجية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">cURL (سطر الأوامر)</Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(`curl -X GET "https://your-erp.com/api/resource/Company" \\
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET"`)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="rounded-lg bg-muted/50 border border-border/40 p-3 text-[11px] font-mono overflow-x-auto" dir="ltr">
{`curl -X GET "https://your-erp.com/api/resource/Company" \\
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET"`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">بايثون (Python)</Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(`import requests

url = "https://your-erp.com/api/resource/Company"
headers = {"Authorization": "token YOUR_API_KEY:YOUR_API_SECRET"}
response = requests.get(url, headers=headers)
print(response.json())`)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="rounded-lg bg-muted/50 border border-border/40 p-3 text-[11px] font-mono overflow-x-auto" dir="ltr">
{`import requests

url = "https://your-erp.com/api/resource/Company"
headers = {"Authorization": "token YOUR_API_KEY:YOUR_API_SECRET"}
response = requests.get(url, headers=headers)
print(response.json())`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">جافاسكريبت (JavaScript)</Label>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(`const response = await fetch("https://your-erp.com/api/resource/Company", {
  headers: { "Authorization": "token YOUR_API_KEY:YOUR_API_SECRET" }
});
const data = await response.json();
console.log(data);`)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="rounded-lg bg-muted/50 border border-border/40 p-3 text-[11px] font-mono overflow-x-auto" dir="ltr">
{`const response = await fetch("https://your-erp.com/api/resource/Company", {
  headers: { "Authorization": "token YOUR_API_KEY:YOUR_API_SECRET" }
});
const data = await response.json();
console.log(data);`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* مواصفات OpenAPI */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">مواصفات OpenAPI</CardTitle>
                <a href="/api/developer/openapi" target="_blank" className="text-xs text-primary underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  فتح الرابط
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea rows={10} readOnly value={JSON.stringify(openapi, null, 2)} className="font-mono text-xs" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ اختبار API ═══════════ */}
        <TabsContent value="test" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" />
                اختبار نقطة نهاية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-[120px_1fr] gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">الطريقة</Label>
                  <Select value={testMethod} onValueChange={setTestMethod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">نقطة النهاية</Label>
                  <Input
                    dir="ltr"
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value)}
                    placeholder="/api/resource/Company"
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>
              {['POST', 'PUT', 'PATCH'].includes(testMethod) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">نص الطلب (JSON)</Label>
                  <Textarea
                    rows={5}
                    dir="ltr"
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    placeholder='{"field": "value"}'
                    className="font-mono text-xs"
                  />
                </div>
              )}
              <Button size="sm" onClick={testApiEndpoint} disabled={testLoading} className="gap-2">
                {testLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                إرسال الطلب
              </Button>
              {testResponse && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">الاستجابة</Label>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(testResponse)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="rounded-lg bg-muted/50 border border-border/40 p-3 text-[11px] font-mono overflow-x-auto max-h-80 overflow-y-auto" dir="ltr">
                    {testResponse}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ سجل التسليم ═══════════ */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                سجل التسليم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">لا توجد سجلات تسليم بعد</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {deliveries.map((d) => {
                    const success = isDeliverySuccess(d.status);
                    return (
                      <div key={d.id} className="rounded-lg border border-border/40 p-3 text-sm hover:border-border/60 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {success ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500" />
                            )}
                            <code className="text-xs font-mono">{d.event}</code>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              success
                                ? 'text-primary border-primary/20'
                                : 'text-destructive border-destructive/20'
                            }`}
                          >
                            {success ? 'نجاح' : 'فشل'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            المحاولات: {d.attempts}
                          </span>
                          {d.lastError && <span className="text-rose-500">خطأ: {d.lastError}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── حوار تعديل خطاف الويب ── */}
      <Dialog open={!!editWebhookId} onOpenChange={(open) => { if (!open) setEditWebhookId(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل خطاف الويب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">اسم الحدث</Label>
              <Input value={editWebhookEvent} onChange={(e) => setEditWebhookEvent(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رابط الاستقبال</Label>
              <Input dir="ltr" value={editWebhookUrl} onChange={(e) => setEditWebhookUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditWebhookId(null)}>
              إلغاء
            </Button>
            <Button type="button" size="sm" onClick={updateWebhook}>
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
