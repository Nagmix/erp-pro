'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Wand2,
  ArrowLeft,
  ArrowRight,
  Store,
  Warehouse,
  CreditCard,
  Receipt,
  Settings2,
  ShoppingCart,
  ChevronLeft,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { PageHeader } from '@/components/erp/page-header';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { apiPosCheckReadiness, apiPosSetup, apiCreateDoc, apiUpdateDoc } from '@/lib/client/api';
import { toast } from 'sonner';
import type {
  POSReadinessResponse,
  PosReadinessIssueDetail,
  PosReadinessIssueCode,
  POSSetupResponseData,
} from '@/lib/core/types';

// ─── ثوابت ────────────────────────────────────────────────────

type WizardStep = 'readiness' | 'auto-fix' | 'manual' | 'verification';

const STEPS: { id: WizardStep; title: string; icon: React.ElementType }[] = [
  { id: 'readiness', title: 'فحص الجاهزية', icon: Store },
  { id: 'auto-fix', title: 'الإصلاح التلقائي', icon: Wand2 },
  { id: 'manual', title: 'الإعداد اليدوي', icon: Settings2 },
  { id: 'verification', title: 'التحقق النهائي', icon: CheckCircle2 },
];

/** خريطة رموز المشاكل → تسمية عربية وأيقونة */
const ISSUE_LABELS: Record<PosReadinessIssueCode, { label: string; icon: React.ElementType }> = {
  no_active_pos_profile: { label: 'ملف نقطة البيع نشط', icon: Store },
  no_company_warehouse: { label: 'مستودع الشركة', icon: Warehouse },
  mode_of_payment_missing_company_account: { label: 'طرق الدفع مُعدّة', icon: CreditCard },
  pos_profile_missing_warehouse: { label: 'ملف POS لديه مستودع', icon: Warehouse },
  pos_profile_missing_price_list: { label: 'ملف POS لديه قائمة أسعار', icon: Receipt },
  pos_profile_no_payment_rows: { label: 'ملف POS لديه صفوف دفع', icon: CreditCard },
  pos_settings_invoice_type: { label: 'إعدادات نوع الفاتورة', icon: FileText },
};

// ─── مكونات مساعدة ────────────────────────────────────────────

