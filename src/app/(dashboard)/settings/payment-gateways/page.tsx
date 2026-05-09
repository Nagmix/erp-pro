'use client';

import { useState, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { StatusBadge } from '@/components/erp/status-badge';
import { DataTable, type Column } from '@/components/erp/data-table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { useToast } from '@/hooks/use-toast';
import {
  useDocList,
  useCreateDoc,
  useUpdateDoc,
  useDeleteDoc,
} from '@/lib/client/hooks';
import {
  CreditCard,
  DollarSign,
  Settings,
  Shield,
  Star,
  Loader2,
  Plus,
  ExternalLink,
  TestTube,
} from 'lucide-react';

/* ─── Types ─── */
interface PaymentGatewayRow {
  name: string;
  gateway?: string;
  gateway_settings?: string;
  is_default?: number;
}

const GATEWAY_TYPE_OPTIONS = [
  { value: 'PayPal', label: 'باي بال (PayPal)', icon: '💳' },
  { value: 'Stripe', label: 'سترايب (Stripe)', icon: '💎' },
  { value: 'Razorpay', label: 'رازورباي (Razorpay)', icon: '⚡' },
  { value: 'Braintree', label: 'برينتري (Braintree)', icon: '🏦' },
  { value: 'Custom', label: 'مخصص (Custom)', icon: '⚙️' },
];

const GATEWAY_TYPE_COLORS: Record<string, string> = {
  'PayPal': 'bg-blue-500/10 text-blue-600',
  'Stripe': 'bg-purple-500/10 text-purple-600',
  'Razorpay': 'bg-amber-500/10 text-amber-600',
  'Braintree': 'bg-green-500/10 text-green-600',
  'Custom': 'bg-muted text-muted-foreground',
};

const GATEWAY_TYPE_AR: Record<string, string> = {
  'PayPal': 'باي بال',
  'Stripe': 'سترايب',
  'Razorpay': 'رازورباي',
  'Braintree': 'برينتري',
  'Custom': 'مخصص',
};

const CURRENCY_OPTIONS = [
  { value: 'YER', label: 'ريال يمني (YER)' },
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'AED', label: 'درهم إماراتي (AED)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
  { value: 'KWD', label: 'دينار كويتي (KWD)' },
];

export default function PaymentGatewaysPage() {
  const { toast } = useToast();

  /* ─── ERPNext Data Hooks ─── */
  const {
    data: gatewaysData,
    isLoading: gatewaysLoading,
    isError: gatewaysIsError,
    error: gatewaysError,
    refetch: refetchGateways,
  } = useDocList<PaymentGatewayRow>('Payment Gateway', {
    fields: ['name', 'gateway', 'gateway_settings', 'is_default'],
    limit: 200,
  });

  const createGateway = useCreateDoc<PaymentGatewayRow>('Payment Gateway');
  const updateGateway = useUpdateDoc<PaymentGatewayRow>('Payment Gateway');
  const deleteGateway = useDeleteDoc('Payment Gateway');

  /* ─── Local State ─── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentGatewayRow | null>(null);
  const [form, setForm] = useState<Partial<PaymentGatewayRow & { _gateway: string }>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PaymentGatewayRow | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const gateways = gatewaysData || [];

  /* ─── KPIs ─── */
  const totalGateways = gateways.length;
  const activeGateways = gateways.filter(g => g.gateway_settings).length;
  const defaultGateway = gateways.find(g => Number(g.is_default) === 1);

  /* ─── Actions ─── */
  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', _gateway: 'Custom', gateway_settings: '', is_default: 0 });
    setDialogOpen(true);
  };

  const openSetup = (gw: PaymentGatewayRow) => {
    setEditing(gw);
    setForm({
      name: gw.name,
      _gateway: gw.gateway || 'Custom',
      gateway_settings: gw.gateway_settings || '',
      is_default: gw.is_default || 0,
    });
    setDialogOpen(true);
  };

  const saveGateway = async () => {
    if (!form.name?.trim()) {
      toast({ title: 'أدخل اسم البوابة', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await updateGateway.mutateAsync({
          name: editing.name,
          doc: {
            gateway: form._gateway || 'Custom',
            gateway_settings: form.gateway_settings || '',
            is_default: form.is_default ? 1 : 0,
          },
        });
        toast({ title: `تم حفظ إعدادات ${editing.name}` });
      } else {
        await createGateway.mutateAsync({
          doctype: 'Payment Gateway',
          gateway_name: form.name.trim(),
          gateway: form._gateway || 'Custom',
          gateway_settings: form.gateway_settings || '',
          is_default: form.is_default ? 1 : 0,
        });
        toast({ title: 'تم إنشاء البوابة' });
      }
      setDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'فشل حفظ البوابة', description: msg, variant: 'destructive' });
    }
  };

  const setAsDefault = async (gw: PaymentGatewayRow) => {
    try {
      // Unset current default
      if (defaultGateway && defaultGateway.name !== gw.name) {
        await updateGateway.mutateAsync({
          name: defaultGateway.name,
          doc: { is_default: 0 },
        });
      }
      // Set new default
      await updateGateway.mutateAsync({
        name: gw.name,
        doc: { is_default: 1 },
      });
      toast({ title: `تم تعيين ${gw.name} كبوابة افتراضية` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'فشل تعيين البوابة الافتراضية', description: msg, variant: 'destructive' });
    }
  };

  const testConnection = async (gwName: string) => {
    setTesting(gwName);
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ woo: gwName }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: `تم اختبار اتصال ${gwName} بنجاح` });
      } else {
        toast({ title: `فشل اختبار اتصال ${gwName}`, description: result.error || '', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'فشل الاتصال بالخادم', variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteGateway.mutateAsync(toDelete.name);
      toast({ title: 'تم حذف البوابة' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'فشل حذف البوابة', description: msg, variant: 'destructive' });
    }
    setDeleteDialogOpen(false);
    setToDelete(null);
  };

  /* ─── DataTable Columns ─── */
  const columns: Column<PaymentGatewayRow>[] = useMemo(
    () => [
      { key: 'name', header: 'اسم البوابة', sortable: true, render: (_, row) => {
        const typeKey = row.gateway || 'Custom';
        const color = GATEWAY_TYPE_COLORS[typeKey] || GATEWAY_TYPE_COLORS['Custom'];
        return (
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">{row.name}</span>
            <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 border-0 ${color}`}>
              {GATEWAY_TYPE_AR[typeKey] || typeKey}
            </Badge>
          </div>
        );
      }},
      {
        key: 'gateway',
        header: 'النوع',
        sortable: true,
        render: (v) => {
          const type = String(v || 'Custom');
          const opt = GATEWAY_TYPE_OPTIONS.find(o => o.value === type);
          return <span className="text-xs">{opt ? `${opt.icon} ${opt.label}` : type}</span>;
        },
      },
      {
        key: 'gateway_settings',
        header: 'إعدادات الربط',
        render: (v) => (
          <span className="text-xs">{String(v || '—')}</span>
        ),
      },
      {
        key: 'is_default',
        header: 'الافتراضية',
        render: (v, row) => (
          <div className="flex items-center gap-2">
            <StatusBadge status={Number(v) === 1 ? 'Active' : 'Inactive'} />
            {Number(v) !== 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-primary hover:text-primary"
                onClick={(e) => { e.stopPropagation(); setAsDefault(row); }}
                disabled={updateGateway.isPending}
              >
                <Star className="h-3 w-3 ms-1" />
                تعيين
              </Button>
            )}
          </div>
        ),
      },
    ],
    [gateways, updateGateway.isPending]
  );

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="بوابات الدفع الإلكترونية"
        description="إدارة بوابات الدفع الإلكترونية وربطها بالحسابات المحاسبية"
        iconify="solar:card-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الإعدادات' }, { label: 'بوابات الدفع' }]}
        actions={
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            بوابة جديدة
          </Button>
        }
      />

      {/* KPI Strip */}
      <KpiStrip cols={3}>
        <KpiCard
          title="إجمالي البوابات"
          value={totalGateways}
          icon={CreditCard}
          accent="info"
        />
        <KpiCard
          title="بوابات مفعّلة"
          value={activeGateways}
          icon={Shield}
          accent="success"
        />
        <KpiCard
          title="البوابة الافتراضية"
          value={defaultGateway?.name || '—'}
          icon={Star}
          accent="warning"
        />
      </KpiStrip>

      <ListQueryAlert error={gatewaysIsError ? gatewaysError : null} onRetry={() => refetchGateways()} />

      {/* Gateway Cards Grid */}
      {gateways.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gateways.map((gw) => {
            const typeKey = gw.gateway || 'Custom';
            const color = GATEWAY_TYPE_COLORS[typeKey] || GATEWAY_TYPE_COLORS['Custom'];
            return (
              <Card
                key={gw.name}
                className="border-border/40 bg-card hover:border-border/60 transition-colors"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-success/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-success" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{gw.name}</p>
                        <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 border-0 mt-0.5 ${color}`}>
                          {GATEWAY_TYPE_AR[typeKey] || typeKey}
                        </Badge>
                      </div>
                    </div>
                    {Number(gw.is_default) === 1 && (
                      <Badge variant="outline" className="text-[10px] border-0 bg-amber-500/10 text-amber-600 shrink-0">
                        <Star className="h-3 w-3 ms-0.5" />
                        افتراضية
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">النوع</span>
                      <p className="font-medium">{GATEWAY_TYPE_AR[typeKey] || typeKey}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-muted-foreground">الإعدادات</span>
                      <p className="font-medium truncate">{gw.gateway_settings || '—'}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => openSetup(gw)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      إعداد
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => testConnection(gw.name)}
                      disabled={testing === gw.name}
                    >
                      {testing === gw.name ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {gw.gateway_settings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-primary"
                        onClick={() => window.open(`/api/data/Payment Gateway/${gw.name}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty state handled via DataTable when no cards */}
      {gateways.length === 0 && !gatewaysLoading && (
        <DataTable
          data={[]}
          columns={columns}
          searchable
          loading={gatewaysLoading}
          addLabel="بوابة جديدة"
          onAdd={openCreate}
        />
      )}

      {/* ─── Setup Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {editing ? `إعداد ${editing.name}` : 'بوابة دفع جديدة'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs">اسم البوابة *</Label>
                <Input
                  className="h-9"
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: Tabby"
                />
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">نوع البوابة</Label>
                <Select
                  value={form._gateway ?? 'Custom'}
                  onValueChange={(v) => setForm((f) => ({ ...f, _gateway: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATEWAY_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.icon} {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">مستند الإعدادات</Label>
                <Input
                  className="h-9"
                  value={form.gateway_settings ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, gateway_settings: e.target.value }))}
                  placeholder="مستند الإعدادات المرتبط"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">بوابة افتراضية</p>
                <p className="text-[10px] text-muted-foreground">عند التفعيل ستكون هذه البوابة الخيار الافتراضي للدفع</p>
              </div>
              <Switch
                checked={Boolean(form.is_default)}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v ? 1 : 0 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={saveGateway}
              disabled={createGateway.isPending || updateGateway.isPending}
            >
              {createGateway.isPending || updateGateway.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin ms-1" /> جاري الحفظ...</>
              ) : 'حفظ الإعدادات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف بوابة الدفع &quot;{toDelete?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteGateway.isPending}
            >
              {deleteGateway.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
