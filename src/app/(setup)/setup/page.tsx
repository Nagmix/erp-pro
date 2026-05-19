'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Calendar,
  Warehouse,
  CreditCard,
  User,
  CheckCircle2,
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
  Upload,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Phone,
  MapPin,
  FileText,
  PartyPopper,
  ArrowLeft,
  ArrowRight,
  Info,
  RefreshCw,
  Landmark,
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Handshake,
  Factory,
  Kanban,
  CalendarDays,
  Briefcase,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiExecuteSetup, apiCheckSetupStatus } from '@/lib/client/api';
import { setSetupConfig } from '@/lib/core/setup-config';

// ─── أنواع ────────────────────────────────────────────────────

type StepId = 'welcome' | 'branding' | 'server' | 'company' | 'modules' | 'hrmsSetup' | 'fiscalYear' | 'warehouses' | 'paymentMethods' | 'tax' | 'admin' | 'employee' | 'review';

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
  icon: React.ElementType;
  enabled: boolean;
}

interface FieldError {
  [key: string]: string;
}

interface HrmsDefaults {
  expenseClaimTypes: Array<{ name: string; englishName: string }>;
  leaveTypes: Array<{ name: string; englishName: string; is_carry_forward: number; is_lwp: number; allow_encashment: number }>;
  salaryComponents: Array<{ name: string; type: string }>;
  employmentTypes: string[];
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
  // حقول جديدة
  companyLogo: string;
  companyTagline: string;
  companyPhone: string;
  companyAddress: string;
  companyTaxId: string;
  adminPasswordConfirm: string;
  dataConfirmed: boolean;
  // حقول HRMS
  hrmsSelectedExpenseTypes: Set<string>;
  hrmsSelectedLeaveTypes: Set<string>;
  hrmsSelectedSalaryComponents: Set<string>;
  hrmsSelectedEmploymentTypes: Set<string>;
}

// ─── ثوابت ────────────────────────────────────────────────────

const APP_VERSION = '2.0.0';

const STEPS: StepDef[] = [
  { id: 'welcome', title: 'مرحباً', description: 'ابدأ إعداد نظامك', icon: Sparkles },
  { id: 'branding', title: 'شعار الشركة', description: 'العلامة التجارية والشعار', icon: ImageIcon },
  { id: 'server', title: 'الاتصال بالخادم', description: 'ربط نظام ERP Pro بالخادم', icon: Server },
  { id: 'company', title: 'الشركة', description: 'معلومات الشركة الأساسية', icon: Building2 },
  { id: 'modules', title: 'الوحدات', description: 'اختر الوحدات المطلوبة', icon: LayoutGrid },
  { id: 'hrmsSetup', title: 'إعداد الموارد البشرية', description: 'تهيئة بيانات HRMS', icon: Users },
  { id: 'fiscalYear', title: 'السنة المالية', description: 'تحديد الفترة المالية', icon: Calendar },
  { id: 'warehouses', title: 'المستودعات', description: 'إنشاء المستودعات الافتراضية', icon: Warehouse },
  { id: 'paymentMethods', title: 'طرق الدفع', description: 'إعداد طرق الدفع', icon: CreditCard },
  { id: 'tax', title: 'الضرائب', description: 'إعداد ضريبة القيمة المضافة', icon: Receipt },
  { id: 'admin', title: 'المستخدم الإداري', description: 'إنشاء حساب المدير', icon: Shield },
  { id: 'employee', title: 'الموظف الإداري', description: 'سجل المدير', icon: User },
  { id: 'review', title: 'مراجعة وتأكيد', description: 'تأكيد الإعداد', icon: CheckCircle2 },
];

const CURRENT_YEAR = new Date().getFullYear();

