'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Calendar,
  Warehouse,
  CreditCard,
  User,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Shield,
  Receipt,
  LayoutGrid,
  Eye,
  EyeOff,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { apiExecuteSetup } from '@/lib/client/api';
import { setSetupConfig } from '@/lib/core/setup-config';

// ─── أنواع ────────────────────────────────────────────────────

type StepId = 'welcome' | 'server' | 'company' | 'modules' | 'fiscalYear' | 'warehouses' | 'paymentMethods' | 'tax' | 'admin' | 'employee' | 'review';

interface StepDef {
  id: StepId;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface WarehouseEntry {
  id: string;
  name: string;
}

interface PaymentMethodEntry {
  id: string;
  name: string;
  type: string;
}

interface ModuleEntry {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

interface FormData {
  backendHost: string;
  serverAdminUser: string;
  serverAdminPassword: string;
  serverConnectionTested: boolean;
  serverConnectionOk: boolean;
  companyName: string;
  abbr: string;
  country: string;
  currency: string;
  language: string;
  chartOfAccounts: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  fiscalYearName: string;
  warehouses: WarehouseEntry[];
  paymentMethods: PaymentMethodEntry[];
  enableTax: boolean;
  taxRate: number;
  taxName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  branchesEnabled: boolean;
  modules: ModuleEntry[];
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeDesignation: string;
}

// ─── ثوابت ────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  { id: 'welcome', title: 'مرحباً', description: 'ابدأ إعداد نظامك', icon: Sparkles },
  { id: 'server', title: 'الاتصال بالخادم', description: 'ربط نظام ERP Pro بالخادم', icon: Server },
  { id: 'company', title: 'الشركة', description: 'معلومات الشركة الأساسية', icon: Building2 },
  { id: 'modules', title: 'الوحدات', description: 'اختر الوحدات المطلوبة', icon: LayoutGrid },
  { id: 'fiscalYear', title: 'السنة المالية', description: 'تحديد الفترة المالية', icon: Calendar },
  { id: 'warehouses', title: 'المستودعات', description: 'إنشاء المستودعات الافتراضية', icon: Warehouse },
  { id: 'paymentMethods', title: 'طرق الدفع', description: 'إعداد طرق الدفع', icon: CreditCard },
  { id: 'tax', title: 'الضرائب', description: 'إعداد ضريبة القيمة المضافة', icon: Receipt },
  { id: 'admin', title: 'المستخدم الإداري', description: 'إنشاء حساب المدير', icon: Shield },
  { id: 'employee', title: 'الموظف الإداري', description: 'سجل المدير', icon: User },
  { id: 'review', title: 'مراجعة وتأكيد', description: 'تأكيد الإعداد', icon: CheckCircle2 },
];

const CURRENT_YEAR = new Date().getFullYear();

const COUNTRY_CURRENCY_MAP: Record<string, { currency: string; taxRate: number; taxName: string }> = {
  'Yemen': { currency: 'YER', taxRate: 5, taxName: 'ضريبة المبيعات' },
  'Saudi Arabia': { currency: 'YER', taxRate: 15, taxName: 'ضريبة القيمة المضافة' },
  'United Arab Emirates': { currency: 'AED', taxRate: 5, taxName: 'ضريبة القيمة المضافة' },
  'Kuwait': { currency: 'KWD', taxRate: 0, taxName: '' },
  'Egypt': { currency: 'EGP', taxRate: 14, taxName: 'ضريبة القيمة المضافة' },
  'Jordan': { currency: 'JOD', taxRate: 16, taxName: 'ضريبة المبيعات' },
  'Qatar': { currency: 'QAR', taxRate: 0, taxName: '' },
  'Bahrain': { currency: 'BHD', taxRate: 5, taxName: 'ضريبة القيمة المضافة' },
  'Oman': { currency: 'OMR', taxRate: 5, taxName: 'ضريبة القيمة المضافة' },
};

const DEFAULT_MODULES: ModuleEntry[] = [
  { id: 'accounting', label: 'المحاسبة والمالية', description: 'الفواتير، القيود، التقارير المالية، المدفوعات', icon: '💰', enabled: true },
  { id: 'sales', label: 'المبيعات', description: 'عروض الأسعار، أوامر البيع، فواتير المبيعات', icon: '📈', enabled: true },
  { id: 'purchases', label: 'المشتريات', description: 'طلبات الشراء، فواتير المشتريات، الموردون', icon: '🛒', enabled: true },
  { id: 'inventory', label: 'المخزون', description: 'إدارة المخزون، حركات المخزون، الجرد', icon: '📦', enabled: true },
  { id: 'hr', label: 'الموارد البشرية', description: 'الموظفون، الإجازات، الرواتب، الحضور', icon: '👥', enabled: true },
  { id: 'crm', label: 'إدارة العملاء', description: 'العملاء المحتملون، الفرص، الاتصالات', icon: '🤝', enabled: true },
  { id: 'manufacturing', label: 'التصنيع', description: 'أوامر العمل، قوائم المواد، محطات العمل', icon: '🏭', enabled: false },
  { id: 'projects', label: 'المشاريع', description: 'إدارة المشاريع، المهام، الجداول الزمنية', icon: '📋', enabled: false },
];

const DEFAULT_WAREHOUSES: WarehouseEntry[] = [
  { id: '1', name: 'المستودع الرئيسي' },
  { id: '2', name: 'منتجات تامة' },
  { id: '3', name: 'مواد خام' },
  { id: '4', name: 'تالف' },
];

const DEFAULT_PAYMENT_METHODS: PaymentMethodEntry[] = [
  { id: '1', name: 'نقدي', type: 'Cash' },
  { id: '2', name: 'تحويل بنكي', type: 'Bank' },
  { id: '3', name: 'بطاقة ائتمان', type: 'General' },
  { id: '4', name: 'مدى', type: 'Bank' },
  { id: '5', name: 'Apple Pay', type: 'General' },
];

let nextId = 100;
function genId(): string {
  return String(++nextId);
}

// ─── مولّد الاختصار من اسم عربي ────────────────────────────

function generateAbbr(arabicName: string): string {
  if (!arabicName.trim()) return '';
  const words = arabicName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0]!.slice(0, 3).toUpperCase();
  }
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 5);
}

