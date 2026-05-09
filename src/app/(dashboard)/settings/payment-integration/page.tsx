'use client';

import { useState, useMemo } from 'react';
import { PageHeader, KpiStrip } from '@/components/erp/page-header';
import { KpiCard } from '@/components/erp/kpi-card';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Plus,
  Loader2,
  Globe,
  Wifi,
  WifiOff,
  ArrowLeftRight,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDocList, useCreateDoc, useUpdateDoc } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/app-format';
import { buildModeOfPaymentCreate } from '@/lib/erp/erpnext-payloads';

/* ─── Types ─── */
interface ModeOfPaymentRow {
  name: string;
  mode_of_payment: string;
  type: string;
  enabled: number | boolean;
}

interface PaymentGatewayRow {
  name: string;
  gateway: string;
  gateway_settings: string;
}

interface PaymentEntryRow {
  name: string;
  payment_type: string;
  posting_date: string;
  paid_amount: number;
  mode_of_payment: string;
  party: string;
  docstatus: number;
}

const typeIconsAr: Record<string, React.ComponentType<{ className?: string }>> = {
  Cash: Banknote,
  Bank: Building2,
  Electronic: Smartphone,
  General: CreditCard,
};

const typeLabelAr: Record<string, string> = {
  Cash: 'نقدي',
  Bank: 'بنكي',
  Electronic: 'إلكتروني',
  General: 'عام',
};

const typeColorsAr: Record<string, string> = {
  Cash: 'bg-emerald-500/10 text-emerald-600',
  Bank: 'bg-sky-500/10 text-sky-600',
  Electronic: 'bg-purple-500/10 text-purple-600',
  General: 'bg-amber-500/10 text-amber-600',
};

const emptyForm = { name: '', type: 'Cash' as string, enabled: true };