const COUNTRY_CURRENCY_MAP: Record<string, { currency: string; taxRate: number; taxName: string; taxSupported: boolean }> = {
  'Yemen': { currency: 'YER', taxRate: 5, taxName: 'ضريبة المبيعات', taxSupported: false },
  'Saudi Arabia': { currency: 'SAR', taxRate: 15, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'United Arab Emirates': { currency: 'AED', taxRate: 5, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'Kuwait': { currency: 'KWD', taxRate: 0, taxName: '', taxSupported: false },
  'Egypt': { currency: 'EGP', taxRate: 14, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'Jordan': { currency: 'JOD', taxRate: 16, taxName: 'ضريبة المبيعات', taxSupported: true },
  'Qatar': { currency: 'QAR', taxRate: 0, taxName: '', taxSupported: false },
  'Bahrain': { currency: 'BHD', taxRate: 5, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
  'Oman': { currency: 'OMR', taxRate: 5, taxName: 'ضريبة القيمة المضافة', taxSupported: true },
};

const DEFAULT_MODULES: ModuleEntry[] = [
  { id: 'accounting', label: 'المحاسبة والمالية', description: 'الفواتير، القيود، التقارير المالية، المدفوعات', icon: Landmark, enabled: true },
  { id: 'sales', label: 'المبيعات', description: 'عروض الأسعار، أوامر البيع، فواتير المبيعات', icon: TrendingUp, enabled: true },
  { id: 'purchases', label: 'المشتريات', description: 'طلبات الشراء، فواتير المشتريات، الموردون', icon: ShoppingCart, enabled: true },
  { id: 'inventory', label: 'المخزون', description: 'إدارة المخزون، حركات المخزون، الجرد', icon: Package, enabled: true },
  { id: 'hr', label: 'الموارد البشرية', description: 'الموظفون، الإجازات، الرواتب، الحضور', icon: Users, enabled: true },
  { id: 'crm', label: 'إدارة العملاء', description: 'العملاء المحتملون، الفرص، الاتصالات', icon: Handshake, enabled: true },
  { id: 'manufacturing', label: 'التصنيع', description: 'أوامر العمل، قوائم المواد، محطات العمل', icon: Factory, enabled: false },
  { id: 'projects', label: 'المشاريع', description: 'إدارة المشاريع، المهام، الجداول الزمنية', icon: Kanban, enabled: false },
];

/** البيانات الافتراضية لـ HRMS */
const HRMS_DEFAULT_EXPENSE_TYPES = [
  { name: 'مصاريف إدارية', englishName: 'Calls' },
  { name: 'مصاريف سفر وتنقل', englishName: 'Travel' },
  { name: 'مصاريف ضيافة', englishName: 'Food' },
  { name: 'مصاريف طبية', englishName: 'Medical' },
  { name: 'مصاريف متنوعة', englishName: 'Others' },
  { name: 'مصاريف اتصالات', englishName: 'Communication' },
  { name: 'مصاريف وقود', englishName: 'Fuel' },
  { name: 'مصاريف صيانة', englishName: 'Maintenance' },
  { name: 'مصاريف إيجار', englishName: 'Rent' },
  { name: 'مصاريف قرطاسية ومستلزمات', englishName: 'Stationery' },
  { name: 'مصاريف تسويق وإعلان', englishName: 'Marketing' },
  { name: 'مصاريف تدريب وتطوير', englishName: 'Training' },
  { name: 'مصاريف كهرباء وماء', englishName: 'Utilities' },
  { name: 'مصاريف نقل وشحن', englishName: 'Shipping' },
  { name: 'مصاريف مهنية وخدمية', englishName: 'Professional' },
];

const HRMS_DEFAULT_LEAVE_TYPES = [
  { name: 'إجازة سنوية', englishName: 'Casual Leave', is_carry_forward: 1, is_lwp: 0, allow_encashment: 1 },
  { name: 'إجازة مرضية', englishName: 'Sick Leave', is_carry_forward: 0, is_lwp: 0, allow_encashment: 0 },
  { name: 'إجازة دورية', englishName: 'Privilege Leave', is_carry_forward: 0, is_lwp: 0, allow_encashment: 0 },
  { name: 'إجازة بدون راتب', englishName: 'Leave Without Pay', is_carry_forward: 0, is_lwp: 1, allow_encashment: 0 },
  { name: 'إجازة تعويضية', englishName: 'Compensatory Off', is_carry_forward: 0, is_lwp: 0, allow_encashment: 0 },
];

const HRMS_DEFAULT_SALARY_COMPONENTS = [
  { name: 'الراتب الأساسي', type: 'Earning' },
  { name: 'بدل سكن', type: 'Earning' },
  { name: 'بدل نقل', type: 'Earning' },
  { name: 'ضريبة الدخل', type: 'Deduction' },
  { name: 'تقاعد', type: 'Deduction' },
];

const HRMS_DEFAULT_EMPLOYMENT_TYPES = [
  'دوام كامل', 'دوام جزئي', 'فترة تجريبية', 'عقد مؤقت', 'عمولة', 'تدريب',
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

const FEATURE_HIGHLIGHTS = [
  { icon: Landmark, label: 'المحاسبة', desc: 'إدارة مالية شاملة' },
  { icon: TrendingUp, label: 'المبيعات', desc: 'فواتير وعروض أسعار' },
  { icon: ShoppingCart, label: 'المشتريات', desc: 'طلبات وموردين' },
  { icon: Package, label: 'المخزون', desc: 'تتبع وجرد' },
  { icon: Users, label: 'الموارد البشرية', desc: 'موظفون ورواتب' },
  { icon: Handshake, label: 'إدارة العملاء', desc: 'فرص واتصالات' },
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

// ─── التحقق من البريد الإلكتروني ──────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${strength.level <= 1 ? 'text-red-500' : strength.level <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
        {strength.label}
      </span>
    </div>
  );
}

// ─── مكون الحقل مع رسالة خطأ ──────────────────────────────

function FieldWrapper({ label, error, required, hint, children, htmlFor }: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── مكون انطباع الاحتفال ──────────────────────────────

function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rotation: number; rotationSpeed: number }[] = [];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 4,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    const maxFrames = 180;

    function animate() {
      if (!ctx || !canvas) return;
      if (frame > maxFrames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });

      frame++;
      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
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
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [setupResults, setSetupResults] = useState<{ step: string; status: string; message: string }[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    ping?: boolean;
    login?: boolean;
    apiKeys?: boolean;
    existingCompany?: { name: string; abbr: string; default_currency: string; country: string } | null;
  } | null>(null);
  const [stepErrors, setStepErrors] = useState<FieldError>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [linkingExisting, setLinkingExisting] = useState(false);
  const [showExistingModules, setShowExistingModules] = useState(false);
  const [checkingModules, setCheckingModules] = useState(false);
  const [activatingModules, setActivatingModules] = useState(false);
  const [existingModules, setExistingModules] = useState<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    appInstalled: boolean;
    canToggle: boolean;
    missingApps: string[];
    moduleExists?: boolean;
  }[]>([]);
  const [selectedExistingModules, setSelectedExistingModules] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── التحقق من اكتمال الإعداد عند فتح الصفحة ────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await apiCheckSetupStatus();
        if (!cancelled && status.configured) {
          // الإعداد مكتمل بالفعل — تحويل للداشبورد
          router.replace('/');
          return;
        }
      } catch {
        // فشل الفحص — ربما الخادم غير متاح، نعرض المعالج
      } finally {
        if (!cancelled) setCheckingSetup(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

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
    enableTax: false,  // معطّل افتراضياً لليمن — المستخدم يمكنه تفعيله
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
    // حقول جديدة
    companyLogo: '',
    companyTagline: '',
    companyPhone: '',
    companyAddress: '',
    companyTaxId: '',
    adminPasswordConfirm: '',
    dataConfirmed: false,
    // حقول HRMS
    hrmsSelectedExpenseTypes: new Set(HRMS_DEFAULT_EXPENSE_TYPES.map(t => t.name)),
    hrmsSelectedLeaveTypes: new Set(HRMS_DEFAULT_LEAVE_TYPES.map(t => t.name)),
    hrmsSelectedSalaryComponents: new Set(HRMS_DEFAULT_SALARY_COMPONENTS.map(t => t.name)),
    hrmsSelectedEmploymentTypes: new Set(HRMS_DEFAULT_EMPLOYMENT_TYPES),
  });

  const updateForm = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
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
        // إذا الدولة لا تدعم الضرائب في ERPNext (مثل اليمن)، عطّل الضريبة افتراضياً
        // لكن المستخدم يمكنه تفعيلها يدوياً إذا أراد
        if (config.taxSupported && config.taxRate > 0) {
          updateForm('enableTax', true);
        } else {
          updateForm('enableTax', false);
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

  // ── هل وحدة HR مفعلة؟ ──
  const hrModuleEnabled = useMemo(() => form.modules.some(m => m.id === 'hr' && m.enabled), [form.modules]);

  // ── الخطوات الفعلية (إخفاء hrmsSetup إذا HR معطّل) ──
  const visibleSteps = useMemo(() => {
    if (hrModuleEnabled) return STEPS;
    return STEPS.filter(s => s.id !== 'hrmsSetup');
  }, [hrModuleEnabled]);

  // ── التحقق من صحة كل خطوة مع رسائل خطأ ───────────────

  const validateStep = useCallback(
    (stepIndex: number): { valid: boolean; errors: FieldError } => {
      const errors: FieldError = {};
      const stepId = STEPS[stepIndex]?.id;

      switch (stepId) {
        case 'welcome':
        case 'branding':
          break;
        case 'server':
          if (!form.backendHost.trim()) errors.backendHost = 'عنوان الخادم مطلوب';
          if (!form.serverAdminPassword.trim()) errors.serverAdminPassword = 'كلمة مرور المدير مطلوبة';
          if (!form.serverConnectionTested) errors.connection = 'يجب اختبار الاتصال قبل المتابعة';
          if (form.serverConnectionTested && !form.serverConnectionOk) errors.connection = 'فشل الاتصال بالخادم. أعد المحاولة.';
          break;
        case 'company':
          if (!form.companyName.trim()) errors.companyName = 'اسم الشركة مطلوب';
          else if (form.companyName.trim().length < 3) errors.companyName = 'اسم الشركة يجب أن يكون 3 أحرف على الأقل';
          if (!form.abbr.trim()) errors.abbr = 'اختصار الشركة مطلوب';
          break;
        case 'modules':
          if (!form.modules.some((m) => m.enabled)) errors.modules = 'يجب تفعيل وحدة واحدة على الأقل';
          break;
        case 'hrmsSetup':
          if (hrModuleEnabled && form.hrmsSelectedExpenseTypes.size === 0) errors.hrmsExpenseTypes = 'يجب تحديد نوع مصروفات واحد على الأقل';
          break;
        case 'fiscalYear':
          if (!form.fiscalYearStart.trim()) errors.fiscalYearStart = 'تاريخ بداية السنة المالية مطلوب';
          if (!form.fiscalYearEnd.trim()) errors.fiscalYearEnd = 'تاريخ نهاية السنة المالية مطلوب';
          if (!form.fiscalYearName.trim()) errors.fiscalYearName = 'اسم السنة المالية مطلوب';
          break;
        case 'warehouses':
          if (form.warehouses.length === 0) errors.warehouses = 'يجب إضافة مستودع واحد على الأقل';
          else if (form.warehouses.some((w) => !w.name.trim())) errors.warehouses = 'اسم المستودع لا يمكن أن يكون فارغاً';
          break;
        case 'paymentMethods':
          if (form.paymentMethods.length === 0) errors.paymentMethods = 'يجب إضافة طريقة دفع واحدة على الأقل';
          else if (form.paymentMethods.some((p) => !p.name.trim())) errors.paymentMethods = 'اسم طريقة الدفع لا يمكن أن يكون فارغاً';
          break;
        case 'tax':
          if (form.enableTax) {
            if (form.taxRate <= 0) errors.taxRate = 'نسبة الضريبة يجب أن تكون أكبر من صفر';
            if (!form.taxName.trim()) errors.taxName = 'اسم الضريبة مطلوب';
          }
          break;
        case 'admin':
          if (!form.adminEmail.trim()) errors.adminEmail = 'البريد الإلكتروني مطلوب';
          else if (!isValidEmail(form.adminEmail)) errors.adminEmail = 'صيغة البريد الإلكتروني غير صحيحة';
          if (!form.adminPassword) errors.adminPassword = 'كلمة المرور مطلوبة';
          else if (form.adminPassword.length < 8) errors.adminPassword = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
          if (!form.adminPasswordConfirm) errors.adminPasswordConfirm = 'تأكيد كلمة المرور مطلوب';
          else if (form.adminPassword !== form.adminPasswordConfirm) errors.adminPasswordConfirm = 'كلمتا المرور غير متطابقتين';
          if (!form.adminFirstName.trim()) errors.adminFirstName = 'الاسم الأول مطلوب';
          break;
        case 'employee':
          if (!form.employeeFirstName.trim()) errors.employeeFirstName = 'الاسم الأول للموظف مطلوب';
          break;
        case 'review':
          if (!form.dataConfirmed) errors.dataConfirmed = 'يجب الإقرار بصحة البيانات للمتابعة';
          break;
      }

      return { valid: Object.keys(errors).length === 0, errors };
    },
    [form, hrModuleEnabled]
  );

  const isStepValid = useCallback(
    (stepIndex: number): boolean => {
      return validateStep(stepIndex).valid;
    },
    [validateStep]
  );

  const canGoNext = useMemo(() => isStepValid(currentStep), [currentStep, isStepValid]);

  const goNext = useCallback(() => {
    const { valid, errors } = validateStep(currentStep);
    setStepErrors(errors);
    // وضع اللمس على جميع الحقول في الخطوة الحالية
    const stepId = STEPS[currentStep]?.id;
    if (stepId) {
      const fieldsForStep: Record<string, string[]> = {
        server: ['backendHost', 'serverAdminPassword', 'connection'],
        company: ['companyName', 'abbr'],
        modules: ['modules'],
        fiscalYear: ['fiscalYearStart', 'fiscalYearEnd', 'fiscalYearName'],
        warehouses: ['warehouses'],
        paymentMethods: ['paymentMethods'],
        tax: ['taxRate', 'taxName'],
        admin: ['adminEmail', 'adminPassword', 'adminPasswordConfirm', 'adminFirstName'],
        employee: ['employeeFirstName'],
        review: ['dataConfirmed'],
      };
      const fields = fieldsForStep[stepId] || [];
      const newTouched: Record<string, boolean> = {};
      fields.forEach((f) => { newTouched[f] = true; });
      setTouched((prev) => ({ ...prev, ...newTouched }));
    }

    if (valid && currentStep < visibleSteps.length - 1) {
      setCurrentStep((s) => s + 1);
      setStepErrors({});
    }
  }, [currentStep, validateStep, visibleSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setStepErrors({});
    }
  }, [currentStep]);

  // ── اختبار الاتصال بالخادم ─────────────────────────────

  const testConnection = useCallback(async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    setFieldTouched('connection');
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
        setConnectionResult({ success: true, message: data.message, ping: data.ping, login: data.login, apiKeys: data.apiKeys, existingCompany: data.existingCompany || null });
        updateForm('serverConnectionTested', true);
        updateForm('serverConnectionOk', true);

        // ── إذا وُجدت شركة مسجلة مسبقاً، نفحص الوحدات المثبتة ──
        if (data.existingCompany) {
          const ec = data.existingCompany as { name: string; abbr: string; default_currency: string; country: string };
          updateForm('companyName', ec.name);
          updateForm('abbr', ec.abbr || generateAbbr(ec.name));
          if (ec.default_currency) updateForm('currency', ec.default_currency);
          if (ec.country) {
            updateForm('country', ec.country);
            const config = COUNTRY_CURRENCY_MAP[ec.country];
            if (config) {
              if (config.taxSupported && config.taxRate > 0) {
                updateForm('enableTax', true);
              } else {
                updateForm('enableTax', false);
              }
            }
          }
          // فحص الوحدات المثبتة/المفعلة على الخادم الخلفي بدلاً من الربط المباشر
          setCheckingModules(true);
          try {
            const modulesResponse = await fetch('/api/setup/check-modules', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                host: form.backendHost,
                admin_user: form.serverAdminUser,
                admin_password: form.serverAdminPassword,
              }),
            });
            const modulesData = await modulesResponse.json();
            if (modulesData.success && modulesData.modules) {
              // تنقية التطبيقات المثبتة — إزالة القيم الفارغة أو غير النصية
              const cleanApps = (modulesData.installedApps || []).filter(
                (a: unknown) => typeof a === 'string' && a.trim()
              ) as string[];
              setInstalledApps(cleanApps);
              // تنقية بيانات الوحدات — ضمان عدم وجود قيم undefined
              const cleanModules = modulesData.modules.map(
                (m: { id?: string; label?: string; description?: string; enabled?: boolean; appInstalled?: boolean; canToggle?: boolean; missingApps?: string[]; moduleExists?: boolean }) => ({
                  id: String(m.id || ''),
                  label: String(m.label || ''),
                  description: String(m.description || ''),
                  enabled: Boolean(m.enabled),
                  appInstalled: Boolean(m.appInstalled),
                  canToggle: Boolean(m.canToggle),
                  missingApps: Array.isArray(m.missingApps)
                    ? m.missingApps.filter((a: unknown) => typeof a === 'string' && a.trim())
                    : [],
                  moduleExists: Boolean(m.moduleExists),
                })
              );
              setExistingModules(cleanModules);
              // تحديد الوحدات المفعلة افتراضياً (فقط التي يمكن تفعيلها)
              const enabledIds = cleanModules
                .filter((m: { enabled: boolean; canToggle: boolean; appInstalled: boolean }) => m.enabled && m.appInstalled)
                .map((m: { id: string }) => m.id);
              setSelectedExistingModules(enabledIds);
              // تحديث وحدات النموذج بناءً على حالة الخادم الخلفي
              const updatedModules = form.modules.map((m) => ({
                ...m,
                enabled: enabledIds.includes(m.id),
              }));
              updateForm('modules', updatedModules);
              setShowExistingModules(true);
            } else {
              // فشل فحص الوحدات — نستخدم القيم الافتراضية مع التحذير
              // ملاحظة: نحدد appInstalled بناءً على التطبيقات المعروفة فقط
              const fallbackModules = DEFAULT_MODULES.map((m) => ({
                id: m.id,
                label: m.label,
                description: m.description,
                enabled: m.id !== 'hr', // نعطل HR افتراضياً لأن HRMS قد لا يكون مثبتاً
                appInstalled: m.id !== 'hr', // نتوقع أن ERPNext مثبت لكن HRMS قد لا يكون
                canToggle: m.id !== 'hr',
                missingApps: m.id === 'hr' ? ['hrms'] : [],
              }));
              setExistingModules(fallbackModules);
              setInstalledApps(['erpnext']); // نفترض أن erpnext مثبت
              setSelectedExistingModules(DEFAULT_MODULES.filter((m) => m.enabled && m.id !== 'hr').map((m) => m.id));
              setShowExistingModules(true);
            }
          } catch {
            // فشل فحص الوحدات — نستخدم القيم الافتراضية مع التحذير
            const fallbackModules = DEFAULT_MODULES.map((m) => ({
              id: m.id,
              label: m.label,
              description: m.description,
              enabled: m.id !== 'hr', // نعطل HR افتراضياً لأن HRMS قد لا يكون مثبتاً
              appInstalled: m.id !== 'hr',
              canToggle: m.id !== 'hr',
              missingApps: m.id === 'hr' ? ['hrms'] : [],
            }));
            setExistingModules(fallbackModules);
            setInstalledApps(['erpnext']); // نفترض أن erpnext مثبت
            setSelectedExistingModules(DEFAULT_MODULES.filter((m) => m.enabled && m.id !== 'hr').map((m) => m.id));
            setShowExistingModules(true);
          } finally {
            setCheckingModules(false);
          }
        }
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
  }, [form.backendHost, form.serverAdminUser, form.serverAdminPassword, updateForm, setFieldTouched, router]);

  // ── ربط خادم موجود به شركة مسجلة مسبقاً ─────────────────

  const linkExistingServer = useCallback(async () => {
    setLinkingExisting(true);
    try {
      const response = await fetch('/api/setup/link-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.backendHost,
          admin_user: form.serverAdminUser,
          admin_password: form.serverAdminPassword,
        }),
      });
      const data = await response.json();
      if (data.success && data.company) {
        const ec = data.company as { name: string; abbr: string; default_currency: string; country: string };
        // حفظ إعدادات التهيئة محلياً
        setSetupConfig({
          defaultCompany: ec.name,
          branchesEnabled: false,
          enabledModules: form.modules.filter((m) => m.enabled).map((m) => m.id),
          currency: ec.default_currency || form.currency,
          country: ec.country || form.country,
          language: form.language,
          companyLogo: form.companyLogo,
          companyTagline: form.companyTagline,
          companyPhone: form.companyPhone,
          companyAddress: form.companyAddress,
          companyTaxId: form.companyTaxId,
        });
        // الانتقال إلى صفحة تسجيل الدخول
        router.replace('/login');
      } else {
        setSetupError(data.error || 'فشل ربط الخادم الموجود');
      }
    } catch {
      setSetupError('فشل الاتصال أثناء ربط الخادم الموجود');
    } finally {
      setLinkingExisting(false);
    }
  }, [form.backendHost, form.serverAdminUser, form.serverAdminPassword, form.modules, form.currency, form.country, form.language, form.companyLogo, form.companyTagline, form.companyPhone, form.companyAddress, form.companyTaxId, router]);

  // ── تفعيل الوحدات والانتقال لتسجيل الدخول (خادم موجود) ────

  const activateModulesAndLogin = useCallback(async () => {
    // تصفية الوحدات التي لا يمكن تفعيلها (تطبيقات غير مثبتة)
    const activatableModules = selectedExistingModules.filter((modId) => {
      const modInfo = existingModules.find((m) => m.id === modId);
      return modInfo && modInfo.appInstalled;
    });

    if (activatableModules.length === 0) {
      setSetupError('يجب تفعيل وحدة واحدة على الأقل (بعد استبعاد الوحدات التي تتطلب تطبيقات غير مثبتة)');
      return;
    }

    setActivatingModules(true);
    setSetupError('');
    try {
      const ec = connectionResult?.existingCompany;
      const response = await fetch('/api/setup/activate-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.backendHost,
          admin_user: form.serverAdminUser,
          admin_password: form.serverAdminPassword,
          enabled_modules: activatableModules, // فقط الوحدات القابلة للتفعيل
          company_info: ec ? {
            name: ec.name,
            abbr: ec.abbr,
            default_currency: ec.default_currency,
            country: ec.country,
          } : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const company = data.company || ec;
        const actuallyEnabled = data.enabledModules || activatableModules;
        if (company) {
          setSetupConfig({
            defaultCompany: company.name,
            branchesEnabled: false,
            enabledModules: actuallyEnabled,
            currency: company.default_currency || form.currency,
            country: company.country || form.country,
            language: form.language,
            companyLogo: form.companyLogo,
            companyTagline: form.companyTagline,
            companyPhone: form.companyPhone,
            companyAddress: form.companyAddress,
            companyTaxId: form.companyTaxId,
          });
        }
        router.replace('/login');
      } else {
        setSetupError(data.error || 'فشل تفعيل الوحدات');
      }
    } catch {
      setSetupError('فشل الاتصال أثناء تفعيل الوحدات');
    } finally {
      setActivatingModules(false);
    }
  }, [selectedExistingModules, existingModules, connectionResult, form.backendHost, form.serverAdminUser, form.serverAdminPassword, form.currency, form.country, form.language, form.companyLogo, form.companyTagline, form.companyPhone, form.companyAddress, form.companyTaxId, router]);

  // ── رفع الشعار ────────────────────────────────────────────

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStepErrors({ companyLogo: 'حجم الملف يتجاوز 2 ميغابايت' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateForm('companyLogo', reader.result as string);
      setStepErrors({});
    };
    reader.readAsDataURL(file);
  }, [updateForm]);

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
        admin_email: form.adminEmail,
        admin_password: form.adminPassword,
        admin_first_name: form.adminFirstName,
        admin_last_name: form.adminLastName,
        enable_tax: form.enableTax,
        tax_rate: form.taxRate,
        tax_name: form.taxName,
        enabled_modules: enabledModules,
        tax_id: form.companyTaxId,
        // HRMS selections
        hrms_expense_types: Array.from(form.hrmsSelectedExpenseTypes),
        hrms_leave_types: Array.from(form.hrmsSelectedLeaveTypes),
        hrms_salary_components: Array.from(form.hrmsSelectedSalaryComponents),
        hrms_employment_types: Array.from(form.hrmsSelectedEmploymentTypes),
      } as Record<string, unknown>);
      const resultsArr = Array.isArray(result.results)
        ? (result.results as { step: string; status: string; message: string }[])
        : [];
      setSetupResults(resultsArr);
      setSetupComplete(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 6000);

      // ── HRMS Configuration (if HR is enabled) ──
      if (enabledModules.includes('hr')) {
        try {
          const hrmsRes = await fetch('/api/setup/configure-hrms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company: form.companyName,
              selectedExpenseTypes: Array.from(form.hrmsSelectedExpenseTypes),
              selectedLeaveTypes: Array.from(form.hrmsSelectedLeaveTypes),
              selectedSalaryComponents: Array.from(form.hrmsSelectedSalaryComponents),
              selectedEmploymentTypes: Array.from(form.hrmsSelectedEmploymentTypes),
            }),
          });
          const hrmsData = await hrmsRes.json();
          if (hrmsData.success) {
            resultsArr.push({ step: 'hrmsSetup', status: 'ok', message: hrmsData.message || 'تم إعداد بيانات الموارد البشرية' });
            setSetupResults([...resultsArr]);
          } else {
            resultsArr.push({ step: 'hrmsSetup', status: 'error', message: hrmsData.error || 'فشل إعداد بيانات الموارد البشرية' });
            setSetupResults([...resultsArr]);
          }
        } catch {
          resultsArr.push({ step: 'hrmsSetup', status: 'error', message: 'تعذر الاتصال لإعداد بيانات الموارد البشرية' });
          setSetupResults([...resultsArr]);
        }
      }

      setSetupConfig({
        defaultCompany: form.companyName,
        branchesEnabled: false,
        enabledModules: enabledModules,
        currency: form.currency,
        country: form.country,
        language: form.language,
        companyLogo: form.companyLogo,
        companyTagline: form.companyTagline,
        companyPhone: form.companyPhone,
        companyAddress: form.companyAddress,
        companyTaxId: form.companyTaxId,
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

  // ── نسخ بيانات الدخول ──────────────────────────────────────

  const copyCredentials = useCallback(() => {
    const text = `البريد: ${form.adminEmail}\nكلمة المرور: ${form.adminPassword}`;
    navigator.clipboard.writeText(text).then(() => {
      setCredentialsCopied(true);
      setTimeout(() => setCredentialsCopied(false), 2000);
    });
  }, [form.adminEmail, form.adminPassword]);

  // ── تبديل قسم في المراجعة ───────────────────────────────

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ── علامة التقدم ──────────────────────────────────────────

  const progressPercent = ((currentStep + 1) / visibleSteps.length) * 100;

  // ════════════════════════════════════════════════════════════
  // شاشة التحقق من حالة الإعداد
  // ════════════════════════════════════════════════════════════

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
          <p className="text-lg text-muted-foreground">جاري التحقق من حالة الإعداد...</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // شاشة ربط خادم موجود
  // ════════════════════════════════════════════════════════════

  if (linkingExisting) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <div className="relative mx-auto w-20 h-20">
            <Loader2 className="w-20 h-20 text-emerald-600 animate-spin" />
            <Building2 className="w-8 h-8 text-emerald-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-foreground">تم اكتشاف شركة مسجلة</p>
            <p className="text-muted-foreground">
              {connectionResult?.existingCompany
                ? `الشركة: ${connectionResult.existingCompany.name}`
                : 'جاري ربط الخادم الموجود...'}
            </p>
            <p className="text-sm text-muted-foreground">جاري إعداد النظام للاتصال بالخادم الموجود...</p>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // شاشة فحص الوحدات (تحميل)
  // ════════════════════════════════════════════════════════════

  if (checkingModules) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md">
          <div className="relative mx-auto w-20 h-20">
            <Loader2 className="w-20 h-20 text-emerald-600 animate-spin" />
            <LayoutGrid className="w-8 h-8 text-emerald-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-foreground">تم اكتشاف شركة مسجلة</p>
            <p className="text-muted-foreground">
              {connectionResult?.existingCompany
                ? `الشركة: ${connectionResult.existingCompany.name}`
                : ''}
            </p>
            <p className="text-sm text-muted-foreground">جاري فحص الوحدات المثبتة والمفعلة على الخادم...</p>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // شاشة اختيار الوحدات (خادم موجود)
  // ════════════════════════════════════════════════════════════

  if (showExistingModules && !checkingModules) {
    const ec = connectionResult?.existingCompany;
    const enabledCount = selectedExistingModules.length;
    const disabledCount = existingModules.length - enabledCount;
    const installedCount = existingModules.filter((m) => m.appInstalled).length;

    // خريطة الأيقونات للوحدات — من DEFAULT_MODULES
    const moduleIcons: Record<string, React.ElementType> = {
      accounting: Landmark,
      sales: TrendingUp,
      purchases: ShoppingCart,
      inventory: Package,
      hr: Users,
      crm: Handshake,
      manufacturing: Factory,
      projects: Kanban,
    };

    // دالة تبديل تحديد وحدة
    const toggleModule = (modId: string) => {
      setSelectedExistingModules((prev) =>
        prev.includes(modId)
          ? prev.filter((id) => id !== modId)
          : [...prev, modId]
      );
    };

    return (
      <div className="min-h-screen bg-gradient-to-bl from-emerald-50 via-teal-50 to-cyan-50 flex flex-col" dir="rtl">
        {/* الشريط العلوي */}
        <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-bl from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-foreground truncate">اختيار الوحدات</h1>
              <p className="text-xs text-muted-foreground truncate">
                {ec ? `${ec.name}` : 'خادم موجود'} — اختر الوحدات التي تريد تفعيلها
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
              <LayoutGrid className="w-3.5 h-3.5" />
              {existingModules.length} وحدة
            </Badge>
          </div>
        </header>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            {/* بطاقة معلومات الشركة والتطبيقات */}
            <Card className="shadow-md border-0 bg-gradient-to-bl from-emerald-600 to-teal-700 text-white">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h2 className="text-lg font-bold">تم اكتشاف شركة مسجلة</h2>
                      {ec && (
                        <p className="text-emerald-100 text-sm mt-0.5">
                          {ec.name}
                          {ec.abbr && <span className="text-emerald-200"> ({ec.abbr})</span>}
                          {ec.default_currency && <span className="text-emerald-200"> — {ec.default_currency}</span>}
                          {ec.country && <span className="text-emerald-200"> — {ec.country}</span>}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 gap-1">
                        <Server className="w-3 h-3" />
                        {installedApps.length} تطبيق مثبت
                      </Badge>
                      <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 gap-1">
                        <Check className="w-3 h-3" />
                        {installedCount} وحدة متاحة
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* التطبيقات المثبتة على الخادم */}
            {installedApps.length > 0 && (
              <Card className="shadow-sm border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-blue-600" />
                    <p className="font-semibold text-sm">التطبيقات المثبتة على الخادم</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {installedApps.map((app, i) => (
                      <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">
                        {app}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* تعليمات */}
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="font-semibold">اختر الوحدات المطلوبة</AlertTitle>
              <AlertDescription className="text-sm">
                فعّل الوحدات التي تحتاجها في نظامك. الوحدات المفعّلة ستكون متاحة في القائمة الرئيسية، والمعطّلة لن تظهر.
                {existingModules.some((m) => !m.appInstalled) && (
                  <span className="block mt-1 text-red-700 font-medium">⚠ بعض الوحدات تتطلب تطبيقات غير مثبتة على الخادم — لا يمكن تفعيلها حتى يتم تثبيت التطبيق المطلوب.</span>
                )}
              </AlertDescription>
            </Alert>

            {/* خطأ */}
            {setupError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
                <AlertDescription>{setupError}</AlertDescription>
              </Alert>
            )}

            {/* ملخص التحديد */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1.5 text-sm py-1.5 px-3 bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> {enabledCount} مفعّلة
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-sm py-1.5 px-3">
                <X className="w-3.5 h-3.5" /> {disabledCount} معطّلة
              </Badge>
            </div>

            {/* شبكة الوحدات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {existingModules.map((mod) => {
                const isSelected = selectedExistingModules.includes(mod.id);
                const ModIcon = moduleIcons[mod.id] || LayoutGrid;
                const hasMissingApps = mod.missingApps && mod.missingApps.length > 0;
                const isDisabled = hasMissingApps; // لا يمكن التفعيل إذا التطبيق غير مثبت

                return (
                  <Card
                    key={mod.id}
                    className={`transition-all duration-200 border-2 overflow-hidden ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-50/50 shadow-md shadow-emerald-100'
                        : hasMissingApps
                          ? 'border-amber-200 bg-amber-50/30'
                          : 'border-muted/60 bg-white hover:border-emerald-200 hover:shadow-sm'
                    } ${isDisabled && !isSelected ? 'opacity-80' : ''}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* صف الأيقونة والاسم والزر */}
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/15'
                            : hasMissingApps
                              ? 'bg-amber-100'
                              : 'bg-muted/60'
                        }`}>
                          <ModIcon className={`w-5 h-5 transition-colors ${
                            isSelected ? 'text-emerald-600' : hasMissingApps ? 'text-amber-600' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm leading-tight ${hasMissingApps ? 'text-amber-800' : ''}`}>{mod.label}</p>
                            {mod.enabled && !isSelected && !hasMissingApps && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-slate-100 text-slate-500 shrink-0">
                                حالياً مفعّلة
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{mod.description}</p>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => {
                            if (!isDisabled) toggleModule(mod.id);
                          }}
                          disabled={isDisabled}
                          className="shrink-0 mt-0.5"
                        />
                      </div>

                      {/* شارات الحالة */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {mod.appInstalled ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 text-blue-600 border border-blue-200 gap-1">
                            <Check className="w-2.5 h-2.5" /> التطبيق مثبت
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-red-50 text-red-600 border border-red-200 gap-1">
                            <AlertCircle className="w-2.5 h-2.5" /> التطبيق غير مثبت
                          </Badge>
                        )}
                        {isSelected && !hasMissingApps && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-50 text-emerald-600 border border-emerald-200 gap-1">
                            <Check className="w-2.5 h-2.5" /> سيتم تفعيلها
                          </Badge>
                        )}
                      </div>

                      {/* تنبيه التطبيقات المفقودة */}
                      {hasMissingApps && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                          <p className="text-xs text-red-800 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              يتطلب التطبيق <strong>{mod.missingApps.join('، ')}</strong> غير المثبت على الخادم.
                              {mod.id === 'hr' && (
                                <> لتثبيت HRMS، أعد نشر الخادم الخلفي على Railway — سيتم تثبيته تلقائياً.</>
                              )}
                              {!mod.appInstalled && mod.id !== 'hr' && (
                                <> لا يمكن تفعيل هذه الوحدة حتى يتم تثبيت التطبيق المطلوب.</>
                              )}
                            </span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* التحقق من وحدة واحدة على الأقل */}
            {selectedExistingModules.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>يجب تفعيل وحدة واحدة على الأقل</AlertTitle>
                <AlertDescription>اختر وحدة واحدة على الأقل للمتابعة.</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* شريط الإجراءات السفلي */}
        <footer className="bg-white/80 backdrop-blur-sm border-t sticky bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setShowExistingModules(false);
                setExistingModules([]);
                setSelectedExistingModules([]);
              }}
              disabled={activatingModules}
            >
              <ArrowRight className="w-4 h-4" />
              رجوع
            </Button>
            <div className="flex-1" />
            <Button
              className="gap-2 min-w-[200px]"
              onClick={activateModulesAndLogin}
              disabled={selectedExistingModules.length === 0 || activatingModules}
            >
              {activatingModules ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري التفعيل...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  تفعيل الوحدات والمتابعة
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // شاشة النجاح
  // ════════════════════════════════════════════════════════════

  if (setupComplete) {
    const errorCount = setupResults.filter((r) => r.status === 'error').length;
    const successCount = setupResults.filter((r) => r.status === 'ok').length;
    const failedSteps = setupResults.filter((r) => r.status === 'error');

    return (
      <div className="min-h-screen bg-gradient-to-bl from-emerald-50 via-teal-50 to-cyan-50 p-4" dir="rtl">
        {showConfetti && <ConfettiEffect />}
        <div className="max-w-xl mx-auto pt-8 space-y-6">
          {/* شعار الشركة والاسم */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-bl from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg overflow-hidden">
              {form.companyLogo ? (
                <img src={form.companyLogo} alt={form.companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-12 h-12 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">تم الإعداد بنجاح!</h2>
              <p className="text-muted-foreground mt-2 text-lg">
                تم إعداد نظام ERP Pro للشركة &laquo;{form.companyName}&raquo;
              </p>
            </div>
          </div>

          {/* ملخص النتائج */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <Badge variant="secondary" className="gap-1 text-sm py-1 px-3">
                  <Check className="w-4 h-4" /> {successCount} نجح
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1 text-sm py-1 px-3">
                    <X className="w-4 h-4" /> {errorCount} أخطاء
                  </Badge>
                )}
              </div>

              {setupResults.length > 0 && (
                <div className="text-start space-y-1 max-h-48 overflow-y-auto bg-muted/50 rounded-lg p-3 custom-scrollbar">
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

              {/* الخطوات الفاشلة مع زر إعادة المحاولة */}
              {failedSteps.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>بعض الخطوات فشلت</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pe-4 mt-2 space-y-1">
                      {failedSteps.map((s, i) => (
                        <li key={i}>{s.message}</li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={executeSetup} disabled={executing}>
                      {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      إعادة المحاولة
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* بيانات الدخول */}
          <Card className="shadow-lg border-0 bg-gradient-to-bl from-slate-50 to-zinc-50">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  بيانات الدخول
                </h3>
                <Button variant="outline" size="sm" className="gap-2" onClick={copyCredentials}>
                  {credentialsCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {credentialsCopied ? 'تم النسخ' : 'نسخ'}
                </Button>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground min-w-20">البريد:</span>
                  <code className="bg-muted px-2 py-1 rounded font-mono text-xs">{form.adminEmail}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground min-w-20">كلمة المرور:</span>
                  <code className="bg-muted px-2 py-1 rounded font-mono text-xs">{form.adminPassword}</code>
                </div>
              </div>
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                احفظ هذه البيانات! لن تتمكن من رؤية كلمة المرور مرة أخرى.
              </p>
            </CardContent>
          </Card>

          {/* الخطوات التالية */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-amber-500" />
                الخطوات التالية
              </h3>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'إضافة الأصناف', desc: 'أضف منتجاتك وخدماتك', icon: Package },
                  { label: 'إنشاء العملاء', desc: 'سجّل بيانات عملائك', icon: Users },
                  { label: 'إضافة الموردين', desc: 'سجّل بيانات مورديك', icon: ShoppingCart },
                  { label: 'إعداد الحسابات', desc: 'راجع دليل الحسابات', icon: Landmark },
                ].map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                  <div key={i} className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ItemIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Button size="lg" className="w-full text-lg h-12 gap-2" onClick={goToDashboard}>
            <Sparkles className="w-5 h-5" />
            الذهاب إلى لوحة القيادة
          </Button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // خطوات المعالج
  // ════════════════════════════════════════════════════════════

  const stepDef = visibleSteps[currentStep];
  const StepIcon = stepDef?.icon ?? Sparkles;

  const getStepStatus = (index: number): 'done' | 'current' | 'pending' => {
    if (index < currentStep) return 'done';
    if (index === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* الشريط الجانبي (سطح المكتب) */}
      <aside className="hidden lg:flex w-80 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex-col">
        <div className="p-6 space-y-2 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ERP Pro" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold">ERP Pro</h1>
              <p className="text-xs text-slate-400">معالج الإعداد</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">الإصدار {APP_VERSION}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {visibleSteps.map((s, i) => {
            const status = getStepStatus(i);
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (i < currentStep) {
                    setCurrentStep(i);
                    setStepErrors({});
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  status === 'current'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : status === 'done'
                    ? 'text-emerald-400 hover:bg-white/5 cursor-pointer'
                    : 'text-slate-500 cursor-default'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  status === 'current'
                    ? 'bg-primary-foreground/20'
                    : status === 'done'
                    ? 'bg-emerald-500/20'
                    : 'bg-white/5'
                }`}>
                  {status === 'done' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-start min-w-0">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className={`text-xs truncate ${status === 'current' ? 'text-primary-foreground/70' : 'text-slate-600'}`}>
                    {s.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>التقدم</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* شريط التقدم (الجوال) */}
        <div className="lg:hidden bg-white border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="ERP Pro" className="w-8 h-8" />
              <span className="font-bold text-sm">ERP Pro</span>
            </div>
            <span className="text-xs text-muted-foreground">
              الخطوة {currentStep + 1} من {visibleSteps.length}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {visibleSteps.map((s, i) => {
              const status = getStepStatus(i);
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (i < currentStep) {
                      setCurrentStep(i);
                      setStepErrors({});
                    }
                  }}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                    status === 'current'
                      ? 'bg-primary text-primary-foreground'
                      : status === 'done'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {status === 'done' ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* محتوى الخطوة */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 md:p-8 space-y-6">
            {/* رأس الخطوة */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <StepIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{stepDef?.title}</h2>
                <p className="text-muted-foreground">{stepDef?.description}</p>
              </div>
            </div>

            <Separator />

            {/* ── الخطوة: مرحباً ────────────────────────── */}
            {stepDef?.id === 'welcome' && (
              <div className="text-center space-y-8 py-6">
                {/* الشعار مع تأثير متحرك */}
                <div className="relative mx-auto w-24 h-24 md:w-32 md:h-32">
                  <div className="absolute inset-0 bg-gradient-to-bl from-emerald-400 to-teal-500 rounded-3xl rotate-6 opacity-30 animate-pulse" />
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-bl from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl overflow-hidden">
                    <img src="/logo.svg" alt="ERP Pro" className="w-16 h-16 md:w-20 md:h-20 drop-shadow-lg" />
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-l from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    مرحباً بك في ERP Pro
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    نظام إدارة موارد المؤسسات الاحترافي باللغة العربية
                  </p>
                  <Badge variant="secondary" className="text-xs">v{APP_VERSION}</Badge>
                </div>

                {/* شبكة الميزات */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
                  {FEATURE_HIGHLIGHTS.map((feat, i) => (
                    <div
                      key={i}
                      className="bg-muted/50 hover:bg-muted rounded-xl p-4 text-center space-y-2 transition-colors"
                    >
                      <feat.icon className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm font-medium">{feat.label}</p>
                      <p className="text-xs text-muted-foreground">{feat.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto">
                  <p className="text-sm text-amber-800">
                    سيأخذك هذا المعالج في جولة سريعة لإعداد نظامك. العملية تستغرق بضع دقائق فقط.
                  </p>
                </div>
              </div>
            )}

            {/* ── الخطوة: شعار الشركة ──────────────────── */}
            {stepDef?.id === 'branding' && (
              <div className="space-y-6">
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle>العلامة التجارية</AlertTitle>
                  <AlertDescription>
                    أضف شعار وشعار شركة. سيظهر الشعار في رأس النظام وعلى الفواتير والتقارير.
                  </AlertDescription>
                </Alert>

                {/* رفع الشعار */}
                <div className="space-y-4">
                  <Label>شعار الشركة</Label>
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${
                        form.companyLogo ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                      }`}>
                        {form.companyLogo ? (
                          <img src={form.companyLogo} alt="شعار الشركة" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center space-y-1">
                            <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                            <p className="text-xs text-muted-foreground">لا يوجد شعار</p>
                          </div>
                        )}
                      </div>
                      {form.companyLogo && (
                        <button
                          type="button"
                          onClick={() => updateForm('companyLogo', '')}
                          className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        رفع شعار
                      </Button>
                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG — بحد أقصى 2 ميغابايت</p>
                      {stepErrors.companyLogo && (
                        <p className="text-xs text-red-500">{stepErrors.companyLogo}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* بيانات إضافية */}
                <FieldWrapper label="شعار الشركة / الوصف" hint="عبارة قصيرة تصف نشاط الشركة" htmlFor="companyTagline">
                  <Textarea
                    id="companyTagline"
                    placeholder="مثال: الريادة في التجارة والخدمات"
                    value={form.companyTagline}
                    onChange={(e) => updateForm('companyTagline', e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </FieldWrapper>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper label="هاتف الشركة" hint="رقم الهاتف للتواصل" htmlFor="companyPhone">
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyPhone"
                        placeholder="مثال: +967123456789"
                        value={form.companyPhone}
                        onChange={(e) => updateForm('companyPhone', e.target.value)}
                        dir="ltr"
                        className="ps-9"
                      />
                    </div>
                  </FieldWrapper>
                  <FieldWrapper label="الرقم الضريبي" hint="الرقم الضريبي المسجل" htmlFor="companyTaxId">
                    <div className="relative">
                      <FileText className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyTaxId"
                        placeholder="مثال: 300000000000003"
                        value={form.companyTaxId}
                        onChange={(e) => updateForm('companyTaxId', e.target.value)}
                        dir="ltr"
                        className="ps-9"
                      />
                    </div>
                  </FieldWrapper>
                </div>

                <FieldWrapper label="عنوان الشركة" hint="العنوان الفعلي للشركة" htmlFor="companyAddress">
                  <div className="relative">
                    <MapPin className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="companyAddress"
                      placeholder="مثال: صنعاء، شارع الزبيري، بجوار البنك المركزي"
                      value={form.companyAddress}
                      onChange={(e) => updateForm('companyAddress', e.target.value)}
                      className="resize-none ps-9"
                      rows={2}
                    />
                  </div>
                </FieldWrapper>
              </div>
            )}

            {/* ── الخطوة 2: الاتصال بالخادم ──────────────────── */}
            {stepDef?.id === 'server' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  للعمل يحتاج النظام إلى الاتصال بخادم ERPNext. أدخل عنوان الخادم وبيانات الدخول.
                </p>
                <FieldWrapper
                  label="عنوان الخادم"
                  required
                  error={touched.backendHost ? stepErrors.backendHost : undefined}
                  hint="عنوان IP أو اسم النطاق مع المنفذ. يجب أن يكون خادم النظام قيد التشغيل."
                  htmlFor="backend-host"
                >
                  <Input
                    id="backend-host"
                    placeholder="مثال: http://192.168.1.100:8000"
                    value={form.backendHost}
                    onChange={(e) => {
                      updateForm('backendHost', e.target.value);
                      updateForm('serverConnectionTested', false);
                      setFieldTouched('backendHost');
                    }}
                    onBlur={() => setFieldTouched('backendHost')}
                    dir="ltr"
                    className={touched.backendHost && stepErrors.backendHost ? 'border-red-500' : ''}
                  />
                </FieldWrapper>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper label="مستخدم المدير" htmlFor="server-admin-user">
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
                  </FieldWrapper>
                  <FieldWrapper
                    label="كلمة مرور المدير"
                    required
                    error={touched.serverAdminPassword ? stepErrors.serverAdminPassword : undefined}
                    htmlFor="server-admin-password"
                  >
                    <div className="relative">
                      <Input
                        id="server-admin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="كلمة مرور المدير"
                        value={form.serverAdminPassword}
                        onChange={(e) => {
                          updateForm('serverAdminPassword', e.target.value);
                          updateForm('serverConnectionTested', false);
                          setFieldTouched('serverAdminPassword');
                        }}
                        onBlur={() => setFieldTouched('serverAdminPassword')}
                        className={`ps-9 ${touched.serverAdminPassword && stepErrors.serverAdminPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldWrapper>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 h-11"
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

                {touched.connection && stepErrors.connection && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{stepErrors.connection}</AlertDescription>
                  </Alert>
                )}

                {connectionResult && (
                  <div className={`p-4 rounded-xl border ${
                    connectionResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {connectionResult.success ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-2">
                        <p className={`text-sm font-semibold ${connectionResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                          {connectionResult.success ? 'تم الاتصال بنجاح' : 'فشل الاتصال'}
                        </p>
                        <p className={`text-xs ${connectionResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                          {connectionResult.message}
                        </p>
                        {connectionResult.success && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {connectionResult.ping && (
                              <Badge variant="secondary" className="text-xs gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                                <Check className="w-3 h-3" /> متاح
                              </Badge>
                            )}
                            {connectionResult.login && (
                              <Badge variant="secondary" className="text-xs gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                                <Check className="w-3 h-3" /> تسجيل دخول
                              </Badge>
                            )}
                            {connectionResult.apiKeys && (
                              <Badge variant="secondary" className="text-xs gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                                <Check className="w-3 h-3" /> مفاتيح API
                              </Badge>
                            )}
                            {connectionResult.existingCompany && (
                              <Badge variant="secondary" className="text-xs gap-1 bg-blue-100 text-blue-700 border-blue-200">
                                <Building2 className="w-3 h-3" /> شركة مسجلة
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* ── تنبيه وجود شركة مسجلة مسبقاً ── */}
                    {connectionResult.success && connectionResult.existingCompany && (
                      <div className="mt-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                        <div className="flex items-start gap-2">
                          <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-blue-800">
                              تم اكتشاف شركة مسجلة مسبقاً على الخادم
                            </p>
                            <p className="text-xs text-blue-700">
                              الشركة: <strong>{connectionResult.existingCompany.name}</strong>
                              {connectionResult.existingCompany.abbr && <> (اختصار: {connectionResult.existingCompany.abbr})</>}
                              {connectionResult.existingCompany.default_currency && <> — العملة: {connectionResult.existingCompany.default_currency}</>}
                              {connectionResult.existingCompany.country && <> — الدولة: {connectionResult.existingCompany.country}</>}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              سيتم عرض الوحدات المتاحة لاختيار ما تريد تفعيله ثم الانتقال لتسجيل الدخول...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">ملاحظة:</p>
                  <p>يجب أن يكون خادم ERPNext مثبتاً وقيد التشغيل قبل المتابعة. إذا لم يكن الخادم جاهزاً، يمكنك إعداده لاحقاً.</p>
                </div>
              </div>
            )}

            {/* ── الخطوة 3: الشركة ──────────────────────── */}
            {stepDef?.id === 'company' && (
              <div className="space-y-5">
                <Alert className="border-primary/20 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle>شركة واحدة</AlertTitle>
                  <AlertDescription>
                    سيتم إنشاء الشركة كشركة افتراضية واحدة في النظام. لا يمكن تعديل بيانات الشركة بعد الإعداد.
                  </AlertDescription>
                </Alert>

                <FieldWrapper
                  label="اسم الشركة"
                  required
                  error={touched.companyName ? stepErrors.companyName : undefined}
                  htmlFor="company-name"
                >
                  <Input
                    id="company-name"
                    placeholder="مثال: شركة النور التجارية"
                    value={form.companyName}
                    onChange={(e) => {
                      handleCompanyNameChange(e.target.value);
                      setFieldTouched('companyName');
                    }}
                    onBlur={() => setFieldTouched('companyName')}
                    className={touched.companyName && stepErrors.companyName ? 'border-red-500' : ''}
                  />
                </FieldWrapper>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper
                    label="اختصار الشركة"
                    error={touched.abbr ? stepErrors.abbr : undefined}
                    htmlFor="abbr"
                  >
                    <Input
                      id="abbr"
                      placeholder="يُولّد تلقائياً"
                      value={form.abbr}
                      onChange={(e) => {
                        updateForm('abbr', e.target.value);
                        setFieldTouched('abbr');
                      }}
                      onBlur={() => setFieldTouched('abbr')}
                      className={touched.abbr && stepErrors.abbr ? 'border-red-500' : ''}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="العملة" htmlFor="currency">
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
                  </FieldWrapper>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper
                    label="الدولة"
                    hint="اختيار الدولة يحدد العملة ونسبة الضريبة تلقائياً"
                    htmlFor="country"
                  >
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
                  </FieldWrapper>
                  <FieldWrapper label="اللغة" htmlFor="language">
                    <Select value={form.language} onValueChange={(v) => updateForm('language', v)}>
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">الإنجليزية</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldWrapper>
                </div>
                <FieldWrapper
                  label="قالب دليل الحسابات"
                  hint="يُنشئ النظام دليل الحسابات تلقائياً بناءً على القالب المختار"
                  htmlFor="coa"
                >
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
                </FieldWrapper>
              </div>
            )}

            {/* ── الخطوة 4: الوحدات ───────────────────────── */}
            {stepDef?.id === 'modules' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  اختر الوحدات التي تحتاجها. يمكنك تفعيل وحدات إضافية لاحقاً من الإعدادات.
                </p>
                {touched.modules && stepErrors.modules && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{stepErrors.modules}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {form.modules.map((mod, idx) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        const updated = [...form.modules];
                        updated[idx] = { ...updated[idx]!, enabled: !updated[idx]!.enabled };
                        updateForm('modules', updated);
                        setFieldTouched('modules');
                      }}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-start transition-all duration-200 ${
                        mod.enabled
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-muted bg-background hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <mod.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{mod.label}</p>
                          {mod.enabled && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── الخطوة: إعداد الموارد البشرية ──────────────── */}
            {stepDef?.id === 'hrmsSetup' && (
              <div className="space-y-5">
                <Alert className="border-amber-200 bg-amber-50">
                  <Users className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">إعداد بيانات الموارد البشرية</AlertTitle>
                  <AlertDescription className="text-amber-700 text-sm">
                    وحدة الموارد البشرية تحتاج إلى بيانات أساسية لعملها: أنواع المصروفات، أنواع الإجازات، مكونات الرواتب، وأنواع التوظيف.
                    حدد العناصر التي تريد إنشاءها — سيتم إعدادها بعد اكتمال الإعداد الرئيسي.
                  </AlertDescription>
                </Alert>

                {touched.hrmsExpenseTypes && stepErrors.hrmsExpenseTypes && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{stepErrors.hrmsExpenseTypes}</AlertDescription>
                  </Alert>
                )}

                {/* أنواع المصروفات */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-amber-500" />
                        أنواع المصروفات
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allNames = HRMS_DEFAULT_EXPENSE_TYPES.map(t => t.name);
                          const allSelected = allNames.every(n => form.hrmsSelectedExpenseTypes.has(n));
                          updateForm('hrmsSelectedExpenseTypes', allSelected ? new Set() : new Set(allNames));
                          setFieldTouched('hrmsExpenseTypes');
                        }}
                      >
                        {HRMS_DEFAULT_EXPENSE_TYPES.every(t => form.hrmsSelectedExpenseTypes.has(t.name)) ? 'إلغاء التحديد' : 'تحديد الكل'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HRMS_DEFAULT_EXPENSE_TYPES.map((type) => (
                        <label
                          key={type.name}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            form.hrmsSelectedExpenseTypes.has(type.name) ? 'bg-amber-50 border border-amber-200' : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={form.hrmsSelectedExpenseTypes.has(type.name)}
                            onCheckedChange={() => {
                              const next = new Set(form.hrmsSelectedExpenseTypes);
                              if (next.has(type.name)) next.delete(type.name); else next.add(type.name);
                              updateForm('hrmsSelectedExpenseTypes', next);
                              setFieldTouched('hrmsExpenseTypes');
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{type.name}</span>
                            <span className="text-muted-foreground text-xs ms-1">({type.englishName})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      تم تحديد {form.hrmsSelectedExpenseTypes.size} من {HRMS_DEFAULT_EXPENSE_TYPES.length} نوع
                    </p>
                  </CardContent>
                </Card>

                {/* أنواع الإجازات */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                        أنواع الإجازات
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allNames = HRMS_DEFAULT_LEAVE_TYPES.map(t => t.name);
                          const allSelected = allNames.every(n => form.hrmsSelectedLeaveTypes.has(n));
                          updateForm('hrmsSelectedLeaveTypes', allSelected ? new Set() : new Set(allNames));
                        }}
                      >
                        {HRMS_DEFAULT_LEAVE_TYPES.every(t => form.hrmsSelectedLeaveTypes.has(t.name)) ? 'إلغاء التحديد' : 'تحديد الكل'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HRMS_DEFAULT_LEAVE_TYPES.map((type) => (
                        <label
                          key={type.name}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            form.hrmsSelectedLeaveTypes.has(type.name) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={form.hrmsSelectedLeaveTypes.has(type.name)}
                            onCheckedChange={() => {
                              const next = new Set(form.hrmsSelectedLeaveTypes);
                              if (next.has(type.name)) next.delete(type.name); else next.add(type.name);
                              updateForm('hrmsSelectedLeaveTypes', next);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{type.name}</span>
                            <span className="text-muted-foreground text-xs ms-1">({type.englishName})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* مكونات الرواتب */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-emerald-500" />
                        مكونات الرواتب
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const allNames = HRMS_DEFAULT_SALARY_COMPONENTS.map(t => t.name);
                          const allSelected = allNames.every(n => form.hrmsSelectedSalaryComponents.has(n));
                          updateForm('hrmsSelectedSalaryComponents', allSelected ? new Set() : new Set(allNames));
                        }}
                      >
                        {HRMS_DEFAULT_SALARY_COMPONENTS.every(t => form.hrmsSelectedSalaryComponents.has(t.name)) ? 'إلغاء التحديد' : 'تحديد الكل'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HRMS_DEFAULT_SALARY_COMPONENTS.map((comp) => (
                        <label
                          key={comp.name}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            form.hrmsSelectedSalaryComponents.has(comp.name) ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={form.hrmsSelectedSalaryComponents.has(comp.name)}
                            onCheckedChange={() => {
                              const next = new Set(form.hrmsSelectedSalaryComponents);
                              if (next.has(comp.name)) next.delete(comp.name); else next.add(comp.name);
                              updateForm('hrmsSelectedSalaryComponents', next);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{comp.name}</span>
                          </div>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${
                            comp.type === 'Earning' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {comp.type === 'Earning' ? 'استحقاق' : 'استقطاع'}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── الخطوة: السنة المالية ───────────────────── */}
            {stepDef?.id === 'fiscalYear' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  حدد الفترة المالية الأولى لنظامك. يمكن إنشاء سنوات مالية إضافية لاحقاً.
                </p>
                <FieldWrapper
                  label="اسم السنة المالية"
                  required
                  error={touched.fiscalYearName ? stepErrors.fiscalYearName : undefined}
                  htmlFor="fy-name"
                >
                  <Input
                    id="fy-name"
                    placeholder="مثال: 2025"
                    value={form.fiscalYearName}
                    onChange={(e) => {
                      updateForm('fiscalYearName', e.target.value);
                      setFieldTouched('fiscalYearName');
                    }}
                    onBlur={() => setFieldTouched('fiscalYearName')}
                    className={touched.fiscalYearName && stepErrors.fiscalYearName ? 'border-red-500' : ''}
                  />
                </FieldWrapper>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper
                    label="تاريخ البداية"
                    required
                    error={touched.fiscalYearStart ? stepErrors.fiscalYearStart : undefined}
                    htmlFor="fy-start"
                  >
                    <Input
                      id="fy-start"
                      type="date"
                      value={form.fiscalYearStart}
                      onChange={(e) => {
                        updateForm('fiscalYearStart', e.target.value);
                        setFieldTouched('fiscalYearStart');
                      }}
                      onBlur={() => setFieldTouched('fiscalYearStart')}
                      dir="ltr"
                      className={touched.fiscalYearStart && stepErrors.fiscalYearStart ? 'border-red-500' : ''}
                    />
                  </FieldWrapper>
                  <FieldWrapper
                    label="تاريخ النهاية"
                    required
                    error={touched.fiscalYearEnd ? stepErrors.fiscalYearEnd : undefined}
                    htmlFor="fy-end"
                  >
                    <Input
                      id="fy-end"
                      type="date"
                      value={form.fiscalYearEnd}
                      onChange={(e) => {
                        updateForm('fiscalYearEnd', e.target.value);
                        setFieldTouched('fiscalYearEnd');
                      }}
                      onBlur={() => setFieldTouched('fiscalYearEnd')}
                      dir="ltr"
                      className={touched.fiscalYearEnd && stepErrors.fiscalYearEnd ? 'border-red-500' : ''}
                    />
                  </FieldWrapper>
                </div>
              </div>
            )}

            {/* ── الخطوة 6: المستودعات ─────────────────────── */}
            {stepDef?.id === 'warehouses' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  أضف المستودعات الافتراضية. يمكنك إضافة المزيد لاحقاً من الإعدادات.
                </p>
                {touched.warehouses && stepErrors.warehouses && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{stepErrors.warehouses}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  {form.warehouses.map((wh, idx) => (
                    <div key={wh.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {idx + 1}
                      </div>
                      <Input
                        value={wh.name}
                        onChange={(e) => {
                          const updated = [...form.warehouses];
                          updated[idx] = { ...updated[idx]!, name: e.target.value };
                          updateForm('warehouses', updated);
                          setFieldTouched('warehouses');
                        }}
                        placeholder="اسم المستودع"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          updateForm('warehouses', form.warehouses.filter((w) => w.id !== wh.id));
                          setFieldTouched('warehouses');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    updateForm('warehouses', [...form.warehouses, { id: genId(), name: '' }]);
                    setFieldTouched('warehouses');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  إضافة مستودع
                </Button>
              </div>
            )}

            {/* ── الخطوة 7: طرق الدفع ─────────────────────── */}
            {stepDef?.id === 'paymentMethods' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  أضف طرق الدفع المتاحة. يمكنك تعديلها لاحقاً.
                </p>
                {touched.paymentMethods && stepErrors.paymentMethods && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{stepErrors.paymentMethods}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  {form.paymentMethods.map((pm, idx) => (
                    <div key={pm.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs shrink-0">
                        {pm.type === 'Cash' ? <Landmark className="w-4 h-4 text-primary" /> : pm.type === 'Bank' ? <Building2 className="w-4 h-4 text-primary" /> : <CreditCard className="w-4 h-4 text-primary" />}
                      </div>
                      <Input
                        value={pm.name}
                        onChange={(e) => {
                          const updated = [...form.paymentMethods];
                          updated[idx] = { ...updated[idx]!, name: e.target.value };
                          updateForm('paymentMethods', updated);
                          setFieldTouched('paymentMethods');
                        }}
                        placeholder="اسم طريقة الدفع"
                        className="flex-1"
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          updateForm('paymentMethods', form.paymentMethods.filter((p) => p.id !== pm.id));
                          setFieldTouched('paymentMethods');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    updateForm('paymentMethods', [...form.paymentMethods, { id: genId(), name: '', type: 'Cash' }]);
                    setFieldTouched('paymentMethods');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  إضافة طريقة دفع
                </Button>
              </div>
            )}

            {/* ── الخطوة 8: الضرائب ─────────────────────── */}
            {stepDef?.id === 'tax' && (
              <div className="space-y-5">
                {/* تنبيه إذا الدولة لا تدعم الضرائب في ERPNext */}
                {!COUNTRY_CURRENCY_MAP[form.country]?.taxSupported && (
                  <Alert className="border-amber-300 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">الدولة لا تدعم الضرائب تلقائياً</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      {form.country} لا تملك بيانات ضريبية معرّفة في ERPNext. يمكنك تفعيل الضريبة يدوياً وسيتولى ERP Pro إنشاء حسابات وقوالب ضريبية مخصصة، أو يمكنك تخطي هذه الخطوة وإعداد الضرائب لاحقاً من الإعدادات.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">تفعيل الضريبة</Label>
                    <p className="text-xs text-muted-foreground">
                      فعّل هذا الخيار لتطبيق ضريبة القيمة المضافة على الفواتير
                    </p>
                  </div>
                  <Switch
                    checked={form.enableTax}
                    onCheckedChange={(v) => updateForm('enableTax', v)}
                  />
                </div>

                {form.enableTax && (
                  <div className="space-y-4">
                    <FieldWrapper
                      label="اسم الضريبة"
                      required
                      error={touched.taxName ? stepErrors.taxName : undefined}
                      htmlFor="tax-name"
                    >
                      <Input
                        id="tax-name"
                        placeholder="مثال: ضريبة القيمة المضافة"
                        value={form.taxName}
                        onChange={(e) => {
                          updateForm('taxName', e.target.value);
                          setFieldTouched('taxName');
                        }}
                        onBlur={() => setFieldTouched('taxName')}
                        className={touched.taxName && stepErrors.taxName ? 'border-red-500' : ''}
                      />
                    </FieldWrapper>
                    <FieldWrapper
                      label="نسبة الضريبة (%)"
                      required
                      error={touched.taxRate ? stepErrors.taxRate : undefined}
                      htmlFor="tax-rate"
                    >
                      <Input
                        id="tax-rate"
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.taxRate}
                        onChange={(e) => {
                          updateForm('taxRate', Number(e.target.value));
                          setFieldTouched('taxRate');
                        }}
                        onBlur={() => setFieldTouched('taxRate')}
                        dir="ltr"
                        className={touched.taxRate && stepErrors.taxRate ? 'border-red-500' : ''}
                      />
                    </FieldWrapper>
                  </div>
                )}
              </div>
            )}

            {/* ── الخطوة 9: المستخدم الإداري ─────────────────── */}
            {stepDef?.id === 'admin' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  أنشئ حساب المدير الرئيسي للنظام. سيكون له صلاحيات كاملة.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper
                    label="الاسم الأول"
                    required
                    error={touched.adminFirstName ? stepErrors.adminFirstName : undefined}
                    htmlFor="admin-first"
                  >
                    <Input
                      id="admin-first"
                      placeholder="الاسم الأول"
                      value={form.adminFirstName}
                      onChange={(e) => {
                        updateForm('adminFirstName', e.target.value);
                        setFieldTouched('adminFirstName');
                      }}
                      onBlur={() => setFieldTouched('adminFirstName')}
                      className={touched.adminFirstName && stepErrors.adminFirstName ? 'border-red-500' : ''}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="الاسم الأخير" htmlFor="admin-last">
                    <Input
                      id="admin-last"
                      placeholder="الاسم الأخير"
                      value={form.adminLastName}
                      onChange={(e) => updateForm('adminLastName', e.target.value)}
                    />
                  </FieldWrapper>
                </div>
                <FieldWrapper
                  label="البريد الإلكتروني"
                  required
                  error={touched.adminEmail ? stepErrors.adminEmail : undefined}
                  hint="سيُستخدم لتسجيل الدخول"
                  htmlFor="admin-email"
                >
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={form.adminEmail}
                    onChange={(e) => {
                      updateForm('adminEmail', e.target.value);
                      setFieldTouched('adminEmail');
                    }}
                    onBlur={() => setFieldTouched('adminEmail')}
                    dir="ltr"
                    className={touched.adminEmail && stepErrors.adminEmail ? 'border-red-500' : ''}
                  />
                </FieldWrapper>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper
                    label="كلمة المرور"
                    required
                    error={touched.adminPassword ? stepErrors.adminPassword : undefined}
                    hint="8 أحرف على الأقل"
                    htmlFor="admin-password"
                  >
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showAdminPassword ? 'text' : 'password'}
                        placeholder="كلمة المرور"
                        value={form.adminPassword}
                        onChange={(e) => {
                          updateForm('adminPassword', e.target.value);
                          setFieldTouched('adminPassword');
                        }}
                        onBlur={() => setFieldTouched('adminPassword')}
                        className={`ps-9 ${touched.adminPassword && stepErrors.adminPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={form.adminPassword} />
                  </FieldWrapper>
                  <FieldWrapper
                    label="تأكيد كلمة المرور"
                    required
                    error={touched.adminPasswordConfirm ? stepErrors.adminPasswordConfirm : undefined}
                    htmlFor="admin-password-confirm"
                  >
                    <Input
                      id="admin-password-confirm"
                      type="password"
                      placeholder="أعد إدخال كلمة المرور"
                      value={form.adminPasswordConfirm}
                      onChange={(e) => {
                        updateForm('adminPasswordConfirm', e.target.value);
                        setFieldTouched('adminPasswordConfirm');
                      }}
                      onBlur={() => setFieldTouched('adminPasswordConfirm')}
                      className={touched.adminPasswordConfirm && stepErrors.adminPasswordConfirm ? 'border-red-500' : ''}
                    />
                  </FieldWrapper>
                </div>
              </div>
            )}

            {/* ── الخطوة 10: الموظف الإداري ─────────────────── */}
            {stepDef?.id === 'employee' && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  سجّل بيانات الموظف الإداري. سيُربط بحساب المدير.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper
                    label="الاسم الأول"
                    required
                    error={touched.employeeFirstName ? stepErrors.employeeFirstName : undefined}
                    htmlFor="emp-first"
                  >
                    <Input
                      id="emp-first"
                      placeholder="الاسم الأول"
                      value={form.employeeFirstName}
                      onChange={(e) => {
                        updateForm('employeeFirstName', e.target.value);
                        setFieldTouched('employeeFirstName');
                      }}
                      onBlur={() => setFieldTouched('employeeFirstName')}
                      className={touched.employeeFirstName && stepErrors.employeeFirstName ? 'border-red-500' : ''}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="الاسم الأخير" htmlFor="emp-last">
                    <Input
                      id="emp-last"
                      placeholder="الاسم الأخير"
                      value={form.employeeLastName}
                      onChange={(e) => updateForm('employeeLastName', e.target.value)}
                    />
                  </FieldWrapper>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldWrapper label="البريد الإلكتروني" hint="اختياري" htmlFor="emp-email">
                    <Input
                      id="emp-email"
                      type="email"
                      placeholder="employee@example.com"
                      value={form.employeeEmail}
                      onChange={(e) => updateForm('employeeEmail', e.target.value)}
                      dir="ltr"
                    />
                  </FieldWrapper>
                  <FieldWrapper label="رقم الهاتف" htmlFor="emp-phone">
                    <Input
                      id="emp-phone"
                      placeholder="+967770000000"
                      value={form.employeePhone}
                      onChange={(e) => updateForm('employeePhone', e.target.value)}
                      dir="ltr"
                    />
                  </FieldWrapper>
                </div>
                <FieldWrapper label="المسمى الوظيفي" htmlFor="emp-designation">
                  <Input
                    id="emp-designation"
                    placeholder="مثال: مدير"
                    value={form.employeeDesignation}
                    onChange={(e) => updateForm('employeeDesignation', e.target.value)}
                  />
                </FieldWrapper>
              </div>
            )}

            {/* ── الخطوة 11: مراجعة وتأكيد ───────────────── */}
            {stepDef?.id === 'review' && (
              <div className="space-y-5">
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>تحذير مهم</AlertTitle>
                  <AlertDescription>
                    لا يمكن تعديل بيانات الشركة بعد الإعداد. تأكد من صحة جميع البيانات قبل المتابعة.
                  </AlertDescription>
                </Alert>

                {/* قسم معلومات الشركة */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('company')}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-semibold">معلومات الشركة</span>
                    </div>
                    {collapsedSections.company ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.company && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-muted-foreground">الاسم:</span> {form.companyName}</div>
                        <div><span className="text-muted-foreground">الاختصار:</span> {form.abbr}</div>
                        <div><span className="text-muted-foreground">الدولة:</span> {form.country}</div>
                        <div><span className="text-muted-foreground">العملة:</span> {form.currency}</div>
                        <div><span className="text-muted-foreground">اللغة:</span> {form.language === 'ar' ? 'العربية' : 'الإنجليزية'}</div>
                        <div><span className="text-muted-foreground">دليل الحسابات:</span> {form.chartOfAccounts}</div>
                        {form.companyTagline && <div className="col-span-2"><span className="text-muted-foreground">الشعار:</span> {form.companyTagline}</div>}
                        {form.companyPhone && <div><span className="text-muted-foreground">الهاتف:</span> {form.companyPhone}</div>}
                        {form.companyTaxId && <div><span className="text-muted-foreground">الرقم الضريبي:</span> {form.companyTaxId}</div>}
                        {form.companyAddress && <div className="col-span-2"><span className="text-muted-foreground">العنوان:</span> {form.companyAddress}</div>}
                      </div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'company')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم الخادم */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('server')}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-primary" />
                      <span className="font-semibold">الاتصال بالخادم</span>
                    </div>
                    {collapsedSections.server ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.server && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div><span className="text-muted-foreground">العنوان:</span> <code className="bg-muted px-1 rounded text-xs">{form.backendHost}</code></div>
                      <div><span className="text-muted-foreground">المستخدم:</span> {form.serverAdminUser}</div>
                      <div><span className="text-muted-foreground">الاتصال:</span> <Badge variant="secondary" className="text-xs gap-1"><Check className="w-3 h-3" /> ناجح</Badge></div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'server')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم الوحدات */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('modules')}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-primary" />
                      <span className="font-semibold">الوحدات المفعلة</span>
                    </div>
                    {collapsedSections.modules ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.modules && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {form.modules.filter((m) => m.enabled).map((m) => {
                          const MIcon = m.icon;
                          return (
                          <Badge key={m.id} variant="secondary" className="gap-1"><MIcon className="w-3.5 h-3.5" /> {m.label}</Badge>
                          );
                        })}
                      </div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'modules')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم السنة المالية */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('fiscalYear')}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-semibold">السنة المالية</span>
                    </div>
                    {collapsedSections.fiscalYear ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.fiscalYear && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div><span className="text-muted-foreground">الاسم:</span> {form.fiscalYearName}</div>
                      <div><span className="text-muted-foreground">من:</span> {form.fiscalYearStart}</div>
                      <div><span className="text-muted-foreground">إلى:</span> {form.fiscalYearEnd}</div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'fiscalYear')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم المستودعات */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('warehouses')}
                  >
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-primary" />
                      <span className="font-semibold">المستودعات ({form.warehouses.length})</span>
                    </div>
                    {collapsedSections.warehouses ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.warehouses && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {form.warehouses.map((w) => (
                          <Badge key={w.id} variant="secondary">{w.name}</Badge>
                        ))}
                      </div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'warehouses')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم طرق الدفع */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('paymentMethods')}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="font-semibold">طرق الدفع ({form.paymentMethods.length})</span>
                    </div>
                    {collapsedSections.paymentMethods ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.paymentMethods && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {form.paymentMethods.map((p) => (
                          <Badge key={p.id} variant="secondary">{p.name}</Badge>
                        ))}
                      </div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'paymentMethods')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم الضرائب */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('tax')}
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      <span className="font-semibold">الضرائب</span>
                    </div>
                    {collapsedSections.tax ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.tax && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      {form.enableTax ? (
                        <>
                          <div><span className="text-muted-foreground">الضريبة:</span> {form.taxName} ({form.taxRate}%)</div>
                          {!COUNTRY_CURRENCY_MAP[form.country]?.taxSupported && (
                            <div className="text-amber-600 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              إعداد مخصص — {form.country} لا تملك بيانات ضريبية في ERPNext
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted-foreground">
                          الضريبة غير مفعلة
                          {!COUNTRY_CURRENCY_MAP[form.country]?.taxSupported && (
                            <span className="text-amber-600 text-xs block mt-1">
                              {form.country} لا تتطلب ضريبة تلقائية — يمكنك تفعيلها يدوياً
                            </span>
                          )}
                        </div>
                      )}
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'tax')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                {/* قسم المستخدم الإداري */}
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('admin')}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-semibold">المستخدم الإداري</span>
                    </div>
                    {collapsedSections.admin ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!collapsedSections.admin && (
                    <CardContent className="pt-0 pb-4 space-y-2 text-sm">
                      <div><span className="text-muted-foreground">الاسم:</span> {form.adminFirstName} {form.adminLastName}</div>
                      <div><span className="text-muted-foreground">البريد:</span> <code className="bg-muted px-1 rounded text-xs">{form.adminEmail}</code></div>
                      <div><span className="text-muted-foreground">كلمة المرور:</span> {'•'.repeat(Math.min(form.adminPassword.length, 12))}</div>
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => { setCurrentStep(visibleSteps.findIndex(s => s.id === 'admin')); setStepErrors({}); }}>
                        تعديل ←
                      </Button>
                    </CardContent>
                  )}
                </Card>

                <Separator />

                {/* الإقرار */}
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/30">
                  <Checkbox
                    id="data-confirm"
                    checked={form.dataConfirmed}
                    onCheckedChange={(checked) => {
                      updateForm('dataConfirmed', checked === true);
                      setFieldTouched('dataConfirmed');
                    }}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="data-confirm" className="text-sm font-medium cursor-pointer">
                      أقر بأن البيانات المدخلة صحيحة وأريد المتابعة
                    </Label>
                    {touched.dataConfirmed && stepErrors.dataConfirmed && (
                      <p className="text-xs text-red-500">{stepErrors.dataConfirmed}</p>
                    )}
                  </div>
                </div>

                {/* رسالة الخطأ */}
                {setupError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>فشل الإعداد</AlertTitle>
                    <AlertDescription className="space-y-3">
                      <p>{setupError}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={executeSetup} disabled={executing}>
                          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          إعادة المحاولة
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* ── أزرار التنقل ────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 pt-6 pb-8">
              <Button
                type="button"
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </Button>

              {currentStep === visibleSteps.length - 1 ? (
                <Button
                  type="button"
                  onClick={executeSetup}
                  disabled={executing || !canGoNext}
                  className="gap-2 min-w-40"
                  size="lg"
                >
                  {executing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإعداد...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      بدء الإعداد
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={currentStep === visibleSteps.length - 1}
                  className="gap-2"
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* أنماط مخصصة */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
}
