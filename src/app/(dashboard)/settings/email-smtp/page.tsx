'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/erp/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SmtpForm = {
 host: string;
 port: string;
 secure: boolean;
 user: string;
 pass: string;
 fromEmail: string;
 fromName: string;
};

export default function EmailSmtpSettingsPage() {
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [testing, setTesting] = useState(false);
 const [hasPass, setHasPass] = useState(false);
 const [testTo, setTestTo] = useState('');
 const [form, setForm] = useState<SmtpForm>({
 host: '',
 port: '587',
 secure: false,
 user: '',
 pass: '',
 fromEmail: '',
 fromName: '',
 });

 useEffect(() => {
 void (async () => {
  try {
  const res = await fetch('/api/settings/smtp');
  const j = (await res.json()) as {
   success?: boolean;
   data?: {
   host?: string;
   port?: number;
   secure?: boolean;
   user?: string;
   fromEmail?: string;
   fromName?: string;
   } | null;
   hasPass?: boolean;
  };
  if (j.data) {
   setForm((f) => ({
   ...f,
   host: j.data!.host ?? '',
   port: String(j.data!.port ?? 587),
   secure: Boolean(j.data!.secure),
   user: j.data!.user ?? '',
   pass: '',
   fromEmail: j.data!.fromEmail ?? '',
   fromName: j.data!.fromName ?? '',
   }));
  }
  setHasPass(Boolean(j.hasPass));
  } catch {
  toast.error('تعذر تحميل الإعدادات');
  } finally {
  setLoading(false);
  }
 })();
 }, [toast]);

 const save = async () => {
 setSaving(true);
 try {
  const res = await fetch('/api/settings/smtp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
   host: form.host,
   port: Number(form.port) || 587,
   secure: form.secure,
   user: form.user,
   pass: form.pass,
   fromEmail: form.fromEmail,
   fromName: form.fromName,
  }),
  });
  const j = await res.json();
  if (!res.ok || !j.success) {
  toast.error(j.error || 'فشل الحفظ');
  return;
  }
  setHasPass(Boolean(j.hasPass));
  setForm((f) => ({ ...f, pass: '' }));
  toast.success('تم حفظ إعدادات SMTP');
 } catch {
  toast.error('فشل الحفظ');
 } finally {
  setSaving(false);
 }
 };

 const sendTest = async () => {
 if (!testTo.trim()) {
  toast.error('أدخل بريداً للاختبار');
  return;
 }
 setTesting(true);
 try {
  const res = await fetch('/api/settings/smtp/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: testTo.trim() }),
  });
  const j = await res.json();
  if (!res.ok || !j.success) {
  toast.error(j.error || 'فشل الإرسال');
  return;
  }
  toast.success(j.message || 'تم إرسال رسالة الاختبار');
 } catch {
  toast.error('فشل الاختبار');
 } finally {
  setTesting(false);
 }
 };

 return (
 <div dir="rtl" className="erp-page-enter max-w-2xl space-y-6">
  <PageHeader
  title="بريد SMTP"
  description="المصدر المعتمد لإرسال البريد من تطبيق ERP Pro: الحفظ والاختبار يتم بالكامل من هذه الصفحة."
  iconify="solar:letter-bold-duotone"
  accent="primary"
  breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'SMTP' }]}
  />

  <Alert>
  <AlertTitle className="text-sm">إرسال من التطبيق</AlertTitle>
  <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
   تُخزَّن الإعدادات على خادم التطبيق (مجلد البيانات). أي إشعار أو بريد يُطلَق من واجهات ERP Pro يستخدم هذا الربط. الإرسال الداخلي من جدولة النظام قد يبقى على قنوات منفصلة يضبطها المسؤول على الخادم.
  </AlertDescription>
  </Alert>

  <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
  {loading ? (
   <p className="text-sm text-muted-foreground">جاري التحميل…</p>
  ) : (
   <>
   <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-1.5">
    <Label className="text-xs">خادم SMTP *</Label>
    <Input dir="ltr" className="font-mono text-sm" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.example.com" />
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">المنفذ</Label>
    <Input dir="ltr" className="font-mono text-sm" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} />
    </div>
   </div>
   <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 px-3 py-2">
    <div>
    <p className="text-sm font-medium">SSL/TLS مباشرة (عادة 465)</p>
    <p className="text-[11px] text-muted-foreground">عطّل للمنفذ 587 مع STARTTLS</p>
    </div>
    <Switch checked={form.secure} onCheckedChange={(v) => setForm((f) => ({ ...f, secure: v }))} />
   </div>
   <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-1.5">
    <Label className="text-xs">المستخدم</Label>
    <Input dir="ltr" className="font-mono text-sm" value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} autoComplete="username" />
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">كلمة المرور {hasPass && <span className="text-muted-foreground">(اتركها فارغة للإبقاء على المحفوظ)</span>}</Label>
    <Input
     type="password"
     dir="ltr"
     className="font-mono text-sm"
     value={form.pass}
     onChange={(e) => setForm((f) => ({ ...f, pass: e.target.value }))}
     autoComplete="current-password"
    />
    </div>
   </div>
   <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-1.5">
    <Label className="text-xs">من (بريد) *</Label>
    <Input dir="ltr" type="email" value={form.fromEmail} onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))} />
    </div>
    <div className="space-y-1.5">
    <Label className="text-xs">اسم المرسل</Label>
    <Input value={form.fromName} onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))} />
    </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
    {saving ? '…' : 'حفظ'}
    </Button>
   </div>
   <div className="border-t border-border/40 pt-4 space-y-2">
    <Label className="text-xs">اختبار إرسال</Label>
    <div className="flex flex-wrap gap-2 items-end">
    <Input dir="ltr" className="max-w-xs text-sm" placeholder="dest@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
    <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => void sendTest()} disabled={testing}>
     <Mail className="h-3.5 w-3.5" />
     {testing ? '…' : 'إرسال تجريبي'}
    </Button>
    </div>
   </div>
   </>
  )}
  </div>
 </div>
 );
}