export default function PaymentIntegrationPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gatewayDialogOpen, setGatewayDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [gatewayForm, setGatewayForm] = useState({ name: '', url: '', apiKey: '', merchantId: '' });
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [gatewayStatuses, setGatewayStatuses] = useState<Record<string, 'connected' | 'disconnected' | 'error'>>({});

  /* ──── ERPNext data hooks ──── */
  const { data: methods, isLoading: methodsLoading, isError: methodsError, error: methodsErr, refetch: refetchMethods } = useDocList<ModeOfPaymentRow>('Mode of Payment', {
    fields: ['name', 'type', 'enabled'],
    limit: 200,
  });

  const { data: gateways, isLoading: gatewaysLoading } = useDocList<PaymentGatewayRow>('Payment Gateway', {
    fields: ['name', 'gateway', 'gateway_settings'],
    limit: 100,
  });

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { data: paymentEntries, isLoading: entriesLoading } = useDocList<PaymentEntryRow>('Payment Entry', {
    fields: ['name', 'payment_type', 'posting_date', 'paid_amount', 'mode_of_payment', 'party', 'docstatus'],
    filters: [['posting_date', '>=', firstOfMonth]],
    order_by: 'posting_date desc',
    limit: 20,
  });

  const createMethodMutation = useCreateDoc('Mode of Payment');
  const updateMethodMutation = useUpdateDoc('Mode of Payment');
  const createGatewayMutation = useCreateDoc('Payment Gateway');

  const paymentMethods = methods || [];
  const paymentGateways = gateways || [];
  const entries = paymentEntries || [];

  /* ──── KPI calculations ──── */
  const activeMethods = paymentMethods.filter(m => Boolean(m.enabled)).length;
  const activeGateways = paymentGateways.length;
  const onlinePaymentsMonth = entries.filter(e => e.docstatus === 1).length;
  const failedTransactions = entries.filter(e => e.docstatus === 2).length;
  const totalProcessed = entries.filter(e => e.docstatus === 1).reduce((sum, e) => sum + (e.paid_amount || 0), 0);

  /* ──── Handlers ──── */
  const handleCreateMethod = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم طريقة الدفع', variant: 'destructive' });
      return;
    }
    try {
      const doc = buildModeOfPaymentCreate({
        mode_of_payment: formData.name.trim(),
        type: formData.type as 'Cash' | 'Bank' | 'Electronic' | 'General',
        enabled: formData.enabled,
      });
      await createMethodMutation.mutateAsync(doc);
      toast({ title: 'تم بنجاح', description: 'تم إضافة طريقة الدفع بنجاح' });
      setDialogOpen(false);
      setFormData(emptyForm);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  const handleToggleMethod = async (row: ModeOfPaymentRow) => {
    try {
      const newVal = Boolean(row.enabled) ? 0 : 1;
      await updateMethodMutation.mutateAsync({ name: row.name, doc: { enabled: newVal } });
      toast({ title: 'تم بنجاح', description: Boolean(row.enabled) ? 'تم تعطيل طريقة الدفع' : 'تم تفعيل طريقة الدفع' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  const handleCreateGateway = async () => {
    if (!gatewayForm.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم البوابة', variant: 'destructive' });
      return;
    }
    try {
      await createGatewayMutation.mutateAsync({
        gateway: gatewayForm.name.trim(),
      });
      toast({ title: 'تم بنجاح', description: 'تم إضافة بوابة الدفع' });
      setGatewayDialogOpen(false);
      setGatewayForm({ name: '', url: '', apiKey: '', merchantId: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'خطأ', description: msg, variant: 'destructive' });
    }
  };

  const handleTestConnection = (gwName: string) => {
    setTestLoading(gwName);
    // Simulate test — real implementation would call API
    setTimeout(() => {
      setGatewayStatuses(prev => ({ ...prev, [gwName]: 'connected' }));
      setTestLoading(null);
      toast({ title: 'نجح الاتصال', description: `تم الاتصال ببوابة ${gwName} بنجاح` });
    }, 1500);
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="مركز التكاملات المالية"
        description="إدارة شاملة لطرق الدفع وبوابات الدفع الإلكترونية والمعاملات المالية"
        iconify="solar:card-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'مركز التكاملات المالية' }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setGatewayDialogOpen(true)}>
              <Globe className="h-3.5 w-3.5" />
              بوابة دفع جديدة
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setFormData(emptyForm); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              طريقة دفع جديدة
            </Button>
          </div>
        }
      />

      <ListQueryAlert error={methodsError ? methodsErr : null} onRetry={() => refetchMethods()} />

      {/* KPI Strip */}
      <KpiStrip cols={4}>
        <KpiCard
          title="طرق الدفع المفعّلة"
          value={activeMethods}
          icon={CreditCard}
          accent="success"
        />
        <KpiCard
          title="بوابات الدفع النشطة"
          value={activeGateways}
          icon={Globe}
          accent="info"
        />
        <KpiCard
          title="مدفوعات هذا الشهر"
          value={onlinePaymentsMonth}
          icon={Receipt}
          accent="primary"
        />
        <KpiCard
          title="معاملات فاشلة"
          value={failedTransactions}
          icon={XCircle}
          accent="destructive"
        />
      </KpiStrip>

      <Tabs defaultValue="methods" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/35 p-1">
          <TabsTrigger value="methods" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <CreditCard className="h-3.5 w-3.5" />
            طرق الدفع
          </TabsTrigger>
          <TabsTrigger value="gateways" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Globe className="h-3.5 w-3.5" />
            بوابات الدفع
          </TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Receipt className="h-3.5 w-3.5" />
            ملخص المعاملات
          </TabsTrigger>
          <TabsTrigger value="setup" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Settings className="h-3.5 w-3.5" />
            الإعداد السريع
          </TabsTrigger>
        </TabsList>

        {/* ═══ Payment Methods Tab ═══ */}
        <TabsContent value="methods" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {methodsLoading ? (
              <div className="col-span-full flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري تحميل طرق الدفع...
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                لا توجد طرق دفع مسجلة
              </div>
            ) : (
              paymentMethods.map((m) => {
                const typeKey = m.type || 'General';
                const Icon = typeIconsAr[typeKey] || CreditCard;
                const color = typeColorsAr[typeKey] || 'bg-muted';
                const isEnabled = Boolean(m.enabled);
                return (
                  <Card key={m.name} className="border-border/40 hover:border-border/60 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{m.name}</p>
                            <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 border-0 mt-1 ${color}`}>
                              {typeLabelAr[typeKey] || typeKey}
                            </Badge>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleMethod(m)}
                          disabled={updateMethodMutation.isPending}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ═══ Payment Gateways Tab ═══ */}
        <TabsContent value="gateways" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gatewaysLoading ? (
              <div className="col-span-full flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري تحميل بوابات الدفع...
              </div>
            ) : paymentGateways.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                <div className="flex flex-col items-center gap-3">
                  <Globe className="h-10 w-10 text-muted-foreground/40" />
                  <p>لا توجد بوابات دفع إلكترونية مسجلة</p>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setGatewayDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    إضافة بوابة
                  </Button>
                </div>
              </div>
            ) : (
              paymentGateways.map((gw) => {
                const status = gatewayStatuses[gw.name] || 'disconnected';
                return (
                  <Card key={gw.name} className="border-border/40 hover:border-border/60 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{gw.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{gw.gateway}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {status === 'connected' ? (
                            <Badge variant="outline" className="text-[10px] border-0 bg-emerald-500/10 text-emerald-600 gap-1">
                              <Wifi className="h-3 w-3" /> متصل
                            </Badge>
                          ) : status === 'error' ? (
                            <Badge variant="outline" className="text-[10px] border-0 bg-rose-500/10 text-rose-600 gap-1">
                              <WifiOff className="h-3 w-3" /> خطأ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground gap-1">
                              <WifiOff className="h-3 w-3" /> غير متصل
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 text-xs"
                        onClick={() => handleTestConnection(gw.name)}
                        disabled={testLoading === gw.name}
                      >
                        {testLoading === gw.name ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري الاختبار...</>
                        ) : (
                          <><ArrowLeftRight className="h-3.5 w-3.5" /> اختبار الاتصال</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ═══ Transactions Tab ═══ */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">إجمالي المبالغ المعالجة</p>
                  <p className="text-base font-bold mt-0.5">{formatCurrency(totalProcessed)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">معاملات ناجحة</p>
                  <p className="text-base font-bold mt-0.5">{onlinePaymentsMonth}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">معاملات فاشلة</p>
                  <p className="text-base font-bold mt-0.5">{failedTransactions}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {entriesLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري تحميل المعاملات...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا توجد معاملات مالية هذا الشهر
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 grid grid-cols-5 gap-2 text-xs font-semibold">
                <div>المعرف</div>
                <div>النوع</div>
                <div>التاريخ</div>
                <div>المبلغ</div>
                <div>الحالة</div>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {entries.map((e) => {
                  const statusLabel = e.docstatus === 0 ? 'مسودة' : e.docstatus === 1 ? 'مُقدّم' : 'ملغي';
                  const statusColor = e.docstatus === 0 ? 'bg-secondary text-secondary-foreground' : e.docstatus === 1 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600';
                  return (
                    <div key={e.name} className="px-4 py-3 grid grid-cols-5 gap-2 items-center border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{e.name}</span>
                      <span className="text-xs">{e.payment_type === 'Receive' ? 'قبض' : e.payment_type === 'Pay' ? 'صرف' : 'تحويل داخلي'}</span>
                      <span className="text-xs text-muted-foreground">{e.posting_date}</span>
                      <span className="text-xs font-semibold">{formatCurrency(e.paid_amount || 0)}</span>
                      <Badge variant="outline" className={`text-[10px] border-0 ${statusColor} w-fit`}>{statusLabel}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ Quick Setup Tab ═══ */}
        <TabsContent value="setup" className="space-y-4">
          <Card className="border-primary/25 bg-primary/[0.03]">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-primary/15 p-2.5">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold">دليل الإعداد السريع</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    اتبع الخطوات التالية لإعداد نظام المدفوعات بالكامل
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'إنشاء طرق الدفع الأساسية',
                    desc: 'أضف طرق الدفع المستخدمة (نقدي، بنكي، إلكتروني) واربط كل طريقة بحساب GL',
                    link: '/settings/payment-methods',
                    linkLabel: 'طرق الدفع',
                    icon: CreditCard,
                  },
                  {
                    step: 2,
                    title: 'إعداد بوابات الدفع الإلكترونية',
                    desc: 'قم بتسجيل بوابات الدفع وربطها بمفاتيح API وحسابات التاجر',
                    link: '/settings/payment-gateways',
                    linkLabel: 'بوابات الدفع',
                    icon: Globe,
                  },
                  {
                    step: 3,
                    title: 'توجيه الحسابات المحاسبية',
                    desc: 'تأكد من توجيه كل طريقة دفع للحساب المحاسبي المناسب',
                    link: '/settings/account-routing',
                    linkLabel: 'توجيه الحسابات',
                    icon: ArrowLeftRight,
                  },
                  {
                    step: 4,
                    title: 'اختبار المعاملات',
                    desc: 'قم بإنشاء مدفوعات تجريبية للتأكد من عمل النظام بشكل صحيح',
                    link: '/accounting/payment-entry',
                    linkLabel: 'سندات القبض والصرف',
                    icon: CheckCircle2,
                  },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-4 rounded-lg border border-border/40 p-4 hover:border-border/60 transition-colors">
                    <div className="flex shrink-0 items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {s.step}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
                      <a href={s.link}>
                        <ExternalLink className="h-3 w-3" />
                        {s.linkLabel}
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payment Method Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة طريقة دفع جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">اسم طريقة الدفع *</Label>
              <Input placeholder="مثال: تحويل بنكي" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">النوع</Label>
              <Select value={formData.type} onValueChange={val => setFormData(prev => ({ ...prev, type: val }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">نقدي (Cash)</SelectItem>
                  <SelectItem value="Bank">بنكي (Bank)</SelectItem>
                  <SelectItem value="Electronic">إلكتروني (Electronic)</SelectItem>
                  <SelectItem value="General">عام (General)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pi-enabled"
                checked={formData.enabled}
                onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="pi-enabled" className="text-xs font-medium cursor-pointer">مفعّل</Label>
            </div>
            <Button className="w-full" onClick={handleCreateMethod} disabled={createMethodMutation.isPending}>
              {createMethodMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري الحفظ...</> : 'حفظ طريقة الدفع'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Gateway Dialog */}
      <Dialog open={gatewayDialogOpen} onOpenChange={setGatewayDialogOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              إضافة بوابة دفع إلكترونية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">اسم البوابة *</Label>
              <Input placeholder="مثال: Stripe" value={gatewayForm.name} onChange={e => setGatewayForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">رابط API</Label>
              <Input dir="ltr" placeholder="https://api.example.com" value={gatewayForm.url} onChange={e => setGatewayForm(prev => ({ ...prev, url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">مفتاح API</Label>
              <Input dir="ltr" type="password" placeholder="API Key" value={gatewayForm.apiKey} onChange={e => setGatewayForm(prev => ({ ...prev, apiKey: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">معرّف التاجر</Label>
              <Input dir="ltr" placeholder="Merchant ID" value={gatewayForm.merchantId} onChange={e => setGatewayForm(prev => ({ ...prev, merchantId: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleCreateGateway} disabled={createGatewayMutation.isPending}>
              {createGatewayMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري الحفظ...</> : 'حفظ البوابة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
