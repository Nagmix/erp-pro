'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { DataTable, type Column } from '@/components/erp/data-table';

import { useDocList } from '@/lib/client/hooks';
import { toast } from 'sonner';
import { PageHeader, PageShell } from '@/components/erp/page-header';
import {
 Save,
 Loader2,
 Shield,
 Lock,
 Key,
 Clock,
 Smartphone,
 Ban,
 Globe,
 CheckCircle2,
 XCircle,
 AlertTriangle,
} from 'lucide-react';

/* ──────────────────────────────────────────── */
/* Types          */
/* ──────────────────────────────────────────── */

type SecuritySettings = {
 minPasswordLength: number;
 requireUppercase: boolean;
 requireLowercase: boolean;
 requireNumbers: boolean;
 requireSymbols: boolean;
 sessionHours: number;
 simultaneousSessions: number;
 forcePasswordReset: boolean;
 forcePasswordResetDays: number;
 twoFactorEnabled: boolean;
 twoFactorMethod: string;
 maxLoginAttempts: number;
 lockoutDuration: number;
 ipRestriction: boolean;
 allowedIps: string;
};

type LoginRow = { name: string; owner?: string; status?: string; creation?: string };

const defaultSettings: SecuritySettings = {
 minPasswordLength: 10,
 requireUppercase: true,
 requireLowercase: true,
 requireNumbers: true,
 requireSymbols: false,
 sessionHours: 8,
 simultaneousSessions: 3,
 forcePasswordReset: false,
 forcePasswordResetDays: 90,
 twoFactorEnabled: false,
 twoFactorMethod: 'OTP App',
 maxLoginAttempts: 5,
 lockoutDuration: 15,
 ipRestriction: false,
 allowedIps: '',
};

const columns: Column<LoginRow>[] = [
 { key: 'owner', header: 'المستخدم', sortable: true },
 { key: 'status', header: 'الحالة', sortable: true },
 { key: 'creation', header: 'التاريخ', sortable: true },
];

/* ──────────────────────────────────────────── */
/* Main Component        */
/* ──────────────────────────────────────────── */