function CheckItem({
  pass,
  warning,
  label,
  icon: Icon,
  detail,
}: {
  pass: boolean;
  warning?: boolean;
  label: string;
  icon: React.ElementType;
  detail?: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        pass
          ? 'border-primary/20 bg-primary/5'
          : warning
            ? 'border-chart-2/20 bg-chart-2/5'
            : 'border-destructive/20 bg-destructive/5'
      }`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          pass
            ? 'bg-primary/10 text-primary'
            : warning
              ? 'bg-chart-2/10 text-chart-2'
              : 'bg-destructive/10 text-destructive'
        }`}
      >
        {pass ? <CheckCircle2 className="h-4 w-4" /> : warning ? <AlertTriangle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{detail}</p>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: typeof STEPS;
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isDone = i < currentIndex;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick?.(step.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : isDone
                  ? 'text-primary hover:bg-primary/5'
                  : 'text-muted-foreground hover:bg-muted/50'
            }`}
            disabled={!isDone && !isActive}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{step.title}</span>
            {isDone && <CheckCircle2 className="h-3 w-3" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── المكون الرئيسي ──────────────────────────────────────────

export default function PosSetupWizardPage() {
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [currentStep, setCurrentStep] = useState<WizardStep>('readiness');
  const [readiness, setReadiness] = useState<POSReadinessResponse | null>(null);
  const [setupActions, setSetupActions] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<POSReadinessResponse | null>(null);

  // Manual form state
  const [manualProfile, setManualProfile] = useState({
    name: '',
    warehouse: '',
    price_list: '',
    company: '',
  });
  const [manualPayment, setManualPayment] = useState({
    pos_profile: '',
    mode_of_payment: '',
  });
  const [manualInvoiceType, setManualInvoiceType] = useState('');
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [settingInvoiceType, setSettingInvoiceType] = useState(false);

  // ── فحص الجاهزية ──────────────────────────────────────────

  const runCheck = useCallback(async () => {
    if (!company) return;
    setChecking(true);
    setSetupActions([]);
    try {
      const r = await apiPosCheckReadiness(company);
      setReadiness(r);
    } catch (e) {
      toast.error('فشل الفحص', {
        description: e instanceof Error ? e.message : 'تعذر التحقق من جاهزية نقطة البيع',
      });
    } finally {
      setChecking(false);
    }
  }, [company]);

  // فحص تلقائي عند تحميل الصفحة
  useEffect(() => {
    if (company && !readiness && !checking) {
      void runCheck();
    }
  }, [company, readiness, checking, runCheck]);

  // ── الإصلاح التلقائي ─────────────────────────────────────

  const runAutoFix = useCallback(async () => {
    if (!company) return;
    setFixing(true);
    try {
      const data = await apiPosSetup({
        company,
        apply_minimal_pos_settings: true,
        ensure_cash_mode_account: true,
        create_default_pos_profile_if_missing: true,
      });
      setReadiness(data.readiness);
      setSetupActions(data.setup_actions);
      if (data.setup_actions.length > 0) {
        toast.success('تم تنفيذ الإصلاحات', {
          description: data.setup_actions.join(' · '),
        });
      } else {
        toast.info('لا توجد إصلاحات إضافية متاحة تلقائياً');
      }
    } catch (e) {
      toast.error('فشل الإصلاح التلقائي', {
        description: e instanceof Error ? e.message : 'تعذر تنفيذ التهيئة',
      });
    } finally {
      setFixing(false);
    }
  }, [company]);

  // ── التحقق النهائي ────────────────────────────────────────

  const runVerification = useCallback(async () => {
    if (!company) return;
    setVerifying(true);
    try {
      const r = await apiPosCheckReadiness(company);
      setVerificationResult(r);
      if (r.ready) {
        toast.success('نقطة البيع جاهزة للعمل!');
      } else {
        toast.warning('لا تزال هناك مشاكل تحتاج اهتماماً');
      }
    } catch (e) {
      toast.error('فشل التحقق', {
        description: e instanceof Error ? e.message : 'تعذر التحقق النهائي',
      });
    } finally {
      setVerifying(false);
    }
  }, [company]);

  // ── الإعداد اليدوي: إنشاء ملف POS ──────────────────────

  const handleCreateProfile = useCallback(async () => {
    if (!manualProfile.name.trim()) {
      toast.error('أدخل اسم ملف نقطة البيع');
      return;
    }
    setCreatingProfile(true);
    try {
      await apiCreateDoc('POS Profile', {
        name: manualProfile.name.trim(),
        company: manualProfile.company || company,
        warehouse: manualProfile.warehouse || undefined,
        selling_price_list: manualProfile.price_list || undefined,
        disabled: 0,
      });
      toast.success('تم إنشاء ملف نقطة البيع بنجاح');
      setManualProfile({ name: '', warehouse: '', price_list: '', company: '' });
      // إعادة فحص الجاهزية
      void runCheck();
    } catch (e) {
      toast.error('فشل إنشاء ملف نقطة البيع', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setCreatingProfile(false);
    }
  }, [manualProfile, company, runCheck]);

  // ── الإعداد اليدوي: إضافة طريقة دفع ──────────────────────

  const handleAddPayment = useCallback(async () => {
    if (!manualPayment.pos_profile.trim() || !manualPayment.mode_of_payment.trim()) {
      toast.error('اختر ملف نقطة البيع وطريقة الدفع');
      return;
    }
    setAddingPayment(true);
    try {
      // جلب الملف الحالي لإضافة صف دفع
      const existing = await fetch(`/api/pos/profile-data?pos_profile=${encodeURIComponent(manualPayment.pos_profile)}`);
      const existingData = await existing.json();
      const payments = Array.isArray(existingData?.data?.payments) ? existingData.data.payments : [];
      payments.push({
        mode_of_payment: manualPayment.mode_of_payment,
        default: payments.length === 0 ? 1 : 0,
      });
      await apiUpdateDoc('POS Profile', manualPayment.pos_profile, { payments });
      toast.success('تم إضافة طريقة الدفع بنجاح');
      setManualPayment({ pos_profile: '', mode_of_payment: '' });
      void runCheck();
    } catch (e) {
      toast.error('فشل إضافة طريقة الدفع', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setAddingPayment(false);
    }
  }, [manualPayment, runCheck]);

  // ── الإعداد اليدوي: تعيين نوع الفاتورة ────────────────────

  const handleSetInvoiceType = useCallback(async () => {
    if (!manualInvoiceType.trim()) {
      toast.error('اختر نوع الفاتورة');
      return;
    }
    setSettingInvoiceType(true);
    try {
      await apiUpdateDoc('POS Settings', 'POS Settings', {
        invoice_type: manualInvoiceType,
      });
      toast.success('تم تعيين نوع الفاتورة بنجاح');
      setManualInvoiceType('');
      void runCheck();
    } catch (e) {
      toast.error('فشل تعيين نوع الفاتورة', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSettingInvoiceType(false);
    }
  }, [manualInvoiceType, runCheck]);

  // ── تحليل المشاكل ─────────────────────────────────────────

  const { blockingIssues, warningIssues, passedChecks } = useMemo(() => {
    if (!readiness?.details) {
      // محاولة استنتاج من issues/warnings
      return { blockingIssues: [], warningIssues: [], passedChecks: [] as PosReadinessIssueCode[] };
    }

    const blocking: PosReadinessIssueDetail[] = [];
    const warning: PosReadinessIssueDetail[] = [];
    const passed: PosReadinessIssueCode[] = [];

    const allCodes: PosReadinessIssueCode[] = [
      'no_active_pos_profile',
      'no_company_warehouse',
      'mode_of_payment_missing_company_account',
      'pos_profile_missing_warehouse',
      'pos_profile_missing_price_list',
      'pos_profile_no_payment_rows',
      'pos_settings_invoice_type',
    ];

    const issueCodes = new Set(readiness.details.map((d) => d.code));

    for (const code of allCodes) {
      if (issueCodes.has(code)) {
        const detail = readiness.details.find((d) => d.code === code)!;
        if (detail.severity === 'warning') {
          warning.push(detail);
        } else {
          blocking.push(detail);
        }
      } else {
        passed.push(code);
      }
    }

    return { blockingIssues: blocking, warningIssues: warning, passedChecks: passed };
  }, [readiness]);

  // هل هناك مشاكل تحتاج إعداد يدوي؟
  const hasManualIssues = useMemo(() => {
    if (!readiness?.details) return false;
    // المشاكل التي لا يمكن إصلاحها تلقائياً
    const manualCodes: PosReadinessIssueCode[] = [
      'pos_profile_missing_warehouse',
      'pos_profile_missing_price_list',
      'pos_profile_no_payment_rows',
    ];
    return readiness.details.some((d) => manualCodes.includes(d.code) && d.severity === 'blocking');
  }, [readiness]);

  // ── التنقل بين الخطوات ────────────────────────────────────

  const goNext = useCallback(() => {
    const idx = STEPS.findIndex((s) => s.id === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1]!.id);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    const idx = STEPS.findIndex((s) => s.id === currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]!.id);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((step: WizardStep) => {
    const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
    const targetIdx = STEPS.findIndex((s) => s.id === step);
    // فقط السماح بالانتقال للخطوات السابقة أو الحالية
    if (targetIdx <= currentIdx) {
      setCurrentStep(step);
    }
  }, [currentStep]);

  // التحقق التلقائي عند الانتقال لخطوة التحقق
  useEffect(() => {
    if (currentStep === 'verification' && company && !verifying && !verificationResult) {
      void runVerification();
    }
  }, [currentStep, company, runVerification, verifying, verificationResult]);

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progressPercent = ((stepIndex + 1) / STEPS.length) * 100;

  // ─── عرض حالة التحميل ─────────────────────────────────────

  if (coLoading) {
    return (
      <div dir="rtl" className="erp-page-enter flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات الشركة...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div dir="rtl" className="erp-page-enter space-y-5">
        <PageHeader
          title="معالج إعداد نقطة البيع"
          description="إعداد موجه بنقرة واحدة لوحدة نقاط البيع"
          iconify="solar:settings-bold-duotone"
          accent="amber"
          breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'معالج الإعداد' }]}
        />
        <Alert className="border-chart-2/20 bg-chart-2/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>لم يتم تحديد شركة</AlertTitle>
          <AlertDescription className="text-sm">
            يرجى تعيين الشركة الافتراضية من{' '}
            <Link href="/settings" className="text-primary underline underline-offset-4 hover:no-underline">
              الإعدادات العامة
            </Link>{' '}
            قبل استخدام معالج الإعداد.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // المحتوى الرئيسي
  // ════════════════════════════════════════════════════════════

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="معالج إعداد نقطة البيع"
        description="إعداد موجه بنقرة واحدة — فحص الجاهزية، إصلاح تلقائي، وإعداد يدوي"
        iconify="solar:settings-bold-duotone"
        accent="amber"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'معالج الإعداد' }]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/pos/settings">
              <Settings2 className="h-4 w-4 ms-1.5" />
              الإعدادات المتقدمة
            </Link>
          </Button>
        }
      />

      {/* شريط التقدم والخطوات */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              الخطوة {stepIndex + 1} من {STEPS.length}
            </span>
            <span className="text-sm font-semibold text-primary">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={handleStepClick} />
        </CardContent>
      </Card>

      {/* ══════ الخطوة 1: فحص الجاهزية ══════ */}
      {currentStep === 'readiness' && (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">فحص جاهزية نقطة البيع</CardTitle>
                  <CardDescription>
                    الشركة: <strong>{company}</strong>
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={checking}
                  onClick={() => void runCheck()}
                >
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  إعادة الفحص
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {checking && !readiness && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جارٍ فحص جاهزية نقطة البيع...</p>
                </div>
              )}

              {readiness && (
                <>
                  {/* ملخص الحالة */}
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/15 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">الحالة:</span>
                      {readiness.ready ? (
                        <Badge className="bg-primary hover:bg-primary text-white gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          جاهز للعمل
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3.5 w-3.5" />
                          غير جاهز
                        </Badge>
                      )}
                    </div>
                    {passedChecks.length > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {passedChecks.length} اجتاز
                      </Badge>
                    )}
                    {blockingIssues.length > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {blockingIssues.length} يعيق
                      </Badge>
                    )}
                    {warningIssues.length > 0 && (
                      <Badge className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/10 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {warningIssues.length} تنبيه
                      </Badge>
                    )}
                  </div>

                  {/* عناصر الفحص */}
                  <div className="space-y-2">
                    {(
                      [
                        'no_active_pos_profile',
                        'no_company_warehouse',
                        'mode_of_payment_missing_company_account',
                        'pos_profile_missing_warehouse',
                        'pos_profile_missing_price_list',
                        'pos_profile_no_payment_rows',
                        'pos_settings_invoice_type',
                      ] as PosReadinessIssueCode[]
                    ).map((code) => {
                      const meta = ISSUE_LABELS[code];
                      const isPassed = passedChecks.includes(code);
                      const blockingIssue = blockingIssues.find((d) => d.code === code);
                      const warningIssue = warningIssues.find((d) => d.code === code);
                      const issue = blockingIssue || warningIssue;

                      return (
                        <CheckItem
                          key={code}
                          pass={isPassed}
                          warning={!!warningIssue}
                          label={meta.label}
                          icon={meta.icon}
                          detail={issue?.message || issue?.context}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {readiness?.ready && (
                <Alert className="border-primary/20 bg-primary/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-primary">نقطة البيع جاهزة!</AlertTitle>
                  <AlertDescription className="text-sm text-primary">
                    جميع الفحوصات اجتازت بنجاح. يمكنك الانتقال مباشرة لشاشة البيع.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* أزرار التنقل */}
          <div className="flex items-center justify-between">
            <Button variant="outline" asChild>
              <Link href="/pos">
                <ArrowRight className="h-4 w-4 ms-1.5" />
                رجوع لنقاط البيع
              </Link>
            </Button>
            <Button
              disabled={!readiness || readiness.ready}
              onClick={goNext}
              className="gap-2"
            >
              التالي: الإصلاح التلقائي
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {readiness?.ready && (
              <Button asChild className="gap-2 bg-primary hover:bg-primary/90">
                <Link href="/pos/sell">
                  <ShoppingCart className="h-4 w-4" />
                  الانتقال لشاشة البيع
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ══════ الخطوة 2: الإصلاح التلقائي ══════ */}
      {currentStep === 'auto-fix' && (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">الإصلاح التلقائي</CardTitle>
              <CardDescription>
                سيحاول النظام إصلاح المشاكل تلقائياً: تعيين POS Settings، ربط حساب نقد بطرق الدفع، وإنشاء ملف POS افتراضي عند توفر الشروط.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                size="lg"
                className="w-full gap-2 h-12 text-base"
                disabled={fixing}
                onClick={() => void runAutoFix()}
              >
                {fixing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جارٍ تنفيذ الإصلاحات...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" />
                    إصلاح تلقائي
                  </>
                )}
              </Button>

              {/* عرض نتائج الإصلاح */}
              {fixing && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">جارٍ تطبيق الإصلاحات ومراجعة الجاهزية...</p>
                </div>
              )}

              {setupActions.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h4 className="font-semibold text-primary">الإجراءات التي تم تنفيذها</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {setupActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-primary">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {readiness && !fixing && setupActions.length === 0 && (
                <Alert className="border-border/60 bg-muted/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>لم يتم تنفيذ إجراءات جديدة</AlertTitle>
                  <AlertDescription className="text-sm">
                    قد تكون المشاكل المتبقية تحتاج إلى إعداد يدوي. انتقل للخطوة التالية.
                  </AlertDescription>
                </Alert>
              )}

              {/* عرض حالة الجاهزية بعد الإصلاح */}
              {readiness && !fixing && (
                <div className="space-y-2">
                  <Separator />
                  <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/15 border border-border/40">
                    <span className="text-sm text-muted-foreground">الجاهزية بعد الإصلاح:</span>
                    {readiness.ready ? (
                      <Badge className="bg-primary hover:bg-primary text-white gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        جاهز للعمل
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        لا يزال غير جاهز
                      </Badge>
                    )}
                    {readiness.details && readiness.details.filter((d) => d.severity === 'blocking').length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({readiness.details.filter((d) => d.severity === 'blocking').length} مشكلة متبقية)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* أزرار التنقل */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goPrev} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              السابق
            </Button>
            <div className="flex items-center gap-2">
              {readiness?.ready ? (
                <Button asChild className="gap-2 bg-primary hover:bg-primary/90">
                  <Link href="/pos/sell">
                    <ShoppingCart className="h-4 w-4" />
                    الانتقال لشاشة البيع
                  </Link>
                </Button>
              ) : (
                <Button onClick={goNext} className="gap-2">
                  التالي: الإعداد اليدوي
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ الخطوة 3: الإعداد اليدوي ══════ */}
      {currentStep === 'manual' && (
        <div className="space-y-4">
          {/* إنشاء ملف نقطة بيع */}
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Store className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">إنشاء ملف نقطة بيع</CardTitle>
                  <CardDescription>أنشئ ملف POS Profile جديد واربطه بالمستودع وقائمة الأسعار</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>اسم ملف نقطة البيع *</Label>
                  <Input
                    placeholder="مثال: نقطة البيع الرئيسية"
                    value={manualProfile.name}
                    onChange={(e) => setManualProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المستودع</Label>
                  <ErpLinkCombobox
                    doctype="Warehouse"
                    value={manualProfile.warehouse}
                    onChange={(v) => setManualProfile((p) => ({ ...p, warehouse: v }))}
                    placeholder="اختر المستودع..."
                    filters={[['company', '=', manualProfile.company || company]]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>قائمة الأسعار</Label>
                  <ErpLinkCombobox
                    doctype="Price List"
                    value={manualProfile.price_list}
                    onChange={(v) => setManualProfile((p) => ({ ...p, price_list: v }))}
                    placeholder="اختر قائمة الأسعار..."
                    filters={[['selling', '=', '1']]}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>الشركة</Label>
                  <ErpLinkCombobox
                    doctype="Company"
                    value={manualProfile.company || company}
                    onChange={(v) => setManualProfile((p) => ({ ...p, company: v }))}
                    placeholder="اختر الشركة..."
                  />
                </div>
              </div>
              <Button
                className="w-full gap-2"
                disabled={creatingProfile || !manualProfile.name.trim()}
                onClick={() => void handleCreateProfile()}
              >
                {creatingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Store className="h-4 w-4" />
                )}
                إنشاء ملف نقطة البيع
              </Button>
            </CardContent>
          </Card>

          {/* إضافة طريقة دفع لملف POS */}
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">إضافة طريقة دفع لملف POS</CardTitle>
                  <CardDescription>اربط طريقة دفع بملف نقطة البيع الحالي</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ملف نقطة البيع *</Label>
                  <ErpLinkCombobox
                    doctype="POS Profile"
                    value={manualPayment.pos_profile}
                    onChange={(v) => setManualPayment((p) => ({ ...p, pos_profile: v }))}
                    placeholder="اختر ملف نقطة البيع..."
                    filters={[['company', '=', company], ['disabled', '=', '0']]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع *</Label>
                  <ErpLinkCombobox
                    doctype="Mode of Payment"
                    value={manualPayment.mode_of_payment}
                    onChange={(v) => setManualPayment((p) => ({ ...p, mode_of_payment: v }))}
                    placeholder="اختر طريقة الدفع..."
                  />
                </div>
              </div>
              <Button
                className="w-full gap-2"
                disabled={addingPayment || !manualPayment.pos_profile || !manualPayment.mode_of_payment}
                onClick={() => void handleAddPayment()}
              >
                {addingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                إضافة طريقة الدفع
              </Button>
            </CardContent>
          </Card>

          {/* تعيين نوع الفاتورة */}
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">تعيين نوع الفاتورة</CardTitle>
                  <CardDescription>اختر نوع الفاتورة الافتراضي في إعدادات نقطة البيع</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>نوع الفاتورة</Label>
                <ErpLinkCombobox
                  doctype="DocType"
                  value={manualInvoiceType}
                  onChange={(v) => setManualInvoiceType(v)}
                  placeholder="اختر نوع الفاتورة..."
                  showCreateShortcut={false}
                />
                <p className="text-xs text-muted-foreground">
                  القيم الشائعة: POS Invoice أو Sales Invoice
                </p>
              </div>
              <Button
                className="w-full gap-2"
                disabled={settingInvoiceType || !manualInvoiceType.trim()}
                onClick={() => void handleSetInvoiceType()}
              >
                {settingInvoiceType ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                تعيين نوع الفاتورة
              </Button>
            </CardContent>
          </Card>

          {/* روابط سريعة */}
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">روابط سريعة لإعدادات إضافية:</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/pos/settings/profiles">إدارة ملفات POS</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings/payment-methods">طرق الدفع</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory/warehouses">المستودعات</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory/price-lists">قوائم الأسعار</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* أزرار التنقل */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goPrev} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              السابق
            </Button>
            <Button onClick={goNext} className="gap-2">
              التالي: التحقق النهائي
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ══════ الخطوة 4: التحقق النهائي ══════ */}
      {currentStep === 'verification' && (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">التحقق النهائي من الجاهزية</CardTitle>
                  <CardDescription>
                    فحص أخير للتأكد من أن جميع المتطلبات مستوفاة
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={verifying}
                  onClick={() => {
                    setVerificationResult(null);
                    void runVerification();
                  }}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  إعادة الفحص
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {verifying && !verificationResult && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جارٍ التحقق النهائي...</p>
                </div>
              )}

              {verificationResult && (
                <>
                  {verificationResult.ready ? (
                    /* ═══ نجاح: نقطة البيع جاهزة ═══ */
                    <div className="flex flex-col items-center py-8 gap-4 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
                        <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-primary">
                          نقطة البيع جاهزة!
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          جميع المتطلبات مستوفاة. يمكنك الآن بدء البيع من شاشة نقطة البيع.
                        </p>
                      </div>
                      <Button asChild size="lg" className="gap-2 h-12 bg-primary hover:bg-primary/90 text-base">
                        <Link href="/pos/sell">
                          <ShoppingCart className="h-5 w-5" />
                          الانتقال لشاشة البيع
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    /* ═══ لا يزال هناك مشاكل ═══ */
                    <div className="space-y-4">
                      <Alert className="border-chart-2/20 bg-chart-2/5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-chart-2">لا تزال هناك مشاكل تحتاج اهتماماً</AlertTitle>
                        <AlertDescription className="text-sm text-chart-2">
                          بعض المشاكل لا يمكن إصلاحها تلقائياً. راجع القائمة أدناه واتبع التعليمات.
                        </AlertDescription>
                      </Alert>

                      {/* عرض عناصر الفحص */}
                      <div className="space-y-2">
                        {(
                          [
                            'no_active_pos_profile',
                            'no_company_warehouse',
                            'mode_of_payment_missing_company_account',
                            'pos_profile_missing_warehouse',
                            'pos_profile_missing_price_list',
                            'pos_profile_no_payment_rows',
                            'pos_settings_invoice_type',
                          ] as PosReadinessIssueCode[]
                        ).map((code) => {
                          const meta = ISSUE_LABELS[code];
                          const isPassed = !verificationResult.details?.some((d) => d.code === code);
                          const issue = verificationResult.details?.find((d) => d.code === code);
                          const isWarning = issue?.severity === 'warning';

                          return (
                            <CheckItem
                              key={code}
                              pass={isPassed}
                              warning={isWarning}
                              label={meta.label}
                              icon={meta.icon}
                              detail={issue?.message || issue?.context}
                            />
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep('manual')}
                          className="gap-2"
                        >
                          <Settings2 className="h-4 w-4" />
                          العودة للإعداد اليدوي
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep('auto-fix')}
                          className="gap-2"
                        >
                          <Wand2 className="h-4 w-4" />
                          محاولة الإصلاح التلقائي مرة أخرى
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* أزرار التنقل */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goPrev} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              السابق: الإعداد اليدوي
            </Button>
            {verificationResult?.ready && (
              <Button asChild className="gap-2 bg-primary hover:bg-primary/90">
                <Link href="/pos/sell">
                  <ShoppingCart className="h-4 w-4" />
                  الانتقال لشاشة البيع
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
