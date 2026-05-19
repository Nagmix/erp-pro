'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  CalendarDays,
  Receipt,
  Briefcase,
  ArrowLeft,
  Settings,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/erp/page-header';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { toast } from 'sonner';

// ─── أنواع ────────────────────────────────────────────────────

interface ExpenseClaimType {
  name: string;
  englishName: string;
  keywords: string[];
  hasAccount?: boolean;
  account?: string | null;
}

interface LeaveType {
  name: string;
  englishName: string;
  is_carry_forward: number;
  is_lwp: number;
  allow_encashment: number;
  is_compensatory?: number;
}

interface SalaryComponent {
  name: string;
  type: 'Earning' | 'Deduction';
  keywords: string[];
  accountType: string;
}

interface HrmsStatus {
  hrmsInstalled: boolean;
  setupComplete: boolean;
  company?: string;
  status: {
    expenseClaimTypes: {
      configured: Array<{ name: string; hasAccount: boolean; account: string | null }>;
      missing: string[];
      withoutAccount: string[];
      totalConfigured: number;
    };
    leaveTypes: {
      configured: string[];
      missing: string[];
    };
    salaryComponents: {
      configured: Array<{ name: string; type: string }>;
      missing: string[];
    };
    employmentTypes: {
      configured: string[];
      missing: string[];
    };
    companyDefaults: {
      set: boolean;
      missing: string[];
    };
  };
  defaults: {
    expenseClaimTypes: ExpenseClaimType[];
    leaveTypes: LeaveType[];
    salaryComponents: SalaryComponent[];
    employmentTypes: string[];
  };
}

interface CustomExpenseType {
  id: string;
  name: string;
  accountKeywords: string;
}

interface ConfigResult {
  success: boolean;
  message?: string;
  error?: string;
  results?: {
    expenseClaimTypes: { created: number; updated: number; skipped: number; failed: number };
    leaveTypes: { created: number; skipped: number; failed: number };
    salaryComponents: { created: number; skipped: number; failed: number };
    employmentTypes: { created: number; skipped: number; failed: number };
    companyDefaults: { set: boolean };
  };
  summary?: {
    totalCreated: number;
    totalUpdated: number;
    totalFailed: number;
  };
}

// ─── المكون الرئيسي ──────────────────────────────────────────