export default function SecuritySettingsPage() {
 const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
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
  queueMicrotask(() => {
   if (cancelled) return;
   setSettings({ ...defaultSettings, ...j.data });
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

 const updateField = useCallback(<K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
 setSettings((prev) => ({ ...prev, [key]: value }));
 }, []);

 const savePrefs = useCallback(async () => {
 setSaving(true);
 try {
  const res = await fetch('/api/settings/security', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(settings),
  });
  const j = await res.json();
  if (!j?.success) throw new Error(j?.error || 'فشل الحفظ');
  toast.success('تم حفظ إعدادات الأمان بنجاح');
 } catch (e) {
  toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
 } finally {
  setSaving(false);
 }
 }, [settings]);

 /* ── Password strength score ── */
 const passwordStrength = (() => {
 let score = 0;
 if (settings.minPasswordLength >= 8) score++;
 if (settings.minPasswordLength >= 12) score++;
 if (settings.requireUppercase) score++;
 if (settings.requireLowercase) score++;
 if (settings.requireNumbers) score++;
 if (settings.requireSymbols) score++;
 return score;
 })();

 const strengthLabel = passwordStrength <= 2 ? 'ضعيفة' : passwordStrength <= 4 ? 'متوسطة' : 'قوية';
 const strengthColor =
 passwordStrength <= 2
  ? 'text-destructive bg-destructive/10 ring-destructive/25'
  : passwordStrength <= 4
  ? 'text-chart-2 bg-chart-2/10 ring-chart-2/25'
  : 'text-primary bg-primary/10 ring-primary/25';

 const strengthBarColor =
 passwordStrength <= 2
  ? 'bg-destructive'
  : passwordStrength <= 4
  ? 'bg-chart-2'
  : 'bg-chart-3';

 if (loadingPrefs) {
 return (
  <div dir="rtl" className="erp-page-enter space-y-5">
  <PageHeader
   title="إعدادات الأمان"
   description="سياسة كلمات المرور ومدة الجلسة والمصادقة الثنائية وتقييد IP وسجل الدخول"
   iconify="solar:shield-keyhole-bold-duotone"
   accent="destructive"
   breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الأمان' }]}
  />
  <div className="flex items-center justify-center py-20">
   <Loader2 className="h-8 w-8 animate-spin text-primary" />
   <span className="ms-3 text-sm text-muted-foreground">جاري تحميل الإعدادات…</span>
  </div>
  </div>
 );
 }

 return (
 <div dir="rtl" className="erp-page-enter space-y-5">
  {/* ── Header ── */}
  <PageHeader
  title="إعدادات الأمان"
  description="سياسة كلمات المرور ومدة الجلسة والمصادقة الثنائية وتقييد IP وسجل الدخول"
  iconify="solar:shield-keyhole-bold-duotone"
  accent="destructive"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'الأمان' }]}
  actions={
   <Button
   size="sm"
   className="gap-1.5"
   disabled={saving}
   onClick={() => void savePrefs()}
   >
   {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
   حفظ الإعدادات
   </Button>
  }
  />

  {/* ── Overview KPIs ── */}
  {/* ── Password Policy ── */}
  <PageShell>
  <div className="space-y-4">
   <div className="flex items-center gap-2 mb-2">
   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
    <Lock className="h-4 w-4" />
   </div>
   <div>
    <h2 className="text-sm font-bold">سياسة كلمات المرور</h2>
    <p className="text-xs text-muted-foreground">تحديد متطلبات كلمات المرور للمستخدمين</p>
   </div>
   </div>

   <div className="grid md:grid-cols-2 gap-4">
   <div className="space-y-2">
    <Label className="text-xs font-semibold">الحد الأدنى لطول كلمة المرور</Label>
    <Input
    type="number"
    value={settings.minPasswordLength}
    onChange={(e) => updateField('minPasswordLength', Number(e.target.value) || 6)}
    min={6}
    max={128}
    />
    <p className="text-[10px] text-muted-foreground">الحد الأدنى: 6 أحرف</p>
   </div>
   <div className="space-y-2">
    <Label className="text-xs font-semibold">قوة السياسة</Label>
    <div className="space-y-2 pt-1">
    <div className="flex items-center gap-2">
     <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
     <div
      className={`h-full rounded-full transition-all duration-300 ${strengthBarColor}`}
      style={{ width: `${(passwordStrength / 6) * 100}%` }}
     />
     </div>
     <Badge variant="outline" className={`text-[10px] border-0 ring-1 ring-inset ${strengthColor}`}>
     {strengthLabel}
     </Badge>
    </div>
    </div>
   </div>
   </div>

   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
   <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
    <div className="space-y-0.5">
    <Label className="text-xs font-semibold">أحرف كبيرة</Label>
    <p className="text-[10px] text-muted-foreground">A-Z</p>
    </div>
    <Switch
    checked={settings.requireUppercase}
    onCheckedChange={(v) => updateField('requireUppercase', v)}
    />
   </div>
   <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
    <div className="space-y-0.5">
    <Label className="text-xs font-semibold">أحرف صغيرة</Label>
    <p className="text-[10px] text-muted-foreground">a-z</p>
    </div>
    <Switch
    checked={settings.requireLowercase}
    onCheckedChange={(v) => updateField('requireLowercase', v)}
    />
   </div>
   <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
    <div className="space-y-0.5">
    <Label className="text-xs font-semibold">أرقام</Label>
    <p className="text-[10px] text-muted-foreground">0-9</p>
    </div>
    <Switch
    checked={settings.requireNumbers}
    onCheckedChange={(v) => updateField('requireNumbers', v)}
    />
   </div>
   <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
    <div className="space-y-0.5">
    <Label className="text-xs font-semibold">رموز خاصة</Label>
    <p className="text-[10px] text-muted-foreground">!@#$%</p>
    </div>
    <Switch
    checked={settings.requireSymbols}
    onCheckedChange={(v) => updateField('requireSymbols', v)}
    />
   </div>
   </div>
  </div>
  </PageShell>

  {/* ── Session Settings ── */}
  <PageShell>
  <div className="space-y-4">
   <div className="flex items-center gap-2 mb-2">
   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
    <Clock className="h-4 w-4" />
   </div>
   <div>
    <h2 className="text-sm font-bold">إعدادات الجلسة</h2>
    <p className="text-xs text-muted-foreground">التحكم في مدة الجلسة والجلسات المتزامنة</p>
   </div>
   </div>

   <div className="grid md:grid-cols-2 gap-4">
   <div className="space-y-2">
    <Label className="text-xs font-semibold">مدة انتهاء الجلسة (ساعات)</Label>
    <Input
    type="number"
    value={settings.sessionHours}
    onChange={(e) => updateField('sessionHours', Number(e.target.value) || 1)}
    min={1}
    max={720}
    />
    <p className="text-[10px] text-muted-foreground">بعد انتهاء المدة، يُطلب من المستخدم تسجيل الدخول مجدداً</p>
   </div>
   <div className="space-y-2">
    <Label className="text-xs font-semibold">الحد الأقصى للجلسات المتزامنة</Label>
    <Input
    type="number"
    value={settings.simultaneousSessions}
    onChange={(e) => updateField('simultaneousSessions', Number(e.target.value) || 1)}
    min={1}
    max={20}
    />
    <p className="text-[10px] text-muted-foreground">عدد الجلسات المسموح بها لكل مستخدم في نفس الوقت</p>
   </div>
   </div>

   <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
   <div className="flex items-center justify-between">
    <div className="space-y-0.5">
    <Label className="text-xs font-semibold">إجبار إعادة تعيين كلمة المرور</Label>
    <p className="text-[10px] text-muted-foreground">يُطلب من المستخدمين تغيير كلمة المرور دورياً</p>
    </div>
    <Switch
    checked={settings.forcePasswordReset}
    onCheckedChange={(v) => updateField('forcePasswordReset', v)}
    />
   </div>
   {settings.forcePasswordReset && (
    <div className="space-y-2 pt-1">
    <Label className="text-xs font-semibold">فترة الإعادة (أيام)</Label>
    <Input
     type="number"
     value={settings.forcePasswordResetDays}
     onChange={(e) => updateField('forcePasswordResetDays', Number(e.target.value) || 30)}
     min={7}
     max={365}
    />
    <p className="text-[10px] text-muted-foreground">يتم التذكير بتغيير كلمة المرور كل {settings.forcePasswordResetDays} يوم</p>
    </div>
   )}
   </div>
  </div>
  </PageShell>

  {/* ── Two-Factor Authentication ── */}
  <PageShell>
  <div className="space-y-4">
   <div className="flex items-center gap-2 mb-2">
   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
    <Smartphone className="h-4 w-4" />
   </div>
   <div>
    <h2 className="text-sm font-bold">المصادقة الثنائية (2FA)</h2>
    <p className="text-xs text-muted-foreground">طبقة حماية إضافية لحسابات المستخدمين</p>
   </div>
   </div>

   <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
   <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
    {settings.twoFactorEnabled ? (
     <CheckCircle2 className="h-5 w-5 text-chart-3" />
    ) : (
     <XCircle className="h-5 w-5 text-muted-foreground" />
    )}
    <div className="space-y-0.5">
     <Label className="text-xs font-semibold">تفعيل المصادقة الثنائية</Label>
     <p className="text-[10px] text-muted-foreground">
     {settings.twoFactorEnabled
      ? 'المصادقة الثنائية مفعّلة — يُطلب رمز تحقق إضافي عند تسجيل الدخول'
      : 'المصادقة الثنائية معطّلة — يُوصى بتفعيلها لحماية أفضل'}
     </p>
    </div>
    </div>
    <Switch
    checked={settings.twoFactorEnabled}
    onCheckedChange={(v) => updateField('twoFactorEnabled', v)}
    />
   </div>
   </div>

   {settings.twoFactorEnabled && (
   <div className="space-y-2">
    <Label className="text-xs font-semibold">طريقة المصادقة</Label>
    <Select
    value={settings.twoFactorMethod}
    onValueChange={(v) => updateField('twoFactorMethod', v)}
    >
    <SelectTrigger className="h-9 text-sm">
     <SelectValue />
    </SelectTrigger>
    <SelectContent>
     <SelectItem value="OTP App">تطبيق المصادقة (OTP)</SelectItem>
     <SelectItem value="SMS">رسالة نصية (SMS)</SelectItem>
     <SelectItem value="Email">البريد الإلكتروني</SelectItem>
    </SelectContent>
    </Select>
    <p className="text-[10px] text-muted-foreground">
    {settings.twoFactorMethod === 'OTP App' && 'يتم إنشاء رمز تحقق من تطبيق مثل Google Authenticator'}
    {settings.twoFactorMethod === 'SMS' && 'يتم إرسال رمز تحقق عبر رسالة نصية إلى هاتف المستخدم'}
    {settings.twoFactorMethod === 'Email' && 'يتم إرسال رمز تحقق عبر البريد الإلكتروني المسجل'}
    </p>
   </div>
   )}
  </div>
  </PageShell>

  {/* ── Login Attempt Rate Limiting ── */}
  <PageShell>
  <div className="space-y-4">
   <div className="flex items-center gap-2 mb-2">
   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
    <Ban className="h-4 w-4" />
   </div>
   <div>
    <h2 className="text-sm font-bold">تحديد محاولات الدخول</h2>
    <p className="text-xs text-muted-foreground">حماية من هجمات التخمين على كلمات المرور</p>
   </div>
   </div>

   <div className="grid md:grid-cols-2 gap-4">
   <div className="space-y-2">
    <Label className="text-xs font-semibold">الحد الأقصى لمحاولات الدخول</Label>
    <Input
    type="number"
    value={settings.maxLoginAttempts}
    onChange={(e) => updateField('maxLoginAttempts', Number(e.target.value) || 1)}
    min={1}
    max={50}
    />
    <p className="text-[10px] text-muted-foreground">عدد المحاولات المسموح بها قبل قفل الحساب</p>
   </div>
   <div className="space-y-2">
    <Label className="text-xs font-semibold">مدة القفل (دقائق)</Label>
    <Input
    type="number"
    value={settings.lockoutDuration}
    onChange={(e) => updateField('lockoutDuration', Number(e.target.value) || 1)}
    min={1}
    max={1440}
    />
    <p className="text-[10px] text-muted-foreground">مدة تعطيل الحساب بعد تجاوز الحد الأقصى</p>
   </div>
   </div>

   <div className="flex items-start gap-2 p-3 rounded-lg border border-chart-2/20 bg-chart-2/5">
   <AlertTriangle className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
   <p className="text-[11px] text-chart-2 leading-relaxed">
    بعد {settings.maxLoginAttempts} محاولات فاشلة، يتم قفل الحساب لمدة {settings.lockoutDuration} دقيقة.
    هذا الإعداد يساعد في منع هجمات القوة الغاشمة.
   </p>
   </div>
  </div>
  </PageShell>

  {/* ── IP Restriction ── */}
  <PageShell>
  <div className="space-y-4">
   <div className="flex items-center gap-2 mb-2">
   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
    <Globe className="h-4 w-4" />
   </div>
   <div>
    <h2 className="text-sm font-bold">تقييد عنوان IP</h2>
    <p className="text-xs text-muted-foreground">السماح بالوصول فقط من عناوين IP محددة</p>
   </div>
   </div>

   <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-3">
   <div className="flex items-center justify-between">
    <div className="space-y-0.5">
    <Label className="text-xs font-semibold">تفعيل تقييد IP</Label>
    <p className="text-[10px] text-muted-foreground">
     {settings.ipRestriction
     ? 'الوصول مقيد بالعناوين المحددة فقط'
     : 'الوصول مسموح من جميع عناوين IP'}
    </p>
    </div>
    <Switch
    checked={settings.ipRestriction}
    onCheckedChange={(v) => updateField('ipRestriction', v)}
    />
   </div>
   </div>

   {settings.ipRestriction && (
   <div className="space-y-2">
    <Label className="text-xs font-semibold">العناوين المسموح بها</Label>
    <Input
    dir="ltr"
    value={settings.allowedIps}
    onChange={(e) => updateField('allowedIps', e.target.value)}
    placeholder="192.168.1.10, 10.0.0.0/24, 172.16.0.0/16"
    />
    <p className="text-[10px] text-muted-foreground">
    أدخل عناوين IP أو نطاقات CIDR مفصولة بفواصل. مثال: 192.168.1.0/24, 10.0.0.5
    </p>
   </div>
   )}
  </div>
  </PageShell>

  {/* ── Login Activity Log ── */}
  <PageShell padded={false}>
  <div className="p-4 lg:p-5 pb-0">
   <div className="flex items-center gap-2 mb-2">
   <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
    <Shield className="h-4 w-4" />
   </div>
   <div>
    <h2 className="text-sm font-bold">سجل نشاط الدخول</h2>
    <p className="text-xs text-muted-foreground">آخر محاولات تسجيل الدخول المسجلة في النظام</p>
   </div>
   </div>
  </div>
  <DataTable
   data={logins.data || []}
   columns={columns}
   searchable
   loading={logins.isLoading}
   tableId="security-login-log"
   exportFileName="سجل_الدخول"
  />
  </PageShell>
 </div>
 );
}
