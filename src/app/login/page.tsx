'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Shield,
  BarChart3,
  Keyboard,
  Mail,
  KeyRound,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { isClientSessionAlive, clearClientExp } from '@/lib/client/session-token';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot password state
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Setup status check
  const [needsSetup, setNeedsSetup] = useState(false);

  // Check if already logged in on mount (SEC-08: بدون قراءة أي توكن — طابع انتهاء غير حساس)
  useEffect(() => {
    if (isClientSessionAlive()) {
      const params = new URLSearchParams(window.location.search);
      const redirect = safeLocalRedirect(params.get('redirect'));
      window.location.replace(redirect);
      return;
    }
    clearClientExp();
    // تنظيف بقايا نموذج التوكن القديم من متصفحات سبق لها الزيارة
    localStorage.removeItem('erp_session');
    localStorage.removeItem('erp_user');
    document.cookie = 'erp_session=; max-age=0; path=/; SameSite=Lax';

    // Check if initial setup is needed
    fetch('/api/setup/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && !data.data.configured) {
          setNeedsSetup(true);
        }
      })
      .catch(() => { /* ignore */ });
  }, []);


  // SEC-11: قبول المسارات المحلية فقط — منع open redirect إلى مواقع خارجية
  const safeLocalRedirect = useCallback((raw: string | null): string => {
    const fallback = '/';
    if (!raw) return fallback;
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      /* قيمة غير مُرمّزة — استخدمها كما هي */
    }
    if (!value.startsWith('/')) return fallback;      // يجب أن يبدأ بـ /
    if (value.startsWith('//')) return fallback;      // منع protocol-relative URLs
    if (value.includes('\\')) return fallback;           // منع backslash tricks
    if (/^[\/]+[@a-z]/i.test(value)) return fallback; // منع /[email] style
    return value;
  }, []);

  // Navigate to dashboard after successful login
  const navigateToDashboard = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = safeLocalRedirect(params.get('redirect'));

    // Use window.location.href for a full page reload
    // This ensures the middleware reads the fresh cookie
    window.location.href = redirect;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login(username, password, rememberMe);
    if (success) {
      // Small delay to ensure cookie is fully written
      setTimeout(() => navigateToDashboard(), 300);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotError('البريد الإلكتروني مطلوب');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (data.success) {
        setForgotSuccess(true);
      } else {
        setForgotError(data.error || 'حدث خطأ');
      }
    } catch {
      setForgotError('فشل الاتصال بالخادم');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotDialog = () => {
    setShowForgotDialog(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError(null);
  };

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background relative">
        {/* Subtle animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -start-1/2 w-full h-full bg-gradient-to-bl from-primary/8 via-transparent to-transparent" />
          <div className="absolute -bottom-1/2 -end-1/2 w-full h-full bg-gradient-to-tr from-primary/5 via-transparent to-transparent" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground mb-4 transition-transform hover:scale-105 duration-300">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ERP Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">نظام إدارة موارد المؤسسات</p>
          </div>

          {/* Login Card */}
          <Card className="border border-border/40 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-6 px-6">
              <h2 className="text-lg font-semibold text-center">تسجيل الدخول</h2>
              <p className="text-xs text-muted-foreground text-center">
                أدخل بيانات الاعتماد للوصول إلى النظام
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-center animate-in slide-in-from-top-2 duration-300">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    اسم المستخدم
                  </Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="أدخل اسم المستخدم"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 pe-10"
                      required
                      dir="ltr"
                      autoComplete="username"
                    />
                    <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <Keyboard className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    كلمة المرور
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 text-sm ps-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                      required
                      dir="ltr"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                      تذكرني
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline hover:text-primary/90 transition-colors"
                    onClick={() => setShowForgotDialog(true)}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <Button
                  type="submit"
                  className={cn(
                    'w-full h-11 text-sm gap-2 transition-all duration-200',
                    'bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20',
                    'text-primary-foreground font-medium'
                  )}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جارٍ تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      تسجيل الدخول
                      <Keyboard className="h-3 w-3 opacity-50" />
                    </>
                  )}
                </Button>


              </form>
            </CardContent>
          </Card>

          {needsSetup && (
            <div className="mt-4 p-3 rounded-lg bg-chart-2/5 border border-chart-2/20 text-center">
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">النظام غير معدّ بعد. يجب إجراء الإعداد الأولي أولاً.</p>
              <a
                href="/setup"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Settings className="w-3.5 h-3.5" />
                الذهاب إلى معالج الإعداد
              </a>
            </div>
          )}

          <p className="text-center text-[10px] text-muted-foreground mt-6">
            ERP Pro &copy; {new Date().getFullYear()} - نظام إدارة موارد المؤسسات
          </p>
        </div>
      </div>

      {/* Right Panel - Brand */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-primary text-primary-foreground relative overflow-hidden items-center justify-center">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <div
            className="absolute top-0 start-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 animate-pulse"
            style={{ animationDuration: '6s' }}
          />
          <div
            className="absolute bottom-0 end-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute top-1/2 end-1/2 w-64 h-64 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{ animationDuration: '10s' }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 text-center px-12">
          {/* Main brand icon */}
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-sm mb-8 shadow-2xl border border-white/10">
            <Calculator className="h-9 w-10 text-white" />
          </div>

          <h2 className="text-3xl font-bold text-white mb-3">ERP Pro</h2>
          <p className="text-white/70 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
            نظام إدارة موارد المؤسسات المتكامل — الحل الأمثل لإدارة عملياتك المالية
            والمخزونية والبشرية بكفاءة عالية
          </p>

          {/* Feature list */}
          <div className="space-y-4 text-start max-w-xs mx-auto">
            <div className="flex items-center gap-3 group">
              <div className="flex h-9 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors shrink-0">
                <Shield className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">أمان متقدم</p>
                <p className="text-xs text-white/50">حماية كاملة لبيانات مؤسستك</p>
              </div>
            </div>

            <div className="flex items-center gap-3 group">
              <div className="flex h-9 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors shrink-0">
                <BarChart3 className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">تقارير ذكية</p>
                <p className="text-xs text-white/50">تحليلات متقدمة ولوحات تحكم تفاعلية</p>
              </div>
            </div>

            <div className="flex items-center gap-3 group">
              <div className="flex h-9 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors shrink-0">
                <ArrowLeft className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">تكامل شامل</p>
                <p className="text-xs text-white/50">ربط جميع أقسام المؤسسة بسلاسة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotDialog} onOpenChange={(open) => { if (!open) closeForgotDialog(); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2 text-start">
              <KeyRound className="h-5 w-5 text-primary" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
            <DialogDescription className="text-start">
              {forgotSuccess
                ? 'تم إرسال رابط إعادة التعيين'
                : 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور'}
            </DialogDescription>
          </DialogHeader>

          {forgotSuccess ? (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
                </p>
                <p className="text-xs text-primary">
                  يرجى التحقق من صندوق الوارد والبريد غير المرغوب فيه
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {forgotError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-center">
                  {forgotError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm font-medium">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="h-11 text-sm pe-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    dir="ltr"
                    autoComplete="email"
                  />
                  <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {forgotSuccess ? (
              <Button
                onClick={closeForgotDialog}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                العودة لتسجيل الدخول
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={closeForgotDialog}
                  className="flex-1"
                  disabled={forgotLoading}
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                      جارٍ الإرسال...
                    </>
                  ) : (
                    'إرسال رابط التعيين'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