export default function HrmsSetupPage() {
  const { company, isLoading: companyLoading } = useDefaultCompanyName();

  // ── حالة التحميل والبيانات ──
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HrmsStatus | null>(null);
  const [fetchError, setFetchError] = useState('');

  // ── التحديدات ──
  const [selectedExpenseTypes, setSelectedExpenseTypes] = useState<Set<string>>(new Set());
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<Set<string>>(new Set());
  const [selectedSalaryComponents, setSelectedSalaryComponents] = useState<Set<string>>(new Set());
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<Set<string>>(new Set());

  // ── أنواع مخصصة ──
  const [customExpenseTypes, setCustomExpenseTypes] = useState<CustomExpenseType[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomKeywords, setNewCustomKeywords] = useState('');

  // ── حالة التطبيق ──
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [configResult, setConfigResult] = useState<ConfigResult | null>(null);
  const [activeTab, setActiveTab] = useState('expenses');

  // ── جلب حالة HRMS ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/setup/configure-hrms');
        const data = await res.json();
        if (!cancelled) {
          if (data.success) {
            setStatus(data as HrmsStatus);
            // تحديد الكل افتراضياً
            if (data.defaults) {
              setSelectedExpenseTypes(new Set(data.defaults.expenseClaimTypes?.map((t: ExpenseClaimType) => t.name) || []));
              setSelectedLeaveTypes(new Set(data.defaults.leaveTypes?.map((t: LeaveType) => t.name) || []));
              setSelectedSalaryComponents(new Set(data.defaults.salaryComponents?.map((t: SalaryComponent) => t.name) || []));
              setSelectedEmploymentTypes(new Set(data.defaults.employmentTypes || []));
            }
          } else {
            setFetchError(data.error || 'فشل جلب حالة HRMS');
          }
        }
      } catch {
        if (!cancelled) setFetchError('تعذر الاتصال بالخادم');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── دوال التحديد ──
  const toggleExpenseType = useCallback((name: string) => {
    setSelectedExpenseTypes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const toggleLeaveType = useCallback((name: string) => {
    setSelectedLeaveTypes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const toggleSalaryComponent = useCallback((name: string) => {
    setSelectedSalaryComponents(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const toggleEmploymentType = useCallback((name: string) => {
    setSelectedEmploymentTypes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const toggleAllExpenseTypes = useCallback(() => {
    if (!status?.defaults.expenseClaimTypes) return;
    const allNames = status.defaults.expenseClaimTypes.map(t => t.name);
    const allSelected = allNames.every(n => selectedExpenseTypes.has(n));
    if (allSelected) {
      setSelectedExpenseTypes(new Set());
    } else {
      setSelectedExpenseTypes(new Set(allNames));
    }
  }, [status, selectedExpenseTypes]);

  const toggleAllLeaveTypes = useCallback(() => {
    if (!status?.defaults.leaveTypes) return;
    const allNames = status.defaults.leaveTypes.map(t => t.name);
    const allSelected = allNames.every(n => selectedLeaveTypes.has(n));
    if (allSelected) {
      setSelectedLeaveTypes(new Set());
    } else {
      setSelectedLeaveTypes(new Set(allNames));
    }
  }, [status, selectedLeaveTypes]);

  const toggleAllSalaryComponents = useCallback(() => {
    if (!status?.defaults.salaryComponents) return;
    const allNames = status.defaults.salaryComponents.map(t => t.name);
    const allSelected = allNames.every(n => selectedSalaryComponents.has(n));
    if (allSelected) {
      setSelectedSalaryComponents(new Set());
    } else {
      setSelectedSalaryComponents(new Set(allNames));
    }
  }, [status, selectedSalaryComponents]);

  const toggleAllEmploymentTypes = useCallback(() => {
    if (!status?.defaults.employmentTypes) return;
    const allNames = status.defaults.employmentTypes;
    const allSelected = allNames.every(n => selectedEmploymentTypes.has(n));
    if (allSelected) {
      setSelectedEmploymentTypes(new Set());
    } else {
      setSelectedEmploymentTypes(new Set(allNames));
    }
  }, [status, selectedEmploymentTypes]);

  // ── إضافة نوع مصروفات مخصص ──
  const addCustomExpenseType = useCallback(() => {
    if (!newCustomName.trim()) {
      toast.error('أدخل اسم نوع المصروفات');
      return;
    }
    const id = `custom_${Date.now()}`;
    setCustomExpenseTypes(prev => [...prev, { id, name: newCustomName.trim(), accountKeywords: newCustomKeywords.trim() }]);
    setSelectedExpenseTypes(prev => new Set(prev).add(newCustomName.trim()));
    setNewCustomName('');
    setNewCustomKeywords('');
    toast.success(`تم إضافة "${newCustomName.trim()}"`);
  }, [newCustomName, newCustomKeywords]);

  const removeCustomExpenseType = useCallback((id: string, name: string) => {
    setCustomExpenseTypes(prev => prev.filter(ct => ct.id !== id));
    setSelectedExpenseTypes(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }, []);

  // ── حسابات الحالة ──
  const allExpenseTypes = useMemo(() => {
    const defaults = status?.defaults.expenseClaimTypes || [];
    return [...defaults, ...customExpenseTypes.map(ct => ({
      name: ct.name,
      englishName: ct.name,
      keywords: ct.accountKeywords ? ct.accountKeywords.split(',').map(k => k.trim()) : [],
      hasAccount: false,
      isCustom: true,
    }))];
  }, [status, customExpenseTypes]);

  // ── خريطة حالة الحسابات ──
  const accountStatusMap = useMemo(() => {
    const map = new Map<string, { hasAccount: boolean; account: string | null }>();
    if (status?.status?.expenseClaimTypes?.configured) {
      for (const c of status.status.expenseClaimTypes.configured) {
        map.set(c.name, { hasAccount: c.hasAccount, account: c.account });
      }
    }
    return map;
  }, [status]);

  // ── تطبيق الإعداد ──
  const applySetup = useCallback(async () => {
    if (!company) {
      toast.error('لم يتم العثور على الشركة. تأكد من وجود شركة واحدة على الأقل.');
      return;
    }
    if (selectedExpenseTypes.size === 0) {
      toast.error('يجب تحديد نوع مصروفات واحد على الأقل');
      return;
    }

    setApplying(true);
    setApplyProgress(10);
    setConfigResult(null);

    try {
      setApplyProgress(30);
      const payload = {
        company,
        selectedExpenseTypes: Array.from(selectedExpenseTypes),
        customExpenseTypes: customExpenseTypes.map(ct => ({
          name: ct.name,
          accountKeywords: ct.accountKeywords ? ct.accountKeywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        })),
        selectedLeaveTypes: Array.from(selectedLeaveTypes),
        selectedSalaryComponents: Array.from(selectedSalaryComponents),
        selectedEmploymentTypes: Array.from(selectedEmploymentTypes),
      };

      setApplyProgress(50);
      const res = await fetch('/api/setup/configure-hrms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setApplyProgress(80);
      const data: ConfigResult = await res.json();

      setApplyProgress(100);
      setConfigResult(data);

      if (data.success) {
        toast.success(data.message || 'تم إعداد HRMS بنجاح');
      } else {
        toast.error(data.error || 'فشل إعداد HRMS');
      }
    } catch {
      setConfigResult({ success: false, error: 'تعذر الاتصال بالخادم' });
      toast.error('تعذر الاتصال بالخادم');
    } finally {
      setApplying(false);
    }
  }, [company, selectedExpenseTypes, customExpenseTypes, selectedLeaveTypes, selectedSalaryComponents, selectedEmploymentTypes]);

  // ── شاشة التحميل ──
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <p className="text-lg text-muted-foreground">جاري فحص حالة الموارد البشرية...</p>
        </div>
      </div>
    );
  }

  // ── شاشة خطأ ──
  if (fetchError && !status) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-lg font-semibold">تعذر تحميل بيانات HRMS</p>
          <p className="text-muted-foreground text-sm">{fetchError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  // ── HRMS غير مثبت ──
  if (status && !status.hrmsInstalled) {
    return (
      <div className="space-y-6" dir="rtl">
        <PageHeader
          title="إعداد الموارد البشرية"
          description="تهيئة البيانات الافتراضية لوحدة الموارد البشرية"
          iconify="lucide:users"
          accent="warning"
          breadcrumbs={[
            { label: 'الإعدادات', href: '/settings' },
            { label: 'إعداد الموارد البشرية' },
          ]}
        />
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="font-bold text-lg">يجب تثبيت تطبيق HRMS أولاً</AlertTitle>
          <AlertDescription className="text-sm mt-2">
            وحدة الموارد البشرية تتطلب تطبيق HRMS المنفصل. يرجى تثبيته من صفحة إدارة التطبيقات قبل إعداد البيانات الافتراضية.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── الإعداد مكتمل ──
  const isAlreadyConfigured = status?.setupComplete === true;
  const showReconfigure = isAlreadyConfigured && !configResult;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إعداد الموارد البشرية"
        description="تهيئة البيانات الافتراضية لوحدة الموارد البشرية"
        iconify="lucide:users"
        accent="warning"
        breadcrumbs={[
          { label: 'الإعدادات', href: '/settings' },
          { label: 'إعداد الموارد البشرية' },
        ]}
        actions={
          isAlreadyConfigured ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-4 w-4" />
              تم الإعداد
            </Badge>
          ) : undefined
        }
      />

      {/* بانر الإعداد المكتمل */}
      {showReconfigure && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="font-semibold text-emerald-800">تم إعداد HRMS بالفعل</AlertTitle>
          <AlertDescription className="text-emerald-700 text-sm">
            جميع البيانات الافتراضية مهيأة. يمكنك إعادة الإعداد أو تعديل التحديدات أدناه.
          </AlertDescription>
        </Alert>
      )}

      {/* بطاقة معلومات */}
      <Card className="border-amber-200 bg-gradient-to-bl from-amber-50 to-orange-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-amber-900">إعداد بيانات الموارد البشرية</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                ستقوم هذه الصفحة بإنشاء البيانات الافتراضية لوحدة الموارد البشرية: أنواع المصروفات، أنواع الإجازات، مكونات الرواتب، وأنواع التوظيف.
                حدد العناصر التي تريد إنشاءها ثم اضغط &quot;تطبيق الإعداد&quot;.
              </p>
              {company && (
                <p className="text-xs text-amber-700 mt-1">
                  الشركة: <strong>{company}</strong>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* واجهة التبويبات */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="expenses" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-4 w-4 hidden sm:block" />
            أنواع المصروفات
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5 text-xs sm:text-sm">
            <CalendarDays className="h-4 w-4 hidden sm:block" />
            أنواع الإجازات
          </TabsTrigger>
          <TabsTrigger value="salary" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4 hidden sm:block" />
            مكونات الرواتب
          </TabsTrigger>
          <TabsTrigger value="employment" className="gap-1.5 text-xs sm:text-sm">
            <Briefcase className="h-4 w-4 hidden sm:block" />
            أنواع التوظيف
          </TabsTrigger>
        </TabsList>

        {/* ── تبويب أنواع المصروفات ── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              تم تحديد <strong className="text-foreground">{selectedExpenseTypes.size}</strong> من <strong className="text-foreground">{allExpenseTypes.length}</strong> نوع
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllExpenseTypes}
              className="gap-1.5"
            >
              {status?.defaults.expenseClaimTypes && status.defaults.expenseClaimTypes.every(t => selectedExpenseTypes.has(t.name))
                ? <>إلغاء التحديد</>
                : <>تحديد الكل</>
              }
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {allExpenseTypes.map((type) => {
                  const accStatus = accountStatusMap.get(type.name);
                  const isSelected = selectedExpenseTypes.has(type.name);
                  const isExisting = accStatus !== undefined;
                  const isCustom = 'isCustom' in type && type.isCustom;
                  const customData = isCustom ? customExpenseTypes.find(ct => ct.name === type.name) : null;

                  return (
                    <div
                      key={type.name}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-amber-50/50' : 'hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleExpenseType(type.name)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{type.name}</p>
                          {isCustom && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700">
                              مخصص
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{type.englishName}</p>
                      </div>
                      <div className="shrink-0">
                        {isExisting ? (
                          accStatus?.hasAccount ? (
                            <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              حساب مربوط
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-red-600 border-red-200">
                              <XCircle className="h-3 w-3" />
                              بدون حساب
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                            <Sparkles className="h-3 w-3" />
                            جديد
                          </Badge>
                        )}
                      </div>
                      {isCustom && customData && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomExpenseType(customData.id, customData.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* إضافة نوع مخصص */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                إضافة نوع مصروفات مخصص
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم النوع</Label>
                  <Input
                    placeholder="مثال: مصاريف تمثيل"
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">كلمات مفتاحية للحساب (مفصولة بفواصل)</Label>
                  <Input
                    placeholder="مثال: تمثيل, استقبال, Entertainment"
                    value={newCustomKeywords}
                    onChange={(e) => setNewCustomKeywords(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomExpenseType}
                disabled={!newCustomName.trim()}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تبويب أنواع الإجازات ── */}
        <TabsContent value="leaves" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              تم تحديد <strong className="text-foreground">{selectedLeaveTypes.size}</strong> من <strong className="text-foreground">{status?.defaults.leaveTypes?.length || 0}</strong> نوع
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllLeaveTypes}
              className="gap-1.5"
            >
              {status?.defaults.leaveTypes && status.defaults.leaveTypes.every(t => selectedLeaveTypes.has(t.name))
                ? <>إلغاء التحديد</>
                : <>تحديد الكل</>
              }
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {status?.defaults.leaveTypes.map((type) => {
                  const isSelected = selectedLeaveTypes.has(type.name);
                  const isExisting = status.status?.leaveTypes?.configured?.includes(type.name);

                  return (
                    <div
                      key={type.name}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-amber-50/50' : 'hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleLeaveType(type.name)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{type.name}</p>
                          <span className="text-xs text-muted-foreground">({type.englishName})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {type.is_carry_forward === 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700">
                              ترحيل
                            </Badge>
                          )}
                          {type.is_lwp === 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-red-100 text-red-700">
                              بدون راتب
                            </Badge>
                          )}
                          {type.allow_encashment === 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700">
                              صرف نقدي
                            </Badge>
                          )}
                          {type.is_compensatory === 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700">
                              تعويضية
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExisting ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            موجود
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                            <Sparkles className="h-3 w-3" />
                            جديد
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تبويب مكونات الرواتب ── */}
        <TabsContent value="salary" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              تم تحديد <strong className="text-foreground">{selectedSalaryComponents.size}</strong> من <strong className="text-foreground">{status?.defaults.salaryComponents?.length || 0}</strong> مكون
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllSalaryComponents}
              className="gap-1.5"
            >
              {status?.defaults.salaryComponents && status.defaults.salaryComponents.every(t => selectedSalaryComponents.has(t.name))
                ? <>إلغاء التحديد</>
                : <>تحديد الكل</>
              }
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {status?.defaults.salaryComponents.map((comp) => {
                  const isSelected = selectedSalaryComponents.has(comp.name);
                  const existingComp = status.status?.salaryComponents?.configured?.find(c => c.name === comp.name);

                  return (
                    <div
                      key={comp.name}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-amber-50/50' : 'hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSalaryComponent(comp.name)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{comp.name}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            comp.type === 'Earning'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {comp.type === 'Earning' ? 'استحقاق' : 'استقطاع'}
                        </Badge>
                        {existingComp ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                            <Sparkles className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── تبويب أنواع التوظيف ── */}
        <TabsContent value="employment" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              تم تحديد <strong className="text-foreground">{selectedEmploymentTypes.size}</strong> من <strong className="text-foreground">{status?.defaults.employmentTypes?.length || 0}</strong> نوع
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllEmploymentTypes}
              className="gap-1.5"
            >
              {status?.defaults.employmentTypes && status.defaults.employmentTypes.every(t => selectedEmploymentTypes.has(t))
                ? <>إلغاء التحديد</>
                : <>تحديد الكل</>
              }
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {status?.defaults.employmentTypes.map((empType) => {
                  const isSelected = selectedEmploymentTypes.has(empType);
                  const isExisting = status.status?.employmentTypes?.configured?.includes(empType);

                  return (
                    <div
                      key={empType}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-amber-50/50' : 'hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEmploymentType(empType)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{empType}</p>
                      </div>
                      <div className="shrink-0">
                        {isExisting ? (
                          <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            موجود
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                            <Sparkles className="h-3 w-3" />
                            جديد
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* ── قسم التطبيق ── */}
      <Card className="border-amber-200 bg-gradient-to-bl from-amber-50/50 to-orange-50/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm">تطبيق الإعداد</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                سيتم إنشاء العناصر المحددة في النظام الخلفي
              </p>
            </div>
            <Button
              onClick={applySetup}
              disabled={applying || selectedExpenseTypes.size === 0}
              className="gap-2 min-w-[160px] bg-amber-600 hover:bg-amber-700 text-white"
              size="lg"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التطبيق...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  تطبيق الإعداد
                </>
              )}
            </Button>
          </div>

          {applying && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>جاري إعداد HRMS...</span>
                <span>{applyProgress}%</span>
              </div>
              <Progress value={applyProgress} className="h-2" />
            </div>
          )}

          {/* نتائج الإعداد */}
          {configResult && (
            <div className="space-y-3">
              <Separator />
              {configResult.success ? (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <AlertTitle className="font-semibold text-emerald-800">
                    {configResult.message || 'تم الإعداد بنجاح'}
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    {configResult.summary && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          إنشاء: {configResult.summary.totalCreated}
                        </Badge>
                        {configResult.summary.totalUpdated > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
                            تحديث: {configResult.summary.totalUpdated}
                          </Badge>
                        )}
                        {configResult.summary.totalFailed > 0 && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                            <XCircle className="h-3 w-3" />
                            فشل: {configResult.summary.totalFailed}
                          </Badge>
                        )}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-5 w-5" />
                  <AlertTitle className="font-semibold">فشل الإعداد</AlertTitle>
                  <AlertDescription>{configResult.error || 'حدث خطأ غير متوقع'}</AlertDescription>
                </Alert>
              )}

              {/* تفاصيل النتائج */}
              {configResult.results && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                      <Receipt className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                      <p className="text-lg font-bold">{configResult.results.expenseClaimTypes.created}</p>
                      <p className="text-[10px] text-muted-foreground">أنواع المصروفات</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                      <CalendarDays className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-bold">{configResult.results.leaveTypes.created}</p>
                      <p className="text-[10px] text-muted-foreground">أنواع الإجازات</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                      <Users className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                      <p className="text-lg font-bold">{configResult.results.salaryComponents.created}</p>
                      <p className="text-[10px] text-muted-foreground">مكونات الرواتب</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                      <Briefcase className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg font-bold">{configResult.results.employmentTypes.created}</p>
                      <p className="text-[10px] text-muted-foreground">أنواع التوظيف</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
