'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useDoc, useUpdateDoc } from '@/lib/client/hooks';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function num01(v: unknown): boolean {
  return v === 1 || v === true || v === '1';
}

/** يكتشف حقل ربط وردية على POS Profile إن وُجد (يختلف حسب إصدار ERPNext/حقول مخصصة). */
function posProfileShiftLinkField(doc: Record<string, unknown> | undefined): string | null {
  if (!doc) return null;
  for (const k of ['shift', 'pos_shift', 'default_shift', 'pos_default_shift'] as const) {
    if (Object.prototype.hasOwnProperty.call(doc, k)) return k;
  }
  return null;
}

export default function PosProfileDetailSettingsPage() {
  const params = useParams();
  const raw = typeof params?.name === 'string' ? decodeURIComponent(params.name) : '';
  const name = raw.trim();
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useDoc<Record<string, unknown>>(
    'POS Profile',
    name
  );

  const updateMut = useUpdateDoc<Record<string, unknown>>('POS Profile');

  const [allowPartial, setAllowPartial] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [updateStock, setUpdateStock] = useState(true);
  const [warehouseVal, setWarehouseVal] = useState('');
  const [shiftLinkVal, setShiftLinkVal] = useState('');
  const [profileDisabled, setProfileDisabled] = useState(false);
  const [writeOffLimit, setWriteOffLimit] = useState('');
  const [writeOffAccount, setWriteOffAccount] = useState('');
  const [writeOffCc, setWriteOffCc] = useState('');

  const shiftLinkField = useMemo(() => posProfileShiftLinkField(data ?? undefined), [data]);

  const hasDisabledField = useMemo(
    () => (data ? Object.prototype.hasOwnProperty.call(data, 'disabled') : false),
    [data]
  );

  useEffect(() => {
    if (!data) return;
    queueMicrotask(() => {
      setAllowPartial(num01(data.allow_partial_payment));
      setHideUnavailable(num01(data.hide_unavailable_items));
      const us = data.update_stock;
      setUpdateStock(us === undefined || us === 1 || us === true || us === '1');
      setWarehouseVal(typeof data.warehouse === 'string' ? data.warehouse : '');
      const sf = posProfileShiftLinkField(data);
      if (sf) {
        const raw = data[sf];
        setShiftLinkVal(typeof raw === 'string' ? raw : '');
      } else {
        setShiftLinkVal('');
      }
      if (Object.prototype.hasOwnProperty.call(data, 'disabled')) {
        setProfileDisabled(num01(data.disabled));
      }
      if (Object.prototype.hasOwnProperty.call(data, 'write_off_limit')) {
        const lim = data.write_off_limit;
        setWriteOffLimit(lim != null && lim !== '' ? String(lim) : '');
      }
      if (Object.prototype.hasOwnProperty.call(data, 'write_off_account')) {
        const a = data.write_off_account;
        setWriteOffAccount(typeof a === 'string' ? a : '');
      }
      if (Object.prototype.hasOwnProperty.call(data, 'write_off_cost_center')) {
        const c = data.write_off_cost_center;
        setWriteOffCc(typeof c === 'string' ? c : '');
      }
    });
  }, [data]);

  const pushPatch = async (patch: Record<string, unknown>) => {
    if (!name) return;
    try {
      await updateMut.mutateAsync({ name, doc: patch });
      toast.success('تم الحفظ');
      void qc.invalidateQueries({ queryKey: ['pos', 'profile-data', name] });
      void refetch();
    } catch (e) {
      toast.error('فشل الحفظ', { description: e instanceof Error ? e.message : undefined });
      void refetch();
    }
  };

  const handleWarehouseChange = (v: string) => {
    setWarehouseVal(v);
    void pushPatch({ warehouse: v });
  };

  const handleShiftLinkChange = (v: string) => {
    if (!shiftLinkField) return;
    setShiftLinkVal(v);
    void pushPatch({ [shiftLinkField]: v ? v : null });
  };

  const handleTogglePartial = (checked: boolean) => {
    setAllowPartial(checked);
    void pushPatch({ allow_partial_payment: checked ? 1 : 0 });
  };

  const handleToggleHide = (checked: boolean) => {
    setHideUnavailable(checked);
    void pushPatch({ hide_unavailable_items: checked ? 1 : 0 });
  };

  const handleToggleStock = (checked: boolean) => {
    setUpdateStock(checked);
    void pushPatch({ update_stock: checked ? 1 : 0 });
  };

  const handleToggleProfileDisabled = (checked: boolean) => {
    setProfileDisabled(checked);
    void pushPatch({ disabled: checked ? 1 : 0 });
  };

  const handleWriteOffLimitBlur = () => {
    const n = Number(writeOffLimit);
    void pushPatch({ write_off_limit: Number.isFinite(n) ? n : 0 });
  };

  const handleWriteOffAccountChange = (v: string) => {
    setWriteOffAccount(v);
    void pushPatch({ write_off_account: v.trim() ? v : null });
  };

  const handleWriteOffCcChange = (v: string) => {
    setWriteOffCc(v);
    void pushPatch({ write_off_cost_center: v.trim() ? v : null });
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="تفاصيل ملف نقطة البيع"
        description={<span className="font-mono text-sm tabular-nums">{name || '—'}</span>}
        iconify="solar:users-group-rounded-bold-duotone"
        accent="primary"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الإعدادات', href: '/pos/settings' }, { label: 'الملفات', href: '/pos/settings/profiles' }, { label: 'تفاصيل' }]}
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">جاري التحميل…</p>
      ) : !data ? (
        <p className="text-sm text-destructive py-10 text-center">تعذر تحميل الملف.</p>
      ) : (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">بيانات أساسية</CardTitle>
              <CardDescription className="text-xs">
                الشركة: {String(data.company ?? '—')} — المستودع: {String(data.warehouse ?? '—')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">قائمة الأسعار: </span>
                  {String(data.selling_price_list ?? '—')}
                </p>
                <p dir="ltr" className="font-mono">
                  <span className="text-muted-foreground">العملة: </span>
                  {String(data.currency ?? '—')}
                </p>
              </div>
              {hasDisabledField ? (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="profile-disabled" className="text-sm font-medium">
                        تعطيل الملف
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        يمنع اختيار هذا الملف في شاشة البيع عند التعطيل (حسب دعم النظام).
                      </p>
                    </div>
                    <Switch
                      id="profile-disabled"
                      checked={profileDisabled}
                      disabled={updateMut.isPending}
                      onCheckedChange={(c) => void handleToggleProfileDisabled(c)}
                    />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">جهاز الكاشير والوردية</CardTitle>
              <CardDescription className="text-xs">
                §11.1 — المستودع للجهاز؛ الوردية الافتراضية عند وجود حقل ربط على ملف نقطة البيع في النظام.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">المستودع</Label>
                <ErpLinkCombobox
                  doctype="Warehouse"
                  value={warehouseVal}
                  onChange={(v) => handleWarehouseChange(v)}
                  disabled={updateMut.isPending}
                  placeholder="اختر المستودع"
                />
              </div>
              {shiftLinkField ? (
                <div className="space-y-2">
                  <Label className="text-xs">الوردية الافتراضية (نوع الوردية)</Label>
                  <ErpLinkCombobox
                    doctype="Shift Type"
                    value={shiftLinkVal}
                    onChange={(v) => handleShiftLinkChange(v)}
                    disabled={updateMut.isPending}
                    placeholder="اختر نوع الوردية"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  لا يوجد على هذا الملف حقل وردية افتراضية. عرّف أنواع الوردية من{' '}
                  <Link href="/pos/settings/shifts-devices" className="text-primary underline">
                    ورديات وأجهزة
                  </Link>
                  ؛ لربط جهاز بوردية يدوياً قد تحتاج حقلاً مخصصاً على POS Profile.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">التنازل (Write-off) §11</CardTitle>
              <CardDescription className="text-xs">
                أقصى مبلغ تنازل عنه والحسابات الافتراضية — تُحفَظ في POS Profile عند توفر الحقول المناسبة.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">أقصى حد للتنازل</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-9 text-sm"
                  dir="ltr"
                  value={writeOffLimit}
                  onChange={(e) => setWriteOffLimit(e.target.value)}
                  onBlur={() => void handleWriteOffLimitBlur()}
                  disabled={updateMut.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">حساب التنازل</Label>
                <ErpLinkCombobox
                  doctype="Account"
                  value={writeOffAccount}
                  onChange={(v) => void handleWriteOffAccountChange(v)}
                  disabled={updateMut.isPending}
                  placeholder="اختر حساباً"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">مركز تكلفة التنازل</Label>
                <ErpLinkCombobox
                  doctype="Cost Center"
                  value={writeOffCc}
                  onChange={(v) => void handleWriteOffCcChange(v)}
                  disabled={updateMut.isPending}
                  placeholder="اختر مركز تكلفة"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">سلوك الشاشة والبيع</CardTitle>
              <CardDescription className="text-xs">
                يُحفظ فور التبديل على الخادم.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="allow_partial" className="text-sm font-medium">
                    السماح بالدفع الجزئي
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    حفظ فاتورة كمسودة عند دفع أقل من الإجمالي (§6.5).
                  </p>
                </div>
                <Switch
                  id="allow_partial"
                  checked={allowPartial}
                  disabled={updateMut.isPending}
                  onCheckedChange={(c) => void handleTogglePartial(c)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="hide_unavail" className="text-sm font-medium">
                    إخفاء الأصناف غير المتوفرة
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    عند التفعيل يقلّ عرض أصناف بلا مخزون في الكتالوج.
                  </p>
                </div>
                <Switch
                  id="hide_unavail"
                  checked={hideUnavailable}
                  disabled={updateMut.isPending}
                  onCheckedChange={(c) => void handleToggleHide(c)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="upd_stock" className="text-sm font-medium">
                    تحديث المخزون عند البيع
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    ترحيل خصم مخزون مع فاتورة نقطة البيع.
                  </p>
                </div>
                <Switch
                  id="upd_stock"
                  checked={updateStock}
                  disabled={updateMut.isPending}
                  onCheckedChange={(c) => void handleToggleStock(c)}
                />
              </div>
              {updateMut.isPending ? (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> جاري الحفظ…
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