// ─── مكون مؤشر قوة كلمة المرور ──────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: 'ضعيفة', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'متوسطة', color: 'bg-amber-500' };
    if (score <= 3) return { level: 3, label: 'جيدة', color: 'bg-blue-500' };
    return { level: 4, label: 'قوية', color: 'bg-emerald-500' };
  };

  const strength = getStrength(password);
  if (!password) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${strength.level <= 1 ? 'text-red-500' : strength.level <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
        {strength.label}
      </span>
    </div>
  );
}

// ─── المكون الرئيسي ──────────────────────────────────────────

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [setupResults, setSetupResults] = useState<{ step: string; status: string; message: string }[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    ping?: boolean;
    login?: boolean;
    apiKeys?: boolean;
  } | null>(null);

  const [form, setForm] = useState<FormData>({
    backendHost: '',
    serverAdminUser: 'Administrator',
    serverAdminPassword: '',
    serverConnectionTested: false,
    serverConnectionOk: false,
    companyName: '',
    abbr: '',
    country: 'Yemen',
    currency: 'YER',
    language: 'ar',
    chartOfAccounts: 'Yemen',
    fiscalYearStart: `${CURRENT_YEAR}-01-01`,
    fiscalYearEnd: `${CURRENT_YEAR}-12-31`,
    fiscalYearName: String(CURRENT_YEAR),
    warehouses: [...DEFAULT_WAREHOUSES],
    paymentMethods: [...DEFAULT_PAYMENT_METHODS],
    enableTax: true,
    taxRate: 5,
    taxName: 'ضريبة المبيعات',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
    branchesEnabled: false,
    modules: DEFAULT_MODULES.map((m) => ({ ...m })),
    employeeFirstName: '',
    employeeLastName: '',
    employeeEmail: '',
    employeePhone: '',
    employeeDesignation: 'مدير',
  });

  const updateForm = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // توليد الاختصار تلقائياً
  const handleCompanyNameChange = useCallback(
    (name: string) => {
      const abbr = generateAbbr(name);
      updateForm('companyName', name);
      updateForm('abbr', abbr);
    },
    [updateForm]
  );

  // تحديث العملة والضريبة عند تغيير الدولة
  const handleCountryChange = useCallback(
    (country: string) => {
      const config = COUNTRY_CURRENCY_MAP[country];
      if (config) {
        updateForm('country', country);
        updateForm('currency', config.currency);
        updateForm('taxRate', config.taxRate);
        updateForm('taxName', config.taxName || '');
        if (config.taxRate > 0) {
          updateForm('enableTax', true);
        }
      } else {
        updateForm('country', country);
      }
    },
    [updateForm]
  );

  // ملء بيانات المستخدم الإداري من بيانات الموظف
  useEffect(() => {
    if (form.adminEmail === '' && form.employeeEmail) {
      updateForm('adminEmail', form.employeeEmail);
    }
    if (form.adminFirstName === '' && form.employeeFirstName) {
      updateForm('adminFirstName', form.employeeFirstName);
    }
    if (form.adminLastName === '' && form.employeeLastName) {
      updateForm('adminLastName', form.employeeLastName);
    }
  }, [form.employeeEmail, form.employeeFirstName, form.employeeLastName]);

  // ── اختبار الاتصال بالخادم ─────────────────────────────

  const testConnection = useCallback(async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const response = await fetch('/api/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.backendHost,
          admin_user: form.serverAdminUser,
          admin_password: form.serverAdminPassword,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setConnectionResult({ success: true, message: data.message, ping: data.ping, login: data.login, apiKeys: data.apiKeys });
        updateForm('serverConnectionTested', true);
        updateForm('serverConnectionOk', true);
      } else {
        setConnectionResult({ success: false, message: data.error });
        updateForm('serverConnectionTested', true);
        updateForm('serverConnectionOk', false);
      }
    } catch {
      setConnectionResult({ success: false, message: 'فشل الاتصال بالخادم' });
      updateForm('serverConnectionTested', true);
      updateForm('serverConnectionOk', false);
    } finally {
      setTestingConnection(false);
    }
  }, [form.backendHost, form.serverAdminUser, form.serverAdminPassword, updateForm]);

  // ── التحقق من صحة الخطوة ────────────────────────────────

  const isStepValid = useCallback(
    (stepIndex: number): boolean => {
      switch (STEPS[stepIndex]?.id) {
        case 'welcome':
          return true;
        case 'server':
          return form.backendHost.trim().length > 0 && form.serverAdminPassword.trim().length > 0 && form.serverConnectionTested && form.serverConnectionOk;
        case 'company':
          return form.companyName.trim().length >= 2;
        case 'modules':
          return form.modules.some((m) => m.enabled);
        case 'fiscalYear':
          return form.fiscalYearStart.trim().length > 0 && form.fiscalYearEnd.trim().length > 0 && form.fiscalYearName.trim().length > 0;
        case 'warehouses':
          return form.warehouses.length > 0 && form.warehouses.every((w) => w.name.trim().length > 0);
        case 'paymentMethods':
          return form.paymentMethods.length > 0 && form.paymentMethods.every((p) => p.name.trim().length > 0);
        case 'tax':
          if (!form.enableTax) return true;
          return form.taxRate > 0 && form.taxName.trim().length > 0;
        case 'admin':
          return form.adminEmail.trim().length > 0 && form.adminPassword.trim().length >= 6 && form.adminFirstName.trim().length > 0;
        case 'employee':
          return form.employeeFirstName.trim().length > 0;
        case 'review':
          return true;
        default:
          return false;
      }
    },
    [form]
  );

  const canGoNext = useMemo(() => isStepValid(currentStep), [currentStep, isStepValid]);

  const goNext = useCallback(() => {
    if (canGoNext && currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [canGoNext, currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ── تنفيذ الإعداد ────────────────────────────────────────

  const executeSetup = useCallback(async () => {
    setExecuting(true);
    setSetupError('');
    try {
      const enabledModules = form.modules.filter((m) => m.enabled).map((m) => m.id);
      const result = await apiExecuteSetup({
        backend_host: form.backendHost,
        server_admin_user: form.serverAdminUser,
        server_admin_password: form.serverAdminPassword,
        company_name: form.companyName,
        abbr: form.abbr,
        currency: form.currency,
        country: form.country,
        language: form.language,
        chart_of_accounts: form.chartOfAccounts,
        fiscal_year_start: form.fiscalYearStart,
        fiscal_year_end: form.fiscalYearEnd,
        fiscal_year_name: form.fiscalYearName,
        warehouses: form.warehouses.map((w) => w.name),
        payment_methods: form.paymentMethods.map((p) => ({ name: p.name, type: p.type })),
        employee_first_name: form.employeeFirstName,
        employee_last_name: form.employeeLastName,
        employee_email: form.employeeEmail,
        employee_phone: form.employeePhone,
        employee_designation: form.employeeDesignation,
        // حقول جديدة
        admin_email: form.adminEmail,
        admin_password: form.adminPassword,
        admin_first_name: form.adminFirstName,
        admin_last_name: form.adminLastName,
        enable_tax: form.enableTax,
        tax_rate: form.taxRate,
        tax_name: form.taxName,
        enabled_modules: enabledModules,
      } as Record<string, unknown>);
      const resultsArr = Array.isArray(result.results)
        ? (result.results as { step: string; status: string; message: string }[])
        : [];
      setSetupResults(resultsArr);
      setSetupComplete(true);
      setSetupConfig({
        defaultCompany: form.companyName,
        branchesEnabled: form.branchesEnabled,
        enabledModules: enabledModules,
        currency: form.currency,
        country: form.country,
        language: form.language,
      });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'فشل تنفيذ الإعداد');
    } finally {
      setExecuting(false);
    }
  }, [form]);

  // ── الانتقال للوحة القيادة ──────────────────────────────

  const goToDashboard = useCallback(() => {
    router.push('/');
  }, [router]);

  // ── علامة التقدم ──────────────────────────────────────────

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  // ════════════════════════════════════════════════════════════
  // شاشة النجاح
  // ════════════════════════════════════════════════════════════

  if (setupComplete) {
    const errorCount = setupResults.filter((r) => r.status === 'error').length;
    const successCount = setupResults.filter((r) => r.status === 'ok').length;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-emerald-50 to-teal-50 p-4" dir="rtl">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-9 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">تم الإعداد بنجاح!</h2>
              <p className="text-muted-foreground mt-2">
                تم إعداد نظام ERP Pro للشركة &laquo;{form.companyName}&raquo;
              </p>
            </div>

            {setupResults.length > 0 && (
              <div className="text-start space-y-1 max-h-60 overflow-y-auto bg-muted/50 rounded-lg p-3">
                {setupResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {r.status === 'ok' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {r.status === 'skip' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                    {r.status === 'error' && <X className="w-4 h-4 text-red-500 shrink-0" />}
                    <span className={r.status === 'error' ? 'text-destructive' : r.status === 'skip' ? 'text-amber-600' : 'text-foreground'}>
                      {r.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3" /> {successCount} نجح
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="w-3 h-3" /> {errorCount} أخطاء
                </Badge>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-start space-y-2 text-sm">
              <p className="font-semibold">بيانات الدخول:</p>
              <div className="grid grid-cols-1 gap-1">
                <div><span className="text-muted-foreground">البريد:</span> {form.adminEmail}</div>
                <div><span className="text-muted-foreground">كلمة المرور:</span> {'•'.repeat(form.adminPassword.length)}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                احفظ هذه البيانات! يمكنك استخدامها لتسجيل الدخول بعد الإعداد.
              </p>
            </div>

            <Button size="lg" className="w-full text-lg h-12" onClick={goToDashboard}>
              الذهاب إلى لوحة القيادة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // خطوات المعالج
  // ════════════════════════════════════════════════════════════

  const stepDef = STEPS[currentStep];
  const StepIcon = stepDef?.icon ?? Sparkles;

  return (
    <div className="min-h-screen bg-gradient-to-bl from-slate-50 to-zinc-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* العنوان */}
        <div className="text-center space-y-2 pt-4">
          <h1 className="text-3xl font-bold text-foreground">إعداد النظام</h1>
          <p className="text-muted-foreground">معالج الإعداد الأولي لـ ERP Pro</p>
        </div>

        {/* شريط التقدم */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              الخطوة {currentStep + 1} من {STEPS.length}
            </span>
            <span className="text-sm font-medium text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="hidden md:flex items-center justify-between gap-1 flex-wrap">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => i < currentStep && setCurrentStep(i)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : isDone ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{s.title}</span>
                  {isDone && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* محتوى الخطوة */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{stepDef?.title}</CardTitle>
                <CardDescription>{stepDef?.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* ── الخطوة 0: مرحباً ────────────────────────── */}
            {currentStep === 0 && (
              <div className="text-center space-y-6 py-8">
                <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-bl from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold">مرحباً بك في ERP Pro</h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    نظام إدارة موارد المؤسسات الاحترافي باللغة العربية
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
                    <Building2 className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">إدارة مالية</p>
                    <p className="text-xs text-muted-foreground">فواتير ومحاسبة</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
                    <Warehouse className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">مخزون</p>
                    <p className="text-xs text-muted-foreground">تتبع وإدارة</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
                    <User className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">موارد بشرية</p>
                    <p className="text-xs text-muted-foreground">موظفون ورواتب</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  سيأخذك هذا المعالج في جولة سريعة لإعداد نظامك. العملية تستغرق بضع دقائق فقط.
                </p>
              </div>
            )}

            {/* ── الخطوة 1: الاتصال بالخادم ──────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  للعمل يحتاج النظام إلى الاتصال بخادم النظام. أدخل عنوان الخادم وبيانات الدخول.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="backend-host">عنوان الخادم *</Label>
                  <Input
                    id="backend-host"
                    placeholder="مثال: http://192.168.1.100:8000"
                    value={form.backendHost}
                    onChange={(e) => {
                      updateForm('backendHost', e.target.value);
                      updateForm('serverConnectionTested', false);
                    }}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    عنوان IP أو اسم النطاق مع المنفذ. يجب أن يكون خادم النظام قيد التشغيل.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="server-admin-user">مستخدم المدير</Label>
                    <Input
                      id="server-admin-user"
                      placeholder="Administrator"
                      value={form.serverAdminUser}
                      onChange={(e) => {
                        updateForm('serverAdminUser', e.target.value);
                        updateForm('serverConnectionTested', false);
                      }}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server-admin-password">كلمة مرور المدير *</Label>
                    <div className="relative">
                      <Input
                        id="server-admin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="كلمة مرور المدير"
                        value={form.serverAdminPassword}
                        onChange={(e) => {
                          updateForm('serverAdminPassword', e.target.value);
                          updateForm('serverConnectionTested', false);
                        }}
                      />
                      <button
                        type="button"
                        className="absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={testConnection}
                  disabled={!form.backendHost.trim() || !form.serverAdminPassword.trim() || testingConnection}
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري اختبار الاتصال...
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4" />
                      اختبار الاتصال
                    </>
                  )}
                </Button>

                {connectionResult && (
                  <div className={`p-4 rounded-lg border ${
                    connectionResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {connectionResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <p className={`text-sm font-medium ${connectionResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                          {connectionResult.success ? 'تم الاتصال بنجاح' : 'فشل الاتصال'}
                        </p>
                        <p className={`text-xs ${connectionResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                          {connectionResult.message}
                        </p>
                        {connectionResult.success && (
                          <div className="flex gap-3 mt-2">
                            {connectionResult.ping && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Check className="w-3 h-3" /> متاح
                              </Badge>
                            )}
                            {connectionResult.login && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Check className="w-3 h-3" /> تسجيل دخول
                              </Badge>
                            )}
                            {connectionResult.apiKeys && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Check className="w-3 h-3" /> مفاتيح API
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-medium">ملاحظة:</p>
                  <p>يجب أن يكون خادم النظام مثبتاً وقيد التشغيل قبل المتابعة. إذا لم يكن الخادم جاهزاً، يمكنك إعداده لاحقاً من صفحة الإعدادات.</p>
                </div>
              </div>
            )}

            {/* ── الخطوة 2: الشركة ──────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">اسم الشركة *</Label>
                  <Input
                    id="company-name"
                    placeholder="مثال: شركة النور التجارية"
                    value={form.companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="abbr">اختصار الشركة</Label>
                    <Input
                      id="abbr"
                      placeholder="يُولّد تلقائياً"
                      value={form.abbr}
                      onChange={(e) => updateForm('abbr', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">العملة</Label>
                    <Select value={form.currency} onValueChange={(v) => updateForm('currency', v)}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YER">ريال يمني (YER)</SelectItem>
                        <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                        <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                        <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                        <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                        <SelectItem value="JOD">دينار أردني (JOD)</SelectItem>
                        <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                        <SelectItem value="BHD">دينار بحريني (BHD)</SelectItem>
                        <SelectItem value="OMR">ريال عماني (OMR)</SelectItem>
                        <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                        <SelectItem value="EUR">يورو (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">الدولة</Label>
                    <Select value={form.country} onValueChange={handleCountryChange}>
                      <SelectTrigger id="country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yemen">اليمن</SelectItem>
                        <SelectItem value="Saudi Arabia">المملكة العربية السعودية</SelectItem>
                        <SelectItem value="United Arab Emirates">الإمارات العربية المتحدة</SelectItem>
                        <SelectItem value="Kuwait">الكويت</SelectItem>
                        <SelectItem value="Egypt">مصر</SelectItem>
                        <SelectItem value="Jordan">الأردن</SelectItem>
                        <SelectItem value="Qatar">قطر</SelectItem>
                        <SelectItem value="Bahrain">البحرين</SelectItem>
                        <SelectItem value="Oman">عُمان</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">اختيار الدولة يحدد العملة ونسبة الضريبة تلقائياً</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">اللغة</Label>
                    <Select value={form.language} onValueChange={(v) => updateForm('language', v)}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">الإنجليزية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coa">قالب دليل الحسابات</Label>
                  <Select value={form.chartOfAccounts} onValueChange={(v) => updateForm('chartOfAccounts', v)}>
                    <SelectTrigger id="coa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yemen">اليمن</SelectItem>
                      <SelectItem value="Saudi Arabia">المملكة العربية السعودية</SelectItem>
                      <SelectItem value="Standard">قياسي (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    يُنشئ النظام دليل الحسابات تلقائياً بناءً على القالب المختار
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/40 p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">تفعيل الفروع</Label>
                    <p className="text-xs text-muted-foreground">
                      فعّل هذا الخيار إذا كانت الشركة تعمل بنظام الفروع. يمكنك إضافة الفروع لاحقاً من الإعدادات.
                    </p>
                  </div>
                  <Switch
                    checked={form.branchesEnabled}
                    onCheckedChange={(v) => updateForm('branchesEnabled', v)}
                  />
                </div>
              </div>
            )}

            {/* ── الخطوة 3: الوحدات ───────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  اختر الوحدات التي تحتاجها. يمكنك تفعيل وحدات إضافية لاحقاً من الإعدادات.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {form.modules.map((mod, idx) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        const updated = [...form.modules];
                        updated[idx] = { ...updated[idx]!, enabled: !updated[idx]!.enabled };
                        updateForm('modules', updated);
                      }}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 text-start transition-all ${
                        mod.enabled
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-muted bg-background hover:border-muted-foreground/30'
                      }`}
                    >
                      <span className="text-2xl mt-0.5">{mod.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{mod.label}</p>
                          {mod.enabled && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">مفعّل</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        mod.enabled ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      }`}>
                        {mod.enabled && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  وحدات المحاسبة والمبيعات والمشتريات مطلوبة للعمليات الأساسية.
                </p>
              </div>
            )}

            {/* ── الخطوة 4: السنة المالية ────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fy-name">اسم السنة المالية</Label>
                  <Input
                    id="fy-name"
                    value={form.fiscalYearName}
                    onChange={(e) => updateForm('fiscalYearName', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fy-start">تاريخ البداية</Label>
                    <Input
                      id="fy-start"
                      type="date"
                      value={form.fiscalYearStart}
                      onChange={(e) => updateForm('fiscalYearStart', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fy-end">تاريخ النهاية</Label>
                    <Input
                      id="fy-end"
                      type="date"
                      value={form.fiscalYearEnd}
                      onChange={(e) => updateForm('fiscalYearEnd', e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                  السنة المالية الافتراضية هي السنة التقويمية الحالية ({CURRENT_YEAR}).
                  يمكنك تعديل التواريخ حسب متطلبات الشركة.
                </p>
              </div>
            )}

            {/* ── الخطوة 5: المستودعات ───────────────────── */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>المستودعات</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      const newWh: WarehouseEntry = { id: genId(), name: '' };
                      updateForm('warehouses', [...form.warehouses, newWh]);
                    }}
                  >
                    <Plus className="w-4 h-4" /> إضافة مستودع
                  </Button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {form.warehouses.map((wh, idx) => (
                    <div key={wh.id} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-6 text-center">{idx + 1}</span>
                      <Input
                        placeholder="اسم المستودع"
                        value={wh.name}
                        onChange={(e) => {
                          const updated = [...form.warehouses];
                          updated[idx] = { ...updated[idx]!, name: e.target.value };
                          updateForm('warehouses', updated);
                        }}
                      />
                      {form.warehouses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            updateForm('warehouses', form.warehouses.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── الخطوة 6: طرق الدفع ────────────────────── */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>طرق الدفع</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      const newPm: PaymentMethodEntry = { id: genId(), name: '', type: 'Cash' };
                      updateForm('paymentMethods', [...form.paymentMethods, newPm]);
                    }}
                  >
                    <Plus className="w-4 h-4" /> إضافة طريقة
                  </Button>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {form.paymentMethods.map((pm, idx) => (
                    <div key={pm.id} className="flex items-center gap-2">
                      <Input
                        placeholder="اسم طريقة الدفع"
                        value={pm.name}
                        className="flex-1"
                        onChange={(e) => {
                          const updated = [...form.paymentMethods];
                          updated[idx] = { ...updated[idx]!, name: e.target.value };
                          updateForm('paymentMethods', updated);
                        }}
                      />
                      <Select
                        value={pm.type}
                        onValueChange={(v) => {
                          const updated = [...form.paymentMethods];
                          updated[idx] = { ...updated[idx]!, type: v };
                          updateForm('paymentMethods', updated);
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">نقدي</SelectItem>
                          <SelectItem value="Bank">بنكي</SelectItem>
                          <SelectItem value="General">عام</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.paymentMethods.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-500 hover:text-red-700"
                          onClick={() => {
                            updateForm('paymentMethods', form.paymentMethods.filter((_, i) => i !== idx));
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── الخطوة 7: الضرائب ──────────────────────── */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <p className="font-medium">تفعيل ضريبة القيمة المضافة</p>
                    <p className="text-xs text-muted-foreground">
                      {form.country === 'Saudi Arabia'
                        ? 'ضريبة القيمة المضافة في السعودية 15%'
                        : form.country === 'Egypt'
                        ? 'ضريبة القيمة المضافة في مصر 14%'
                        : 'تفعيل إذا كانت شركتك مسجلة للضريبة'}
                    </p>
                  </div>
                  <Switch
                    checked={form.enableTax}
                    onCheckedChange={(checked) => updateForm('enableTax', checked)}
                  />
                </div>

                {form.enableTax && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tax-name">اسم الضريبة</Label>
                        <Input
                          id="tax-name"
                          value={form.taxName}
                          onChange={(e) => updateForm('taxName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax-rate">النسبة المئوية (%)</Label>
                        <Input
                          id="tax-rate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={form.taxRate}
                          onChange={(e) => updateForm('taxRate', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-3 text-sm space-y-2">
                      <p className="font-medium">سيتم إنشاء:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          3 حسابات ضريبية (مخرجات، مدخلات، صافي)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          قالب ضريبة مبيعات ({form.taxName} — مبيعات)
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          قالب ضريبة مشتريات ({form.taxName} — مشتريات)
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── الخطوة 8: المستخدم الإداري ────────────────── */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p className="font-medium">حساب المدير</p>
                  <p className="text-muted-foreground mt-1">
                    هذا الحساب يستخدم لتسجيل الدخول إلى النظام وإدارة جميع العمليات.
                    ستحصل على صلاحيات كاملة (System Manager).
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-fname">الاسم الأول *</Label>
                    <Input
                      id="admin-fname"
                      placeholder="مثال: أحمد"
                      value={form.adminFirstName}
                      onChange={(e) => updateForm('adminFirstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-lname">الاسم الأخير</Label>
                    <Input
                      id="admin-lname"
                      placeholder="مثال: محمد"
                      value={form.adminLastName}
                      onChange={(e) => updateForm('adminLastName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">البريد الإلكتروني *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@company.com"
                    value={form.adminEmail}
                    onChange={(e) => updateForm('adminEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">كلمة المرور *</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="6 أحرف على الأقل"
                      value={form.adminPassword}
                      onChange={(e) => updateForm('adminPassword', e.target.value)}
                      className="ps-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={form.adminPassword} />
                </div>
                <p className="text-xs text-muted-foreground">
                  سيتم إنشاء مفاتيح API تلقائياً لربط النظام بالخادم بدون تدخل يدوي.
                </p>
              </div>
            )}

            {/* ── الخطوة 9: الموظف الإداري ──────────────── */}
            {currentStep === 9 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  سجل الموظف الإداري في النظام (مختلف عن حساب الدخول).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emp-fname">الاسم الأول *</Label>
                    <Input
                      id="emp-fname"
                      placeholder="مثال: أحمد"
                      value={form.employeeFirstName}
                      onChange={(e) => updateForm('employeeFirstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-lname">الاسم الأخير</Label>
                    <Input
                      id="emp-lname"
                      placeholder="مثال: محمد"
                      value={form.employeeLastName}
                      onChange={(e) => updateForm('employeeLastName', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emp-email">البريد الإلكتروني</Label>
                    <Input
                      id="emp-email"
                      type="email"
                      placeholder="admin@company.com"
                      value={form.employeeEmail}
                      onChange={(e) => updateForm('employeeEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-phone">رقم الهاتف</Label>
                    <Input
                      id="emp-phone"
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={form.employeePhone}
                      onChange={(e) => updateForm('employeePhone', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-designation">المسمى الوظيفي</Label>
                  <Input
                    id="emp-designation"
                    placeholder="مثال: مدير"
                    value={form.employeeDesignation}
                    onChange={(e) => updateForm('employeeDesignation', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── الخطوة 10: مراجعة وتأكيد ───────────────── */}
            {currentStep === 10 && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">اتصال الخادم</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">عنوان الخادم:</span> {form.backendHost || '—'}</div>
                    <div><span className="text-muted-foreground">المستخدم:</span> {form.serverAdminUser}</div>
                    <div><span className="text-muted-foreground">حالة الاتصال:</span> {form.serverConnectionOk ? '✓ متصل' : '✗ غير متصل'}</div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">معلومات الشركة</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">الاسم:</span> {form.companyName}</div>
                    <div><span className="text-muted-foreground">الاختصار:</span> {form.abbr || '—'}</div>
                    <div><span className="text-muted-foreground">العملة:</span> {form.currency}</div>
                    <div><span className="text-muted-foreground">الدولة:</span> {form.country}</div>
                    <div><span className="text-muted-foreground">اللغة:</span> {form.language === 'ar' ? 'العربية' : 'الإنجليزية'}</div>
                    <div><span className="text-muted-foreground">دليل الحسابات:</span> {form.chartOfAccounts === 'Saudi Arabia' ? 'السعودية' : 'قياسي'}</div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">الوحدات المفعّلة</h3>
                  <div className="flex flex-wrap gap-2">
                    {form.modules.filter((m) => m.enabled).map((m) => (
                      <Badge key={m.id} variant="secondary" className="gap-1">
                        {m.icon} {m.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">السنة المالية</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div><span className="text-muted-foreground">الاسم:</span> {form.fiscalYearName}</div>
                    <div><span className="text-muted-foreground">البداية:</span> {form.fiscalYearStart}</div>
                    <div><span className="text-muted-foreground">النهاية:</span> {form.fiscalYearEnd}</div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">المستودعات ({form.warehouses.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {form.warehouses.map((w) => (
                      <Badge key={w.id} variant="secondary">{w.name}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">طرق الدفع ({form.paymentMethods.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {form.paymentMethods.map((p) => (
                      <Badge key={p.id} variant="secondary">
                        {p.name} ({p.type === 'Cash' ? 'نقدي' : p.type === 'Bank' ? 'بنكي' : 'عام'})
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">الضرائب</h3>
                  {form.enableTax ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">الضريبة:</span> {form.taxName}</div>
                      <div><span className="text-muted-foreground">النسبة:</span> {form.taxRate}%</div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لم يتم تفعيل الضرائب</p>
                  )}
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">المستخدم الإداري</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">الاسم:</span> {form.adminFirstName} {form.adminLastName}</div>
                    <div><span className="text-muted-foreground">البريد:</span> {form.adminEmail}</div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-base">الموظف الإداري</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">الاسم:</span> {form.employeeFirstName} {form.employeeLastName}</div>
                    <div><span className="text-muted-foreground">المسمى:</span> {form.employeeDesignation || '—'}</div>
                    <div><span className="text-muted-foreground">البريد:</span> {form.employeeEmail || '—'}</div>
                    <div><span className="text-muted-foreground">الهاتف:</span> {form.employeePhone || '—'}</div>
                  </div>
                </div>

                {setupError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {setupError}
                  </div>
                )}
              </div>
            )}

            {/* ── أزرار التنقل ───────────────────────────── */}
            <Separator />
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext} disabled={!canGoNext} className="gap-1">
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={executeSetup}
                  disabled={executing}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-40"
                >
                  {executing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جارٍ الإعداد...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      بدء الإعداد
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
