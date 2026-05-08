'use client';

import { useCallback, useMemo, useSyncExternalStore, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { DataTable, type Column } from '@/components/erp/data-table';
import { StatusBadge } from '@/components/erp/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/app-format';
import {
  RefreshCw,
  Plug,
  CheckCircle2,
  XCircle,
  Store,
  ArrowRightLeft,
  Clock,
  TestTube,
} from 'lucide-react';

/* ─── Types ─── */
type PlatformId = 'salla' | 'zid' | 'shopify' | 'woocommerce';

type PlatformConfig = {
  platform: PlatformId;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  syncProducts: boolean;
  syncOrders: boolean;
  syncStock: boolean;
  syncInterval: string;
  syncDirection: string;
  lastSync: string | null;
  lastSyncStatus: 'success' | 'failed' | null;
};

type SyncLogEntry = {
  id: string;
  date: string;
  platform: PlatformId;
  type: string;
  records: number;
  status: 'ناجح' | 'فاشل';
};

const LS_CONFIG = 'erp_ecommerce_configs';
const LS_LOG = 'erp_ecommerce_sync_log';

const PLATFORM_META: Record<PlatformId, { name: string; nameAr: string; icon: string }> = {
  salla: { name: 'Salla', nameAr: 'سلة', icon: 'solar:shop-bold-duotone' },
  zid: { name: 'Zid', nameAr: 'زِد', icon: 'solar:shop-bold-duotone' },
  shopify: { name: 'Shopify', nameAr: 'شوبيفاي', icon: 'solar:shop-bold-duotone' },
  woocommerce: { name: 'WooCommerce', nameAr: 'ووكومرس', icon: 'solar:shop-bold-duotone' },
};

const SYNC_INTERVALS = [
  { value: '15m', label: 'كل 15 دقيقة' },
  { value: '1h', label: 'كل ساعة' },
  { value: '6h', label: 'كل 6 ساعات' },
  { value: '1d', label: 'يومياً' },
];

const SYNC_DIRECTIONS = [
  { value: 'import', label: 'استيراد فقط' },
  { value: 'export', label: 'تصدير فقط' },
  { value: 'bidirectional', label: 'ثنائي' },
];

const SYNC_TYPES = ['منتجات', 'طلبات', 'مخزون'];

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

const defaultConfigs: PlatformConfig[] = [
  { platform: 'salla', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
  { platform: 'zid', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
  { platform: 'shopify', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
  { platform: 'woocommerce', apiUrl: '', apiKey: '', apiSecret: '', storeUrl: '', syncProducts: false, syncOrders: false, syncStock: false, syncInterval: '1h', syncDirection: 'import', lastSync: null, lastSyncStatus: null },
];

const emptySubscribe = () => () => {};

export default function EcommerceIntegrationPage() {
  const { toast } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [configs, setConfigs] = useState<PlatformConfig[]>(() => loadJson(LS_CONFIG, defaultConfigs));
  const [log, setLog] = useState<SyncLogEntry[]>(() => loadJson(LS_LOG, []));
  const [testing, setTesting] = useState<PlatformId | null>(null);

  const updateConfig = useCallback(
    (platform: PlatformId, patch: Partial<PlatformConfig>) => {
      setConfigs((prev) => {
        const updated = prev.map((c) => (c.platform === platform ? { ...c, ...patch } : c));
        localStorage.setItem(LS_CONFIG, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const saveConfig = useCallback(
    (platform: PlatformId) => {
      localStorage.setItem(LS_CONFIG, JSON.stringify(configs));
      toast({ title: `تم حفظ إعدادات ${PLATFORM_META[platform].nameAr}` });
    },
    [configs, toast]
  );

  const testConnection = useCallback(
    async (platform: PlatformId) => {
      const cfg = configs.find((c) => c.platform === platform);
      if (!cfg?.apiKey) {
        toast({ title: 'أدخل مفتاح API أولاً', variant: 'destructive' });
        return;
      }
      setTesting(platform);
      await new Promise((r) => setTimeout(r, 2000));
      const success = Math.random() > 0.3;
      updateConfig(platform, {
        lastSync: new Date().toISOString(),
        lastSyncStatus: success ? 'success' : 'failed',
      });
      setTesting(null);
      toast({
        title: success
          ? `تم الاتصال بـ ${PLATFORM_META[platform].nameAr} بنجاح`
          : `فشل الاتصال بـ ${PLATFORM_META[platform].nameAr}`,
        variant: success ? undefined : 'destructive',
      });
    },
    [configs, toast, updateConfig]
  );

  const runSync = useCallback(
    (platform: PlatformId, type: string) => {
      const newEntry: SyncLogEntry = {
        id: uid(),
        date: new Date().toISOString(),
        platform,
        type,
        records: Math.floor(Math.random() * 50) + 1,
        status: Math.random() > 0.2 ? 'ناجح' : 'فاشل',
      };
      const updated = [newEntry, ...log];
      setLog(updated);
      localStorage.setItem(LS_LOG, JSON.stringify(updated));
      updateConfig(platform, {
        lastSync: newEntry.date,
        lastSyncStatus: newEntry.status === 'ناجح' ? 'success' : 'failed',
      });
      toast({
        title: newEntry.status === 'ناجح'
          ? `تمت مزامنة ${type} (${newEntry.records} سجل)`
          : `فشلت مزامنة ${type}`,
      });
    },
    [log, toast, updateConfig]
  );

  const logColumns: Column<SyncLogEntry>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'التاريخ',
        sortable: true,
        render: (v) => <span className="text-xs">{formatDate(String(v))}</span>,
      },
      {
        key: 'platform',
        header: 'المنصة',
        render: (v) => <span className="text-xs">{PLATFORM_META[v as PlatformId]?.nameAr ?? String(v)}</span>,
      },
      { key: 'type', header: 'النوع' },
      {
        key: 'records',
        header: 'عدد السجلات',
        render: (v) => <span className="tabular-nums text-xs">{String(v)}</span>,
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (v) => (
          <StatusBadge status={v === 'ناجح' ? 'Sent' : 'Overdue'} />
        ),
      },
    ],
    []
  );

  const filteredLog = (platform: PlatformId) => log.filter((l) => l.platform === platform);

  if (!mounted) return null;

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="ربط المتاجر الإلكترونية"
        description="إدارة الاتصال والمزامنة مع منصات التجارة الإلكترونية"
        iconify="solar:shop-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'ربط المتاجر' }]}
      />

      <Tabs defaultValue="salla" className="space-y-4">
        <TabsList>
          {Object.entries(PLATFORM_META).map(([key, meta]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5 text-xs">
              <Store className="h-3.5 w-3.5" />
              {meta.nameAr}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(PLATFORM_META) as PlatformId[]).map((platform) => {
          const cfg = configs.find((c) => c.platform === platform) ?? configs[0];
          const meta = PLATFORM_META[platform];

          return (
            <TabsContent key={platform} value={platform} className="space-y-5">
              {/* Connection Settings */}
              <Card className="border-border/40 bg-card">
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Plug className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">إعدادات الاتصال — {meta.nameAr}</h2>
                      <p className="text-xs text-muted-foreground">أدخل بيانات الربط مع متجر {meta.nameAr}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">رابط API</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={cfg.apiUrl}
                        onChange={(e) => updateConfig(platform, { apiUrl: e.target.value })}
                        placeholder={`https://api.${meta.name.toLowerCase()}.com/v1`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">رابط المتجر</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={cfg.storeUrl}
                        onChange={(e) => updateConfig(platform, { storeUrl: e.target.value })}
                        placeholder={`https://mystore.${meta.name.toLowerCase()}.com`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">مفتاح API</Label>
                      <Input
                        dir="ltr"
                        className="h-9 font-mono text-xs"
                        value={cfg.apiKey}
                        onChange={(e) => updateConfig(platform, { apiKey: e.target.value })}
                        placeholder="API Key"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">سرّ API</Label>
                      <Input
                        dir="ltr"
                        type="password"
                        className="h-9 font-mono text-xs"
                        value={cfg.apiSecret}
                        onChange={(e) => updateConfig(platform, { apiSecret: e.target.value })}
                        placeholder="API Secret"
                      />
                    </div>
                  </div>

                  {/* Sync Options */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-3 rounded-lg border border-border/30 p-3">
                      <p className="text-xs font-semibold">خيارات المزامنة</p>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sync-products-${platform}`}
                          checked={cfg.syncProducts}
                          onCheckedChange={(v) => updateConfig(platform, { syncProducts: v === true })}
                        />
                        <Label htmlFor={`sync-products-${platform}`} className="text-xs cursor-pointer">مزامنة المنتجات</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sync-orders-${platform}`}
                          checked={cfg.syncOrders}
                          onCheckedChange={(v) => updateConfig(platform, { syncOrders: v === true })}
                        />
                        <Label htmlFor={`sync-orders-${platform}`} className="text-xs cursor-pointer">مزامنة الطلبات</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sync-stock-${platform}`}
                          checked={cfg.syncStock}
                          onCheckedChange={(v) => updateConfig(platform, { syncStock: v === true })}
                        />
                        <Label htmlFor={`sync-stock-${platform}`} className="text-xs cursor-pointer">مزامنة المخزون</Label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">فترة المزامنة</Label>
                        <Select
                          value={cfg.syncInterval}
                          onValueChange={(v) => updateConfig(platform, { syncInterval: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYNC_INTERVALS.map((i) => (
                              <SelectItem key={i.value} value={i.value}>
                                {i.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">اتجاه المزامنة</Label>
                        <Select
                          value={cfg.syncDirection}
                          onValueChange={(v) => updateConfig(platform, { syncDirection: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYNC_DIRECTIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Last Sync Status */}
                  {cfg.lastSync && (
                    <div className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">آخر مزامنة:</span>
                      <span className="font-medium">{formatDate(cfg.lastSync)}</span>
                      {cfg.lastSyncStatus === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span>{cfg.lastSyncStatus === 'success' ? 'ناجحة' : 'فاشلة'}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => saveConfig(platform)}>
                      حفظ الإعدادات
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={testing === platform}
                      onClick={() => testConnection(platform)}
                    >
                      <TestTube className="h-3.5 w-3.5" />
                      {testing === platform ? 'جاري الاتصال…' : 'اختبار الاتصال'}
                    </Button>
                    {SYNC_TYPES.map((type) => (
                      <Button
                        key={type}
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => runSync(platform, type)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        مزامنة {type}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sync Log */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  سجل المزامنة — {meta.nameAr}
                </h3>
                <DataTable
                  data={filteredLog(platform)}
                  columns={logColumns}
                  tableId={`ecommerce-log-${platform}`}
                  searchable
                  exportFileName={`سجل-مزامنة-${meta.nameAr}`}
                />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
