'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/erp/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function SettingsIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopify, setShopify] = useState('');
  const [salla, setSalla] = useState('');
  const [zid, setZid] = useState('');
  const [woo, setWoo] = useState('');
  const [smsProvider, setSmsProvider] = useState('Unifonic');
  const [waProvider, setWaProvider] = useState('Meta');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/settings/integrations-local');
        const j = (await res.json()) as {
          data?: {
            shopify: string;
            salla: string;
            zid: string;
            woo: string;
            smsProvider: string;
            waProvider: string;
            notes: string;
          };
        };
        if (j.data) {
          const d = j.data;
          setShopify(d.shopify);
          setSalla(d.salla);
          setZid(d.zid);
          setWoo(d.woo);
          setSmsProvider(d.smsProvider);
          setWaProvider(d.waProvider);
          setNotes(d.notes);
        }
      } catch {
        toast.error('تعذر تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runShapeCheck = async () => {
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo }),
      });
      const j = (await res.json()) as { success?: boolean; data?: { messages?: string[] }; error?: string };
      if (!res.ok || !j.success) {
        toast.error(j.error || 'فشل التحقق');
        return;
      }
      const msgs = j.data?.messages ?? [];
      toast.message(msgs.join(' · ') || 'تم التحقق');
    } catch {
      toast.error('تعذّر الاتصال بالخادم');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/integrations-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify, salla, zid, woo, smsProvider, waProvider, notes }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        toast.error('فشل الحفظ');
        return;
      }
      toast.success('تم حفظ إعدادات التكاملات (ملف البيانات + مرآة SQLite)');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="التكاملات الخارجية"
        description="ربط المتاجر وأنظمة المراسلة — الإدخال والحفظ والتحقق من هذه الصفحة مباشرة."
        iconify="solar:link-round-bold-duotone"
        accent="purple"
        breadcrumbs={[{ label: 'الإعدادات', href: '/settings' }, { label: 'التكاملات الخارجية' }]}
      />
      <div className="max-w-3xl space-y-5">

      <Alert>
        <AlertTitle className="text-sm">خارطة طريق</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
          مزامنة طلبات ومخزون مع Salla / Zid / Shopify تتطلب مفاتيح API وواجهة خلفية مخصصة. الحقول تُخزَّن في `data/integrations-local.json` مع مرآة في SQLite (`AppLocalSettings`) للاسترداد.
          تقارير ولاء العملاء مربوطة بمركز التقارير؛ PNR/سياحة عبر صفحة التشغيل المخصّصة عند التفعيل.
        </AlertDescription>
      </Alert>

      {loading ? (
        <p className="text-sm text-muted-foreground">جاري التحميل…</p>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">متجر Shopify</Label>
              <Input dir="ltr" value={shopify} onChange={(e) => setShopify(e.target.value)} placeholder="example.myshopify.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">تاجر Salla</Label>
              <Input value={salla} onChange={(e) => setSalla(e.target.value)} placeholder="اسم المتجر" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">تاجر Zid</Label>
              <Input value={zid} onChange={(e) => setZid(e.target.value)} placeholder="معرف المتجر" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">رابط WooCommerce</Label>
              <Input dir="ltr" value={woo} onChange={(e) => setWoo(e.target.value)} placeholder="https://store.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">مزود الرسائل النصية</Label>
              <Input value={smsProvider} onChange={(e) => setSmsProvider(e.target.value)} placeholder="Unifonic" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold">مزود WhatsApp</Label>
              <Input value={waProvider} onChange={(e) => setWaProvider(e.target.value)} placeholder="Meta" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold">ملاحظات الربط</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات حول إعدادات التكامل..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? '…' : 'حفظ على الخادم'}
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => void runShapeCheck()}>
              التحقق من صيغة العناوين
            </Button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
